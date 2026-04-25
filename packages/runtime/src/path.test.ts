import { describe, expect, it } from 'vitest';
import { joinPath, readPath, readPathWithScope, splitPath, writePath } from './path.js';

describe('splitPath', () => {
  it('处理各种边界形式', () => {
    expect(splitPath(undefined)).toEqual([]);
    expect(splitPath('')).toEqual([]);
    expect(splitPath('/')).toEqual([]);
    expect(splitPath('user')).toEqual(['user']);
    expect(splitPath('/user')).toEqual(['user']);
    expect(splitPath('/user/name')).toEqual(['user', 'name']);
    expect(splitPath('/a//b/')).toEqual(['a', 'b']);
  });
});

describe('joinPath', () => {
  it('回拼路径', () => {
    expect(joinPath([])).toBe('/');
    expect(joinPath(['user'])).toBe('/user');
    expect(joinPath(['user', 'name'])).toBe('/user/name');
  });
});

describe('readPath', () => {
  const m = { user: { name: 'Bob', age: 30 }, ok: true };
  it('能读出嵌套值', () => {
    expect(readPath(m, '/user/name')).toBe('Bob');
    expect(readPath(m, 'user/age')).toBe(30);
    expect(readPath(m, '/ok')).toBe(true);
  });
  it('找不到返回 undefined', () => {
    expect(readPath(m, '/nope')).toBeUndefined();
    expect(readPath(m, '/user/nope/deeper')).toBeUndefined();
  });
});

describe('writePath', () => {
  it('能创建嵌套对象并写值', () => {
    const m = {};
    writePath(m, '/user/name', 'Bob');
    expect(m).toEqual({ user: { name: 'Bob' } });
  });
});

describe('readPathWithScope', () => {
  it('优先按绝对路径，找不到则按 scope 拼接', () => {
    const m = { items: { abc: { title: 'Hi' } } };
    expect(readPathWithScope(m, '/items/abc/title', undefined)).toBe('Hi');
    expect(readPathWithScope(m, 'title', '/items/abc')).toBe('Hi');
    expect(readPathWithScope(m, '/title', '/items/abc')).toBeUndefined();
  });
});
