import { useEffect } from 'react';
import { A2UIRenderer } from '@a2ui/components';
import { Sparkles } from 'lucide-react';
import { a2uiClient } from '../lib/client.js';
import type { UiTurn } from '../store/conversations.js';

/**
 * AssistantTurn —— 渲染一轮 agent 回复。
 *
 * 流程：
 * 1. mount 时把 turn.agentMessages（持久化下来的）回放进 store —— 用于刷新页面后还原
 * 2. <A2UIRenderer> 监听 store 变化自动渲染
 *
 * 注意：对于「新发」的 turn，agentMessages 由 services/api.ts 在流式接收时已经
 * apply 到 store 了；这里再 apply 一遍是幂等的（surfaceUpdate 是 merge，
 * dataModelUpdate 也是 merge，beginRendering 设置 root + ready）。
 */
export function AssistantTurn({ turn }: { turn: UiTurn }) {
  useEffect(() => {
    if (turn.agentMessages.length > 0) {
      a2uiClient.store.applyMany(turn.agentMessages);
    }
  }, [turn.surfaceId, turn.agentMessages.length]);

  return (
    <div className="flex justify-start">
      <div className="flex max-w-3xl gap-3 w-full">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <A2UIRenderer
            surfaceId={turn.surfaceId}
            pending={
              <span className="inline-flex items-center gap-2 text-sm text-neutral-500">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
                {turn.streaming ? '生成中…' : '准备渲染…'}
              </span>
            }
          />
          {turn.streaming ? (
            <div className="mt-1 text-[11px] text-neutral-400">流式接收中…</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
