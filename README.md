# a2ui-chat

> 基于 [A2UI 0.8 协议](https://a2ui.org/specification/v0.8-a2ui/) 的中文 AI 对话应用 —— 类 Gemini 的「问答对」列表界面：
> 用户提问 → AI Agent 通过 A2UI 协议流式返回 **UI 组件描述** → 前端运行时实时渲染为富交互卡片

**约束**：本项目所有 A2UI 协议相关代码（`@a2ui/protocol` / `@a2ui/runtime` / `@a2ui/components`）都按官方规范**从零手写**实现，**不依赖任何 a2ui 第三方 npm 包**。

---

## 它能做什么

传统的 LLM 聊天只能输出 markdown 文字，需要前端写死的卡片模板才能渲染富 UI。
**A2UI** 让 LLM 直接输出**结构化的 UI 描述（adjacency-list 形式的组件树 + 数据模型）**，前端有一个**通用渲染引擎**就能把任何 UI 渲出来 —— 包括复杂的表单、列表、嵌套布局，并能监听用户回写、按钮点击，再把这些事件回流给 Agent 进入下一轮对话。

```
你：列一个三天的旅行计划
↓
Agent: { surfaceUpdate { Card → Column → [Text, List(template)] } }
       { dataModelUpdate { /days: [d1,d2,d3] } }
       { beginRendering { root: "root" } }
↓
前端：渲染出一张含 3 个可滚动 day 项的卡片
```

```
你（在表单里）填好后点提交
↓
前端：解析 BoundValue 拿到 { name, email, age }，POST /api/action
↓
Agent: 收到 action context，输出新的「提交成功」surface
↓
前端：在下一轮渲染新卡片
```

---

## 架构

```
┌──────────────────┐    SSE (A2UI JSONL)    ┌──────────────────┐
│  apps/web        │ ◄──────────────────────│  apps/server     │
│  (Vite + React)  │                        │  (Express + TS)  │
│                  │                        │                  │
│ ┌──────────────┐ │   userAction (JSON)    │ ┌──────────────┐ │
│ │ A2UIRenderer │─┼───────────────────────►│ │ Gemini Agent │ │
│ └──────┬───────┘ │                        │ └──────────────┘ │
│   uses │         │                        │                  │
│ ┌──────▼───────┐ │                        │ Storage:         │
│ │ @a2ui/       │ │                        │  memory / sqlite │
│ │ runtime      │ │                        │                  │
│ │ components   │ │                        │ Mock 模式：      │
│ │ protocol     │ │                        │  无 KEY 时启用   │
│ └──────────────┘ │                        │                  │
└──────────────────┘                        └──────────────────┘
```

### Monorepo 布局

```
a2ui-chat/
├── apps/
│   ├── web/                  Vite + React 前端壳子（会话列表 + 渲染区）
│   └── server/               Express + Gemini 后端 Agent
└── packages/
    ├── protocol/             @a2ui/protocol  — A2UI 0.8 协议 TS 类型（手写）
    ├── runtime/              @a2ui/runtime   — 客户端运行时（JSONL parser + SurfaceStore + DataModel + BoundValue + React hooks）
    └── components/           @a2ui/components — 18 个标准目录 React 组件 + Renderer + Catalog 机制
```

每个包都有自己的 README 和 `docs/step-NN-*.md` 工作确认文档。

---

## 快速开始

### 环境要求
- Node.js ≥ 20
- pnpm 10.x（仓库锁定 `10.33.0`）

### 1. 安装

```bash
pnpm install
```

### 2. 配置后端

```bash
cp apps/server/.env.example apps/server/.env
```

编辑 `apps/server/.env`：
- 填入 `GEMINI_API_KEY` 接入真实 Gemini
- **或留空** → 自动启用 **MOCK 模式**（写死的 4 套演示场景，零依赖联调）

### 3. 启动

```bash
pnpm dev
# turbo 会同时启动 server (8787) 和 web (5173)
```

打开 [http://localhost:5173](http://localhost:5173)。

### 4. 体验

不需要 GEMINI_API_KEY 也能立刻试。在输入框试试：
- `卡片` —— 头像 + 名片 + 数据绑定演示
- `列表` —— 模板渲染 + CheckBox 输入回写
- `表单` —— TextField + Slider + Button.action（提交后会回灌一轮）
- 任意其他文字 —— 默认场景

---

## 各个包

| 包 | 简介 | README |
|---|---|---|
| `@a2ui/protocol` | A2UI 0.8 协议 TypeScript 类型 + 类型守卫 | [README](./packages/protocol/README.md) |
| `@a2ui/runtime` | JSONL/SSE 解析、SurfaceStore、DataModel/BoundValue、React hooks | [README](./packages/runtime/README.md) |
| `@a2ui/components` | 18 个标准目录 React 组件 + `<A2UIRenderer>` + Catalog 注册 | [README](./packages/components/README.md) |
| `@a2ui/server` | Express + Gemini agent + SSE，含 mock 模式 | [README](./apps/server/README.md) |
| `@a2ui/web` | Vite + React + Tailwind + Zustand 演示前端 | [README](./apps/web/README.md) |

---

## 命令速查

```bash
pnpm dev                              # 同时启动 server + web
pnpm build                            # 构建所有包
pnpm typecheck                        # 全量类型检查
pnpm test                             # 跑测试（protocol + runtime 共 47 个）

# 单包
pnpm --filter @a2ui/server dev
pnpm --filter @a2ui/web dev
pnpm --filter @a2ui/protocol test
pnpm --filter @a2ui/runtime test

# 健康检查（server 启动后）
curl http://localhost:8787/api/health
# → {"ok":true,"mock":true,"model":"gemini-2.5-flash","storage":"memory"}
```

---

## 实现要点

### protocol 层

- 4 种服务端→客户端消息（`surfaceUpdate` / `dataModelUpdate` / `beginRendering` / `deleteSurface`）
- 2 种客户端→服务端消息（`userAction` / `error`）
- 18 个标准组件 props 类型（精确 BoundValue + ChildrenSpec + ActionSpec）
- DataModel 设计为**递归可嵌套**的 `valueMap`（更容忍真实 LLM 输出）
- BoundValue 支持**初始化简写**（path + literal* 同时存在 → 第一次渲染写入数据模型）
- 9 个测试覆盖类型守卫与 1.5 节示例的可解构性

### runtime 层

- **SurfaceStore**：多 surface 内存模型，immutable 更新 + 版本号；`useSyncExternalStore` 兼容
- **JSONL/SSE parser**：跨 chunk 安全 + 多行 `data:` 字段 + 注释行 + `[DONE]` 终止
- **resolveBoundValue**：path 优先于 literal；`getBoundValueInit` 单独负责识别初始化场景
- **resolveChildren**：explicitList 直接展开；template 模式按 dataBinding 迭代 map 并下发 scope
- **React hooks**：`useBoundString/Number/Boolean/Array`、`useDataWriter`、`useUserActionDispatcher`，全部从 store 订阅
- 38 个测试覆盖 path/dataModel/boundValue/children/parser/store

### components 层

- **Catalog 注册机制**：`defineCatalog` + `mergeCatalogs` + `selectCatalog`；通过 `<CatalogProvider>` 注入
- **ResolvedComponent**：单组件分发器；类型缺失/未注册时显示带说明的占位（不白屏）
- **A2UIRenderer**：等待 `isReady`（即 beginRendering 到达）后才渲染；按 surface.catalogId 选用 catalog
- **18 个标准组件**：Tailwind 类名风格，遵循 shadcn/ui 视觉语言
- MultipleChoice 用 `valueMap({"0","1"…})` 把数组兼容协议（runtime 已自动反序列化）

### server 层

- Express + zod 校验 + cors + SSE
- **Agent 抽象**：`AgentRunner.run(input) → AsyncIterable<ServerToClientMessage>`
- **MockAgentRunner**：4 场景（plain / card / list / form），关键词触发
- **GeminiAgentRunner**：`@google/genai` + `responseMimeType=application/json` + 强中文系统提示词 + 1 个 few-shot
- **韧性兜底**：解析失败展示错误卡片；缺 beginRendering 时自动从 surfaceUpdate 推断 root 补一个
- 持久化：memory / sqlite 同接口，惰性加载 sqlite 依赖
- 视觉伪流式：消息间 30~40ms 延迟，让卡片逐张冒出

### web 层

- Vite + React + Tailwind + Zustand + localStorage 持久化
- **A2UIWebClient extends A2UIClient**：复用父类 store，重写 `sendUserAction` 走 apps/server 契约
- **每个 turn 独占一个 surfaceId**（`msg-<turnId>`），切换会话时持久化的 agentMessages 用 `applyMany` 重放回 store
- 流式中可中止（AbortController）；中文输入法 `isComposing` 兼容
- 错误兜底：后端断连时显示 banner 而非崩溃

---

## 已知限制 & 下一步

- Gemini 真实接入仅做了 prompt 设计 + 韧性兜底，未在大量真实 prompt 上调优；建议用真实 KEY 跑一段时间观察输出质量再迭代提示词
- 协议未原生支持 `valueArray`，本仓库用 `valueMap({"0","1"…})` 兼容（已在 runtime 自动解析）
- Modal 的 entryPointChild 当前用 wrapper 拦截点击实现（协议没定义打开通道）
- 未实现 A2A 模式（Agent2Agent），如需扩展可在 protocol 层补充
- 测试只覆盖核心库，apps 端没有自动化测试（仅 manual e2e）

---

## 开发文档

| 文档 | 内容 |
|---|---|
| [TODO.md](./TODO.md) | 任务清单 + 完成进度 |
| [docs/step-01-init-monorepo.md](./docs/step-01-init-monorepo.md) | 初始化 monorepo 骨架 |
| [docs/step-02-protocol.md](./docs/step-02-protocol.md) | 实现 `@a2ui/protocol` |
| [docs/step-03-runtime.md](./docs/step-03-runtime.md) | 实现 `@a2ui/runtime` |
| [docs/step-04-components.md](./docs/step-04-components.md) | 实现 `@a2ui/components` |
| [docs/step-05-server.md](./docs/step-05-server.md) | 实现 `apps/server` |
| [docs/step-06-web.md](./docs/step-06-web.md) | 实现 `apps/web` |

---

## 参考

- [A2UI 0.8 规范](https://a2ui.org/specification/v0.8-a2ui/)
- [server_to_client schema](https://a2ui.org/specification/v0_8/server_to_client.json)
- [client_to_server schema](https://a2ui.org/specification/v0_8/client_to_server.json)
- [标准目录定义](https://a2ui.org/specification/v0_8/standard_catalog_definition.json)

## License

Apache-2.0
