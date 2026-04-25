# Step 6 工作确认：实现 apps/web

> 完成时间: 2026-04-25
> 对应 TODO: Step 6 — apps/web，Gemini 风格 Q&A 对话壳子

---

## 一、本步实现了什么

完整的 React + Vite + Tailwind + Zustand 前端，串联 protocol/runtime/components 三个包 + apps/server 后端。

### 1. 工程基线
- Vite 6 + React 18 + TypeScript 5（继承 root tsconfig.base）
- Tailwind 3 + PostCSS + Autoprefixer
- Tailwind `content` 也扫描 `packages/components/src/**/*.{ts,tsx}` —— 让组件包里的类名生效
- 中文字体优先 PingFang SC，回退系统字体；`--a2ui-font` CSS 变量优先（让 server styles 能覆盖）
- Vite proxy `/api/*` → `http://localhost:8787`

### 2. 状态管理
- `store/conversations.ts`：zustand + persist(localStorage)
- 数据结构：`UiSession`（meta + turns + loaded）、`UiTurn`（surfaceId + user + agentMessages + streaming + abort）
- partialize 时丢弃 `abort` 函数（不可序列化）

### 3. API 客户端层
- `services/api.ts`：sessions CRUD + chat/action SSE
- 共用 `parseSSEStream`（来自 runtime），第一条 `meta` 单独处理（拿到 turnId/surfaceId）
- 后续 A2UI 消息直接 `store.apply(msg)` 喂给 runtime

### 4. A2UIClient 扩展
- `lib/client.ts`：`A2UIWebClient extends A2UIClient`
- 复用父类的 `store`，重写 `sendUserAction` 走 apps/server 契约 + 同时把 action 触发的 turn 加进 zustand
- `chat()` 不被使用（壳子直接调 `api.chat`）

### 5. UI 组件
| 文件 | 职责 |
|---|---|
| `Sidebar.tsx` | 会话列表 + 新建/删除 |
| `Composer.tsx` | 输入框；Enter 发送、Shift+Enter 换行；中文输入法 isComposing 兼容；流式中显示停止按钮 |
| `UserBubble.tsx` | 用户气泡（右对齐黑底白字） |
| `AssistantTurn.tsx` | 头像 + `<A2UIRenderer surfaceId={...}>`；mount 时把已持久化的 agentMessages 重放回 store |
| `QAList.tsx` | 纵向 QA 对列表 + 自动滚到底；用 `<SessionProvider>` 把 sessionId 注入到组件包内 |

### 6. 顶层组装
- `App.tsx`：
  - `<A2UIProvider client={a2uiClient}>` 包整体
  - 启动时 fetch sessions，空则自建一个
  - 切换 session 时懒加载详情；把持久化 agentMessages 用 `applyMany` 一次性灌回 store
  - 发送：先在 store 中插入一个 placeholder turn → 启动 SSE → 流式 append agent 消息 → 完成后 patch turn 的 `surfaceId` / `streaming=false`
  - 提供错误兜底（后端断连时显示 banner）

## 二、关键设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| zustand 而非 context | ✓ | 多 turn 增量更新需要细粒度订阅，context 会触发整树重渲 |
| localStorage 持久化整轮 agentMessages | ✓ | 刷新后能完全还原渲染；只持久化「源数据」、不持久化派生的 store 状态 |
| `<A2UIRenderer>` 用 `surfaceId={msg-<turnId>}` 复用稳定 id | ✓ | 切换会话时不会创建新 surface；和服务端约定一致 |
| 把 sessionId 通过 SessionContext 注入而非协议 | ✓ | 与 A2UI 协议解耦；userAction 只在客户端壳子层关心 sessionId |
| 重写 A2UIClient.sendUserAction | ✓ | runtime 默认契约和我们的服务端不一致；用继承覆盖最干净 |
| 流式期间允许 abort | AbortController | 用户体验，避免长时间等待 |
| 第一个 `data: {meta:...}` 事件单独处理 | ✓ | A2UI store.apply 不认识 meta；而前端需要它来知道这一轮 surfaceId |
| Tailwind content 扫到 monorepo 内的 components 源码 | ✓ | components 是源码包不是构建产物，类名必须被 Tailwind 看到 |

## 三、文件清单

```
apps/web/
├── README.md
├── package.json          @a2ui/web
├── tsconfig.json
├── vite.config.ts        Vite + React + /api 代理
├── postcss.config.js
├── tailwind.config.js    扫描 monorepo components 源码
├── index.html
└── src/
    ├── main.tsx          入口
    ├── App.tsx           Shell + 顶层数据流
    ├── index.css         Tailwind base/components/utilities + 自定义滚动条
    ├── lib/
    │   ├── cn.ts         clsx 包装
    │   └── client.ts     A2UIWebClient（继承 + 重写 sendUserAction）
    ├── services/
    │   └── api.ts        sessions CRUD + chat/action SSE
    ├── store/
    │   └── conversations.ts   zustand + persist
    └── components/
        ├── Sidebar.tsx
        ├── Composer.tsx
        ├── UserBubble.tsx
        ├── AssistantTurn.tsx
        └── QAList.tsx
```

## 四、验证

### typecheck + 构建
```bash
$ pnpm --filter @a2ui/web typecheck
✓ tsc --noEmit 通过

$ pnpm --filter @a2ui/web build
✓ vite v6.4.2  built in 1.19s
  dist/index.html                   0.49 kB │ gzip:  0.36 kB
  dist/assets/index-*.css          15.67 kB │ gzip:  3.79 kB
  dist/assets/index-*.js          203.08 kB │ gzip: 63.54 kB
```

### 端到端浏览器测试（mock 模式）

启动两个进程后用 browser-use subagent 验证 5 个场景：

1. **首屏**：会话栏 + Hero + 输入框 ✅
2. **卡片场景**：输入「卡片」→ 头像/姓名/简介/两个按钮 ✅
3. **Action**：点「关注」→ 新一轮显示 `[操作 follow]` + agent 回复包含 actionName ✅
4. **列表场景**：「列表」→ 4 个 todo + checkbox 可勾选 ✅
5. **表单场景**：「表单」→ TextField/Slider/CheckBox/Button 全部正常，提交后 agent 收到 context ✅

## 五、下一步

进入 **Step 7：联调收尾 + 中文 README + Gemini 真实接入测试**。

要点：
- 写根 README：项目介绍、架构图、起步命令、常见问题
- 接入真实 Gemini API 跑一遍，看提示词是否需要再调
- 列已知限制 / 未来可扩展
