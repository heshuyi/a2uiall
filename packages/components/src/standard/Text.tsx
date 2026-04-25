import type { TextProps } from '@a2ui/protocol';
import { useBoundString } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';
import { cn } from '../utils.js';

const usageHintClass: Record<NonNullable<TextProps['usageHint']>, string> = {
  h1: 'text-3xl font-bold leading-tight tracking-tight',
  h2: 'text-2xl font-bold leading-tight',
  h3: 'text-xl font-semibold leading-snug',
  h4: 'text-lg font-semibold',
  h5: 'text-base font-semibold',
  body: 'text-sm leading-relaxed text-neutral-800',
  caption: 'text-xs text-neutral-500',
};

export function Text({ props }: CatalogComponentProps<TextProps>) {
  const text = useBoundString(props.text);
  return (
    <span className={cn('whitespace-pre-wrap', usageHintClass[props.usageHint ?? 'body'])}>
      {text ?? ''}
    </span>
  );
}
