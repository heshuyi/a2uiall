/**
 * BoundValue 求值。
 *
 * 三种写法（协议 4.2 节）：
 *   1. 仅字面量：           `{ literalString: "Hello" }`
 *   2. 仅路径：             `{ path: "/user/name" }`
 *   3. 路径 + 字面量初始化： `{ path: "/user/name", literalString: "Guest" }`
 *
 * 解析顺序：
 *   - 优先按 path 在 dataModel 中查找；查到（含 false / 0 / 空字符串）即返回
 *   - 否则回退到字面量
 *   - 都没有返回 undefined
 *
 * 「初始化简写」并不在 resolveBoundValue 中产生副作用，
 * 由调用方（hook 或 client）通过 `getBoundValueInit` 收集需要写回 dataModel 的初值，
 * 再统一应用一次 dataModelUpdate（避免每次渲染都写入，破坏用户输入）。
 */

import type {
  AnyBoundValue,
  BoundBoolean,
  BoundNumber,
  BoundString,
  BoundStringArray,
  DataModelObject,
} from '@a2ui/protocol';
import { readPathWithScope } from './path.js';

export interface ResolveContext {
  dataModel: DataModelObject;
  /** 模板作用域路径（如 `/items/abc`），缺省时仅按绝对路径解析。 */
  scope?: string;
}

/** 通用解析：优先 path → fallback literal*。 */
export function resolveBoundValue(
  bv: AnyBoundValue | undefined,
  ctx: ResolveContext,
): unknown {
  if (!bv) return undefined;

  if ('path' in bv && typeof bv.path === 'string') {
    const v = readPathWithScope(ctx.dataModel, bv.path, ctx.scope);
    if (v !== undefined) return v;
  }

  if ('literalString' in bv && bv.literalString !== undefined) return bv.literalString;
  if ('literalNumber' in bv && bv.literalNumber !== undefined) return bv.literalNumber;
  if ('literalBoolean' in bv && bv.literalBoolean !== undefined) return bv.literalBoolean;
  if ('literalArray' in bv && bv.literalArray !== undefined) return bv.literalArray;

  return undefined;
}

export function resolveBoundString(bv: BoundString | undefined, ctx: ResolveContext): string | undefined {
  const v = resolveBoundValue(bv, ctx);
  return typeof v === 'string' ? v : v == null ? undefined : String(v);
}

export function resolveBoundNumber(bv: BoundNumber | undefined, ctx: ResolveContext): number | undefined {
  const v = resolveBoundValue(bv, ctx);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function resolveBoundBoolean(bv: BoundBoolean | undefined, ctx: ResolveContext): boolean | undefined {
  const v = resolveBoundValue(bv, ctx);
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return undefined;
}

export function resolveBoundStringArray(
  bv: BoundStringArray | undefined,
  ctx: ResolveContext,
): string[] {
  const v = resolveBoundValue(bv, ctx);
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'object' && v !== null) {
    return Object.values(v as Record<string, unknown>).map((x) => String(x));
  }
  return [];
}

/**
 * 检查 BoundValue 是否需要做「初始化简写」回写。
 * 当 path + literal* 同时存在，且当前 dataModel 上 path 处为 undefined 时返回 init 任务。
 */
export interface BoundValueInit {
  path: string;
  value: string | number | boolean | string[];
}

export function getBoundValueInit(
  bv: AnyBoundValue | undefined,
  ctx: ResolveContext,
): BoundValueInit | null {
  if (!bv) return null;
  if (!('path' in bv) || typeof bv.path !== 'string') return null;
  const current = readPathWithScope(ctx.dataModel, bv.path, ctx.scope);
  if (current !== undefined) return null;

  if ('literalString' in bv && bv.literalString !== undefined) {
    return { path: bv.path, value: bv.literalString };
  }
  if ('literalNumber' in bv && bv.literalNumber !== undefined) {
    return { path: bv.path, value: bv.literalNumber };
  }
  if ('literalBoolean' in bv && bv.literalBoolean !== undefined) {
    return { path: bv.path, value: bv.literalBoolean };
  }
  if ('literalArray' in bv && bv.literalArray !== undefined) {
    return { path: bv.path, value: bv.literalArray };
  }
  return null;
}
