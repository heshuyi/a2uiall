import { useCallback } from 'react';
import type { ActionSpec } from '@a2ui/protocol';
import { useA2UIClient } from './A2UIProvider.js';
import { useScope } from './ScopeContext.js';
import { useSurfaceId } from './SurfaceContext.js';
import { useSurface } from './useSurface.js';
import { resolveBoundValue } from '../bound-value.js';

export interface DispatchUserActionInput {
  /** 触发动作的组件 id（写入 sourceComponentId）。 */
  sourceComponentId: string;
  /** 来自组件 props 的 ActionSpec（含 name + 可选 context）。 */
  action: ActionSpec;
  /** 用于关联请求与会话；前端壳子负责传入。 */
  sessionId: string;
}

/**
 * 返回一个 dispatch 函数，调用时：
 *   1. 解析 action.context 中的 BoundValue 为字面量
 *   2. 组装 userAction 消息
 *   3. 通过 A2UIClient.sendUserAction 上报，并消费返回的 SSE 流
 */
export function useUserActionDispatcher() {
  const client = useA2UIClient();
  const surfaceId = useSurfaceId();
  const scope = useScope();
  const surface = useSurface(surfaceId);
  const dataModel = surface?.dataModel ?? {};

  return useCallback(
    (input: DispatchUserActionInput) => {
      const ctxObj: Record<string, string | number | boolean> = {};
      const entries = input.action.context ?? [];
      for (const e of entries) {
        const v = resolveBoundValue(e.value, { dataModel, scope });
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          ctxObj[e.key] = v;
        } else {
          ctxObj[e.key] = String(v);
        }
      }
      return client.sendUserAction(input.sessionId, {
        name: input.action.name,
        surfaceId,
        sourceComponentId: input.sourceComponentId,
        context: ctxObj,
      });
    },
    [client, surfaceId, scope, dataModel],
  );
}
