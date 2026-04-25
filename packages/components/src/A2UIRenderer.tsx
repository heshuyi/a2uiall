/**
 * A2UIRenderer —— A2UI surface 的入口渲染器。
 *
 * 用法：
 * ```tsx
 * <A2UIProvider client={client}>
 *   <SessionProvider sessionId={sessionId}>
 *     <A2UIRenderer surfaceId={surfaceId} catalogs={[StandardCatalog]} />
 *   </SessionProvider>
 * </A2UIProvider>
 * ```
 *
 * - 等待 surface.isReady（即收到 beginRendering）后才渲染
 * - 自动按 surface.catalogId 在 catalogs 中查找对应 catalog（找不到回退第一个）
 * - 应用 surface.styles.primaryColor 等样式 token（用 CSS 变量注入）
 */

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { SurfaceProvider, useSurface } from '@a2ui/runtime/react';
import { CatalogProvider } from './CatalogContext.js';
import { ResolvedComponent } from './ComponentResolver.js';
import { selectCatalog, type ReactCatalog } from './catalog.js';
import { StandardCatalog } from './standard/index.js';
import { cn } from './utils.js';

export interface A2UIRendererProps {
  surfaceId: string;
  /** 提供给运行时使用的 catalog 列表，缺省时使用标准目录。 */
  catalogs?: ReactCatalog[];
  /** 还没收到 beginRendering 时显示的占位（如打字光标）。 */
  pending?: ReactNode;
  /** 容器额外类名。 */
  className?: string;
}

export function A2UIRenderer({
  surfaceId,
  catalogs,
  pending,
  className,
}: A2UIRendererProps) {
  const cats = catalogs && catalogs.length > 0 ? catalogs : [StandardCatalog];
  return (
    <SurfaceProvider surfaceId={surfaceId}>
      <SurfaceBody surfaceId={surfaceId} catalogs={cats} pending={pending} className={className} />
    </SurfaceProvider>
  );
}

function SurfaceBody({
  surfaceId,
  catalogs,
  pending,
  className,
}: {
  surfaceId: string;
  catalogs: ReactCatalog[];
  pending?: ReactNode;
  className?: string;
}) {
  const surface = useSurface(surfaceId);
  const styleVars = useMemo(() => stylesToCssVars(surface?.styles), [surface?.styles]);

  // 允许 beginRendering 先到，但在 root 组件实例尚未收到前不要开始渲染，
  // 否则会出现 “未找到组件实例 id=root” 的占位闪烁。
  const rootReady = Boolean(surface?.rootId && surface.components.get(surface.rootId));
  if (!surface || !surface.isReady || !surface.rootId || !rootReady) {
    return <div className={cn('text-sm text-neutral-400', className)}>{pending ?? '渲染中…'}</div>;
  }

  const activeCatalog = selectCatalog(catalogs, surface.catalogId);

  return (
    <CatalogProvider catalog={activeCatalog}>
      <div className={cn('a2ui-surface', className)} style={styleVars}>
        <ResolvedComponent componentId={surface.rootId} catalog={activeCatalog} />
      </div>
    </CatalogProvider>
  );
}

function stylesToCssVars(styles: Record<string, unknown> | null | undefined): CSSProperties {
  if (!styles) return {};
  const out: Record<string, string> = {};
  if (typeof styles.primaryColor === 'string') {
    out['--a2ui-primary'] = styles.primaryColor;
  }
  if (typeof styles.font === 'string') {
    out['--a2ui-font'] = styles.font;
  }
  return out as CSSProperties;
}
