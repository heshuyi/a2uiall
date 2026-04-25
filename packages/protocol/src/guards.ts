/**
 * 类型守卫与小工具函数。
 */

import type {
  BeginRendering,
  ComponentInstance,
  DataModelUpdate,
  DeleteSurface,
  ServerToClientMessage,
  SurfaceUpdate,
} from './messages.js';
import type { ClientError, ClientToServerMessage, UserAction } from './events.js';
import type {
  ChildrenExplicit,
  ChildrenSpec,
  ChildrenTemplate,
} from './components/common.js';
import type {
  StandardComponent,
  StandardComponentType,
  StandardComponentPropsMap,
} from './components/index.js';

/* ─────────────── 服务端→客户端消息 ─────────────── */

export function isSurfaceUpdate(
  m: ServerToClientMessage,
): m is { surfaceUpdate: SurfaceUpdate } {
  return 'surfaceUpdate' in m && m.surfaceUpdate !== undefined;
}

export function isDataModelUpdate(
  m: ServerToClientMessage,
): m is { dataModelUpdate: DataModelUpdate } {
  return 'dataModelUpdate' in m && m.dataModelUpdate !== undefined;
}

export function isBeginRendering(
  m: ServerToClientMessage,
): m is { beginRendering: BeginRendering } {
  return 'beginRendering' in m && m.beginRendering !== undefined;
}

export function isDeleteSurface(
  m: ServerToClientMessage,
): m is { deleteSurface: DeleteSurface } {
  return 'deleteSurface' in m && m.deleteSurface !== undefined;
}

/* ─────────────── 客户端→服务端消息 ─────────────── */

export function isUserAction(
  m: ClientToServerMessage,
): m is { userAction: UserAction } {
  return 'userAction' in m && m.userAction !== undefined;
}

export function isClientError(
  m: ClientToServerMessage,
): m is { error: ClientError } {
  return 'error' in m && m.error !== undefined;
}

/* ─────────────── 容器子元素 ─────────────── */

export function isExplicitChildren(c: ChildrenSpec): c is ChildrenExplicit {
  return 'explicitList' in c && Array.isArray((c as ChildrenExplicit).explicitList);
}

export function isTemplateChildren(c: ChildrenSpec): c is ChildrenTemplate {
  return 'template' in c && (c as ChildrenTemplate).template !== undefined;
}

/* ─────────────── 标准目录组件 ─────────────── */

/**
 * 取出 ComponentInstance.component 中的「单键」并断言它属于标准目录。
 * 返回 `[type, props]` 元组方便消费方做穷举 switch。
 */
export function readStandardComponent(
  instance: ComponentInstance,
):
  | { type: StandardComponentType; props: StandardComponentPropsMap[StandardComponentType] }
  | null {
  const keys = Object.keys(instance.component);
  if (keys.length !== 1) return null;
  const type = keys[0] as StandardComponentType;
  const props = instance.component[type];
  if (!isKnownStandardType(type)) return null;
  return { type, props: props as StandardComponentPropsMap[StandardComponentType] };
}

const STANDARD_TYPES = new Set<string>([
  'Text',
  'Image',
  'Icon',
  'Video',
  'AudioPlayer',
  'Row',
  'Column',
  'List',
  'Card',
  'Tabs',
  'Divider',
  'Modal',
  'Button',
  'CheckBox',
  'TextField',
  'DateTimeInput',
  'MultipleChoice',
  'Slider',
]);

export function isKnownStandardType(t: string): t is StandardComponentType {
  return STANDARD_TYPES.has(t);
}

/** 仅当 `c.component` 的单键属于标准目录时返回 true。 */
export function isStandardComponent(c: unknown): c is StandardComponent {
  if (!c || typeof c !== 'object') return false;
  const keys = Object.keys(c as object);
  if (keys.length !== 1) return false;
  return isKnownStandardType(keys[0]!);
}
