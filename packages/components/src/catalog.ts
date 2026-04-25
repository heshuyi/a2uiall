/**
 * Catalog —— 组件目录注册机制。
 *
 * 一个 ReactCatalog 是「组件类型名 → React 组件」的映射，
 * 同时携带它的 catalogId（用于和服务端协商）。
 *
 * 标准目录由 `StandardCatalog` 提供；
 * 业务方可以通过 `defineCatalog` + `mergeCatalogs` 扩展自定义组件。
 */

import type { ComponentType } from 'react';

/** 一个组件实现接收的 props：展开协议 props 并附带 _instanceId（方便 action 上报）。 */
export interface CatalogComponentProps<P = unknown> {
  /** 当前组件实例 id（即 ComponentInstance.id）。 */
  _instanceId: string;
  /** 协议层 props（不同组件类型不同，UI 实现自行收窄）。 */
  props: P;
}

/** 一个 catalog：由 catalogId 标识，键是组件类型名，值是 React 组件。 */
export interface ReactCatalog {
  catalogId: string;
  components: Record<string, ComponentType<CatalogComponentProps>>;
}

/**
 * 创建一个 catalog；类型签名上的 `as` 强转是为了让用户在写组件时能用具体的 props 类型，
 * 实际渲染时 ComponentResolver 会把协议 props 透传过去。
 */
export function defineCatalog(c: {
  catalogId: string;
  components: Record<string, ComponentType<CatalogComponentProps<never>>>;
}): ReactCatalog {
  return c as unknown as ReactCatalog;
}

/**
 * 合并多个 catalog：后来者覆盖先来者的同名组件。
 * 第一个参数的 catalogId 作为合并结果的 catalogId（你也可以显式传 catalogId 覆盖）。
 */
export function mergeCatalogs(
  ...catalogs: ReactCatalog[]
): ReactCatalog {
  if (catalogs.length === 0) throw new Error('mergeCatalogs 至少需要一个 catalog');
  const out: ReactCatalog = {
    catalogId: catalogs[0]!.catalogId,
    components: {},
  };
  for (const c of catalogs) {
    for (const k of Object.keys(c.components)) {
      out.components[k] = c.components[k]!;
    }
  }
  return out;
}

/**
 * 按 catalogId 在一组 catalog 中查找；找不到时按数组顺序回退到第一个。
 */
export function selectCatalog(
  catalogs: ReactCatalog[],
  catalogId: string | null,
): ReactCatalog {
  if (!catalogId) return catalogs[0]!;
  const found = catalogs.find((c) => c.catalogId === catalogId);
  return found ?? catalogs[0]!;
}
