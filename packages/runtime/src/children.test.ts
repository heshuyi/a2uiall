import { describe, expect, it } from 'vitest';
import { resolveChildren } from './children.js';

describe('resolveChildren', () => {
  it('explicitList 直接展开', () => {
    const out = resolveChildren({ explicitList: ['a', 'b', 'c'] }, {});
    expect(out.map((x) => x.componentId)).toEqual(['a', 'b', 'c']);
    expect(out[0]?.scope).toBeUndefined();
  });
  it('template + map 数据迭代', () => {
    const dm = {
      items: {
        x: { title: 'A' },
        y: { title: 'B' },
      },
    };
    const out = resolveChildren(
      { template: { componentId: 'item-tpl', dataBinding: '/items' } },
      dm,
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ componentId: 'item-tpl', scope: '/items/x' });
    expect(out[1]).toMatchObject({ componentId: 'item-tpl', scope: '/items/y' });
  });
  it('template 数据缺失时返回空', () => {
    const out = resolveChildren(
      { template: { componentId: 'tpl', dataBinding: '/missing' } },
      {},
    );
    expect(out).toEqual([]);
  });
});
