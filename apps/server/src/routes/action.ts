/**
 * POST /api/action
 *
 * 请求体：
 * {
 *   sessionId: string,
 *   surfaceId: string,           // 触发 action 所在的 surface
 *   sourceComponentId: string,   // 触发的组件实例 id
 *   actionName: string,
 *   context: Record<string, unknown>
 * }
 *
 * 响应：text/event-stream
 * - 同 /chat：把 agent 对此 action 的回复以 A2UI 消息流推回
 * - 通常会创建一个新的 surface 作为下一轮回答
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ServerToClientMessage } from '@a2ui/protocol';
import type { AgentRunner } from '../agent/index.js';
import { setupSse } from '../stream/sse.js';
import type { SessionStorage, Turn } from '../types.js';

export function actionRouter(storage: SessionStorage, agent: AgentRunner): Router {
  const r = Router();

  r.post('/action', async (req, res) => {
    let body: {
      sessionId: string;
      surfaceId: string;
      sourceComponentId: string;
      actionName: string;
      context: Record<string, unknown>;
    };
    try {
      body = z
        .object({
          sessionId: z.string().min(1),
          surfaceId: z.string().min(1),
          sourceComponentId: z.string().min(1),
          actionName: z.string().min(1),
          context: z.record(z.unknown()).default({}),
        })
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
    const newSurfaceId = `msg-${turnId}`;
    const collected: ServerToClientMessage[] = [];

    sse.send({ meta: { turnId, surfaceId: newSurfaceId, role: 'agent' } });

    try {
      for await (const msg of agent.run({
        history: session.turns,
        current: {
          action: {
            sourceComponentId: body.sourceComponentId,
            surfaceId: body.surfaceId,
            actionName: body.actionName,
            context: body.context,
          },
        },
        surfaceId: newSurfaceId,
      })) {
        if (sse.closed) break;
        collected.push(msg);
        sse.send(msg);
      }
    } catch (e) {
      sse.send({ error: { code: 'agent_failure', message: (e as Error).message } });
    }

    const turn: Turn = {
      id: turnId,
      sessionId: body.sessionId,
      userInput: {
        action: {
          sourceComponentId: body.sourceComponentId,
          surfaceId: body.surfaceId,
          actionName: body.actionName,
          context: body.context,
        },
      },
      agentMessages: collected,
      createdAt: Date.now(),
    };
    await storage.appendTurn(turn);

    sse.done();
  });

  return r;
}
