# @a2ui/protocol

A2UI 0.8 协议的 TypeScript 类型定义。**完全按官方协议规范从零手写实现**，不依赖任何已有的 a2ui 三方包，仅作为类型契约供 `@a2ui/runtime`、`@a2ui/components`、`apps/server` 共用。

## 协议参考

- 规范文档：https://a2ui.org/specification/v0.8-a2ui/
- 标准目录：https://a2ui.org/specification/v0_8/standard_catalog_definition.json
- 服务端→客户端 schema：https://a2ui.org/specification/v0_8/server_to_client.json
- 客户端→服务端 schema：https://a2ui.org/specification/v0_8/client_to_server.json

## 模块组织

| 文件 | 内容 |
|---|---|
| `bound-value.ts` | `BoundString` / `BoundNumber` / `BoundBoolean` / `BoundStringArray` —— 数据绑定值类型 |
| `data-model.ts` | `DataEntry` / `DataModel` —— 数据模型与邻接列表条目 |
| `messages.ts` | 4 类服务端→客户端消息（surfaceUpdate / dataModelUpdate / beginRendering / deleteSurface） |
| `events.ts` | 2 类客户端→服务端消息（userAction / error） |
| `catalog.ts` | `CatalogDefinition` 与 `STANDARD_CATALOG_ID` 常量 |
| `components/common.ts` | `ChildrenSpec` / `ActionSpec` 等通用结构 |
| `components/display.ts` | Text · Image · Icon · Video · AudioPlayer |
| `components/layout.ts` | Row · Column · List · Card · Tabs · Divider · Modal |
| `components/input.ts` | Button · CheckBox · TextField · DateTimeInput · MultipleChoice · Slider |
| `components/index.ts` | `StandardComponent` 联合类型与 props 映射 |
| `guards.ts` | 类型守卫 `isSurfaceUpdate` / `isStandardComponent` 等 |

## 命令

```bash
pnpm --filter @a2ui/protocol typecheck
pnpm --filter @a2ui/protocol test
```
