/**
 * BoundValue —— A2UI 0.8 数据绑定值。
 *
 * 协议参考：https://a2ui.org/specification/v0.8-a2ui/#42-data-binding-the-boundvalue-object
 *
 * 任意可绑定属性可以是：
 * 1. 纯字面量：    `{ literalString: "Hello" }`
 * 2. 纯路径：      `{ path: "/user/name" }`
 * 3. 路径 + 字面量（初始化简写）：
 *      `{ path: "/user/name", literalString: "Guest" }`
 *      —— 客户端在首次解析时把字面量写入 path，然后绑定到该 path
 *
 * 因此 TypeScript 类型必须允许 path 与 literal* 同时存在，但至少二选一。
 */

/** 数据模型路径，遵循 RFC 6901 JSON Pointer 风格，例如 `/user/name`。 */
export type DataPath = string;

interface WithLiteralString {
  literalString: string;
  path?: DataPath;
}
interface WithPathOnlyString {
  path: DataPath;
  literalString?: string;
}
/** 字符串型绑定值。 */
export type BoundString = WithLiteralString | WithPathOnlyString;

interface WithLiteralNumber {
  literalNumber: number;
  path?: DataPath;
}
interface WithPathOnlyNumber {
  path: DataPath;
  literalNumber?: number;
}
/** 数字型绑定值。 */
export type BoundNumber = WithLiteralNumber | WithPathOnlyNumber;

interface WithLiteralBoolean {
  literalBoolean: boolean;
  path?: DataPath;
}
interface WithPathOnlyBoolean {
  path: DataPath;
  literalBoolean?: boolean;
}
/** 布尔型绑定值。 */
export type BoundBoolean = WithLiteralBoolean | WithPathOnlyBoolean;

interface WithLiteralArray {
  literalArray: string[];
  path?: DataPath;
}
interface WithPathOnlyArray {
  path: DataPath;
  literalArray?: string[];
}
/** 字符串数组型绑定值（用于 MultipleChoice.selections 等）。 */
export type BoundStringArray = WithLiteralArray | WithPathOnlyArray;

/** 任意 BoundValue 的联合（用于运行时辅助函数签名）。 */
export type AnyBoundValue = BoundString | BoundNumber | BoundBoolean | BoundStringArray;
