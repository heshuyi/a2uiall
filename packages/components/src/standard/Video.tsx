import type { VideoProps } from '@a2ui/protocol';
import { useBoundString } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';

export function Video({ props }: CatalogComponentProps<VideoProps>) {
  const url = useBoundString(props.url);
  if (!url) return null;
  return (
    <video
      controls
      className="w-full rounded-lg bg-black"
      src={url}
    />
  );
}
