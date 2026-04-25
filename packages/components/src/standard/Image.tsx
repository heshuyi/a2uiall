import type { ImageProps } from '@a2ui/protocol';
import { useBoundString } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';
import { cn } from '../utils.js';

const usageHintClass: Record<NonNullable<ImageProps['usageHint']>, string> = {
  icon: 'w-5 h-5',
  avatar: 'w-10 h-10 rounded-full',
  smallFeature: 'w-24 h-24 rounded-md',
  mediumFeature: 'w-48 h-48 rounded-lg',
  largeFeature: 'w-80 h-80 rounded-lg',
  header: 'w-full h-48 rounded-none',
};

const fitClass: Record<NonNullable<ImageProps['fit']>, string> = {
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

export function Image({ props }: CatalogComponentProps<ImageProps>) {
  const url = useBoundString(props.url);
  const altText = useBoundString(props.altText) ?? '';
  if (!url) return null;
  return (
    <img
      src={url}
      alt={altText}
      className={cn(
        usageHintClass[props.usageHint ?? 'mediumFeature'],
        fitClass[props.fit ?? 'cover'],
        'bg-neutral-100',
      )}
    />
  );
}
