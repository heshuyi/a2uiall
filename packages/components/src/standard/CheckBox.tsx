import type { CheckBoxProps } from '@a2ui/protocol';
import { useBoundBoolean, useBoundString, useDataWriter } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';

export function CheckBox({ props }: CatalogComponentProps<CheckBoxProps>) {
  const checked = useBoundBoolean(props.value) ?? false;
  const label = useBoundString(props.label) ?? '';
  const write = useDataWriter();
  const path = 'path' in props.value ? props.value.path : undefined;
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-neutral-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          if (path) write(path, e.target.checked);
        }}
        className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
      />
      <span>{label}</span>
    </label>
  );
}
