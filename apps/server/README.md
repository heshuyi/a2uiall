# @a2ui/server

A2UI 0.8 后端 Agent。Express + Gemini + SSE。

## 启动

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
# 不填 GEMINI_API_KEY 也能跑（自动启用 MOCK Agent）
pnpm --filter @a2ui/server dev
# → http://localhost:8787
```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/sessions` | 列出会话（按 updatedAt 倒序） |
| POST | `/api/sessions` | 创建会话，body `{ title? }` → `{ id }` |
| GET | `/api/sessions/:id` | 取单个会话（含 turns） |
| PATCH | `/api/sessions/:id` | 改标题 |
| DELETE | `/api/sessions/:id` | 删除 |
| POST | `/api/chat` | **SSE**。body `{ sessionId, text }` → A2UI 消息流 |
| POST | `/api/action` | **SSE**。body `{ sessionId, surfaceId, sourceComponentId, actionName, context }` |

## SSE 协议

每条事件 `data: <json>\n\n`，最后一条为 `data: [DONE]`。
首条 `data` 是元信息 `{ "meta": { "turnId", "surfaceId", "role": "agent" } }`，
后续都是标准 A2UI server-to-client 消息（surfaceUpdate / dataModelUpdate / beginRendering / deleteSurface）。

## MOCK 模式

无 GEMINI_API_KEY 时启用，按用户输入关键词切换 4 种场景：
- 「卡片」/「profile」 → 头像名片 + 数据绑定
- 「列表」/「todo」 → 模板渲染列表 + CheckBox
- 「表单」/「登录」 → TextField + Slider + CheckBox + Button.action
- 其他 → 纯文本回复

## 持久化

- `STORAGE=memory`（默认）：进程内
- `STORAGE=sqlite`：`SQLITE_PATH` 指定 db 文件位置（自动建表）
