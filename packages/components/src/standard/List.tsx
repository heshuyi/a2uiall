import type { CrossAxisAlignment, ListDirection, ListProps } from '@a2ui/protocol';
import { useSurface, useSurfaceId } from '@a2ui/runtime/react';
import { resolveChildren } from '@a2ui/runtime';
import type { CatalogComponentProps } from '../catalog.js';
import { useCatalog } from '../CatalogContext.js';
import { ResolvedComponent } from '../ComponentResolver.js';
import { cn } from '../utils.js';

const directionClass: Record<ListDirection, string> = {
  vertical: 'flex-col',
  horizontal: 'flex-row',
};

const alignClass: Record<CrossAxisAlignment, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

export function List({ props }: CatalogComponentProps<ListProps>) {
  const surfaceId = useSurfaceId();
  const surface = useSurface(surfaceId);
  const catalog = useCatalog();
  const items = resolveChildren(props.children, surface?.dataModel ?? {});
  const dir = props.direction ?? 'vertical';
  return (
    <div
      className={cn(
        'flex gap-3',
        directionClass[dir],
        alignClass[props.alignment ?? 'stretch'],
        dir === 'horizontal' ? 'overflow-x-auto' : '',
      )}
    >
      {items.map((it) => (
        <ResolvedComponent
          key={it.reactKey}
          componentId={it.componentId}
          catalog={catalog}
          scope={it.scope}
        />
      ))}
    </div>
  );
}
