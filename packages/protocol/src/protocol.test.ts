import { describe, expect, it } from 'vitest';
import {
  A2UI_PROTOCOL_VERSION,
  STANDARD_CATALOG_ID,
  isBeginRendering,
  isClientError,
  isDataModelUpdate,
  isDeleteSurface,
  isExplicitChildren,
  isKnownStandardType,
  isStandardComponent,
  isSurfaceUpdate,
  isTemplateChildren,
  isUserAction,
  readStandardComponent,
} from './index.js';
import type {
  ClientToServerMessage,
  ComponentInstance,
  ServerToClientMessage,
  StandardComponent,
} from './index.js';

describe('协议常量', () => {
  it('版本与标准 catalog id 应正确', () => {
    expect(A2UI_PROTOCOL_VERSION).toBe('0.8');
    expect(STANDARD_CATALOG_ID).toBe(
      'https://a2ui.org/specification/v0_8/standard_catalog_definition.json',
    );
  });
});

describe('服务端→客户端消息守卫', () => {
  it('isSurfaceUpdate 仅匹配带 surfaceUpdate 的消息', () => {
    const m: ServerToClientMessage = {
      surfaceUpdate: {
        surfaceId: 's1',
        components: [
          { id: 'root', component: { Text: { text: { literalString: 'Hi' } } } },
        ],
      },
    };
    expect(isSurfaceUpdate(m)).toBe(true);
    expect(isDataModelUpdate(m)).toBe(false);
    expect(isBeginRendering(m)).toBe(false);
    expect(isDeleteSurface(m)).toBe(false);
  });

  it('isDataModelUpdate / isBeginRendering / isDeleteSurface 各自独立', () => {
    const dm: ServerToClientMessage = {
      dataModelUpdate: {
        surfaceId: 's1',
        contents: [{ key: 'name', valueString: 'Bob' }],
      },
    };
    const br: ServerToClientMessage = {
      beginRendering: { surfaceId: 's1', root: 'root' },
    };
    const ds: ServerToClientMessage = { deleteSurface: { surfaceId: 's1' } };
    expect(isDataModelUpdate(dm)).toBe(true);
    expect(isBeginRendering(br)).toBe(true);
    expect(isDeleteSurface(ds)).toBe(true);
  });
});

describe('客户端→服务端消息守卫', () => {
  it('userAction / error 互斥', () => {
    const a: ClientToServerMessage = {
      userAction: {
        name: 'submit',
        surfaceId: 's1',
        sourceComponentId: 'btn',
        timestamp: '2026-04-25T07:00:00Z',
        context: { foo: 'bar' },
      },
    };
    const e: ClientToServerMessage = { error: { message: 'oops' } };
    expect(isUserAction(a)).toBe(true);
    expect(isClientError(a)).toBe(false);
    expect(isUserAction(e)).toBe(false);
    expect(isClientError(e)).toBe(true);
  });
});

describe('容器子元素守卫', () => {
  it('explicitList vs template', () => {
    expect(isExplicitChildren({ explicitList: ['a', 'b'] })).toBe(true);
    expect(
      isTemplateChildren({
        template: { componentId: 'item-tpl', dataBinding: '/items' },
      }),
    ).toBe(true);
  });
});

describe('标准目录组件识别', () => {
  it('isKnownStandardType 仅识别 18 个内置类型', () => {
    expect(isKnownStandardType('Text')).toBe(true);
    expect(isKnownStandardType('Slider')).toBe(true);
    expect(isKnownStandardType('SignaturePad')).toBe(false);
  });

  it('isStandardComponent 检查单键 + 类型名', () => {
    const c: StandardComponent = { Text: { text: { literalString: 'Hello' } } };
    expect(isStandardComponent(c)).toBe(true);
    expect(isStandardComponent({ Text: {}, Image: {} })).toBe(false);
    expect(isStandardComponent({ NotInCatalog: {} })).toBe(false);
  });

  it('readStandardComponent 返回 type + props', () => {
    const inst: ComponentInstance = {
      id: 'btn',
      component: {
        Button: {
          child: 'btn_text',
          action: { name: 'go' },
        },
      },
    };
    const r = readStandardComponent(inst);
    expect(r?.type).toBe('Button');
    expect((r?.props as { action: { name: string } }).action.name).toBe('go');
  });
});

describe('类型层级 sanity check（编译期）', () => {
  it('能构造一条完整 surfaceUpdate（来自规范 1.5 节示例的精简版）', () => {
    const message: ServerToClientMessage = {
      surfaceUpdate: {
        surfaceId: 's1',
        components: [
          {
            id: 'root',
            component: {
              Column: { children: { explicitList: ['profile_card'] } },
            },
          },
          {
            id: 'profile_card',
            component: { Card: { child: 'card_content' } },
          },
          {
            id: 'card_content',
            component: {
              Column: {
                children: { explicitList: ['name_text'] },
              },
            },
          },
          {
            id: 'name_text',
            component: {
              Text: { text: { literalString: 'A2A Fan' }, usageHint: 'h3' },
            },
          },
        ],
      },
    };
    expect(message.surfaceUpdate.components).toHaveLength(4);
  });
});
