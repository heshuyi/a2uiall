import type { CrossAxisAlignment, RowDistribution, RowProps } from '@a2ui/protocol';
import { useSurface, useSurfaceId } from '@a2ui/runtime/react';
import { resolveChildren } from '@a2ui/runtime';
import type { CatalogComponentProps } from '../catalog.js';
import { useCatalog } from '../CatalogContext.js';
import { ResolvedComponent } from '../ComponentResolver.js';
import { cn } from '../utils.js';

const distClass: Record<RowDistribution, string> = {
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

export function Row({ props }: CatalogComponentProps<RowProps>) {
  const surfaceId = useSurfaceId();
  const surface = useSurface(surfaceId);
  const catalog = useCatalog();
  const items = resolveChildren(props.children, surface?.dataModel ?? {});
  return (
    <div
      className={cn(
        'flex flex-row gap-2',
        distClass[props.distribution ?? 'start'],
        alignClass[props.alignment ?? 'center'],
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
