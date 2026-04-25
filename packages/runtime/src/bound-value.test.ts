import { describe, expect, it } from 'vitest';
import {
  getBoundValueInit,
  resolveBoundBoolean,
  resolveBoundNumber,
  resolveBoundString,
  resolveBoundStringArray,
} from './bound-value.js';

describe('resolveBoundString', () => {
  it('字面量', () => {
    expect(resolveBoundString({ literalString: 'Hi' }, { dataModel: {} })).toBe('Hi');
  });
  it('路径', () => {
    expect(
      resolveBoundString({ path: '/user/name' }, { dataModel: { user: { name: 'Bob' } } }),
    ).toBe('Bob');
  });
  it('路径 + 字面量初始化简写：路径有值时优先取路径', () => {
    expect(
      resolveBoundString(
        { path: '/x', literalString: 'fallback' },
        { dataModel: { x: 'real' } },
      ),
    ).toBe('real');
  });
  it('路径 + 字面量初始化简写：路径未定义时回退字面量', () => {
    expect(
      resolveBoundString(
        { path: '/x', literalString: 'fallback' },
        { dataModel: {} },
      ),
    ).toBe('fallback');
  });
});

describe('数字 / 布尔 / 字符串数组解析', () => {
  it('数字：字面量、路径、字符串自动转换', () => {
    expect(resolveBoundNumber({ literalNumber: 5 }, { dataModel: {} })).toBe(5);
    expect(resolveBoundNumber({ path: '/n' }, { dataModel: { n: 3 } })).toBe(3);
    expect(resolveBoundNumber({ path: '/n' }, { dataModel: { n: '7' } })).toBe(7);
  });
  it('布尔', () => {
    expect(resolveBoundBoolean({ literalBoolean: true }, { dataModel: {} })).toBe(true);
    expect(resolveBoundBoolean({ path: '/b' }, { dataModel: { b: 'true' } })).toBe(true);
    expect(resolveBoundBoolean({ path: '/b' }, { dataModel: { b: 'false' } })).toBe(false);
  });
  it('字符串数组：literalArray 与 map 转换', () => {
    expect(
      resolveBoundStringArray({ literalArray: ['a', 'b'] }, { dataModel: {} }),
    ).toEqual(['a', 'b']);
    expect(
      resolveBoundStringArray(
        { path: '/sel' },
        { dataModel: { sel: { 0: 'x', 1: 'y' } } },
      ),
    ).toEqual(['x', 'y']);
  });
});

describe('getBoundValueInit', () => {
  it('仅在 path + literal* 同存且 path 处空时返回 init', () => {
    expect(
      getBoundValueInit(
        { path: '/x', literalString: 'init' },
        { dataModel: {} },
      ),
    ).toEqual({ path: '/x', value: 'init' });
  });
  it('path 已有值则不返回 init', () => {
    expect(
      getBoundValueInit(
        { path: '/x', literalString: 'init' },
        { dataModel: { x: 'present' } },
      ),
    ).toBeNull();
  });
  it('仅字面量不返回 init', () => {
    expect(
      getBoundValueInit({ literalString: 'init' }, { dataModel: {} }),
    ).toBeNull();
  });
});

describe('scope 相对路径', () => {
  it('优先绝对路径', () => {
    const dm = { items: { abc: { title: 'inner' } }, title: 'outer' };
    expect(
      resolveBoundString(
        { path: '/title' },
        { dataModel: dm, scope: '/items/abc' },
      ),
    ).toBe('outer');
  });
  it('找不到绝对路径时按 scope 解析', () => {
    const dm = { items: { abc: { title: 'inner' } } };
    expect(
      resolveBoundString({ path: 'title' }, { dataModel: dm, scope: '/items/abc' }),
    ).toBe('inner');
  });
});
