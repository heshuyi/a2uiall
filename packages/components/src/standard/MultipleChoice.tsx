import { useState } from 'react';
import type { MultipleChoiceProps } from '@a2ui/protocol';
import {
  useA2UIClient,
  useBoundString,
  useBoundStringArray,
  useSurfaceId,
} from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';
import { cn } from '../utils.js';

export function MultipleChoice({ props }: CatalogComponentProps<MultipleChoiceProps>) {
  const selections = useBoundStringArray(props.selections);
  const client = useA2UIClient();
  const surfaceId = useSurfaceId();
  const path = 'path' in props.selections ? props.selections.path : undefined;
  const variant = props.variant ?? 'checkbox';
  const max = props.maxAllowedSelections ?? Infinity;
  const [filter, setFilter] = useState('');

  const writeArray = (arr: string[]) => {
    if (!path) return;
    // 协议 dataModelUpdate 不支持 valueArray，
    // 这里把数组以 valueMap({"0":"x","1":"y"...}) 形式存储；
    // 读取侧 resolveBoundStringArray 已支持 map→array 自动转换。
    client.store.apply({
      dataModelUpdate: {
        surfaceId,
        path,
        contents: arr.map((v, i) => ({ key: String(i), valueString: v })),
      },
    });
  };

  const toggle = (val: string) => {
    const set = new Set(selections);
    if (set.has(val)) {
      set.delete(val);
    } else {
      if (set.size >= max) return;
      set.add(val);
    }
    writeArray(Array.from(set));
  };

  return (
    <div className="flex flex-col gap-2">
      {props.filterable ? (
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索…"
          className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
        />
      ) : null}
      <div className={cn(variant === 'chips' ? 'flex flex-wrap gap-2' : 'flex flex-col gap-1.5')}>
        {props.options
          .filter((o) => !filter || matchesFilter(o.label, filter))
          .map((o) => (
            <OptionItem
              key={o.value}
              option={o}
              selected={selections.includes(o.value)}
              variant={variant}
              onToggle={() => toggle(o.value)}
            />
          ))}
      </div>
    </div>
  );
}

function OptionItem({
  option,
  selected,
  variant,
  onToggle,
}: {
  option: MultipleChoiceProps['options'][number];
  selected: boolean;
  variant: 'checkbox' | 'chips';
  onToggle: () => void;
}) {
  const label = useBoundString(option.label) ?? option.value;
  if (variant === 'chips') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'rounded-full border px-3 py-1 text-sm transition-colors',
          selected
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50',
        )}
      >
        {label}
      </button>
    );
  }
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-neutral-800">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="h-4 w-4 rounded border-neutral-300 text-neutral-900"
      />
      <span>{label}</span>
    </label>
  );
}

function matchesFilter(
  bv: { literalString?: string; path?: string },
  q: string,
): boolean {
  if (!bv.literalString) return true;
  return bv.literalString.toLowerCase().includes(q.toLowerCase());
}
