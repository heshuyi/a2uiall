import type { UserAction } from '@a2ui/protocol';
import { A2UIClient, type ChatHandle } from '@a2ui/runtime';
import { api } from '../services/api.js';
import { useConversations, type UiTurn } from '../store/conversations.js';

/**
 * A2UIWebClient —— 重写 sendUserAction 让它走 apps/server 的契约，
 * 并把这一轮 turn 写进 zustand 会话存档。
 *
 * .chat() 不会被组件调用（壳子直接用 services/api.ts 的 api.chat），
 * 这里只为了满足 Provider 类型。
 */
class A2UIWebClient extends A2UIClient {
  constructor() {
    super({ endpoint: '/api' });
  }

  override sendUserAction(
    sessionId: string,
    action: Omit<UserAction, 'timestamp'> & { timestamp?: string },
  ): ChatHandle {
    const turnId = crypto.randomUUID();
    const placeholderSurfaceId = `pending-${turnId}`;
    const userTurn: UiTurn = {
      id: turnId,
      surfaceId: placeholderSurfaceId,
      user: {
        kind: 'action',
        sourceComponentId: action.sourceComponentId,
        actionName: action.name,
        context: action.context ?? {},
      },
      agentMessages: [],
      streaming: true,
      createdAt: Date.now(),
    };
    useConversations.getState().appendTurn(sessionId, userTurn);

    const handle = api.action(
      this.store,
      {
        sessionId,
        surfaceId: action.surfaceId,
        sourceComponentId: action.sourceComponentId,
        actionName: action.name,
        context: action.context ?? {},
      },
      (msg) => useConversations.getState().appendAgentMessage(sessionId, turnId, msg),
    );

    handle.done.then(
      (meta) => {
        useConversations.getState().patchTurn(sessionId, turnId, {
          surfaceId: meta.surfaceId,
          streaming: false,
          abort: undefined,
        });
      },
      () => {
        useConversations.getState().patchTurn(sessionId, turnId, {
          streaming: false,
          abort: undefined,
        });
      },
    );

    useConversations.getState().patchTurn(sessionId, turnId, { abort: handle.abort });

    return {
      done: handle.done.then(() => undefined),
      abort: handle.abort,
    };
  }
}

export const a2uiClient = new A2UIWebClient();
