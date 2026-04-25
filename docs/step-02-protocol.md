# Step 2 工作确认：实现 packages/protocol

> 完成时间: 2026-04-25
> 对应 TODO: Step 2 — packages/protocol，A2UI 0.8 协议 TypeScript 类型（手写实现）

---

## 一、本步实现了什么

按 A2UI 0.8 协议规范从零手写实现了 `@a2ui/protocol` 包，提供完整的 TypeScript 类型契约：

- 4 类**服务端→客户端**消息：`surfaceUpdate` / `dataModelUpdate` / `beginRendering` / `deleteSurface`
- 2 类**客户端→服务端**消息：`userAction` / `error`
- 4 类 BoundValue（字符串/数字/布尔/字符串数组），完整支持 `path`、`literal*`、以及二者并存的「初始化简写」
- 4 类 DataModel 条目（valueString/Number/Boolean/Map），`valueMap` 递归
- 18 个标准目录组件的 props 类型，并聚合为 `StandardComponent` discriminated union
- Catalog 协商相关类型（`A2UIClientCapabilities` / `A2UIServerCapabilities` / `CatalogDefinition`）
- 一组类型守卫（`isSurfaceUpdate` / `isStandardComponent` / `readStandardComponent` 等）

并配套 vitest 测试 9 个，全部通过。

## 二、关键设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 不引入 a2ui 三方包 | ✓ | 用户明确要求 protocol/runtime/components 自己手写实现 |
| 不用 codegen 直接由 schema 生成 | 改为手写 | json-schema-to-typescript 的产物不便 IDE 跳转、注释丢失；手写带中文 doc 注释更可读 |
| `ComponentInstance.component` 用 `Record<string, unknown>` | ✓ | 协议层允许任意 catalog 的组件，类型不能锁死成 StandardComponent；标准目录场景再用 `readStandardComponent` 收紧 |
| BoundValue 写成 `{ literalX } \| { path }` 而不是 `{ literalX?, path? }` | ✓ | 保留至少二选一的约束，同时通过两个分支的可选字段允许「path + literal 同存」的初始化简写场景 |
| `valueMap` 递归 | ✓ | 协议正文示例展示了嵌套，虽然官方 schema 顶层 valueMap 子项目前不允许再嵌套 valueMap，但留宽松类型与真实 LLM 输出兼容 |
| 18 个组件分 3 个子文件 | display / layout / input | 比一个大文件好读，比 18 个文件简洁 |
| 提供 `readStandardComponent` 工具 | ✓ | 协议把 component 设计为单键对象，运行时取键名是高频操作，单独提供一个工具避免到处 `Object.keys()[0]` |

## 三、文件清单

```
packages/protocol/
├── README.md
├── package.json                           # @a2ui/protocol，源码包
├── tsconfig.json                          # extends 根 base
├── vitest.config.ts
└── src/
    ├── index.ts                           # 统一导出 + A2UI_PROTOCOL_VERSION 常量
    ├── bound-value.ts                     # BoundString/Number/Boolean/StringArray
    ├── data-model.ts                      # DataEntry + DataModel 类型
    ├── messages.ts                        # 4 类服务端→客户端消息
    ├── events.ts                          # 2 类客户端→服务端消息
    ├── catalog.ts                         # CatalogDefinition + STANDARD_CATALOG_ID
    ├── guards.ts                          # 类型守卫
    ├── components/
    │   ├── index.ts                       # StandardComponent union + props map
    │   ├── common.ts                      # ChildrenSpec + ActionSpec
    │   ├── display.ts                     # Text/Image/Icon/Video/AudioPlayer
    │   ├── layout.ts                      # Row/Column/List/Card/Tabs/Divider/Modal
    │   └── input.ts                       # Button/CheckBox/TextField/DateTimeInput/MultipleChoice/Slider
    └── protocol.test.ts                   # 9 个 vitest 测试
```

源码加注释合计约 700 行。所有公共类型均带中文 doc comment + 协议规范链接。

## 四、验证

```bash
$ pnpm --filter @a2ui/protocol typecheck
> tsc --noEmit
✓ 通过

$ pnpm --filter @a2ui/protocol test
> vitest run
 RUN  v2.1.9 /Users/xiaohe/Desktop/a2ui/packages/protocol
 ✓ src/protocol.test.ts (9 tests) 3ms
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

测试覆盖：
1. 协议常量（版本号、catalog id）
2. 4 类服务端→客户端消息守卫
3. 2 类客户端→服务端消息守卫
4. ChildrenSpec 的 explicitList / template 守卫
5. 标准目录组件名识别
6. `isStandardComponent` 单键约束
7. `readStandardComponent` 元组返回
8. 完整构造一条来自规范 1.5 节的 user profile card surfaceUpdate

## 五、下一步

进入 **Step 3：实现 packages/runtime** —— 客户端运行时。重点：

1. JSONL 流解析器（基于 `ReadableStream` + `TextDecoder` + 行缓冲，支持 chunk 跨行）
2. JSON Pointer 路径读写工具
3. `applyDataModelUpdate` —— 把 `DataEntry[]` 增量合并到 `DataModel`
4. `resolveBoundValue` —— 处理 path / literal / 初始化简写 三种模式
5. `resolveChildren` —— 处理 explicitList / template + 模板内相对作用域
6. `SurfaceStore` —— 多 surface 并存的内存模型，事件订阅
7. `createA2UIClient` —— SSE 连接 + send + sendUserAction
8. React 适配：`A2UIProvider`、`useSurface`、`useDataValue`、`useUserAction`
9. 自检测试覆盖核心算法
