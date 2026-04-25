# @a2ui/runtime

A2UI 0.8 客户端运行时，**完全自实现**，不依赖任何已有 a2ui 三方包。

## 模块

| 模块 | 文件 | 作用 |
|---|---|---|
| 路径工具 | `src/path.ts` | JSON Pointer 风格路径读写、scope 相对路径 |
| 数据模型 | `src/data-model.ts` | DataEntry → 对象、`applyDataModelUpdate` 增量合并 |
| 绑定值 | `src/bound-value.ts` | `resolveBoundValue` / `getBoundValueInit` |
| 子元素 | `src/children.ts` | `resolveChildren`：explicitList / template |
| 流解析 | `src/parser.ts` | JSONL 与 SSE 流（chunk 跨行安全） |
| 内存模型 | `src/store.ts` | `SurfaceStore`：多 surface 状态 + 订阅 |
| 客户端 | `src/client.ts` | `createA2UIClient`：fetch + SSE + store 缝合 |
| React 适配 | `src/react/` | `A2UIProvider` / `useSurface` / `useDataValue` 等 |

## React 入口

```ts
import { A2UIProvider, useSurface, useBoundString, useUserActionDispatcher } from '@a2ui/runtime/react';
```

## 命令

```bash
pnpm --filter @a2ui/runtime typecheck
pnpm --filter @a2ui/runtime test
```
