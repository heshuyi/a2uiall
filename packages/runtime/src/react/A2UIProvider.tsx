import { createContext, useContext, type ReactNode } from 'react';
import type { A2UIClient } from '../client.js';

const A2UIContext = createContext<A2UIClient | null>(null);

export interface A2UIProviderProps {
  client: A2UIClient;
  children: ReactNode;
}

export function A2UIProvider({ client, children }: A2UIProviderProps) {
  return <A2UIContext.Provider value={client}>{children}</A2UIContext.Provider>;
}

export function useA2UIClient(): A2UIClient {
  const c = useContext(A2UIContext);
  if (!c) throw new Error('[a2ui/runtime] useA2UIClient 必须在 <A2UIProvider> 内使用');
  return c;
}
