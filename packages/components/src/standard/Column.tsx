import type { ColumnDistribution, ColumnProps, CrossAxisAlignment } from '@a2ui/protocol';
import { useSurface, useSurfaceId } from '@a2ui/runtime/react';
import { resolveChildren } from '@a2ui/runtime';
import type { CatalogComponentProps } from '../catalog.js';
import { useCatalog } from '../CatalogContext.js';
import { ResolvedComponent } from '../ComponentResolver.js';
import { cn } from '../utils.js';

const distClass: Record<ColumnDistribution, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  spaceAround: 'justify-around',
  spaceBetween: 'justify-between',
  spaceEvenly: 'justify-evenly',
};

const alignClass: Record<CrossAxisAlignment, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

export function Column({ props }: CatalogComponentProps<ColumnProps>) {
  const surfaceId = useSurfaceId();
  const surface = useSurface(surfaceId);
  const catalog = useCatalog();
  const items = resolveChildren(props.children, surface?.dataModel ?? {});
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        distClass[props.distribution ?? 'start'],
        alignClass[props.alignment ?? 'stretch'],
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
