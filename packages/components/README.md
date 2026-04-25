# @a2ui/components

A2UI 0.8 标准目录的 React 组件实现 + Renderer + Catalog 注册机制。**完全自实现**。

## 入口

```tsx
import { A2UIProvider, createA2UIClient } from '@a2ui/runtime';
import { A2UIRenderer, SessionProvider, StandardCatalog } from '@a2ui/components';

const client = createA2UIClient({ endpoint: '/api' });

<A2UIProvider client={client}>
  <SessionProvider sessionId={sessionId}>
    <A2UIRenderer surfaceId={msgSurfaceId} catalogs={[StandardCatalog]} />
  </SessionProvider>
</A2UIProvider>
```

## 组件清单（18 个）

| 类别 | 组件 |
|---|---|
| 显示 | `Text` `Image` `Icon` `Video` `AudioPlayer` |
| 布局 | `Row` `Column` `List` `Card` `Tabs` `Divider` `Modal` |
| 输入 | `Button` `CheckBox` `TextField` `DateTimeInput` `MultipleChoice` `Slider` |

## 自定义 Catalog

```tsx
import { defineCatalog, mergeCatalogs, StandardCatalog } from '@a2ui/components';

const MyCatalog = defineCatalog({
  catalogId: 'https://my.com/v1',
  components: { SignaturePad: SignaturePadReactComponent },
});

<A2UIRenderer surfaceId={id} catalogs={[StandardCatalog, MyCatalog]} />
```

## 样式约定

- 使用 Tailwind 类名（消费方需要在 tailwind 配置中扫描 `@a2ui/components` 包）
- 协议 `styles.primaryColor` / `styles.font` 会被注入为 CSS 变量 `--a2ui-primary` / `--a2ui-font`
