import type { ButtonProps } from '@a2ui/protocol';
import { useUserActionDispatcher } from '@a2ui/runtime/react';
import type { CatalogComponentProps } from '../catalog.js';
import { useCatalog } from '../CatalogContext.js';
import { useSessionId } from '../SessionContext.js';
import { ResolvedComponent } from '../ComponentResolver.js';
import { cn } from '../utils.js';

export function Button({ _instanceId, props }: CatalogComponentProps<ButtonProps>) {
  const catalog = useCatalog();
  const dispatch = useUserActionDispatcher();
  const sessionId = useSessionId();
  return (
    <button
      type="button"
      onClick={() =>
        dispatch({ sourceComponentId: _instanceId, action: props.action, sessionId })
      }
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        props.primary
          ? 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-700'
          : 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50',
      )}
    >
      <ResolvedComponent componentId={props.child} catalog={catalog} />
    </button>
  );
}
