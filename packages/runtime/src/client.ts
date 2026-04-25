/**
 * A2UIClient —— 客户端协议入口。
 *
 * 职责：
 *   - 维护一个全局 SurfaceStore
 *   - `chat()`：发起对话请求，建立 SSE 连接，把流式消息喂给 store
 *   - `sendUserAction()`：把用户交互上报给后端，并消费返回的 SSE 流
 *
 * 与具体的后端契约：
 *   - POST {endpoint}/chat   → text/event-stream（每个 event.data 是一条 ServerToClientMessage）
 *   - POST {endpoint}/action → text/event-stream（同上）
 *
 * 注意：runtime 不绑定具体框架，UI 层（@a2ui/components）通过 store 订阅渲染。
 */

import type {
  A2UIClientCapabilities,
  ClientToServerMessage,
  ServerToClientMessage,
  UserAction,
} from '@a2ui/protocol';
import { STANDARD_CATALOG_ID } from '@a2ui/protocol';
import { parseSSEStream } from './parser.js';
import { SurfaceStore } from './store.js';

/** 后端期望的 chat 请求体（仅 runtime 这一层的契约，可由各 app 自行扩展）。 */
export interface ChatRequestBody {
  sessionId: string;
  /** 历史问答对，由前端壳子维护。 */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 本轮用户消息（纯文本）。 */
  message: string;
  /** 客户端能力声明（A2A metadata.a2uiClientCapabilities）。 */
  capabilities?: A2UIClientCapabilities;
}

export interface A2UIClientOptions {
  /** 后端基础 URL，例如 `http://localhost:3001/api`。 */
  endpoint: string;
  /** fetch 实现，默认用全局 fetch。 */
  fetchImpl?: typeof fetch;
  /** 默认能力声明（chat 调用时未显式传则用这里的）。 */
  defaultCapabilities?: A2UIClientCapabilities;
  /** 错误回调；不提供则只 console.error。 */
  onError?: (err: Error) => void;
}

export interface ChatHandle {
  /** 该次请求新分配/复用的 surfaceId 列表（由后端在 surfaceUpdate 中决定）。 */
  done: Promise<void>;
  /** 提前中止本次流式请求。 */
  abort: () => void;
}

export class A2UIClient {
  readonly store = new SurfaceStore();
  private fetchImpl: typeof fetch;
  private endpoint: string;
  private defaultCapabilities: A2UIClientCapabilities;
  private onError: (err: Error) => void;

  constructor(opts: A2UIClientOptions) {
    this.endpoint = opts.endpoint.replace(/\/$/, '');
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.defaultCapabilities = opts.defaultCapabilities ?? {
      supportedCatalogIds: [STANDARD_CATALOG_ID],
    };
    this.onError =
      opts.onError ??
      ((e) => {
        // eslint-disable-next-line no-console
        console.error('[a2ui]', e);
      });
  }

  /** 发起一轮对话；返回的 done promise 在 SSE 关闭/中止后 resolve。 */
  chat(body: Omit<ChatRequestBody, 'capabilities'> & { capabilities?: A2UIClientCapabilities }): ChatHandle {
    const ctrl = new AbortController();
    const payload: ChatRequestBody = {
      capabilities: body.capabilities ?? this.defaultCapabilities,
      ...body,
    };
    const done = this.streamPost('/chat', payload, ctrl.signal);
    return { done, abort: () => ctrl.abort() };
  }

  /** 把 userAction 上报给服务端；服务端可能返回新的 SSE 流增量更新对应 surface。 */
  sendUserAction(
    sessionId: string,
    action: Omit<UserAction, 'timestamp'> & { timestamp?: string },
  ): ChatHandle {
    const ctrl = new AbortController();
    const ua: UserAction = {
      ...action,
      timestamp: action.timestamp ?? new Date().toISOString(),
    };
    const message: ClientToServerMessage = { userAction: ua };
    const done = this.streamPost(
      '/action',
      { sessionId, ...message, capabilities: this.defaultCapabilities },
      ctrl.signal,
    );
    return { done, abort: () => ctrl.abort() };
  }

  private async streamPost(path: string, body: unknown, signal: AbortSignal): Promise<void> {
    let resp: Response;
    try {
      resp = await this.fetchImpl(this.endpoint + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      this.onError(err as Error);
      throw err;
    }
    if (!resp.ok || !resp.body) {
      const text = await safeText(resp);
      const err = new Error(`A2UI 请求失败 ${resp.status}: ${text}`);
      this.onError(err);
      throw err;
    }
    try {
      for await (const msg of parseSSEStream<ServerToClientMessage>(resp.body, signal)) {
        try {
          this.store.apply(msg);
        } catch (innerErr) {
          this.onError(innerErr as Error);
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      this.onError(err as Error);
    }
  }
}

async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return '';
  }
}

export function createA2UIClient(opts: A2UIClientOptions): A2UIClient {
  return new A2UIClient(opts);
}
