import { describe, expect, it, vi } from 'vitest';
import type { ServerToClientMessage } from '@a2ui/protocol';
import { SurfaceStore } from './store.js';

describe('SurfaceStore', () => {
  it('能消费规范 1.5 节示例 stream 并构建 surface', () => {
    const store = new SurfaceStore();
    const stream: ServerToClientMessage[] = [
      {
        surfaceUpdate: {
          surfaceId: 's1',
          components: [
            {
              id: 'root',
              component: { Column: { children: { explicitList: ['profile_card'] } } },
            },
          ],
        },
      },
      {
        surfaceUpdate: {
          surfaceId: 's1',
          components: [
            { id: 'profile_card', component: { Card: { child: 'card_content' } } },
          ],
        },
      },
      {
        surfaceUpdate: {
          surfaceId: 's1',
          components: [
            {
              id: 'card_content',
              component: {
                Column: { children: { explicitList: ['name_text'] } },
              },
            },
            {
              id: 'name_text',
              component: { Text: { text: { literalString: 'A2A Fan' }, usageHint: 'h3' } },
            },
          ],
        },
      },
      { dataModelUpdate: { surfaceId: 's1', contents: [] } },
      { beginRendering: { surfaceId: 's1', root: 'root' } },
    ];
    store.applyMany(stream);
    const s = store.getSurface('s1');
    expect(s?.isReady).toBe(true);
    expect(s?.rootId).toBe('root');
    expect(s?.components.size).toBe(4);
    expect(s?.components.get('name_text')?.component.Text).toBeDefined();
  });

  it('订阅在每次变更触发并提供新 SurfaceState 引用', () => {
    const store = new SurfaceStore();
    const fn = vi.fn();
    const off = store.subscribe('s1', fn);
    store.apply({
      surfaceUpdate: { surfaceId: 's1', components: [{ id: 'r', component: { Text: {} } }] },
    });
    store.apply({
      dataModelUpdate: { surfaceId: 's1', contents: [{ key: 'a', valueString: 'b' }] },
    });
    expect(fn).toHaveBeenCalledTimes(2);
    const calls = fn.mock.calls;
    expect(calls[0]?.[0].version).toBe(1);
    expect(calls[1]?.[0].version).toBe(2);
    off();
  });

  it('deleteSurface 移除并通知 globalListener', () => {
    const store = new SurfaceStore();
    const global = vi.fn();
    store.subscribeAll(global);
    store.apply({
      surfaceUpdate: { surfaceId: 's1', components: [{ id: 'r', component: { Text: {} } }] },
    });
    store.apply({ deleteSurface: { surfaceId: 's1' } });
    expect(store.getSurface('s1')).toBeUndefined();
    expect(global).toHaveBeenLastCalledWith('s1', null);
  });

  it('writeData 直接写 dataModel 路径', () => {
    const store = new SurfaceStore();
    store.writeData('s1', '/form/name', 'Bob');
    expect(store.getSurface('s1')?.dataModel).toEqual({ form: { name: 'Bob' } });
  });
});
