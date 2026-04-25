/**
 * 布局类标准组件：Row / Column / List / Card / Tabs / Divider / Modal。
 */

import type { BoundString } from '../bound-value.js';
import type { ChildrenSpec } from './common.js';

/* ─────────────────────────── Row ─────────────────────────── */

export type RowDistribution =
  | 'center'
  | 'end'
  | 'spaceAround'
  | 'spaceBetween'
  | 'spaceEvenly'
  | 'start';

export type CrossAxisAlignment = 'start' | 'center' | 'end' | 'stretch';

export interface RowProps {
  children: ChildrenSpec;
  /** 主轴（水平）排布，对应 CSS justify-content。 */
  distribution?: RowDistribution;
  /** 交叉轴（垂直）对齐，对应 CSS align-items。 */
  alignment?: CrossAxisAlignment;
}

/* ─────────────────────────── Column ─────────────────────────── */

export type ColumnDistribution =
  | 'start'
  | 'center'
  | 'end'
  | 'spaceBetween'
  | 'spaceAround'
  | 'spaceEvenly';

export interface ColumnProps {
  children: ChildrenSpec;
  /** 主轴（垂直）排布。 */
  distribution?: ColumnDistribution;
  /** 交叉轴（水平）对齐。 */
  alignment?: CrossAxisAlignment;
}

/* ─────────────────────────── List ─────────────────────────── */

export type ListDirection = 'vertical' | 'horizontal';

export interface ListProps {
  children: ChildrenSpec;
  direction?: ListDirection;
  alignment?: CrossAxisAlignment;
}

/* ─────────────────────────── Card ─────────────────────────── */

export interface CardProps {
  /** 内嵌组件 id。 */
  child: string;
}

/* ─────────────────────────── Tabs ─────────────────────────── */

export interface TabItem {
  title: BoundString;
  /** 该 tab 内嵌的组件 id。 */
  child: string;
}

export interface TabsProps {
  tabItems: TabItem[];
}

/* ─────────────────────────── Divider ─────────────────────────── */

export interface DividerProps {
  axis?: 'horizontal' | 'vertical';
}

/* ─────────────────────────── Modal ─────────────────────────── */

export interface ModalProps {
  /** 触发打开 modal 的组件 id（通常是 Button）。 */
  entryPointChild: string;
  /** modal 内部展示的组件 id。 */
  contentChild: string;
}
