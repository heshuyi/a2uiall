/**
 * 服务端 → 客户端消息（4 种）。
 *
 * 协议 schema 参考：
 *   https://a2ui.org/specification/v0_8/server_to_client.json
 *
 * 一个 A2UI JSONL 流由若干行组成，每行是一个 `ServerToClientMessage`，
 * **必须且仅有一个** key（surfaceUpdate / dataModelUpdate / beginRendering / deleteSurface）。
 */

import type { DataEntry } from './data-model.js';

/** 一个组件实例（出现在 surfaceUpdate.components 中）。 */
export interface ComponentInstance {
  /** 组件实例的唯一 id，用于父子引用。 */
  id: string;
  /**
   * 单键对象：键名是组件类型（来自 catalog），值是其 props。
   * 用 `unknown` 而非具体 union，是为了允许任意自定义 catalog；
   * 标准目录场景下可断言为 `StandardComponent`（见 components/index.ts）。
   */
  component: Record<string, unknown>;
  /**
   * Row/Column 直接子节点的 flex-grow 权重。
   * 仅当父级是 Row 或 Column 时生效。
   */
  weight?: number;
}

export interface SurfaceUpdate {
  /** 目标 surface 的唯一 id。 */
  surfaceId: string;
  /** 该 surface 的组件列表（邻接列表）。schema 要求 minItems: 1。 */
  components: ComponentInstance[];
}

export interface DataModelUpdate {
  surfaceId: string;
  /**
   * 数据模型中的写入路径。如省略或为 `/`，整个数据模型将被替换为本次 contents。
   * 例如 `/user`、`/cart/items/0`。
   */
  path?: string;
  /** 邻接列表形式的数据条目。 */
  contents: DataEntry[];
}

export interface BeginRendering {
  surfaceId: string;
  /** 根组件 id —— 必填。 */
  root: string;
  /**
   * 选用的 catalog id；省略时客户端默认使用 0.8 标准目录。
   * 标准目录 id：`https://a2ui.org/specification/v0_8/standard_catalog_definition.json`
   */
  catalogId?: string;
  /** 样式信息（如 primaryColor、font），由 catalog 的 styles 字段决定可用键。 */
  styles?: Record<string, unknown>;
}

export interface DeleteSurface {
  surfaceId: string;
}

/**
 * 服务端→客户端的单条 A2UI JSONL 消息。
 * MUST 仅包含 4 个键之一。
 */
export type ServerToClientMessage =
  | { surfaceUpdate: SurfaceUpdate; dataModelUpdate?: never; beginRendering?: never; deleteSurface?: never }
  | { dataModelUpdate: DataModelUpdate; surfaceUpdate?: never; beginRendering?: never; deleteSurface?: never }
  | { beginRendering: BeginRendering; surfaceUpdate?: never; dataModelUpdate?: never; deleteSurface?: never }
  | { deleteSurface: DeleteSurface; surfaceUpdate?: never; dataModelUpdate?: never; beginRendering?: never };
