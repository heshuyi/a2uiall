import { createContext, useContext, type ReactNode } from 'react';

/**
 * 模板作用域 Context。
 *
 * 当父 Row/Column/List 处于 template 模式时，会用 ScopeProvider 给每个迭代项
 * 注入它在 dataModel 中的路径（例如 `/items/abc`）。
 * 内部组件的 BoundValue 解析时优先按绝对路径查，查不到再按相对此 scope 查。
 */
const ScopeContext = createContext<string | undefined>(undefined);

export interface ScopeProviderProps {
  scope: string | undefined;
  children: ReactNode;
}

export function ScopeProvider({ scope, children }: ScopeProviderProps) {
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

export function useScope(): string | undefined {
  return useContext(ScopeContext);
}
