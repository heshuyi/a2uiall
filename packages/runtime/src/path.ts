/**
 * 数据模型路径工具。
 *
 * A2UI 协议 4.1 节示例同时出现 `"path": "user"` 和 `"path": "/user/name"`，
 * 也提到 `"/"` 表示根（替换整个数据模型）。我们采取宽松解析：
 * - 以 `/` 开头视为绝对路径
 * - 不以 `/` 开头同样视为绝对路径（向后兼容协议示例）
 * - 空字符串、`/` 视为根
 *
 * 使用 `splitPath` / `joinPath` 把路径拆/合为段。
 */

import type { DataModelObject, DataModelValue } from '@a2ui/protocol';

export function splitPath(path: string | undefined): string[] {
  if (!path || path === '/' || path === '') return [];
  return path
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function joinPath(segments: string[]): string {
  if (segments.length === 0) return '/';
  return '/' + segments.map((s) => String(s)).join('/');
}

/** 在 model 上按 path 读出值；不存在返回 undefined。 */
export function readPath(model: DataModelObject, path: string | undefined): DataModelValue | undefined {
  const segs = splitPath(path);
  let cur: DataModelValue | undefined = model;
  for (const seg of segs) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as DataModelObject)[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** 在 model 上按 path 写入值（沿途自动建对象）。返回新的根对象（原对象会被修改）。 */
export function writePath(
  model: DataModelObject,
  path: string | undefined,
  value: DataModelValue,
): DataModelObject {
  const segs = splitPath(path);
  if (segs.length === 0) {
    if (typeof value !== 'object' || value === null) {
      throw new TypeError(
        `[a2ui/runtime] writePath: 写入根路径时 value 必须是对象，收到 ${typeof value}`,
      );
    }
    return { ...(value as DataModelObject) };
  }
  let cur: DataModelObject = model;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!;
    const next = cur[seg];
    if (next === undefined || typeof next !== 'object' || next === null) {
      const fresh: DataModelObject = {};
      cur[seg] = fresh;
      cur = fresh;
    } else {
      cur = next as DataModelObject;
    }
  }
  cur[segs[segs.length - 1]!] = value;
  return model;
}

/**
 * 解析「相对路径」：当处于 template 作用域时，
 * 如果 path 在绝对位置查不到，再尝试拼接到 scope 路径下查找。
 */
export function readPathWithScope(
  model: DataModelObject,
  path: string | undefined,
  scope: string | undefined,
): DataModelValue | undefined {
  const absolute = readPath(model, path);
  if (absolute !== undefined) return absolute;
  if (scope && path && !path.startsWith('/')) {
    const combined = joinPath([...splitPath(scope), ...splitPath(path)]);
    return readPath(model, combined);
  }
  return undefined;
}
