import { createContext, useContext, type ReactNode } from 'react';
import type { ReactCatalog } from './catalog.js';

const CatalogContext = createContext<ReactCatalog | null>(null);

export interface CatalogProviderProps {
  catalog: ReactCatalog;
  children: ReactNode;
}

export function CatalogProvider({ catalog, children }: CatalogProviderProps) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): ReactCatalog {
  const c = useContext(CatalogContext);
  if (!c) throw new Error('[a2ui/components] useCatalog 必须在 <CatalogProvider> 内使用（一般由 <A2UIRenderer> 自动注入）');
  return c;
}
