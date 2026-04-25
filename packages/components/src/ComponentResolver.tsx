/**
 * ComponentResolver —— 单个组件实例的渲染分发。
 *
 * 用法：在父级（Renderer 或某个布局组件）拿到 child 的 componentId 后，
 *      渲染 `<ResolvedComponent componentId={id} />` 即可。
 *
 * 内部从当前 surface 的 components map 取出 ComponentInstance，
 * 读出单键作为类型名，从 catalog 找对应 React 组件并渲染。
 */

import { Fragment } from 'react';
import { useSurface, useSurfaceId, useScope, ScopeProvider } from '@a2ui/runtime/react';
import type { ReactCatalog } from './catalog.js';

export interface ResolvedComponentProps {
  /** 组件实例 id（在 surface.components 中查找）。 */
  componentId: string;
  /** 当前活动 catalog（由 Renderer 选定后向下传递；这里直接拿 props 而不是再 context 一层）。 */
  catalog: ReactCatalog;
  /** 模板作用域；如果非空会自动包一层 ScopeProvider。 */
  scope?: string | undefined;
}

export function ResolvedComponent({ componentId, catalog, scope }: ResolvedComponentProps) {
  const surfaceId = useSurfaceId();
  const surface = useSurface(surfaceId);
  const inheritedScope = useScope();

  const instance = surface?.components.get(componentId);
  if (!instance) {
    return (
      <UnknownPlaceholder reason={`未找到组件实例 id=${componentId}`} />
    );
  }

  const keys = Object.keys(instance.component);
  if (keys.length !== 1) {
    return (
      <UnknownPlaceholder
        reason={`组件实例 ${componentId} 应有且仅有 1 个键，实际为 ${keys.length}：${keys.join(',')}`}
      />
    );
  }
  const type = keys[0]!;
  const Comp = catalog.components[type];
  if (!Comp) {
    return (
      <UnknownPlaceholder
        reason={`catalog ${catalog.catalogId} 中未注册组件类型「${type}」`}
      />
    );
  }

  const node = (
    <Comp _instanceId={componentId} props={instance.component[type] as never} />
  );

  if (scope !== undefined && scope !== inheritedScope) {
    return <ScopeProvider scope={scope}>{node}</ScopeProvider>;
  }
  return <Fragment>{node}</Fragment>;
}

function UnknownPlaceholder({ reason }: { reason: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      [a2ui/components] 渲染失败：{reason}
    </div>
  );
}
