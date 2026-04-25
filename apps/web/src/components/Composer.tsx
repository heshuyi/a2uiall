import { useState, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '../lib/cn.js';

export interface ComposerProps {
  disabled?: boolean;
  streaming?: boolean;
  onSend: (text: string) => void;
  onAbort?: () => void;
}

export function Composer({ disabled, streaming, onSend, onAbort }: ComposerProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const t = text.trim();
    if (!t || disabled || streaming) return;
    onSend(t);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-neutral-300">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            disabled={disabled}
            rows={1}
            placeholder={
              disabled
                ? '请先在左侧选择或新建一个会话…'
                : '输入消息（Enter 发送，Shift+Enter 换行）'
            }
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed max-h-40"
          />
          {streaming ? (
            <button
              onClick={onAbort}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-red-500 text-white hover:bg-red-600"
              aria-label="停止"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || !text.trim()}
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-lg text-white',
                disabled || !text.trim()
                  ? 'bg-neutral-300 cursor-not-allowed'
                  : 'bg-neutral-900 hover:bg-neutral-800',
              )}
              aria-label="发送"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
