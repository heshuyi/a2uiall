import { createContext, useContext, type ReactNode } from 'react';

/**
 * SurfaceContext —— 渲染树内传递「当前所属 surfaceId」的轻量 context。
 * <A2UIRenderer surfaceId="..."> 会在内部用 SurfaceProvider 包裹根，
 * 这样所有内嵌 hook（useDataValue / useUserAction）无需重复传 surfaceId。
 */
const SurfaceContext = createContext<string | null>(null);

export interface SurfaceProviderProps {
  surfaceId: string;
  children: ReactNode;
}

export function SurfaceProvider({ surfaceId, children }: SurfaceProviderProps) {
  return <SurfaceContext.Provider value={surfaceId}>{children}</SurfaceContext.Provider>;
}

export function useSurfaceId(): string {
  const v = useContext(SurfaceContext);
  if (!v) throw new Error('[a2ui/runtime] useSurfaceId 必须在 <SurfaceProvider> 内使用');
  return v;
}
