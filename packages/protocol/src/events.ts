/**
 * 客户端 → 服务端事件消息（2 种）。
 *
 * 协议 schema 参考：
 *   https://a2ui.org/specification/v0_8/client_to_server.json
 *
 * 一个事件包必须且仅包含 `userAction` 或 `error` 中的一个键。
 */

/** 用户动作上报（按钮点击、表单提交等）。 */
export interface UserAction {
  /** 动作名（取自组件 action.name）。 */
  name: string;
  /** 事件发生的 surfaceId。 */
  surfaceId: string;
  /** 触发事件的组件 id。 */
  sourceComponentId: string;
  /** ISO 8601 时间戳，例如 `2026-04-25T07:30:00Z`。 */
  timestamp: string;
  /**
   * action.context 解析后的扁平对象（BoundValue 已被解析为字面量）。
   * 例如：`{ "userInput": "hello", "formId": "f-123" }`。
   */
  context: Record<string, string | number | boolean>;
}

/** 客户端错误上报（结构灵活）。 */
export interface ClientError {
  message?: string;
  code?: string;
  /** 任意附加字段。 */
  [extra: string]: unknown;
}

/** 客户端 → 服务端的单条消息。 */
export type ClientToServerMessage =
  | { userAction: UserAction; error?: never }
  | { error: ClientError; userAction?: never };
