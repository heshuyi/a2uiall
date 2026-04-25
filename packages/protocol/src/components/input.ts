/**
 * 输入类标准组件：Button / CheckBox / TextField / DateTimeInput / MultipleChoice / Slider。
 */

import type {
  BoundBoolean,
  BoundNumber,
  BoundString,
  BoundStringArray,
} from '../bound-value.js';
import type { ActionSpec } from './common.js';

/* ─────────────────────────── Button ─────────────────────────── */

export interface ButtonProps {
  /** 按钮内显示的组件 id（一般是 Text）。 */
  child: string;
  /** 是否为主按钮样式。 */
  primary?: boolean;
  action: ActionSpec;
}

/* ─────────────────────────── CheckBox ─────────────────────────── */

export interface CheckBoxProps {
  label: BoundString;
  /** 当前勾选状态，可绑定到 dataModel。 */
  value: BoundBoolean;
}

/* ─────────────────────────── TextField ─────────────────────────── */

export type TextFieldType = 'date' | 'longText' | 'number' | 'shortText' | 'obscured';

export interface TextFieldProps {
  label: BoundString;
  /** 输入框当前值，可绑定到 dataModel。 */
  text?: BoundString;
  textFieldType?: TextFieldType;
  /** 客户端校验正则。 */
  validationRegexp?: string;
}

/* ─────────────────────────── DateTimeInput ─────────────────────────── */

export interface DateTimeInputProps {
  /** ISO 8601 字符串。 */
  value: BoundString;
  enableDate?: boolean;
  enableTime?: boolean;
}

/* ─────────────────────────── MultipleChoice ─────────────────────────── */

export type MultipleChoiceVariant = 'checkbox' | 'chips';

export interface MultipleChoiceOption {
  label: BoundString;
  /** 该选项被选中时上报的值。 */
  value: string;
}

export interface MultipleChoiceProps {
  /** 当前选中的 value 列表。 */
  selections: BoundStringArray;
  options: MultipleChoiceOption[];
  /** 最大可选数。 */
  maxAllowedSelections?: number;
  variant?: MultipleChoiceVariant;
  /** 是否提供搜索过滤。 */
  filterable?: boolean;
}

/* ─────────────────────────── Slider ─────────────────────────── */

export interface SliderProps {
  label?: BoundString;
  value: BoundNumber;
  minValue?: number;
  maxValue?: number;
}
