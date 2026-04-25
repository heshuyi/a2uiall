/**
 * POST /api/chat
 *
 * 请求体：
 * {
 *   sessionId: string,
 *   text: string,
 * }
 *
 * 响应：text/event-stream
 * - 每条 data 是一个 A2UI server-to-client 消息（surfaceUpdate / dataModelUpdate / beginRendering）
 * - 客户端通过 surfaceId 把这一轮的 surface 与本轮 turn 对应
 * - 流末尾发送 `data: [DONE]`
 *
 * 服务端职责：
 * - 为本轮分配 surfaceId（msg-<turnId>-surface），传给 agent
 * - 把 agent 流式输出原样推回前端
 * - 流结束后整轮 agentMessages 持久化到 storage
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ServerToClientMessage } from '@a2ui/protocol';
import type { AgentRunner } from '../agent/index.js';
import { setupSse } from '../stream/sse.js';
import type { SessionStorage, Turn } from '../types.js';

export function chatRouter(storage: SessionStorage, agent: AgentRunner): Router {
  const r = Router();

  r.post('/chat', async (req, res) => {
    const reqStart = Date.now();
    let body: { sessionId: string; text: string };
    try {
      body = z
        .object({ sessionId: z.string().min(1), text: z.string().min(1).max(4000) })
        .parse(req.body);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
      return;
    }

    const session = await storage.getSession(body.sessionId);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }

    const sse = setupSse(res);
    const turnId = randomUUID();
    const surfaceId = `msg-${turnId}`;
    const collected: ServerToClientMessage[] = [];

    console.log(
      `[a2ui/server] POST /api/chat session=${body.sessionId} turn=${turnId} chars=${body.text.length}`,
    );

    sse.send({
      meta: { turnId, surfaceId, role: 'agent' },
    });

    try {
      for await (const msg of agent.run({
        history: session.turns,
        current: { text: body.text },
        surfaceId,
      })) {
        if (sse.closed) break;
        collected.push(msg);
        sse.send(msg);
      }
    } catch (e) {
      console.error('[a2ui/server] agent_failure', {
        sessionId: body.sessionId,
        turnId,
        surfaceId,
        message: (e as Error)?.message ?? String(e),
        stack: (e as Error)?.stack,
        error: e,
      });
      sse.send({
        error: { code: 'agent_failure', message: (e as Error).message },
      });
    }

    const turn: Turn = {
      id: turnId,
      sessionId: body.sessionId,
      userInput: { text: body.text },
      agentMessages: collected,
      createdAt: Date.now(),
    };
    await storage.appendTurn(turn);

    if (session.turns.length === 0 && session.title === '新对话') {
      await storage.updateSession(body.sessionId, {
        title: body.text.slice(0, 30),
        updatedAt: Date.now(),
      });
    }

    sse.done();
    console.log(
      `[a2ui/server] POST /api/chat done session=${body.sessionId} turn=${turnId} msgs=${collected.length} ms=${
        Date.now() - reqStart
      }`,
    );
  });

  return r;
}
