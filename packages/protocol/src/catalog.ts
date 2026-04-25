/**
 * Catalog —— 客户端与服务端就「可渲染组件集合」达成的契约。
 *
 * 协议参考：
 *   https://a2ui.org/specification/v0.8-a2ui/#21-catalog-negotiation
 *
 * 简单模型：
 * - 每个 catalog 有唯一 `catalogId`（推荐 URI）。
 * - `components` 描述每个组件类型的 props（在协议层是 JSON Schema 片段，类型上保持 unknown）。
 * - `styles` 描述全局样式 token（如 primaryColor、font）。
 * - 客户端在握手时通过 A2A metadata.a2uiClientCapabilities 声明支持的 catalog。
 */

/** A2UI 0.8 标准目录的官方 id。 */
export const STANDARD_CATALOG_ID =
  'https://a2ui.org/specification/v0_8/standard_catalog_definition.json' as const;

/** A2UI 0.8 A2A 扩展 URI。 */
export const A2A_EXTENSION_URI = 'https://a2ui.org/a2a-extension/a2ui/v0.8' as const;

/** 客户端在每条 A2A 消息中声明的能力对象。 */
export interface A2UIClientCapabilities {
  /** 支持的预定义 catalog id 列表，必须显式包含标准目录 id 才表示支持标准目录。 */
  supportedCatalogIds: string[];
  /** 服务端 acceptsInlineCatalogs 时，可附带定义的内联 catalog。 */
  inlineCatalogs?: CatalogDefinition[];
}

/**
 * Catalog 定义文档的结构（精简版）。
 * 完整 JSON Schema 见协议规范附录，类型仅做大体约束。
 */
export interface CatalogDefinition {
  catalogId: string;
  /** 组件类型名 → 该类型的属性 schema（JSON Schema 片段）。 */
  components: Record<string, unknown>;
  /** 全局样式 token → schema 片段。 */
  styles?: Record<string, unknown>;
}

/** 服务端在 Agent Card 中暴露的能力（A2A 扩展 params）。 */
export interface A2UIServerCapabilities {
  supportedCatalogIds?: string[];
  acceptsInlineCatalogs?: boolean;
}
