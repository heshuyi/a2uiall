# a2ui-chat 任务清单

> 基于 [A2UI 0.8 协议](https://a2ui.org/specification/v0.8-a2ui/) 的中文 AI 对话应用
> 前端 React monorepo + 后端 TypeScript Gemini Agent
>
> **重要约束：所有 A2UI 协议相关代码（protocol/runtime/components）都必须自己手写实现，不依赖任何已有的 a2ui npm 包，仅参考官方协议规范**

---

## 项目最终决策

| 项 | 选择 |
|---|---|
| 包管理 | pnpm 9 + workspaces |
| 任务编排 | Turborepo |
| 前端构建 | Vite + React 18 + TS 5 |
| UI 样式 | Tailwind CSS + shadcn/ui 风格 |
| 状态管理 | Zustand |
| 后端框架 | Express + TS |
| AI SDK | @google/genai |
| Gemini 模型 | gemini-2.5-flash |
| 持久化 | 前端 localStorage + 后端可选 SQLite (better-sqlite3) |
| 组件目录 | 标准目录 + 自定义扩展机制 |
| A2A 协议 | 最简实现 (HTTP + SSE，不引入完整 A2A) |
| 界面语言 | 中文 |
| 应用形态 | 类 Gemini 的「问答对」列表（用户气泡 + AI 卡片，按时间往下叠） |

---

## 仓库目标结构

```
a2ui-chat/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .prettierrc / .eslintrc.cjs / .gitignore
├── README.md
├── TODO.md                      ← 当前文件
├── docs/                        ← 每完成一步生成的工作确认文档
│   ├── step-01-init-monorepo.md
│   ├── step-02-protocol.md
│   ├── step-03-runtime.md
│   ├── step-04-components.md
│   ├── step-05-server.md
│   ├── step-06-web-shell.md
│   └── step-07-final-integration.md
├── apps/
│   ├── web/                     ← 前端壳子
│   └── server/                  ← 后端 Gemini Agent
└── packages/
    ├── protocol/                ← @a2ui/protocol  - 协议类型 (前后端共用)
    ├── runtime/                 ← @a2ui/runtime   - 客户端协议运行时
    └── components/              ← @a2ui/components - React 组件库
```

---

## 任务列表

### Step 1: 初始化 monorepo 骨架 ✅

**输出文档**: [docs/step-01-init-monorepo.md](./docs/step-01-init-monorepo.md)

- [x] 1.1 创建仓库根 `package.json`，声明 workspaces 与统一脚本（dev/build/lint/typecheck）
- [x] 1.2 创建 `pnpm-workspace.yaml`
- [x] 1.3 创建 `turbo.json`：定义 `dev` `build` `lint` `typecheck` 任务管道
- [x] 1.4 创建 `tsconfig.base.json`：strict、moduleResolution Bundler、ES2022
- [x] 1.5 创建 `.gitignore` `.prettierrc` `.editorconfig` `.npmrc`
- [x] 1.6 创建 `apps/` `packages/` `docs/` 空目录结构
- [x] 1.7 写一个简单的根 `README.md`（中文，说明项目）

**验收**: ✅ `pnpm install` 通过，turbo/typescript/prettier 已就绪

---

### Step 2: packages/protocol — 手写 A2UI 0.8 协议类型 ✅

**输出文档**: [docs/step-02-protocol.md](./docs/step-02-protocol.md)

> 完全照协议规范手写 TS 类型，不引用任何 a2ui 包；类型定义即文档。

- [x] 2.1 `package.json` (`@a2ui/protocol`)
- [x] 2.2 `src/messages.ts`：服务端→客户端 4 种消息
- [x] 2.3 `src/events.ts`：客户端→服务端消息
- [x] 2.4 `src/bound-value.ts`：BoundString / BoundNumber / BoundBoolean / BoundStringArray
- [x] 2.5 `src/data-model.ts`：DataEntry 递归类型
- [x] 2.6 `src/components/`：18 个组件 props + StandardComponent union（拆 display/layout/input/common）
- [x] 2.7 `src/catalog.ts`：CatalogDefinition + `STANDARD_CATALOG_ID` 常量
- [x] 2.8 `src/index.ts` 统一导出
- [x] 2.9 自检测试 9 个全部通过

**验收**: ✅ typecheck 通过，9 个测试通过

---

### Step 3: packages/runtime — A2UI 客户端运行时 ✅

**输出文档**: [docs/step-03-runtime.md](./docs/step-03-runtime.md)

- [x] 3.1 `package.json` (`@a2ui/runtime`)，依赖 `@a2ui/protocol` workspace
- [x] 3.2 `src/parser.ts`：JSONL + SSE 流解析（chunk 跨行安全）
- [x] 3.3 `src/path.ts` + `src/data-model.ts`：路径工具、`applyDataModelUpdate`
- [x] 3.4 `src/bound-value.ts`：`resolveBoundValue` + `getBoundValueInit`
- [x] 3.5 `src/children.ts`：`resolveChildren`
- [x] 3.6 `src/store.ts`：`SurfaceStore` + 订阅 + writeData
- [x] 3.7 `src/client.ts`：`createA2UIClient` + chat + sendUserAction
- [x] 3.8 `src/react/A2UIProvider.tsx` + SurfaceContext + ScopeContext
- [x] 3.9 React hooks：useSurface / useBoundString/Number/Boolean/Array / useDataWriter / useUserActionDispatcher
- [x] 3.10 `src/index.ts` + `src/react/index.ts`（双入口）
- [x] 3.11 自检测试 38 个，全部通过

**验收**: ✅ typecheck 通过；38 个测试全过；规范 1.5 节示例 stream 能正确还原

---

### Step 4: packages/components — 标准目录 React 组件 + Renderer ✅

**输出文档**: [docs/step-04-components.md](./docs/step-04-components.md)

- [x] 4.1 `package.json` (`@a2ui/components`)，依赖 protocol/runtime
- [x] 4.2 Tailwind 类名风格（设计 token 由消费方 tailwind 配置承载）
- [x] 4.3 `src/catalog.ts`：Catalog 类型 + `defineCatalog`/`mergeCatalogs`/`selectCatalog`
- [x] 4.4 `src/ComponentResolver.tsx`：单组件分发 + 容错占位
- [x] 4.5 `src/A2UIRenderer.tsx`：等待 isReady 后递归渲染 + 样式 token CSS 变量
- [x] 4.6 18 个标准组件全部实现
- [x] 4.7 `src/standard/index.ts`：导出 `StandardCatalog`
- [x] 4.8 `src/index.ts` 统一导出
- [x] 4.9 验证留到 Step 6 联调时进行（Renderer 能力齐备）

**验收**: ✅ typecheck 通过；StandardCatalog 已注册 18 个组件

---

### Step 5: apps/server — Express + Gemini Agent ✅

**输出文档**: [docs/step-05-server.md](./docs/step-05-server.md)

- [x] 5.1 `package.json`，依赖 express, @google/genai, better-sqlite3, zod, cors
- [x] 5.2 `src/env.ts`：zod 环境变量校验
- [x] 5.3 `src/storage/`：MemoryStore + SqliteStore（同接口）
- [x] 5.4 `src/stream/sse.ts`：SSE 工具（写入 / 心跳 / 关闭）
- [x] 5.5 ~~JSON Schema 作为 responseSchema~~ → 改用 `responseMimeType=application/json` + 强系统提示（更稳定）
- [x] 5.6 `src/agent/prompt.ts`：中文系统提示词 + few-shot
- [x] 5.7 `src/agent/gemini.ts`：generateContent 拿完整 JSON 后逐条 yield，附韧性兜底
- [x] 5.8 `src/routes/chat.ts`：POST /api/chat（SSE）
- [x] 5.9 `src/routes/action.ts`：POST /api/action（SSE）
- [x] 5.10 `src/routes/sessions.ts`：会话 CRUD
- [x] 5.11 `src/index.ts`：组装 express
- [x] 5.12 提供 `.env.example`

**验收**: ✅ typecheck 通过；mock 模式 e2e smoke 通过（health → 创建 session → /chat 返回完整 A2UI SSE 流）

---

### Step 6: apps/web — Gemini 风格 Q&A 对列表壳子 ✅

**输出文档**: [docs/step-06-web.md](./docs/step-06-web.md)

- [x] 6.1 `package.json`，依赖 react, vite, tailwind, zustand, @a2ui/runtime, @a2ui/components
- [x] 6.2 vite + tailwind 配置（content 扫到 monorepo 内 components 源码）
- [x] 6.3 `src/store/conversations.ts`：Zustand store + localStorage 持久化
- [x] 6.4 `src/components/Sidebar.tsx`：会话列表（新建 / 切换 / 删除）
- [x] 6.5 `src/components/QAList.tsx`：问答对列表 + 自动滚到底
- [x] 6.6 `src/components/UserBubble.tsx`
- [x] 6.7 `src/components/AssistantTurn.tsx`：内嵌 `<A2UIRenderer>` + 持久化重放
- [x] 6.8 `src/components/Composer.tsx`：Enter 发送、isComposing 兼容、流式中可停
- [x] 6.9 `src/services/api.ts`：fetch + SSE，meta 事件单独处理
- [x] 6.10 `src/App.tsx`：顶层数据流 + 错误兜底
- [x] 6.11 流式中显示动画 + AbortController 可中止
- [x] 6.12 自定义 `A2UIWebClient` 重写 sendUserAction 走服务端契约

**验收**: ✅ typecheck/build 通过；浏览器 e2e 5 个场景全过（卡片 / 列表 / 表单 / Button action / 输入回写）

---

### Step 7: 联调联测 + 调优 + 中文 README ✅

**输出文档**: [docs/step-07-final-integration.md](./docs/step-07-final-integration.md)

- [x] 7.1 端到端跑通 mock 模式 5 个场景（卡片/列表/表单/Action/输入回写）
- [x] 7.2 Gemini 系统提示词设计（长 prompt + 1 个 few-shot），韧性兜底（解析失败 + 缺 beginRendering 自动补）
- [x] 7.3 错误处理：Gemini 输出无法解析 → 错误卡片；SSE 断连 → AbortController 中止；组件未注册 → 占位提示
- [x] 7.4 重写根 README：项目介绍 + 架构图 + 快速开始 + 包索引 + 命令速查 + 实现要点 + 已知限制
- [x] 7.5 5 个包/应用都有专属 README

**验收**: ✅ 全部通过；新人按根 README 3 步可跑起来

---

## 进度跟踪

| Step | 状态 | 完成时间 | 文档 |
|------|------|---------|------|
| 1. 初始化 monorepo | ✅ | 2026-04-25 | [step-01](./docs/step-01-init-monorepo.md) |
| 2. protocol | ✅ | 2026-04-25 | [step-02](./docs/step-02-protocol.md) |
| 3. runtime | ✅ | 2026-04-25 | [step-03](./docs/step-03-runtime.md) |
| 4. components | ✅ | 2026-04-25 | [step-04](./docs/step-04-components.md) |
| 5. server | ✅ | 2026-04-25 | [step-05](./docs/step-05-server.md) |
| 6. web 壳子 | ✅ | 2026-04-25 | [step-06](./docs/step-06-web.md) |
| 7. 联调 + README | ✅ | 2026-04-25 | [step-07](./docs/step-07-final-integration.md) |

每完成一步，会在 `docs/` 下生成 `step-NN-xxx.md` 工作确认文档，记录：
- 实现了什么
- 关键设计决策与理由
- 文件清单 + 说明
- 验证结果（命令 / 输出截图描述）
- 下一步要做什么
