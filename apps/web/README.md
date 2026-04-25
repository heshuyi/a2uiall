# @a2ui/web

A2UI 0.8 演示前端：Vite + React + Tailwind + Zustand。
Gemini 风格的 Q&A 对话壳子，每个 AI 回合是一张「自渲染」的 A2UI surface。

## 启动

确保 `apps/server` 已经启动（默认 `http://localhost:8787`）。

```bash
pnpm install
pnpm --filter @a2ui/web dev
# → http://localhost:5173
```

Vite dev server 会把 `/api/*` 代理到后端。

## 关键架构

- `lib/client.ts`：扩展了 `A2UIClient`，重写 `sendUserAction` 走 apps/server 契约（同时把 turn 写入 zustand store）
- `services/api.ts`：会话 CRUD + chat/action 的 SSE 客户端，把 `meta` 事件抽出来、A2UI 消息塞进 store
- `store/conversations.ts`：zustand + localStorage，按 sessionId 索引会话；每个 session 含若干 UiTurn
- `components/QAList.tsx`：问答对纵向列表 + 自动滚到底
- `components/AssistantTurn.tsx`：对每个 turn 用 `<A2UIRenderer surfaceId={turn.surfaceId} />`
- `App.tsx`：启动时拉会话列表（无则自动建一个），按需懒加载会话详情，发送时按 SSE 流回灌 store + 持久化

## 行为约定

- Enter 发送，Shift+Enter 换行；中文输入法组合期间不会误触发
- 流式中显示「生成中…」+ 红色「停止」按钮（点击后中止 fetch）
- 切换会话时 surfaceId 是稳定的 `msg-<turnId>`，store.applyMany() 把持久化的 agentMessages 重放回 store
