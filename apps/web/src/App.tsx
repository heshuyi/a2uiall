import { useEffect, useRef, useState } from 'react';
import { A2UIProvider } from '@a2ui/runtime/react';
import { Sidebar } from './components/Sidebar.js';
import { QAList } from './components/QAList.js';
import { Composer } from './components/Composer.js';
import { useConversations, type UiTurn } from './store/conversations.js';
import { api } from './services/api.js';
import { a2uiClient } from './lib/client.js';

export function App() {
  return (
    <A2UIProvider client={a2uiClient}>
      <Shell />
    </A2UIProvider>
  );
}

function Shell() {
  const {
    sessions,
    activeId,
    setSessionsList,
    setSessionTurns,
    setActive,
    removeSession,
    appendTurn,
    patchTurn,
    appendAgentMessage,
    upsertSessionMeta,
  } = useConversations();
  const [bootError, setBootError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        const list = await api.listSessions();
        setSessionsList(list);
        if (list.length === 0) {
          const id = await api.createSession();
          const now = Date.now();
          upsertSessionMeta({ id, title: '新对话', createdAt: now, updatedAt: now });
          setActive(id);
        } else if (!activeId || !list.find((s) => s.id === activeId)) {
          setActive(list[0]!.id);
        }
      } catch (e) {
        setBootError((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const cur = sessions[activeId];
    if (!cur || cur.loaded) return;
    (async () => {
      const detail = await api.getSession(activeId);
      if (!detail) return;
      const turns: UiTurn[] = detail.turns.map((t) => ({
        id: t.id,
        surfaceId: `msg-${t.id}`,
        user: t.userInput.text
          ? { kind: 'text', text: t.userInput.text }
          : t.userInput.action
            ? {
                kind: 'action',
                sourceComponentId: t.userInput.action.sourceComponentId,
                actionName: t.userInput.action.actionName,
                context: t.userInput.action.context,
              }
            : { kind: 'text', text: '' },
        agentMessages: t.agentMessages,
        streaming: false,
        createdAt: t.createdAt,
      }));
      setSessionTurns(activeId, turns);
      a2uiClient.store.applyMany(turns.flatMap((t) => t.agentMessages));
    })();
  }, [activeId, sessions]);

  const session = activeId ? sessions[activeId] : undefined;
  const lastTurn = session?.turns[session.turns.length - 1];
  const isStreaming = Boolean(lastTurn?.streaming);

  const handleSend = async (text: string) => {
    if (!activeId || !session) return;
    const turnId = crypto.randomUUID();
    const placeholderSurfaceId = `pending-${turnId}`;
    const newTurn: UiTurn = {
      id: turnId,
      surfaceId: placeholderSurfaceId,
      user: { kind: 'text', text },
      agentMessages: [],
      streaming: true,
      createdAt: Date.now(),
    };
    appendTurn(activeId, newTurn);

    const handle = api.chat(
      a2uiClient.store,
      { sessionId: activeId, text },
      (msg) => appendAgentMessage(activeId, turnId, msg),
    );
    patchTurn(activeId, turnId, { abort: handle.abort });

    try {
      const meta = await handle.done;
      patchTurn(activeId, turnId, {
        surfaceId: meta.surfaceId,
        streaming: false,
        abort: undefined,
      });
      if (session.turns.length === 0) {
        const updated = await api.getSession(activeId);
        if (updated) {
          upsertSessionMeta({
            id: updated.id,
            title: updated.title,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          });
        }
      }
    } catch (e) {
      patchTurn(activeId, turnId, { streaming: false, abort: undefined });
      const msg = (e as Error)?.message ?? String(e);
      // 当后端使用 memory 存储且服务端重启后，本地仍持有旧 sessionId，会出现 404 session not found。
      // 这里做一次自愈：移除本地旧会话，创建新会话并切换。
      if (/HTTP\s+404\b/.test(msg) && /session not found/i.test(msg)) {
        try {
          removeSession(activeId);
          const id = await api.createSession();
          const now = Date.now();
          upsertSessionMeta({ id, title: '新对话', createdAt: now, updatedAt: now });
          setActive(id);
        } catch (e2) {
          console.error(e2);
        }
        return;
      }
      console.error(e);
    }
  };

  const handleAbort = () => {
    if (lastTurn?.abort) lastTurn.abort();
  };

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex flex-1 flex-col">
        {bootError ? (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            后端连接失败：{bootError}
            <br />
            请确认 <code className="px-1 bg-white rounded">apps/server</code> 已启动（默认 http://localhost:8787）
          </div>
        ) : null}
        {session ? (
          <QAList session={session} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
            选择左侧的会话，或点击「新建」开始
          </div>
        )}
        <Composer
          disabled={!session}
          streaming={isStreaming}
          onSend={handleSend}
          onAbort={handleAbort}
        />
      </main>
    </div>
  );
}
