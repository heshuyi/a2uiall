/**
 * 标准目录组件类型聚合。
 *
 * 协议参考：
 *   https://a2ui.org/specification/v0_8/standard_catalog_definition.json
 *
 * `component` 字段是一个「单键对象」，键名是组件类型，值是该组件 props。
 *
 * ```jsonc
 * { "component": { "Text": { "text": { "literalString": "Hi" } } } }
 * ```
 *
 * 这里把 18 个标准组件统一为 `StandardComponent` discriminated union，
 * 方便消费方用 `'Text' in c` 之类的写法做穷举判别。
 */

import type {
  AudioPlayerProps,
  IconProps,
  ImageProps,
  TextProps,
  VideoProps,
} from './display.js';
import type {
  CardProps,
  ColumnProps,
  DividerProps,
  ListProps,
  ModalProps,
  RowProps,
  TabsProps,
} from './layout.js';
import type {
  ButtonProps,
  CheckBoxProps,
  DateTimeInputProps,
  MultipleChoiceProps,
  SliderProps,
  TextFieldProps,
} from './input.js';

export * from './common.js';
export * from './display.js';
export * from './input.js';
export * from './layout.js';

/** 18 个标准组件名。 */
export type StandardComponentType =
  | 'Text'
  | 'Image'
  | 'Icon'
  | 'Video'
  | 'AudioPlayer'
  | 'Row'
  | 'Column'
  | 'List'
  | 'Card'
  | 'Tabs'
  | 'Divider'
  | 'Modal'
  | 'Button'
  | 'CheckBox'
  | 'TextField'
  | 'DateTimeInput'
  | 'MultipleChoice'
  | 'Slider';

/**
 * 标准目录中所有组件 props 的映射。
 * 给运行时按 type 取对应 props 的写法用。
 */
export interface StandardComponentPropsMap {
  Text: TextProps;
  Image: ImageProps;
  Icon: IconProps;
  Video: VideoProps;
  AudioPlayer: AudioPlayerProps;
  Row: RowProps;
  Column: ColumnProps;
  List: ListProps;
  Card: CardProps;
  Tabs: TabsProps;
  Divider: DividerProps;
  Modal: ModalProps;
  Button: ButtonProps;
  CheckBox: CheckBoxProps;
  TextField: TextFieldProps;
  DateTimeInput: DateTimeInputProps;
  MultipleChoice: MultipleChoiceProps;
  Slider: SliderProps;
}

/**
 * 标准目录组件的 discriminated union（每个对象只允许一个键）。
 *
 * 注意：`component` 字段在协议线上其实可以承载 *任意* catalog 的组件，因此
 * 运行时类型应保留扩展性（见 messages.ts 的 `ComponentInstance.component` 用 `unknown`），
 * 这里的 `StandardComponent` 仅在与标准目录交互时使用。
 */
export type StandardComponent = {
  [K in StandardComponentType]: { [P in K]: StandardComponentPropsMap[K] };
}[StandardComponentType];
