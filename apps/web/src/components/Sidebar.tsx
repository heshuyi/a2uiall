import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { useConversations } from '../store/conversations.js';
import { api } from '../services/api.js';
import { cn } from '../lib/cn.js';

export function Sidebar() {
  const { sessions, sessionOrder, activeId, setActive, removeSession, upsertSessionMeta } =
    useConversations();

  const handleNew = async () => {
    const id = await api.createSession();
    const now = Date.now();
    upsertSessionMeta({ id, title: '新对话', createdAt: now, updatedAt: now });
    setActive(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('删除此会话？')) return;
    await api.deleteSession(id);
    removeSession(id);
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center justify-between p-3 border-b border-neutral-200">
        <span className="text-sm font-semibold text-neutral-900">A2UI Chat</span>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          新建
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {sessionOrder.length === 0 ? (
          <div className="p-4 text-xs text-neutral-400">暂无会话，点右上「新建」开始</div>
        ) : (
          sessionOrder
            .map((id) => sessions[id])
            .filter((x): x is NonNullable<typeof x> => Boolean(x))
            .map((s) => (
              <div
                key={s.id}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer mb-0.5',
                  activeId === s.id
                    ? 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50',
                )}
                onClick={() => setActive(s.id)}
              >
                <span className="flex-1 truncate">{s.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500"
                  aria-label="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
        )}
      </div>
      <div className="p-3 border-t border-neutral-200 text-[10px] text-neutral-400 leading-tight">
        基于 A2UI 0.8 协议
        <br />
        UI 由 Agent 生成，运行时自渲染
      </div>
    </aside>
  );
}
