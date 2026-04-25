/**
 * DataModel —— A2UI 0.8 数据模型。
 *
 * 协议参考：https://a2ui.org/specification/v0.8-a2ui/#41-the-datamodelupdate-message
 *
 * 数据模型是一个 JSON 对象，由 `dataModelUpdate` 消息以「邻接列表」（adjacency list）
 * 的方式增量构建/更新。每条 entry 必须有 `key`，并且只能携带恰好一个 `value*` 字段。
 *
 * 注意：
 * - 官方 server_to_client schema 中，`valueMap` 的子项不允许再嵌套 `valueMap`（仅 valueString/Number/Boolean）。
 * - 但协议正文 4.1 节给出的示例展示了嵌套场景，因此我们的类型采用 **递归可嵌套** 的宽松形式，
 *   既兼容线上 LLM 的真实输出，也兼容更严格的 schema 校验。
 * - 协议没有定义 `valueList`；动态列表通过 `valueMap` 表达，
 *   `template.dataBinding` 指向的是一个 map，map 的 values 即为子项。
 */

import type { DataPath } from './bound-value.js';

/** dataModel 中可能出现的原始值类型。 */
export type DataModelPrimitive = string | number | boolean;

/** dataModel 在内存中的形态：嵌套的普通 JSON 对象（key → primitive | map）。 */
export type DataModelValue = DataModelPrimitive | DataModelObject;
export interface DataModelObject {
  [key: string]: DataModelValue;
}

/** 数据模型本身：一个根对象。 */
export type DataModel = DataModelObject;

/** 一个 dataModelUpdate.contents 的子项。键 + 恰好一个 value*。 */
export type DataEntry =
  | DataEntryString
  | DataEntryNumber
  | DataEntryBoolean
  | DataEntryMap;

export interface DataEntryString {
  key: string;
  valueString: string;
}

export interface DataEntryNumber {
  key: string;
  valueNumber: number;
}

export interface DataEntryBoolean {
  key: string;
  valueBoolean: boolean;
}

export interface DataEntryMap {
  key: string;
  /** 嵌套的 map（同样以邻接列表表示）。 */
  valueMap: DataEntry[];
}

/** dataModelUpdate 的可选 path：若省略，按规范应替换整个数据模型。 */
export type DataModelUpdatePath = DataPath | undefined;
