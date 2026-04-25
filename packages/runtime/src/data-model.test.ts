import { describe, expect, it } from 'vitest';
import type { DataModelUpdate } from '@a2ui/protocol';
import { applyDataModelUpdate, entriesToObject, writePathImmutable } from './data-model.js';

describe('entriesToObject', () => {
  it('原始值', () => {
    expect(
      entriesToObject([
        { key: 'a', valueString: 'x' },
        { key: 'b', valueNumber: 1 },
        { key: 'c', valueBoolean: true },
      ]),
    ).toEqual({ a: 'x', b: 1, c: true });
  });
  it('嵌套 valueMap', () => {
    expect(
      entriesToObject([
        {
          key: 'addr',
          valueMap: [
            { key: 'city', valueString: 'Tokyo' },
            { key: 'zip', valueNumber: 100 },
          ],
        },
      ]),
    ).toEqual({ addr: { city: 'Tokyo', zip: 100 } });
  });
});

describe('applyDataModelUpdate', () => {
  it('path 为空 → 整体替换', () => {
    const cur = { a: 1, b: 2 };
    const update: DataModelUpdate = {
      surfaceId: 's',
      contents: [{ key: 'x', valueString: 'y' }],
    };
    expect(applyDataModelUpdate(cur, update)).toEqual({ x: 'y' });
  });
  it('path 指向新键 → 浅合并到该位置', () => {
    const cur = { user: { age: 30 } };
    const update: DataModelUpdate = {
      surfaceId: 's',
      path: 'user',
      contents: [{ key: 'name', valueString: 'Bob' }],
    };
    expect(applyDataModelUpdate(cur, update)).toEqual({ user: { age: 30, name: 'Bob' } });
  });
  it('path 不存在时自动建对象', () => {
    expect(
      applyDataModelUpdate(
        {},
        {
          surfaceId: 's',
          path: '/cart/items/0',
          contents: [{ key: 'name', valueString: 'Apple' }],
        },
      ),
    ).toEqual({ cart: { items: { 0: { name: 'Apple' } } } });
  });
  it('不修改原对象', () => {
    const cur = { a: 1 };
    const next = applyDataModelUpdate(cur, {
      surfaceId: 's',
      contents: [{ key: 'a', valueNumber: 2 }],
    });
    expect(cur).toEqual({ a: 1 });
    expect(next).toEqual({ a: 2 });
  });
});

describe('writePathImmutable', () => {
  it('返回新对象，原对象不变', () => {
    const cur = { user: { name: 'Bob' } };
    const next = writePathImmutable(cur, '/user/name', 'Alice');
    expect(cur.user.name).toBe('Bob');
    expect((next.user as { name: string }).name).toBe('Alice');
  });
});
