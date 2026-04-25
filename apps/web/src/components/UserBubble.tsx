import type { UiTurn } from '../store/conversations.js';

export function UserBubble({ turn }: { turn: UiTurn }) {
  const text =
    turn.user.kind === 'text'
      ? turn.user.text
      : `[操作 ${turn.user.actionName}]`;
  return (
    <div className="flex justify-end">
      <div className="max-w-2xl rounded-2xl bg-neutral-900 text-white px-4 py-2.5 text-sm whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}
