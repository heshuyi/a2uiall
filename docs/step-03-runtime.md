# Step 3 工作确认：实现 packages/runtime

> 完成时间: 2026-04-25
> 对应 TODO: Step 3 — packages/runtime，A2UI 客户端运行时（手写实现）

---

## 一、本步实现了什么

完整实现了 A2UI 0.8 客户端协议运行时 `@a2ui/runtime`：

1. **流解析器**（`parser.ts`）
   - `createLineSplitter()`：处理跨 chunk 行边界
   - `parseJSONLStream<T>()`：把 `ReadableStream<Uint8Array>` 按行 JSON.parse
   - `parseSSEStream<T>()`：按 SSE 规范处理 `data:` 行 + 空行分隔事件 + 注释行 + `[DONE]`

2. **数据模型**（`path.ts` + `data-model.ts`）
   - JSON Pointer 风格路径读写，兼容 `"/user/name"` 与 `"user"` 两种形式
   - `applyDataModelUpdate(model, update)`：按协议 4.1 节语义实现
     - path 为空/`/` → 整体替换
     - path 指向某节点 → 浅合并（已有键保留，新键覆盖）
     - 不修改原对象，返回新对象
   - `writePathImmutable(model, path, value)`：单值写入，沿途自动建对象

3. **BoundValue 求值**（`bound-value.ts`）
   - 优先按 path 查 dataModel；查到（含 false / 0 / 空字符串）即返回
   - 找不到再回退到 `literal*`
   - `getBoundValueInit()`：识别「path + literal* 同存且 path 处空」的初始化简写场景，返回需写回的 init 任务（不在解析时直接产生副作用，由 hook 在 mount 时统一应用）
   - 支持 scope 相对路径（template 内部场景）：先按绝对路径查，再按 scope 拼接相对路径查

4. **子元素展开**（`children.ts`）
   - `resolveChildren()`：explicitList → 直接展开；template → 取 dataBinding 指向的 map，对每个 key 复用同一 componentId，并附带本项 scope 路径与 React key

5. **SurfaceStore**（`store.ts`）
   - 多 surfaceId 并存，每个 surface 自带 components / dataModel / rootId / catalogId / styles / isReady / version
   - `apply(msg)` 单条消息分发，`applyMany(iter)` 批量
   - 订阅 API：按 surfaceId 订阅、全局订阅
   - `writeData(surfaceId, path, value)`：直写 dataModel（用于 BoundValue 初始化简写、输入组件双向绑定）
   - 每次状态变更产生新对象引用 + 单调递增 version，配合 React `useSyncExternalStore` 安全

6. **A2UIClient**（`client.ts`）
   - `createA2UIClient({ endpoint, fetchImpl?, defaultCapabilities?, onError? })`
   - `chat()`：POST `/chat`，建立 SSE 流，把消息喂入 store
   - `sendUserAction(sessionId, action)`：POST `/action`，附带 ISO 时间戳，同样消费返回 SSE
   - 支持 `AbortController` 中止

7. **React 适配**（`react/`）
   - `<A2UIProvider client={...}>`：注入 client
   - `<SurfaceProvider surfaceId={...}>`：渲染树内传播 surfaceId
   - `<ScopeProvider scope={...}>`：模板作用域
   - `useA2UIClient()` / `useSurfaceId()` / `useScope()`
   - `useSurface(id)`：基于 `useSyncExternalStore` 的安全订阅
   - `useBoundString` / `useBoundNumber` / `useBoundBoolean` / `useBoundStringArray` / `useResolvedBoundValue`
     - 内部自动处理 BoundValue 初始化简写（mount 时一次性写入）
   - `useDataWriter()`：返回 `(path, value) => void` 写回 store
   - `useUserActionDispatcher()`：解析 action.context 中的 BoundValue → 调 client.sendUserAction

## 二、关键设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 不依赖任何 a2ui 三方包 | ✓ | 用户明确要求 |
| 同时支持 JSONL 与 SSE 两种流 | ✓ | A2UI 协议语义是 JSONL，但实际传输几乎都是 SSE 包裹；两种工具都给到，灵活 |
| BoundValue 初始化简写不在解析时产生副作用 | ✓ | 否则每次重渲染都会用 literal 覆盖用户输入，把双向绑定打废 |
| 用 `useSyncExternalStore` 而非自己 setState | ✓ | React 18 官方推荐做法，避免 tearing |
| Store 每次变更产生**新引用** + version 字段 | ✓ | 确保 useSyncExternalStore 的 getSnapshot 能正确判定变化 |
| `runtime` 不强依赖 React | ✓ | React 写在 `peerDependenciesMeta.optional`；核心 store / parser 可在 Node 用 |
| 模板 scope 先绝对再相对 | ✓ | 两种写法兼容，对 LLM 输出更友好 |
| 不实现 ListChildren 数据数组 | 设计为 map 形式 | 协议 schema 没有 valueList，dataBinding 也是「指向 map，values 为 children」 |

## 三、文件清单

```
packages/runtime/
├── README.md
├── package.json                         @a2ui/runtime
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts                         核心导出
    ├── path.ts                          路径工具
    ├── data-model.ts                    DataEntry / applyDataModelUpdate
    ├── bound-value.ts                   BoundValue 解析 + init
    ├── children.ts                      explicitList / template 展开
    ├── parser.ts                        JSONL + SSE 流解析
    ├── store.ts                         SurfaceStore
    ├── client.ts                        createA2UIClient
    ├── react/
    │   ├── index.ts                     React 子入口（@a2ui/runtime/react）
    │   ├── A2UIProvider.tsx
    │   ├── SurfaceContext.tsx
    │   ├── ScopeContext.tsx
    │   ├── useSurface.ts
    │   ├── useDataValue.ts              （含 useBoundString/Number/Boolean/Array、useDataWriter）
    │   └── useUserAction.ts
    ├── path.test.ts                     6 个测试
    ├── data-model.test.ts               7 个测试
    ├── bound-value.test.ts              12 个测试
    ├── children.test.ts                 3 个测试
    ├── parser.test.ts                   6 个测试
    └── store.test.ts                    4 个测试
```

## 四、验证

```bash
$ pnpm --filter @a2ui/runtime typecheck
> tsc --noEmit
✓ 通过

$ pnpm --filter @a2ui/runtime test
 RUN  v2.1.9 /Users/xiaohe/Desktop/a2ui/packages/runtime
 ✓ src/bound-value.test.ts (12 tests) 3ms
 ✓ src/data-model.test.ts (7 tests) 3ms
 ✓ src/path.test.ts (6 tests) 3ms
 ✓ src/parser.test.ts (6 tests) 9ms
 ✓ src/children.test.ts (3 tests) 2ms
 ✓ src/store.test.ts (4 tests) 2ms
 Test Files  6 passed (6)
      Tests  38 passed (38)
```

亮点测试覆盖：
- SSE 多 chunk 中跨行 `data:` 拼接
- 协议 1.5 节官方 user profile card 示例完整 stream → SurfaceStore 还原
- BoundValue 初始化简写不污染已存在数据
- 模板 scope 相对路径正确解析

## 五、下一步

进入 **Step 4：实现 packages/components** —— 18 个标准组件 + Renderer + Catalog 机制。

- `Catalog` 类型与 `mergeCatalogs`
- `<A2UIRenderer surfaceId catalogs />`：递归渲染入口
- `<ComponentResolver instance />`：单组件按 type 分发
- 18 个标准组件 React 实现，全部用 Tailwind + shadcn 风格
- 验证：把官方 Profile Card 示例 stream 渲染到一张可见的卡片
