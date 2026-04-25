import type { DateTimeInputProps } from '@a2ui/protocol';
import { useBoundString, useDataWriter } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';

export function DateTimeInput({ props }: CatalogComponentProps<DateTimeInputProps>) {
  const value = useBoundString(props.value) ?? '';
  const write = useDataWriter();
  const path = 'path' in props.value ? props.value.path : undefined;

  const enableDate = props.enableDate ?? true;
  const enableTime = props.enableTime ?? false;

  const inputType =
    enableDate && enableTime ? 'datetime-local' : enableTime ? 'time' : 'date';

  return (
    <input
      type={inputType}
      value={value}
      onChange={(e) => {
        if (path) write(path, e.target.value);
      }}
      className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
    />
  );
}
