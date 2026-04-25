/**
 * 把协议的 `DataEntry[]`（邻接列表）转成普通 JS 对象，
 * 并把 `dataModelUpdate` 增量合并到内存中的 dataModel。
 */

import type {
  DataEntry,
  DataModelObject,
  DataModelUpdate,
  DataModelValue,
} from '@a2ui/protocol';
import { splitPath, writePath } from './path.js';

/** 把一组 DataEntry 转成普通 JS 对象。 */
export function entriesToObject(entries: DataEntry[]): DataModelObject {
  const out: DataModelObject = {};
  for (const e of entries) {
    out[e.key] = entryValue(e);
  }
  return out;
}

function entryValue(e: DataEntry): DataModelValue {
  if ('valueString' in e) return e.valueString;
  if ('valueNumber' in e) return e.valueNumber;
  if ('valueBoolean' in e) return e.valueBoolean;
  if ('valueMap' in e) return entriesToObject(e.valueMap);
  return undefined as unknown as DataModelValue;
}

/**
 * 应用一条 dataModelUpdate。
 *
 * 语义（按协议 4.1 节）：
 *   - 若 path 省略或为 `/`：整个数据模型被替换为本次 contents 构成的对象
 *   - 否则：把 contents 构成的对象「浅合并」到 path 指向的位置
 *     （即 path 处的对象上增加/替换 contents 里出现的键，未提及的键保留）
 *
 * 返回**新的**根对象（不修改原对象，避免外部订阅误判）。
 */
export function applyDataModelUpdate(
  current: DataModelObject,
  update: DataModelUpdate,
): DataModelObject {
  const incoming = entriesToObject(update.contents);
  const segs = splitPath(update.path);

  if (segs.length === 0) {
    return incoming;
  }

  const next = deepClone(current);
  const target = ensureObjectAt(next, segs);
  for (const k of Object.keys(incoming)) {
    target[k] = incoming[k]!;
  }
  return next;
}

function ensureObjectAt(root: DataModelObject, segs: string[]): DataModelObject {
  let cur: DataModelObject = root;
  for (const seg of segs) {
    const v = cur[seg];
    if (v === undefined || typeof v !== 'object' || v === null) {
      const fresh: DataModelObject = {};
      cur[seg] = fresh;
      cur = fresh;
    } else {
      cur = v as DataModelObject;
    }
  }
  return cur;
}

function deepClone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((i) => deepClone(i)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as object)) {
    out[k] = deepClone((v as Record<string, unknown>)[k]);
  }
  return out as T;
}

/**
 * 在指定 path 上 *写入单个原始值*（用于 BoundValue 初始化简写场景）。
 * 不修改原对象，返回新的根。
 */
export function writePathImmutable(
  current: DataModelObject,
  path: string | undefined,
  value: DataModelValue,
): DataModelObject {
  const next = deepClone(current);
  return writePath(next, path, value);
}
