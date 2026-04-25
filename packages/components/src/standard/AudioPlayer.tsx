import type { AudioPlayerProps } from '@a2ui/protocol';
import { useBoundString } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';

export function AudioPlayer({ props }: CatalogComponentProps<AudioPlayerProps>) {
  const url = useBoundString(props.url);
  const desc = useBoundString(props.description);
  if (!url) return null;
  return (
    <div className="flex flex-col gap-1 rounded-md bg-neutral-50 px-3 py-2 border border-neutral-200">
      {desc ? <span className="text-xs text-neutral-600">{desc}</span> : null}
      <audio controls src={url} className="w-full" />
    </div>
  );
}
