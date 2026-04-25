/**
 * 标准目录组件中复用的通用结构。
 */

import type { BoundBoolean, BoundNumber, BoundString, DataPath } from '../bound-value.js';

/**
 * 容器组件（Row / Column / List）的子元素声明。
 * 二选一：静态列表 explicitList 或 动态模板 template。
 */
export type ChildrenSpec = ChildrenExplicit | ChildrenTemplate;

export interface ChildrenExplicit {
  /** 子组件 id 的有序数组。 */
  explicitList: string[];
  template?: never;
}

export interface ChildrenTemplate {
  template: TemplateBinding;
  explicitList?: never;
}

export interface TemplateBinding {
  /** 用作模板的子组件 id，每个数据项会复用此模板渲染一次。 */
  componentId: string;
  /** 数据模型中指向 map 的路径；map 的每个 value 视为列表中一项。 */
  dataBinding: DataPath;
}

/**
 * 用户操作（Button.action 等）。
 * 客户端在用户触发时把 context 中的 BoundValue 解析为字面量，
 * 再以 `userAction` 消息回传服务端。
 */
export interface ActionSpec {
  /** 服务端识别的动作名。 */
  name: string;
  /** 触发时随同上报的上下文。 */
  context?: ActionContextEntry[];
}

export interface ActionContextEntry {
  key: string;
  value: ActionContextValue;
}

/**
 * action.context 中的值——可以是任意类型的 BoundValue（字面量 + 路径任选其一/合用）。
 */
export type ActionContextValue =
  | BoundString
  | BoundNumber
  | BoundBoolean;
