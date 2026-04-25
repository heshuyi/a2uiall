# Step 4 工作确认：实现 packages/components

> 完成时间: 2026-04-25
> 对应 TODO: Step 4 — packages/components，A2UI 标准目录组件 + Renderer + Catalog 机制

---

## 一、本步实现了什么

完整实现了 `@a2ui/components`：

1. **Catalog 注册机制**（`catalog.ts` + `CatalogContext.tsx`）
   - `ReactCatalog` 类型：`{ catalogId, components: Record<typeName, ReactComponent> }`
   - `defineCatalog` / `mergeCatalogs` / `selectCatalog` 工具
   - `<CatalogProvider>` 把当前 catalog 注入子树，避免每个组件 prop-drill

2. **入口渲染器** `<A2UIRenderer>`
   - 等待 `surface.isReady` 后才渲染（避免 flash of incomplete content）
   - 按 `surface.catalogId` 在 catalogs 列表中选用，找不到回退第一个
   - 把 `surface.styles.primaryColor` 与 `font` 注入为 CSS 变量 `--a2ui-primary` / `--a2ui-font`
   - 内部用 `<SurfaceProvider>` + `<CatalogProvider>` 建好 context，从 rootId 开始递归

3. **组件分发器** `<ResolvedComponent>`
   - 从 surface.components 取实例
   - 读单键作为类型名，从 catalog 取对应 React 组件
   - 容错：实例缺失/键不唯一/类型未注册 都展示带说明的占位
   - 自动包裹 `ScopeProvider`（当 props.scope 与上层不同时）

4. **18 个标准组件**（全部实现，路径在 `src/standard/`）
   | 类别 | 组件 | 关键实现点 |
   |---|---|---|
   | 显示 | `Text` | 7 个 usageHint 映射到 Tailwind 字号；`whitespace-pre-wrap` |
   | | `Image` | 6 个 usageHint + 5 个 fit 模式 |
   | | `Icon` | 47 个图标全部用 `lucide-react` 映射 |
   | | `Video` | 原生 `<video controls>` |
   | | `AudioPlayer` | 原生 `<audio controls>` + 描述文字 |
   | 布局 | `Row` `Column` `List` | 调用 runtime `resolveChildren`，支持 explicitList + template；distribution / alignment 完整映射 Tailwind |
   | | `Card` | 圆角白卡 + 阴影 |
   | | `Tabs` | useState 受控切换 |
   | | `Divider` | 横/竖向 |
   | | `Modal` | entryPointChild 触发 + 全屏遮罩 + ESC 关闭 |
   | 输入 | `Button` | dispatch userAction 通过 `useUserActionDispatcher`，分 primary/secondary 两种样式 |
   | | `CheckBox` | 通过 `useDataWriter` 把勾选状态回写到 BoundValue.path |
   | | `TextField` | 5 种 textFieldType 中 longText 用 textarea，其余用 input |
   | | `DateTimeInput` | enableDate/enableTime 组合得到 input type |
   | | `MultipleChoice` | 协议 dataModel 不支持 valueArray，用 valueMap({"0":"x"...}) 序列化；runtime 已支持 map→array 自动反序列；checkbox/chips 两种 variant |
   | | `Slider` | 原生 range，显示当前值 |

5. **SessionContext**：把 sessionId 透传给 Button 等需要上报的组件

## 二、关键设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| Tailwind 风格而非 CSS-in-JS | Tailwind | 与项目决策一致；shadcn/ui 风格基线 |
| Catalog 注册用 React Context | ✓ | 让每个组件 hook 拿 catalog，无需逐层透传 |
| MultipleChoice 选中态用 valueMap 序列化 | ✓ | 协议 dataModelUpdate schema 不支持 valueArray；用 map 索引数组兼容协议 + runtime 已自动反序列化 |
| Modal 实现简化为 wrapper 拦截点击 | ✓ | 协议没定义 entryPointChild → Modal 的回调通道，wrapper 包裹是最简实现 |
| Button 的 sessionId 通过 SessionContext 而非协议传入 | ✓ | sessionId 是宿主壳子的概念，不属于 A2UI 协议；用 context 在外层注入更干净 |
| 容错：组件类型缺失展示占位 | ✓ | LLM 难免出错，渲染失败时给出可读提示比白屏好 |
| 组件 props 透传时用 `as never` | ✓ | catalog 的存储类型是统一的，业务实现各有自己的 props，用 never 占位绕开 TS 不变性问题 |

## 三、文件清单

```
packages/components/
├── README.md
├── package.json                          @a2ui/components
├── tsconfig.json
└── src/
    ├── index.ts                          统一导出
    ├── catalog.ts                        Catalog 类型 + defineCatalog / mergeCatalogs / selectCatalog
    ├── CatalogContext.tsx                <CatalogProvider> + useCatalog
    ├── SessionContext.tsx                <SessionProvider> + useSessionId
    ├── ComponentResolver.tsx             <ResolvedComponent> 单组件分发
    ├── A2UIRenderer.tsx                  <A2UIRenderer> 入口
    ├── utils.ts                          cn 工具
    └── standard/
        ├── index.ts                      StandardCatalog（18 组件聚合）
        ├── Text.tsx
        ├── Image.tsx
        ├── Icon.tsx                      含 47 lucide-react 图标映射
        ├── Video.tsx
        ├── AudioPlayer.tsx
        ├── Row.tsx
        ├── Column.tsx
        ├── List.tsx
        ├── Card.tsx
        ├── Tabs.tsx
        ├── Divider.tsx
        ├── Modal.tsx
        ├── Button.tsx
        ├── CheckBox.tsx
        ├── TextField.tsx
        ├── DateTimeInput.tsx
        ├── MultipleChoice.tsx
        └── Slider.tsx
```

## 四、验证

```bash
$ pnpm install
$ pnpm --filter @a2ui/components typecheck
> tsc --noEmit
✓ 通过
```

UI 验证留到 Step 6（apps/web）跑通整套链路时进行。

## 五、下一步

进入 **Step 5：实现 apps/server** —— Express + Gemini Agent + SSE 推送。

- `.env.example`、zod 校验
- `apps/server/src/gemini/`：嵌入 A2UI server_to_client 与标准目录的精简 schema 作为 responseSchema
- 中文系统提示词 + 2~3 个 few-shot
- POST `/api/chat`：把 Gemini 流式输出按 A2UI JSONL 行格式 SSE 推回
- POST `/api/action`：接收 userAction 进入下一轮
- MOCK 模式：不带 GEMINI_API_KEY 时也能跑写死的 stream 用于联调
