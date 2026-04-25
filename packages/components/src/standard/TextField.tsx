import type { TextFieldProps } from '@a2ui/protocol';
import { useBoundString, useDataWriter } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';
import { cn } from '../utils.js';

const typeMap: Record<NonNullable<TextFieldProps['textFieldType']>, string> = {
  date: 'date',
  longText: 'textarea',
  number: 'number',
  shortText: 'text',
  obscured: 'password',
};

export function TextField({ props }: CatalogComponentProps<TextFieldProps>) {
  const value = useBoundString(props.text) ?? '';
  const label = useBoundString(props.label) ?? '';
  const write = useDataWriter();
  const path = props.text && 'path' in props.text ? props.text.path : undefined;
  const fieldType = typeMap[props.textFieldType ?? 'shortText'];

  const onChange = (v: string) => {
    if (!path) return;
    if (fieldType === 'number') {
      const n = Number(v);
      if (Number.isFinite(n)) write(path, n);
    } else {
      write(path, v);
    }
  };

  const inputCls = cn(
    'w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-neutral-400',
  );

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-700">{label}</span>
      {fieldType === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={inputCls}
        />
      ) : (
        <input
          type={fieldType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern={props.validationRegexp}
          className={inputCls}
        />
      )}
    </label>
  );
}
