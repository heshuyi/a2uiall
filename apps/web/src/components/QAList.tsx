import { useEffect, useRef } from 'react';
import { SessionProvider } from '@a2ui/components';
import type { UiSession } from '../store/conversations.js';
import { UserBubble } from './UserBubble.js';
import { AssistantTurn } from './AssistantTurn.js';

export function QAList({ session }: { session: UiSession }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const turns = session.turns;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns.length, turns[turns.length - 1]?.agentMessages.length]);

  return (
    <SessionProvider sessionId={session.id}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
          {turns.length === 0 ? (
            <EmptyHero />
          ) : (
            turns.map((t) => (
              <div key={t.id} className="flex flex-col gap-4">
                <UserBubble turn={t} />
                <AssistantTurn turn={t} />
              </div>
            ))
          )}
        </div>
      </div>
    </SessionProvider>
  );
}

function EmptyHero() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="text-3xl font-semibold tracking-tight text-neutral-900">
        你好，我是 A2UI Agent
      </div>
      <div className="text-sm text-neutral-500 max-w-md">
        我会根据你的请求生成 A2UI 协议描述的卡片化界面。
        <br />
        试试输入「卡片」、「列表」或「表单」开始体验。
      </div>
    </div>
  );
}
