import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ServerToClientMessage } from '@a2ui/protocol';
import type { SessionMeta } from '../services/api.js';

/**
 * 一个 turn = 用户问 + agent 答（agent 答以 surfaceId + agentMessages 表示）。
 */
export interface UiTurn {
  id: string;
  /** A2UI surface id（当时服务端为该轮分配的 msg-<uuid>）。 */
  surfaceId: string;
  user:
    | { kind: 'text'; text: string }
    | {
        kind: 'action';
        sourceComponentId: string;
        actionName: string;
        context: Record<string, unknown>;
      };
  /** 已经收到的 agent 消息（用于刷新页面后重放到 store）。 */
  agentMessages: ServerToClientMessage[];
  /** 是否仍在流式中。 */
  streaming: boolean;
  /** 流式中可中止的 abort 函数（不持久化）。 */
  abort?: (() => void) | undefined;
  createdAt: number;
}

export interface UiSession extends SessionMeta {
  turns: UiTurn[];
  /** 是否已经从后端拉取过完整 turns。 */
  loaded: boolean;
}

interface ConversationsState {
  sessions: Record<string, UiSession>;
  sessionOrder: string[];
  activeId: string | null;

  setSessionsList: (list: SessionMeta[]) => void;
  upsertSessionMeta: (meta: SessionMeta) => void;
  setSessionTurns: (id: string, turns: UiTurn[]) => void;
  removeSession: (id: string) => void;
  setActive: (id: string | null) => void;

  appendTurn: (sessionId: string, turn: UiTurn) => void;
  patchTurn: (sessionId: string, turnId: string, patch: Partial<UiTurn>) => void;
  appendAgentMessage: (sessionId: string, turnId: string, msg: ServerToClientMessage) => void;
}

export const useConversations = create<ConversationsState>()(
  persist(
    (set) => ({
      sessions: {},
      sessionOrder: [],
      activeId: null,

      setSessionsList: (list) =>
        set((s) => {
          const next = { ...s.sessions };
          for (const m of list) {
            next[m.id] = next[m.id]
              ? { ...next[m.id]!, ...m }
              : { ...m, turns: [], loaded: false };
          }
          return {
            sessions: next,
            sessionOrder: list.map((m) => m.id),
          };
        }),

      upsertSessionMeta: (meta) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [meta.id]: s.sessions[meta.id]
              ? { ...s.sessions[meta.id]!, ...meta }
              : { ...meta, turns: [], loaded: false },
          },
          sessionOrder: s.sessionOrder.includes(meta.id)
            ? s.sessionOrder
            : [meta.id, ...s.sessionOrder],
        })),

      setSessionTurns: (id, turns) =>
        set((s) => {
          const cur = s.sessions[id];
          if (!cur) return {};
          return {
            sessions: { ...s.sessions, [id]: { ...cur, turns, loaded: true } },
          };
        }),

      removeSession: (id) =>
        set((s) => {
          const next = { ...s.sessions };
          delete next[id];
          return {
            sessions: next,
            sessionOrder: s.sessionOrder.filter((x) => x !== id),
            activeId: s.activeId === id ? null : s.activeId,
          };
        }),

      setActive: (id) => set({ activeId: id }),

      appendTurn: (sessionId, turn) =>
        set((s) => {
          const cur = s.sessions[sessionId];
          if (!cur) return {};
          return {
            sessions: {
              ...s.sessions,
              [sessionId]: { ...cur, turns: [...cur.turns, turn], updatedAt: Date.now() },
            },
          };
        }),

      patchTurn: (sessionId, turnId, patch) =>
        set((s) => {
          const cur = s.sessions[sessionId];
          if (!cur) return {};
          return {
            sessions: {
              ...s.sessions,
              [sessionId]: {
                ...cur,
                turns: cur.turns.map((t) => (t.id === turnId ? { ...t, ...patch } : t)),
              },
            },
          };
        }),

      appendAgentMessage: (sessionId, turnId, msg) =>
        set((s) => {
          const cur = s.sessions[sessionId];
          if (!cur) return {};
          return {
            sessions: {
              ...s.sessions,
              [sessionId]: {
                ...cur,
                turns: cur.turns.map((t) =>
                  t.id === turnId ? { ...t, agentMessages: [...t.agentMessages, msg] } : t,
                ),
              },
            },
          };
        }),
    }),
    {
      name: 'a2ui-chat-conversations-v1',
      storage: createJSONStorage(() => localStorage),
      // 持久化时去掉非可序列化的 abort 函数
      partialize: (s) => ({
        sessions: Object.fromEntries(
          Object.entries(s.sessions).map(([k, v]) => [
            k,
            { ...v, turns: v.turns.map(({ abort, ...rest }) => { void abort; return rest; }) },
          ]),
        ),
        sessionOrder: s.sessionOrder,
        activeId: s.activeId,
      }),
    },
  ),
);
