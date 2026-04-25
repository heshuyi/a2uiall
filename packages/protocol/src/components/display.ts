/**
 * 显示类标准组件：Text / Image / Icon / Video / AudioPlayer。
 *
 * 与 https://a2ui.org/specification/v0_8/standard_catalog_definition.json 严格一致。
 */

import type { BoundString } from '../bound-value.js';

/* ─────────────────────────── Text ─────────────────────────── */

export type TextUsageHint = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body';

export interface TextProps {
  /** 文本内容（支持简单 Markdown，但不含 HTML/图片/链接）。 */
  text: BoundString;
  /** 文本样式提示。 */
  usageHint?: TextUsageHint;
}

/* ─────────────────────────── Image ─────────────────────────── */

export type ImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
export type ImageUsageHint =
  | 'icon'
  | 'avatar'
  | 'smallFeature'
  | 'mediumFeature'
  | 'largeFeature'
  | 'header';

export interface ImageProps {
  url: BoundString;
  altText?: BoundString;
  fit?: ImageFit;
  usageHint?: ImageUsageHint;
}

/* ─────────────────────────── Icon ─────────────────────────── */

/** 标准目录定义的 47 个图标名。 */
export type IconName =
  | 'accountCircle'
  | 'add'
  | 'arrowBack'
  | 'arrowForward'
  | 'attachFile'
  | 'calendarToday'
  | 'call'
  | 'camera'
  | 'check'
  | 'close'
  | 'delete'
  | 'download'
  | 'edit'
  | 'event'
  | 'error'
  | 'favorite'
  | 'favoriteOff'
  | 'folder'
  | 'help'
  | 'home'
  | 'info'
  | 'locationOn'
  | 'lock'
  | 'lockOpen'
  | 'mail'
  | 'menu'
  | 'moreVert'
  | 'moreHoriz'
  | 'notificationsOff'
  | 'notifications'
  | 'payment'
  | 'person'
  | 'phone'
  | 'photo'
  | 'print'
  | 'refresh'
  | 'search'
  | 'send'
  | 'settings'
  | 'share'
  | 'shoppingCart'
  | 'star'
  | 'starHalf'
  | 'starOff'
  | 'upload'
  | 'visibility'
  | 'visibilityOff'
  | 'warning';

export interface IconProps {
  /** 图标名：可以是 47 个枚举之一的字面量，或绑定到 dataModel 的字符串。 */
  name:
    | { literalString: IconName; path?: string }
    | { path: string; literalString?: IconName };
}

/* ─────────────────────────── Video ─────────────────────────── */

export interface VideoProps {
  url: BoundString;
}

/* ─────────────────────────── AudioPlayer ─────────────────────────── */

export interface AudioPlayerProps {
  url: BoundString;
  description?: BoundString;
}
