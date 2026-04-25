/**
 * 服务端内部类型：会话、消息、对话回合（turn）。
 *
 * 一个 session 是一段连续对话；每个 turn = 用户输入 + agent 回复。
 * agent 回复是 0..N 个 surface（每个 surface 对应一个 A2UI 卡片）。
 */

import type { ServerToClientMessage } from '@a2ui/protocol';

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Turn {
  id: string;
  sessionId: string;
  /** 用户输入：要么是文字，要么是上一轮某个组件的 userAction（被前端转译为文字描述）。 */
  userInput: {
    text?: string;
    /** 如果是 userAction 触发的回合，原始 action 也存档便于回放。 */
    action?: {
      sourceComponentId: string;
      surfaceId: string;
      actionName: string;
      context: Record<string, unknown>;
    };
  };
  /** agent 输出（按生成顺序排列的 A2UI 消息）。 */
  agentMessages: ServerToClientMessage[];
  createdAt: number;
}

export interface Session extends SessionMeta {
  turns: Turn[];
}

export interface SessionStorage {
  listSessions(): Promise<SessionMeta[]>;
  getSession(id: string): Promise<Session | null>;
  createSession(meta: SessionMeta): Promise<void>;
  updateSession(id: string, patch: Partial<SessionMeta>): Promise<void>;
  deleteSession(id: string): Promise<void>;
  appendTurn(turn: Turn): Promise<void>;
}
