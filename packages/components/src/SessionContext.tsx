import { createContext, useContext, type ReactNode } from 'react';

/**
 * SessionContext —— 把当前 sessionId 透传给输入组件，让它们 dispatch userAction 时能带上。
 * 由前端壳子（apps/web）在外层注入。
 */
const SessionContext = createContext<string | null>(null);

export interface SessionProviderProps {
  sessionId: string;
  children: ReactNode;
}

export function SessionProvider({ sessionId, children }: SessionProviderProps) {
  return <SessionContext.Provider value={sessionId}>{children}</SessionContext.Provider>;
}

export function useSessionId(): string {
  const v = useContext(SessionContext);
  if (!v) throw new Error('[a2ui/components] useSessionId 必须在 <SessionProvider> 内使用');
  return v;
}
