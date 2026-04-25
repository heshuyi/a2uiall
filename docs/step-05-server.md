# Step 5 工作确认：实现 apps/server

> 完成时间: 2026-04-25
> 对应 TODO: Step 5 — apps/server，Express + Gemini Agent + SSE

---

## 一、本步实现了什么

### 1. Express 应用骨架（`src/index.ts`）

- 启动后监听 `PORT`（默认 8787）
- CORS（默认 `*`）+ JSON body 解析
- 全局 error handler
- 启动日志：`mock=`、`storage=`

### 2. 会话存储（`src/storage/`）

- 抽象接口 `SessionStorage`
- `MemorySessionStorage`（默认）：进程内 Map
- `SqliteSessionStorage`：`better-sqlite3`，自动建表 + WAL 模式
- 通过 `STORAGE` 环境变量切换

### 3. SSE 工具（`src/stream/sse.ts`）

- 自动设置 `Content-Type: text/event-stream` + 禁缓存头
- 15s 心跳（`: hb` 注释）
- `send/comment/done` API + 客户端断开自动 cleanup

### 4. Agent 抽象（`src/agent/`）

- `AgentRunner` 接口：`run(input) → AsyncIterable<ServerToClientMessage>`
- `MockAgentRunner`：写死的 4 种演示场景（plain / card / list / form）
- `GeminiAgentRunner`：调用 `@google/genai`，`responseMimeType=application/json`
- 工厂 `createAgent()`：未配置 `GEMINI_API_KEY` 时自动回退到 mock

### 5. Gemini 系统提示词（`src/agent/prompt.ts`）

中文系统提示，明确：
- A2UI 0.8 4 种消息类型 + 邻接列表 + BoundValue + ChildrenSpec + Action
- 18 个组件枚举
- surfaceId / catalogId 必须使用调用方提供的固定值
- 严格 JSON 输出（无 markdown）
- 1 个完整 few-shot（旅行计划列表）

### 6. 韧性兜底（`src/agent/gemini.ts`）

- 解析失败时返回 surface = error 卡片（仍正常 begin）
- 模型忘了发 `beginRendering` 时自动从 surfaceUpdate 推断 root 并补一条
- 处理 markdown code fence 包裹

### 7. 三个核心路由

| 路由 | 行为 |
|---|---|
| `/api/sessions` (CRUD) | zod 校验，sqlite/memory 透明 |
| `/api/chat` (SSE) | 分配 `surfaceId = msg-<turnId>`，串接 agent 流推回；首轮自动用用户文本前 30 字作为 session 标题 |
| `/api/action` (SSE) | 接 userAction，开新 surface 进入下一轮 |

## 二、关键设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| Agent 输出整体 JSON 而非真流式 token | ✓ | Gemini 的结构化输出在 stream 模式下增量是 partial JSON，自己拼回完整 message 复杂且容易出错；先拿完整 JSON 再切片更稳定 |
| 视觉伪流式 | yield 时 sleep 30~40ms | 让前端能逐张卡片冒出，仍像流式 |
| MOCK 模式默认开启 | 未配 KEY 即 mock | 前端开发可以零依赖联调 |
| surfaceId 服务端分配 | `msg-<uuid>` | 避免客户端/agent 自己生成造成冲突；存档也好对应 |
| beginRendering 缺失自动补 | ✓ | Gemini 偶尔会漏；不强制让前端死等 |
| sessionId 不写入 A2UI 协议 | ✓ | sessionId 是宿主壳子的概念，前端通过 SessionContext 自己持有 |
| storage 抽象 + 工厂 | ✓ | sqlite 是可选依赖（Mac M 系列 native 编译），让 memory 模式不被它拖累 |

## 三、文件清单

```
apps/server/
├── README.md
├── package.json                @a2ui/server
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts                Express 启动入口
    ├── env.ts                  zod 环境变量校验
    ├── types.ts                Session / Turn / SessionStorage 类型
    ├── stream/
    │   └── sse.ts              SSE 写入器
    ├── storage/
    │   ├── index.ts            createStorage() 工厂
    │   ├── memory.ts           MemorySessionStorage
    │   └── sqlite.ts           SqliteSessionStorage（better-sqlite3）
    ├── agent/
    │   ├── index.ts            createAgent() 工厂
    │   ├── types.ts            AgentRunner / AgentInput
    │   ├── mock.ts             MockAgentRunner（4 场景）
    │   ├── gemini.ts           GeminiAgentRunner
    │   └── prompt.ts           中文系统提示词 + few-shot
    └── routes/
        ├── sessions.ts         /api/sessions CRUD
        ├── chat.ts             POST /api/chat (SSE)
        └── action.ts           POST /api/action (SSE)
```

## 四、验证

### typecheck
```bash
$ pnpm --filter @a2ui/server typecheck
> tsc --noEmit
✓ 通过
```

### 端到端 smoke（mock 模式）
```bash
$ pnpm --filter @a2ui/server dev
[a2ui/server] 未检测到 GEMINI_API_KEY，启用 MOCK Agent
[a2ui/server] listening on http://localhost:8787  (mock=true, storage=memory)

# 健康检查
$ curl -s http://localhost:8787/api/health
{"ok":true,"mock":true,"model":"gemini-2.5-flash","storage":"memory"}

# 创建会话 + 发送消息（SSE）
$ SID=$(curl -s -X POST http://localhost:8787/api/sessions \
    -H 'content-type: application/json' -d '{}' | jq -r .id)
$ curl -N -X POST http://localhost:8787/api/chat \
    -H 'content-type: application/json' \
    -d "{\"sessionId\":\"$SID\",\"text\":\"列表\"}"

data: {"meta":{"turnId":"...","surfaceId":"msg-...","role":"agent"}}
data: {"surfaceUpdate":{"surfaceId":"msg-...","components":[...]}}
data: {"dataModelUpdate":{"surfaceId":"msg-...","contents":[{"key":"todos","valueMap":[...]}]}}
data: {"beginRendering":{"surfaceId":"msg-...","root":"root","catalogId":"https://a2ui.org/specification/v0_8/standard_catalog_definition.json"}}
data: [DONE]
```

✅ 所有消息符合 A2UI 0.8 协议形态，前端运行时可直接消费。

## 五、下一步

进入 **Step 6：实现 apps/web** —— Vite + React + Tailwind + Zustand + Gemini 风格 Q&A 列表壳子。

要点：
- 左侧会话列表 + 右侧消息区（参考 Gemini App / ChatGPT 布局）
- 用户消息：右对齐文本气泡
- Agent 消息：左对齐 → `<A2UIRenderer>` 渲染
- 输入框 + 发送按钮（Enter 发送、Shift+Enter 换行）
- 历史会话切换（基于 sessionId）
- localStorage 缓存会话列表（避免每次刷新重新拉）
