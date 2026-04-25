/**
 * MockAgentRunner —— 没有 GEMINI_API_KEY 时启用，返回写死的演示卡片。
 *
 * 通过简单关键词匹配在 3~4 套场景中切换，覆盖所有重要协议特性：
 * - 纯文本卡片
 * - 卡片 + 列表 + 模板渲染
 * - 表单（输入回写 + Button action）
 * - dataModel 流式追加
 *
 * 这样前端可以在没有 API key 的情况下完整跑通整个链路。
 */

import { STANDARD_CATALOG_ID, type ServerToClientMessage } from '@a2ui/protocol';
import type { AgentInput, AgentRunner } from './types.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockAgentRunner implements AgentRunner {
  async *run(input: AgentInput): AsyncIterable<ServerToClientMessage> {
    const text = (input.current.text ?? '').toLowerCase();
    let scene: 'form' | 'list' | 'card' | 'plain';
    if (input.current.action) {
      scene = 'plain';
    } else if (/(form|表单|登录|注册|提交)/.test(text)) {
      scene = 'form';
    } else if (/(list|列表|todo|任务|清单)/.test(text)) {
      scene = 'list';
    } else if (/(card|卡片|名片|profile|个人)/.test(text)) {
      scene = 'card';
    } else {
      scene = 'plain';
    }

    for (const msg of buildScene(scene, input)) {
      await sleep(40);
      yield msg;
    }
  }
}

function buildScene(
  scene: 'form' | 'list' | 'card' | 'plain',
  input: AgentInput,
): ServerToClientMessage[] {
  const { surfaceId } = input;
  switch (scene) {
    case 'plain':
      return plainScene(surfaceId, input);
    case 'card':
      return cardScene(surfaceId);
    case 'list':
      return listScene(surfaceId);
    case 'form':
      return formScene(surfaceId);
  }
}

function plainScene(surfaceId: string, input: AgentInput): ServerToClientMessage[] {
  let body: string;
  if (input.current.action) {
    const a = input.current.action;
    body = `已收到来自组件 \`${a.sourceComponentId}\` 的动作「${a.actionName}」，附带数据：\n\n\`\`\`json\n${JSON.stringify(a.context, null, 2)}\n\`\`\``;
  } else {
    const userText = input.current.text ?? '';
    body =
      `这是 MOCK 模式的回复（未配置 \`GEMINI_API_KEY\`）。\n\n` +
      `你刚才说：「${userText}」\n\n` +
      `试试输入「卡片」、「列表」、「表单」来看不同的 A2UI 渲染示例。`;
  }
  return [
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          {
            id: 'root',
            component: {
              Card: { child: 'inner' },
            },
          },
          {
            id: 'inner',
            component: {
              Column: {
                alignment: 'start',
                children: { explicitList: ['title', 'body'] },
              },
            },
          },
          {
            id: 'title',
            component: { Text: { text: { literalString: '🤖 MOCK Agent 回复' }, usageHint: 'h4' } },
          },
          {
            id: 'body',
            component: { Text: { text: { literalString: body }, usageHint: 'body' } },
          },
        ],
      },
    },
    { beginRendering: { surfaceId, root: 'root', catalogId: STANDARD_CATALOG_ID } },
  ];
}

function cardScene(surfaceId: string): ServerToClientMessage[] {
  return [
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          { id: 'root', component: { Card: { child: 'col' } } },
          {
            id: 'col',
            component: {
              Column: {
                alignment: 'start',
                children: { explicitList: ['avatar', 'name', 'bio', 'actions'] },
              },
            },
          },
          {
            id: 'avatar',
            component: {
              Image: {
                url: { literalString: 'https://api.dicebear.com/7.x/personas/svg?seed=A2UI' },
                altText: { literalString: 'avatar' },
                usageHint: 'avatar',
              },
            },
          },
          {
            id: 'name',
            component: {
              Text: { text: { path: '/profile/name' }, usageHint: 'h3' },
            },
          },
          {
            id: 'bio',
            component: {
              Text: { text: { path: '/profile/bio' }, usageHint: 'body' },
            },
          },
          {
            id: 'actions',
            component: {
              Row: {
                distribution: 'start',
                children: { explicitList: ['btnFollow', 'btnMsg'] },
              },
            },
          },
          {
            id: 'btnFollow',
            component: {
              Button: {
                primary: true,
                child: 'btnFollowText',
                action: { name: 'follow', context: [] },
              },
            },
          },
          {
            id: 'btnFollowText',
            component: { Text: { text: { literalString: '关注' } } },
          },
          {
            id: 'btnMsg',
            component: {
              Button: {
                child: 'btnMsgText',
                action: { name: 'sendMessage', context: [] },
              },
            },
          },
          {
            id: 'btnMsgText',
            component: { Text: { text: { literalString: '私信' } } },
          },
        ],
      },
    },
    {
      dataModelUpdate: {
        surfaceId,
        contents: [
          {
            key: 'profile',
            valueMap: [
              { key: 'name', valueString: 'A2UI Demo 用户' },
              {
                key: 'bio',
                valueString:
                  '这是 MOCK 模式的卡片场景。Agent 通过 BoundValue.path 把字段绑到 dataModel，前端运行时自动解析渲染。',
              },
            ],
          },
        ],
      },
    },
    { beginRendering: { surfaceId, root: 'root', catalogId: STANDARD_CATALOG_ID } },
  ];
}

function listScene(surfaceId: string): ServerToClientMessage[] {
  return [
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          { id: 'root', component: { Card: { child: 'col' } } },
          {
            id: 'col',
            component: {
              Column: {
                alignment: 'stretch',
                children: { explicitList: ['title', 'list'] },
              },
            },
          },
          {
            id: 'title',
            component: {
              Text: { text: { literalString: '📋 我的待办' }, usageHint: 'h4' },
            },
          },
          {
            id: 'list',
            component: {
              List: {
                direction: 'vertical',
                children: { template: { componentId: 'item', dataBinding: '/todos' } },
              },
            },
          },
          {
            id: 'item',
            component: {
              Row: {
                alignment: 'center',
                distribution: 'spaceBetween',
                children: { explicitList: ['itemTitle', 'itemDone'] },
              },
            },
          },
          {
            id: 'itemTitle',
            component: { Text: { text: { path: 'title' }, usageHint: 'body' } },
          },
          {
            id: 'itemDone',
            component: {
              CheckBox: {
                value: { path: 'done', literalBoolean: false },
                label: { literalString: '完成' },
              },
            },
          },
        ],
      },
    },
    {
      dataModelUpdate: {
        surfaceId,
        contents: [
          {
            key: 'todos',
            valueMap: [
              {
                key: 't1',
                valueMap: [
                  { key: 'title', valueString: '阅读 A2UI 0.8 协议规范' },
                  { key: 'done', valueBoolean: true },
                ],
              },
              {
                key: 't2',
                valueMap: [
                  { key: 'title', valueString: '搭好 monorepo 骨架' },
                  { key: 'done', valueBoolean: true },
                ],
              },
              {
                key: 't3',
                valueMap: [
                  { key: 'title', valueString: '实现 18 个标准组件' },
                  { key: 'done', valueBoolean: true },
                ],
              },
              {
                key: 't4',
                valueMap: [
                  { key: 'title', valueString: '接入 Gemini 流式输出' },
                  { key: 'done', valueBoolean: false },
                ],
              },
            ],
          },
        ],
      },
    },
    { beginRendering: { surfaceId, root: 'root', catalogId: STANDARD_CATALOG_ID } },
  ];
}

function formScene(surfaceId: string): ServerToClientMessage[] {
  return [
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          { id: 'root', component: { Card: { child: 'col' } } },
          {
            id: 'col',
            component: {
              Column: {
                alignment: 'stretch',
                children: { explicitList: ['title', 'name', 'email', 'age', 'subscribe', 'submit'] },
              },
            },
          },
          {
            id: 'title',
            component: { Text: { text: { literalString: '✨ 报名表' }, usageHint: 'h4' } },
          },
          {
            id: 'name',
            component: {
              TextField: {
                label: { literalString: '姓名' },
                text: { path: '/form/name', literalString: '' },
                textFieldType: 'shortText',
              },
            },
          },
          {
            id: 'email',
            component: {
              TextField: {
                label: { literalString: '邮箱' },
                text: { path: '/form/email', literalString: '' },
                textFieldType: 'shortText',
              },
            },
          },
          {
            id: 'age',
            component: {
              Slider: {
                label: { literalString: '年龄' },
                value: { path: '/form/age', literalNumber: 18 },
                minValue: 0,
                maxValue: 100,
              },
            },
          },
          {
            id: 'subscribe',
            component: {
              CheckBox: {
                value: { path: '/form/subscribe', literalBoolean: true },
                label: { literalString: '订阅产品更新邮件' },
              },
            },
          },
          {
            id: 'submit',
            component: {
              Button: {
                primary: true,
                child: 'submitText',
                action: {
                  name: 'submitForm',
                  context: [
                    { key: 'name', value: { path: '/form/name' } },
                    { key: 'email', value: { path: '/form/email' } },
                    { key: 'age', value: { path: '/form/age' } },
                    { key: 'subscribe', value: { path: '/form/subscribe' } },
                  ],
                },
              },
            },
          },
          {
            id: 'submitText',
            component: { Text: { text: { literalString: '提交' } } },
          },
        ],
      },
    },
    { beginRendering: { surfaceId, root: 'root', catalogId: STANDARD_CATALOG_ID } },
  ];
}
