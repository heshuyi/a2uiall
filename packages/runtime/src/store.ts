/**
 * SurfaceStore —— 多 surface 的内存模型。
 *
 * 一个 SurfaceStore 拥有若干 surface，每个 surface 包含：
 *   - components: id → ComponentInstance
 *   - dataModel:  普通 JS 对象
 *   - rootId:     由 beginRendering 指定
 *   - catalogId:  由 beginRendering 指定（可空）
 *   - styles:     由 beginRendering 指定（可空）
 *   - isReady:    收到 beginRendering 即为 true
 *
 * 提供精细的订阅：listenSurface(id, fn) / listenAll(fn)。
 * 每次状态变化（components / dataModel / readiness）都触发回调。
 */

import {
  isBeginRendering,
  isDataModelUpdate,
  isDeleteSurface,
  isSurfaceUpdate,
} from '@a2ui/protocol';
import type {
  ComponentInstance,
  DataModelObject,
  ServerToClientMessage,
} from '@a2ui/protocol';
import { applyDataModelUpdate, writePathImmutable } from './data-model.js';

export interface SurfaceState {
  surfaceId: string;
  components: Map<string, ComponentInstance>;
  dataModel: DataModelObject;
  rootId: string | null;
  catalogId: string | null;
  styles: Record<string, unknown> | null;
  isReady: boolean;
  /** 单调递增的版本号，用于 React useSyncExternalStore 的 getSnapshot 比较。 */
  version: number;
}

type Listener = (state: SurfaceState) => void;
type GlobalListener = (surfaceId: string, state: SurfaceState | null) => void;

function createEmptySurface(surfaceId: string): SurfaceState {
  return {
    surfaceId,
    components: new Map(),
    dataModel: {},
    rootId: null,
    catalogId: null,
    styles: null,
    isReady: false,
    version: 0,
  };
}

export class SurfaceStore {
  private surfaces = new Map<string, SurfaceState>();
  private listeners = new Map<string, Set<Listener>>();
  private globalListeners = new Set<GlobalListener>();

  /** 取（或创建）某 surface 的当前状态快照（引用，不要直接改）。 */
  getSurface(surfaceId: string): SurfaceState | undefined {
    return this.surfaces.get(surfaceId);
  }

  /** 取所有 surfaceId 列表。 */
  getSurfaceIds(): string[] {
    return Array.from(this.surfaces.keys());
  }

  /** 订阅某个 surfaceId 的状态变化。 */
  subscribe(surfaceId: string, fn: Listener): () => void {
    let set = this.listeners.get(surfaceId);
    if (!set) {
      set = new Set();
      this.listeners.set(surfaceId, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  /** 订阅所有 surface 的变化（含新增/删除）。 */
  subscribeAll(fn: GlobalListener): () => void {
    this.globalListeners.add(fn);
    return () => this.globalListeners.delete(fn);
  }

  /**
   * 直接对 dataModel 写入一个原始值（用于 BoundValue 初始化简写、
   * 以及 CheckBox/TextField 等输入组件的本地状态回写）。
   * 不通过协议 dataModelUpdate，但效果等价。
   */
  writeData(surfaceId: string, path: string, value: string | number | boolean): void {
    const cur = this.ensureSurface(surfaceId);
    const next = writePathImmutable(cur.dataModel, path, value);
    this.replaceSurface(surfaceId, { ...cur, dataModel: next, version: cur.version + 1 });
  }

  /** 应用一条服务端消息到 store。 */
  apply(msg: ServerToClientMessage): void {
    if (isSurfaceUpdate(msg)) {
      const { surfaceId, components } = msg.surfaceUpdate;
      const cur = this.ensureSurface(surfaceId);
      const nextComponents = new Map(cur.components);
      for (const c of components) nextComponents.set(c.id, c);
      this.replaceSurface(surfaceId, {
        ...cur,
        components: nextComponents,
        version: cur.version + 1,
      });
      return;
    }

    if (isDataModelUpdate(msg)) {
      const update = msg.dataModelUpdate;
      const cur = this.ensureSurface(update.surfaceId);
      const next = applyDataModelUpdate(cur.dataModel, update);
      this.replaceSurface(update.surfaceId, {
        ...cur,
        dataModel: next,
        version: cur.version + 1,
      });
      return;
    }

    if (isBeginRendering(msg)) {
      const { surfaceId, root, catalogId, styles } = msg.beginRendering;
      const cur = this.ensureSurface(surfaceId);
      this.replaceSurface(surfaceId, {
        ...cur,
        rootId: root,
        catalogId: catalogId ?? null,
        styles: styles ?? null,
        isReady: true,
        version: cur.version + 1,
      });
      return;
    }

    if (isDeleteSurface(msg)) {
      const { surfaceId } = msg.deleteSurface;
      if (!this.surfaces.has(surfaceId)) return;
      this.surfaces.delete(surfaceId);
      this.notify(surfaceId, null);
      return;
    }
  }

  /** 一次喂入多条消息（避免逐条触发订阅风暴）。 */
  applyMany(messages: Iterable<ServerToClientMessage>): void {
    for (const m of messages) this.apply(m);
  }

  /** 删除全部 surface。 */
  reset(): void {
    const ids = Array.from(this.surfaces.keys());
    this.surfaces.clear();
    for (const id of ids) this.notify(id, null);
  }

  private ensureSurface(surfaceId: string): SurfaceState {
    let s = this.surfaces.get(surfaceId);
    if (!s) {
      s = createEmptySurface(surfaceId);
      this.surfaces.set(surfaceId, s);
    }
    return s;
  }

  private replaceSurface(surfaceId: string, next: SurfaceState): void {
    this.surfaces.set(surfaceId, next);
    this.notify(surfaceId, next);
  }

  private notify(surfaceId: string, state: SurfaceState | null): void {
    if (state) {
      const set = this.listeners.get(surfaceId);
      if (set) for (const fn of set) fn(state);
    }
    for (const fn of this.globalListeners) fn(surfaceId, state);
  }
}
