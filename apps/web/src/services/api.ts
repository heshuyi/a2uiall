/**
 * apps/web 的后端 API 客户端。
 *
 * 与 @a2ui/runtime 自带的 A2UIClient.chat 不同，这里走的是 apps/server 自己的契约：
 *   - POST /api/chat   { sessionId, text } → SSE
 *   - POST /api/action { sessionId, surfaceId, sourceComponentId, actionName, context } → SSE
 *
 * 第一条 SSE 事件是 `{ "meta": { turnId, surfaceId, role } }`，后续才是 A2UI 消息。
 * 我们把 meta 单独通过 onMeta 回调暴露，A2UI 消息扔进 store。
 */

import type { ServerToClientMessage } from '@a2ui/protocol';
import { parseSSEStream, type SurfaceStore } from '@a2ui/runtime';

const BASE = '/api';

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedTurn {
  id: string;
  sessionId: string;
  userInput: {
    text?: string;
    action?: {
      sourceComponentId: string;
      surfaceId: string;
      actionName: string;
      context: Record<string, unknown>;
    };
  };
  agentMessages: ServerToClientMessage[];
  createdAt: number;
}

export interface SessionDetail extends SessionMeta {
  turns: PersistedTurn[];
}

export interface TurnMeta {
  turnId: string;
  surfaceId: string;
}

export interface StreamHandle {
  done: Promise<TurnMeta>;
  abort: () => void;
}

export const api = {
  async listSessions(): Promise<SessionMeta[]> {
    const r = await fetch(`${BASE}/sessions`);
    const j = (await r.json()) as { sessions: SessionMeta[] };
    return j.sessions;
  },
  async createSession(title?: string): Promise<string> {
    const r = await fetch(`${BASE}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const j = (await r.json()) as { id: string };
    return j.id;
  },
  async getSession(id: string): Promise<SessionDetail | null> {
    const r = await fetch(`${BASE}/sessions/${id}`);
    if (r.status === 404) return null;
    return (await r.json()) as SessionDetail;
  },
  async renameSession(id: string, title: string): Promise<void> {
    await fetch(`${BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  },
  async deleteSession(id: string): Promise<void> {
    await fetch(`${BASE}/sessions/${id}`, { method: 'DELETE' });
  },

  chat(
    store: SurfaceStore,
    body: { sessionId: string; text: string },
    onMessage?: (msg: ServerToClientMessage) => void,
  ): StreamHandle {
    return startStream(store, '/chat', body, onMessage);
  },

  action(
    store: SurfaceStore,
    body: {
      sessionId: string;
      surfaceId: string;
      sourceComponentId: string;
      actionName: string;
      context: Record<string, unknown>;
    },
    onMessage?: (msg: ServerToClientMessage) => void,
  ): StreamHandle {
    return startStream(store, '/action', body, onMessage);
  },
};

function startStream(
  store: SurfaceStore,
  path: '/chat' | '/action',
  body: unknown,
  onMessage?: (msg: ServerToClientMessage) => void,
): StreamHandle {
  const ctrl = new AbortController();
  let resolveMeta!: (m: TurnMeta) => void;
  let rejectMeta!: (e: Error) => void;
  const metaPromise = new Promise<TurnMeta>((resolve, reject) => {
    resolveMeta = resolve;
    rejectMeta = reject;
  });

  const done = (async () => {
    let resp: Response;
    try {
      resp = await fetch(BASE + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') {
        rejectMeta(new Error('aborted'));
        throw e;
      }
      rejectMeta(e as Error);
      throw e;
    }
    if (!resp.ok || !resp.body) {
      const txt = await resp.text().catch(() => '');
      const e = new Error(`HTTP ${resp.status}: ${txt}`);
      rejectMeta(e);
      throw e;
    }

    let meta: TurnMeta | null = null;
    try {
      for await (const evt of parseSSEStream<unknown>(resp.body, ctrl.signal)) {
        if (isMetaEvent(evt)) {
          meta = { turnId: evt.meta.turnId, surfaceId: evt.meta.surfaceId };
          resolveMeta(meta);
          continue;
        }
        const msg = evt as ServerToClientMessage;
        store.apply(msg);
        onMessage?.(msg);
      }
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') {
        if (!meta) rejectMeta(e as Error);
        throw e;
      }
    }
    if (!meta) {
      const e = new Error('未收到 meta 事件');
      rejectMeta(e);
      throw e;
    }
    return meta;
  })();

  return {
    done: done.catch(() => metaPromise),
    abort: () => ctrl.abort(),
  };
}

function isMetaEvent(v: unknown): v is { meta: { turnId: string; surfaceId: string; role: string } } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'meta' in v &&
    typeof (v as { meta?: { turnId?: unknown } }).meta?.turnId === 'string'
  );
}
