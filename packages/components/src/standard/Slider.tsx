import type { SliderProps } from '@a2ui/protocol';
import { useBoundNumber, useBoundString, useDataWriter } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';

export function Slider({ props }: CatalogComponentProps<SliderProps>) {
  const value = useBoundNumber(props.value) ?? props.minValue ?? 0;
  const label = useBoundString(props.label);
  const write = useDataWriter();
  const path = 'path' in props.value ? props.value.path : undefined;
  const min = props.minValue ?? 0;
  const max = props.maxValue ?? 100;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span>{label ?? ''}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          if (path) write(path, Number(e.target.value));
        }}
        className="w-full accent-neutral-900"
      />
    </div>
  );
}
