import { useSyncExternalStore } from 'react';
import { useA2UIClient } from './A2UIProvider.js';
import type { SurfaceState } from '../store.js';

/**
 * 订阅指定 surfaceId 的状态变化。
 *
 * 用 React 18 的 useSyncExternalStore 实现，避免渲染撕裂。
 * 返回值是 store 内部维护的 SurfaceState 引用（每次状态变化引用变更）。
 */
export function useSurface(surfaceId: string): SurfaceState | undefined {
  const client = useA2UIClient();
  return useSyncExternalStore(
    (cb) => client.store.subscribe(surfaceId, cb),
    () => client.store.getSurface(surfaceId),
    () => client.store.getSurface(surfaceId),
  );
}
