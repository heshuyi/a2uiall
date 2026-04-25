import type { DividerProps } from '@a2ui/protocol';
import type { CatalogComponentProps } from '../catalog.js';
import { cn } from '../utils.js';

export function Divider({ props }: CatalogComponentProps<DividerProps>) {
  const axis = props.axis ?? 'horizontal';
  return (
    <div
      role="separator"
      className={cn(
        'bg-neutral-200',
        axis === 'horizontal' ? 'h-px w-full my-2' : 'w-px h-full mx-2',
      )}
    />
  );
}
