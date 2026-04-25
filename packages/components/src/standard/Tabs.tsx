import { useState } from 'react';
import type { TabsProps } from '@a2ui/protocol';
import { useBoundString } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';
import { useCatalog } from '../CatalogContext.js';
import { ResolvedComponent } from '../ComponentResolver.js';
import { cn } from '../utils.js';

export function Tabs({ props }: CatalogComponentProps<TabsProps>) {
  const catalog = useCatalog();
  const [active, setActive] = useState(0);
  const items = props.tabItems ?? [];
  if (items.length === 0) return null;
  const cur = items[Math.min(active, items.length - 1)]!;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row gap-1 border-b border-neutral-200">
        {items.map((it, i) => (
          <TabHeader
            key={i}
            title={it}
            isActive={i === active}
            onSelect={() => setActive(i)}
          />
        ))}
      </div>
      <div>
        <ResolvedComponent componentId={cur.child} catalog={catalog} />
      </div>
    </div>
  );
}

function TabHeader({
  title,
  isActive,
  onSelect,
}: {
  title: TabsProps['tabItems'][number];
  isActive: boolean;
  onSelect: () => void;
}) {
  const text = useBoundString(title.title) ?? '';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'px-3 py-1.5 text-sm transition-colors -mb-px border-b-2',
        isActive
          ? 'border-neutral-900 text-neutral-900 font-medium'
          : 'border-transparent text-neutral-500 hover:text-neutral-700',
      )}
    >
      {text}
    </button>
  );
}
