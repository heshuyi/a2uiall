import type { CardProps } from '@a2ui/protocol';
import type { CatalogComponentProps } from '../catalog.js';
import { useCatalog } from '../CatalogContext.js';
import { ResolvedComponent } from '../ComponentResolver.js';

export function Card({ props }: CatalogComponentProps<CardProps>) {
  const catalog = useCatalog();
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <ResolvedComponent componentId={props.child} catalog={catalog} />
    </div>
  );
}
