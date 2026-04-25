import { useEffect, useMemo } from 'react';
import type {
  AnyBoundValue,
  BoundBoolean,
  BoundNumber,
  BoundString,
  BoundStringArray,
} from '@a2ui/protocol';
import { useA2UIClient } from './A2UIProvider.js';
import { useScope } from './ScopeContext.js';
import { useSurfaceId } from './SurfaceContext.js';
import { useSurface } from './useSurface.js';
import {
  getBoundValueInit,
  resolveBoundBoolean,
  resolveBoundNumber,
  resolveBoundString,
  resolveBoundStringArray,
  resolveBoundValue,
} from '../bound-value.js';

/**
 * 获取当前 surface 的 dataModel + scope 上下文，并提供 BoundValue 解析。
 *
 * 同时处理「初始化简写」：
 *   若 path + literal* 同存且 dataModel 上 path 处当前为 undefined，
 *   首次执行时把 literal 写回 store（仅一次）。
 */
function useResolveContext() {
  const client = useA2UIClient();
  const surfaceId = useSurfaceId();
  const scope = useScope();
  const surface = useSurface(surfaceId);
  return {
    client,
    surfaceId,
    scope,
    dataModel: surface?.dataModel ?? {},
  };
}

function useInitFor(bv: AnyBoundValue | undefined) {
  const { client, surfaceId, scope, dataModel } = useResolveContext();
  const initKey = useMemo(() => JSON.stringify(bv ?? null), [bv]);
  useEffect(() => {
    if (!bv) return;
    const init = getBoundValueInit(bv, { dataModel, scope });
    if (!init) return;
    if (Array.isArray(init.value)) {
      // 数组初始化目前用 dataModelUpdate 表达不便，先序列化到一个 map
      // （实际场景 MultipleChoice.selections 的初始 literalArray 需要更通用支持，留作扩展）
      return;
    }
    client.store.writeData(surfaceId, init.path, init.value as string | number | boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey]);
}

export function useResolvedBoundValue(bv: AnyBoundValue | undefined): unknown {
  useInitFor(bv);
  const { dataModel, scope } = useResolveContext();
  return resolveBoundValue(bv, { dataModel, scope });
}

export function useBoundString(bv: BoundString | undefined): string | undefined {
  useInitFor(bv as AnyBoundValue);
  const { dataModel, scope } = useResolveContext();
  return resolveBoundString(bv, { dataModel, scope });
}

export function useBoundNumber(bv: BoundNumber | undefined): number | undefined {
  useInitFor(bv as AnyBoundValue);
  const { dataModel, scope } = useResolveContext();
  return resolveBoundNumber(bv, { dataModel, scope });
}

export function useBoundBoolean(bv: BoundBoolean | undefined): boolean | undefined {
  useInitFor(bv as AnyBoundValue);
  const { dataModel, scope } = useResolveContext();
  return resolveBoundBoolean(bv, { dataModel, scope });
}

export function useBoundStringArray(bv: BoundStringArray | undefined): string[] {
  useInitFor(bv as AnyBoundValue);
  const { dataModel, scope } = useResolveContext();
  return resolveBoundStringArray(bv, { dataModel, scope });
}

/**
 * 获取一个写入器：用于 CheckBox / TextField / Slider 等输入组件
 * 把用户当前值写回 dataModel 中 BoundValue.path 指向的位置。
 */
export function useDataWriter() {
  const client = useA2UIClient();
  const surfaceId = useSurfaceId();
  return (path: string, value: string | number | boolean) => {
    client.store.writeData(surfaceId, path, value);
  };
}
