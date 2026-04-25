# Step 1 工作确认：初始化 monorepo 骨架

> 完成时间: 2026-04-25
> 对应 TODO: Step 1 — 初始化 monorepo 骨架

---

## 一、本步实现了什么

搭建好 a2ui-chat 仓库的最外层骨架，让后续所有子包都能在统一的 TypeScript / lint / prettier / turbo 配置下工作。验证 `pnpm install` 通畅。

## 二、关键设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 包管理 | pnpm 10 + workspaces | 依赖隔离干净，硬链接节约磁盘，是 monorepo 事实标准 |
| 任务编排 | Turborepo 2.x | 零配置缓存、并行 dev，比 nx 上手快 |
| TS 模块解析 | `Bundler` + `ESNext` | Vite/tsx 的现代约定，避免 Node 解析的繁琐 ext 后缀 |
| `noUncheckedIndexedAccess` | 开启 | `arr[i]` 自动推为 `T \| undefined`，配合 A2UI 大量 map 查 id 场景能挡掉很多 bug |
| `verbatimModuleSyntax` | 关闭 | 暂不强制 `import type`，给 protocol 包的写法留点余地 |
| `.npmrc` 配 `link-workspace-packages` | 是 | workspace:* 协议，本地包自动 link |

## 三、文件清单

```
a2ui/
├── .editorconfig            统一编辑器行尾/缩进
├── .gitignore               忽略 node_modules/dist/.turbo/.env/SQLite 等
├── .npmrc                   pnpm workspace 行为
├── .prettierrc              代码格式化（单引号、行宽 100）
├── README.md                项目入口介绍（中文）
├── TODO.md                  完整任务清单（含进度表）
├── apps/                    业务 app 占位目录
├── docs/                    每步工作确认文档目录（本文件所在）
├── package.json             根 package：private、workspace 脚本、devDeps
├── packages/                公共包占位目录
├── pnpm-workspace.yaml      声明 apps/* + packages/* 为子包
├── tsconfig.base.json       所有子包继承的严格 TS 基线
└── turbo.json               build/dev/lint/typecheck/test 任务管道
```

### 根 `package.json` 要点

- `"private": true`：根包不发布
- `"packageManager": "pnpm@10.33.0"`：corepack 锁版本
- 提供 5 个 turbo 脚本（dev/build/lint/typecheck/test）
- devDeps 只放共用工具：turbo、typescript、prettier、@types/node

### `turbo.json` 要点

- `dev` 任务设 `cache: false` + `persistent: true`：dev 是长进程，不缓存
- `build` 任务声明 `dependsOn: ["^build"]`：依赖包先构建
- `typecheck` 任务 `outputs: []`：纯检查无产物，但走拓扑序

### `tsconfig.base.json` 要点

- 所有子包通过 `extends: "../../tsconfig.base.json"` 继承
- 开启 `declaration` + `declarationMap` + `sourceMap`：包之间 IDE 跳转和 debug 友好
- ESNext + Bundler：与 Vite/tsx 生态对齐

## 四、验证

执行：

```bash
cd /Users/xiaohe/Desktop/a2ui
pnpm install
```

输出（节选）：

```
Done in 24.1s using pnpm v10.33.0

devDependencies:
+ @types/node 22.19.17
+ prettier 3.8.3
+ turbo 2.9.6
+ typescript 5.9.3
```

依赖安装成功，`node_modules/` 与 `pnpm-lock.yaml` 已生成。

## 五、下一步

进入 **Step 2：实现 packages/protocol** —— 完全照 A2UI 0.8 协议规范，手写 TypeScript 类型定义。重点：
- 4 类服务端→客户端消息（surfaceUpdate / dataModelUpdate / beginRendering / deleteSurface）
- 2 类客户端→服务端消息（userAction / error）
- BoundValue 系列（literal / path 二选一）
- DataModel 的 entry 递归类型（valueString/Number/Boolean/Map/List）
- 18 个标准目录组件的 props 类型 + StandardComponent union
- 完全不引入任何 a2ui npm 包，只参考协议 JSON Schema
