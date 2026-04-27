/**
 * Gemini system prompt —— 按官方 A2UI Agent SDK 的做法，
 * 把完整的 Server-to-Client Schema + Catalog Schema 喂给模型，
 * 让模型精确按 JSON Schema 约束生成输出。
 *
 * 参考：https://github.com/google/A2UI
 *   - specification/v0_8/json/server_to_client.json
 *   - specification/v0_8/json/standard_catalog_definition.json
 *   - agent_sdks/python/src/a2ui/schema/catalog.py → render_as_llm_instructions()
 */

import { STANDARD_CATALOG_ID } from '@a2ui/protocol';

const SERVER_TO_CLIENT_SCHEMA = {
  title: 'A2UI Message Schema',
  description:
    "Describes a JSON payload for an A2UI (Agent to UI) message. A message MUST contain exactly ONE of: 'beginRendering', 'surfaceUpdate', 'dataModelUpdate', or 'deleteSurface'.",
  type: 'object',
  additionalProperties: false,
  properties: {
    beginRendering: {
      type: 'object',
      additionalProperties: false,
      properties: {
        surfaceId: { type: 'string' },
        catalogId: { type: 'string' },
        root: { type: 'string', description: 'The ID of the root component to render.' },
        styles: { type: 'object', additionalProperties: true },
      },
      required: ['root', 'surfaceId'],
    },
    surfaceUpdate: {
      type: 'object',
      additionalProperties: false,
      properties: {
        surfaceId: { type: 'string' },
        catalogId: { type: 'string' },
        components: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              weight: { type: 'number' },
              component: {
                type: 'object',
                description:
                  'MUST contain exactly one key = component type name. Value = props object.',
                additionalProperties: true,
              },
            },
            required: ['id', 'component'],
          },
        },
      },
      required: ['surfaceId', 'components'],
    },
    dataModelUpdate: {
      type: 'object',
      additionalProperties: false,
      properties: {
        surfaceId: { type: 'string' },
        path: { type: 'string' },
        contents: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              key: { type: 'string' },
              valueString: { type: 'string' },
              valueNumber: { type: 'number' },
              valueBoolean: { type: 'boolean' },
              valueMap: {
                type: 'array',
                description: 'Nested map as adjacency list.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    key: { type: 'string' },
                    valueString: { type: 'string' },
                    valueNumber: { type: 'number' },
                    valueBoolean: { type: 'boolean' },
                  },
                  required: ['key'],
                },
              },
            },
            required: ['key'],
          },
        },
      },
      required: ['contents', 'surfaceId'],
    },
    deleteSurface: {
      type: 'object',
      additionalProperties: false,
      properties: { surfaceId: { type: 'string' } },
      required: ['surfaceId'],
    },
  },
};

const CATALOG_SCHEMA = {
  components: {
    Text: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: {
          type: 'object',
          description: 'BoundValue. Use literalString for static text or path for data binding.',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        usageHint: {
          type: 'string',
          enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'caption', 'body'],
        },
      },
      required: ['text'],
    },
    Image: {
      type: 'object',
      additionalProperties: false,
      properties: {
        url: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        altText: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        fit: { type: 'string', enum: ['contain', 'cover', 'fill', 'none', 'scale-down'] },
        usageHint: {
          type: 'string',
          enum: ['icon', 'avatar', 'smallFeature', 'mediumFeature', 'largeFeature', 'header'],
        },
      },
      required: ['url'],
    },
    Icon: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'object',
          additionalProperties: false,
          properties: {
            literalString: {
              type: 'string',
              enum: [
                'accountCircle', 'add', 'arrowBack', 'arrowForward', 'attachFile',
                'calendarToday', 'call', 'camera', 'check', 'close', 'delete', 'download',
                'edit', 'event', 'error', 'favorite', 'favoriteOff', 'folder', 'help', 'home',
                'info', 'locationOn', 'lock', 'lockOpen', 'mail', 'menu', 'moreVert',
                'moreHoriz', 'notificationsOff', 'notifications', 'payment', 'person', 'phone',
                'photo', 'print', 'refresh', 'search', 'send', 'settings', 'share',
                'shoppingCart', 'star', 'starHalf', 'starOff', 'upload', 'visibility',
                'visibilityOff', 'warning',
              ],
            },
            path: { type: 'string' },
          },
        },
      },
      required: ['name'],
    },
    Video: {
      type: 'object',
      additionalProperties: false,
      properties: {
        url: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
      },
      required: ['url'],
    },
    AudioPlayer: {
      type: 'object',
      additionalProperties: false,
      properties: {
        url: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        description: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
      },
      required: ['url'],
    },
    Row: {
      type: 'object',
      additionalProperties: false,
      properties: {
        children: {
          type: 'object',
          additionalProperties: false,
          properties: {
            explicitList: { type: 'array', items: { type: 'string' } },
            template: {
              type: 'object',
              additionalProperties: false,
              properties: { componentId: { type: 'string' }, dataBinding: { type: 'string' } },
              required: ['componentId', 'dataBinding'],
            },
          },
        },
        distribution: {
          type: 'string',
          enum: ['center', 'end', 'spaceAround', 'spaceBetween', 'spaceEvenly', 'start'],
        },
        alignment: { type: 'string', enum: ['start', 'center', 'end', 'stretch'] },
      },
      required: ['children'],
    },
    Column: {
      type: 'object',
      additionalProperties: false,
      properties: {
        children: {
          type: 'object',
          additionalProperties: false,
          properties: {
            explicitList: { type: 'array', items: { type: 'string' } },
            template: {
              type: 'object',
              additionalProperties: false,
              properties: { componentId: { type: 'string' }, dataBinding: { type: 'string' } },
              required: ['componentId', 'dataBinding'],
            },
          },
        },
        distribution: {
          type: 'string',
          enum: ['start', 'center', 'end', 'spaceBetween', 'spaceAround', 'spaceEvenly'],
        },
        alignment: { type: 'string', enum: ['center', 'end', 'start', 'stretch'] },
      },
      required: ['children'],
    },
    List: {
      type: 'object',
      additionalProperties: false,
      properties: {
        children: {
          type: 'object',
          additionalProperties: false,
          properties: {
            explicitList: { type: 'array', items: { type: 'string' } },
            template: {
              type: 'object',
              additionalProperties: false,
              properties: { componentId: { type: 'string' }, dataBinding: { type: 'string' } },
              required: ['componentId', 'dataBinding'],
            },
          },
        },
        direction: { type: 'string', enum: ['vertical', 'horizontal'] },
        alignment: { type: 'string', enum: ['start', 'center', 'end', 'stretch'] },
      },
      required: ['children'],
    },
    Card: {
      type: 'object',
      additionalProperties: false,
      properties: { child: { type: 'string' } },
      required: ['child'],
    },
    Tabs: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tabItems: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: {
                type: 'object',
                additionalProperties: false,
                properties: { literalString: { type: 'string' }, path: { type: 'string' } },
              },
              child: { type: 'string' },
            },
            required: ['title', 'child'],
          },
        },
      },
      required: ['tabItems'],
    },
    Divider: {
      type: 'object',
      additionalProperties: false,
      properties: { axis: { type: 'string', enum: ['horizontal', 'vertical'] } },
    },
    Modal: {
      type: 'object',
      additionalProperties: false,
      properties: { entryPointChild: { type: 'string' }, contentChild: { type: 'string' } },
      required: ['entryPointChild', 'contentChild'],
    },
    Button: {
      type: 'object',
      additionalProperties: false,
      properties: {
        child: { type: 'string' },
        primary: { type: 'boolean' },
        action: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            context: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  key: { type: 'string' },
                  value: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      path: { type: 'string' },
                      literalString: { type: 'string' },
                      literalNumber: { type: 'number' },
                      literalBoolean: { type: 'boolean' },
                    },
                  },
                },
                required: ['key', 'value'],
              },
            },
          },
          required: ['name'],
        },
      },
      required: ['child', 'action'],
    },
    CheckBox: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        value: {
          type: 'object',
          additionalProperties: false,
          properties: { literalBoolean: { type: 'boolean' }, path: { type: 'string' } },
        },
      },
      required: ['label', 'value'],
    },
    TextField: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        text: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        textFieldType: {
          type: 'string',
          enum: ['date', 'longText', 'number', 'shortText', 'obscured'],
        },
        validationRegexp: { type: 'string' },
      },
      required: ['label'],
    },
    DateTimeInput: {
      type: 'object',
      additionalProperties: false,
      properties: {
        value: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        enableDate: { type: 'boolean' },
        enableTime: { type: 'boolean' },
      },
      required: ['value'],
    },
    MultipleChoice: {
      type: 'object',
      additionalProperties: false,
      required: ['selections', 'options'],
      properties: {
        selections: {
          type: 'object',
          additionalProperties: false,
          properties: {
            literalArray: { type: 'array', items: { type: 'string' } },
            path: { type: 'string' },
          },
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label: {
                type: 'object',
                additionalProperties: false,
                properties: { literalString: { type: 'string' }, path: { type: 'string' } },
              },
              value: { type: 'string' },
            },
            required: ['label', 'value'],
          },
        },
        maxAllowedSelections: { type: 'integer' },
        variant: { type: 'string', enum: ['checkbox', 'chips'] },
        filterable: { type: 'boolean' },
      },
    },
    Slider: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: {
          type: 'object',
          additionalProperties: false,
          properties: { literalString: { type: 'string' }, path: { type: 'string' } },
        },
        value: {
          type: 'object',
          additionalProperties: false,
          properties: { literalNumber: { type: 'number' }, path: { type: 'string' } },
        },
        minValue: { type: 'number' },
        maxValue: { type: 'number' },
      },
      required: ['value'],
    },
  },
};

/**
 * 构建 responseJsonSchema —— 用于 Gemini JSON mode 的 constrained decoding。
 * 只保留顶层结构约束，具体字段校验由 system prompt 内的详细 schema 说明覆盖。
 */
export function buildResponseJsonSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      messages: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          description:
            'A2UI server-to-client message. Each object MUST contain exactly one of: beginRendering, surfaceUpdate, dataModelUpdate, deleteSurface.',
          additionalProperties: false,
          properties: {
            beginRendering: { type: 'object' },
            surfaceUpdate: { type: 'object' },
            dataModelUpdate: { type: 'object' },
            deleteSurface: { type: 'object' },
          },
          oneOf: [
            { required: ['beginRendering'] },
            { required: ['surfaceUpdate'] },
            { required: ['dataModelUpdate'] },
            { required: ['deleteSurface'] },
          ],
        },
      },
    },
    required: ['messages'],
  };
}

export function buildSystemPrompt(surfaceId: string): string {
  const s2cStr = JSON.stringify(SERVER_TO_CLIENT_SCHEMA, null, 2);
  const catalogStr = JSON.stringify(CATALOG_SCHEMA, null, 2);

  return `你是一个 A2UI 0.8 协议的 UI 生成 Agent。

# 你的工作
- 接收用户的自然语言请求或上一轮 userAction
- 输出一个 **严格的 JSON 对象**：{ "messages": [...] }，其中 messages 数组包含所有 A2UI server-to-client 消息

# 输出硬性要求（非常重要）
- 只能输出 JSON（不要 Markdown/代码块/解释文字/标签）
- 顶层必须是对象，且必须有且仅有一个字段：messages
- messages 必须是数组，且数组里每一项必须是一个 A2UI 消息对象
- 每条 A2UI 消息对象 **必须且仅能**包含 4 个键之一：beginRendering / surfaceUpdate / dataModelUpdate / deleteSurface
- 严禁输出空对象 {}，也严禁输出 { "foo": ... } 这种协议外字段
- surfaceId 必须等于：${surfaceId}（不要复用历史 surfaceId）

# messages 数组顺序
1) 第 1 个元素必须是 beginRendering，root 固定为 "root"
2) 第 2 个元素起放 1+ 个 surfaceUpdate（必须包含 id="root" 的根组件实例）
3) 随后放 0+ 个 dataModelUpdate

# 必填参数
- 所有消息的 surfaceId 必须等于：${surfaceId}
- 所有 surfaceUpdate 的 catalogId 必须等于：${STANDARD_CATALOG_ID}

# 增量渲染稳定性（参考官方 demo 的做法）
- **组件声明顺序（Top-Down Ordering）**：在 surfaceUpdate.components 中：
  - id="root" 的根组件实例必须是第一项
  - 父组件必须出现在子组件之前（这样客户端可以边到边渲染）
- 建议每次 surfaceUpdate 都包含完整组件邻接表（至少包含 root + 其子树涉及的组件实例）

# dataModelUpdate 约束（减少模型“省略字段”导致的不一致）
- 建议总是显式给出 path
  - 若要写入整个 dataModel：path="/"（或省略也可，但更推荐显式写 "/"）
  - 若只更新某个列表/字段：给出具体 path，如 "/items"

# ===== A2UI Schema（请严格遵守） =====

### Server-to-Client Message Schema:
${s2cStr}

### Component Catalog Schema:
${catalogStr}

# ===== 使用要点 =====

- 组件实例形如：{ "id": "<unique-id>", "component": { "<TypeName>": { ...props } } }
- TypeName 必须是 Catalog 中存在的类型名（Text/Image/Icon/Video/AudioPlayer/Row/Column/List/Card/Tabs/Divider/Modal/Button/CheckBox/TextField/DateTimeInput/MultipleChoice/Slider）
- 根组件实例 id 固定为 "root"
- 容器组件 children 用 explicitList 或 template，不要混用
- template.dataBinding 指向 dataModel 中的 map，map 的每个 value 是 valueMap（不是 valueString）
- 模板内部用相对路径（如 "path":"name"），不要用 "path":"."
- dataModelUpdate.contents 必须严格是 DataEntry[]（key + valueString/valueNumber/valueBoolean/valueMap）
- 不要把 JSON 嵌套进 valueString
- 中文 UI 文案

# ===== 模板库（优先套用，提升稳定性） =====

## 模板选择规则（先选模板再填内容）
- 若用户要“列举/推荐/Top N/清单/列表”：用【模板 A：列表（带图片）】
- 若用户要“介绍一个对象/个人简介/总结/说明”：用【模板 B：卡片（标题 + 正文）】
- 若用户要“填写/报名/注册/登录/提交信息/问卷”：用【模板 C：表单】
- 若用户触发了 userAction：优先延续上一轮的组件结构（必要时用【模板 B】做确认页）
- 任何字段不确定时：先用【模板 B】给出可读的文本，不要输出空对象

## 模板 A：列表（带图片）
{ "messages": [
  { "beginRendering": { "surfaceId": "${surfaceId}", "root": "root", "catalogId": "${STANDARD_CATALOG_ID}" } },
  { "surfaceUpdate": { "surfaceId": "${surfaceId}", "catalogId": "${STANDARD_CATALOG_ID}", "components": [
    { "id": "root", "component": { "Card": { "child": "col" } } },
    { "id": "col", "component": { "Column": { "alignment": "stretch", "children": { "explicitList": ["title", "list"] } } } },
    { "id": "title", "component": { "Text": { "text": { "path": "/title" }, "usageHint": "h4" } } },
    { "id": "list", "component": { "List": { "direction": "vertical", "children": { "template": { "componentId": "itemCard", "dataBinding": "/items" } } } } },
    { "id": "itemCard", "component": { "Card": { "child": "itemRow" } } },
    { "id": "itemRow", "component": { "Row": { "alignment": "center", "children": { "explicitList": ["itemImg", "itemCol"] } } } },
    { "id": "itemImg", "weight": 1, "component": { "Image": { "url": { "path": "imageUrl" }, "altText": { "path": "name" }, "fit": "cover", "usageHint": "smallFeature" } } },
    { "id": "itemCol", "weight": 2, "component": { "Column": { "alignment": "start", "children": { "explicitList": ["itemName", "itemDesc"] } } } },
    { "id": "itemName", "component": { "Text": { "text": { "path": "name" }, "usageHint": "h5" } } },
    { "id": "itemDesc", "component": { "Text": { "text": { "path": "desc" }, "usageHint": "body" } } }
  ] } },
  { "dataModelUpdate": { "surfaceId": "${surfaceId}", "path": "/", "contents": [
    { "key": "title", "valueString": "（替换成列表标题）" },
    { "key": "items", "valueMap": [
      { "key": "i1", "valueMap": [
        { "key": "name", "valueString": "（替换成条目名）" },
        { "key": "desc", "valueString": "（替换成条目描述）" },
        { "key": "imageUrl", "valueString": "（替换成图片 URL）" }
      ] }
    ] }
  ] } }
] }

## 模板 B：卡片（标题 + 正文）
{ "messages": [
  { "beginRendering": { "surfaceId": "${surfaceId}", "root": "root", "catalogId": "${STANDARD_CATALOG_ID}" } },
  { "surfaceUpdate": { "surfaceId": "${surfaceId}", "catalogId": "${STANDARD_CATALOG_ID}", "components": [
    { "id": "root", "component": { "Card": { "child": "col" } } },
    { "id": "col", "component": { "Column": { "alignment": "stretch", "children": { "explicitList": ["title", "body"] } } } },
    { "id": "title", "component": { "Text": { "text": { "path": "/title" }, "usageHint": "h4" } } },
    { "id": "body", "component": { "Text": { "text": { "path": "/body" }, "usageHint": "body" } } }
  ] } },
  { "dataModelUpdate": { "surfaceId": "${surfaceId}", "path": "/", "contents": [
    { "key": "title", "valueString": "（替换成标题）" },
    { "key": "body", "valueString": "（替换成正文）" }
  ] } }
] }

## 模板 C：表单（收集信息 + 提交）
{ "messages": [
  { "beginRendering": { "surfaceId": "${surfaceId}", "root": "root", "catalogId": "${STANDARD_CATALOG_ID}" } },
  { "surfaceUpdate": { "surfaceId": "${surfaceId}", "catalogId": "${STANDARD_CATALOG_ID}", "components": [
    { "id": "root", "component": { "Card": { "child": "col" } } },
    { "id": "col", "component": { "Column": { "alignment": "stretch", "children": { "explicitList": ["title", "field1", "field2", "submit"] } } } },
    { "id": "title", "component": { "Text": { "text": { "path": "/title" }, "usageHint": "h4" } } },
    { "id": "field1", "component": { "TextField": { "label": { "literalString": "字段 1" }, "text": { "path": "/form/field1", "literalString": "" }, "textFieldType": "shortText" } } },
    { "id": "field2", "component": { "TextField": { "label": { "literalString": "字段 2" }, "text": { "path": "/form/field2", "literalString": "" }, "textFieldType": "shortText" } } },
    { "id": "submit", "component": { "Button": { "primary": true, "child": "submitText", "action": { "name": "submitForm", "context": [
      { "key": "field1", "value": { "path": "/form/field1" } },
      { "key": "field2", "value": { "path": "/form/field2" } }
    ] } } } },
    { "id": "submitText", "component": { "Text": { "text": { "literalString": "提交" } } } }
  ] } },
  { "dataModelUpdate": { "surfaceId": "${surfaceId}", "path": "/", "contents": [
    { "key": "title", "valueString": "（替换成表单标题）" },
    { "key": "form", "valueMap": [
      { "key": "field1", "valueString": "" },
      { "key": "field2", "valueString": "" }
    ] }
  ] } }
] }

# 示例（可参考，但优先套用上面的模板库）
{"messages":[{"beginRendering":{"surfaceId":"${surfaceId}","root":"root"}},{"surfaceUpdate":{"surfaceId":"${surfaceId}","catalogId":"${STANDARD_CATALOG_ID}","components":[{"id":"root","component":{"Card":{"child":"col"}}},{"id":"col","component":{"Column":{"alignment":"stretch","children":{"explicitList":["title","list"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"🗺️ 三天旅行计划"},"usageHint":"h4"}}},{"id":"list","component":{"List":{"direction":"vertical","children":{"template":{"componentId":"item","dataBinding":"/days"}}}}},{"id":"item","component":{"Row":{"alignment":"center","children":{"explicitList":["dayLabel","dayDesc"]}}}},{"id":"dayLabel","component":{"Text":{"text":{"path":"label"},"usageHint":"h5"}}},{"id":"dayDesc","component":{"Text":{"text":{"path":"desc"},"usageHint":"body"}}}]}},{"dataModelUpdate":{"surfaceId":"${surfaceId}","contents":[{"key":"days","valueMap":[{"key":"d1","valueMap":[{"key":"label","valueString":"Day 1"},{"key":"desc","valueString":"市区漫步、博物馆、本地小吃"}]},{"key":"d2","valueMap":[{"key":"label","valueString":"Day 2"},{"key":"desc","valueString":"登山一日游"}]},{"key":"d3","valueMap":[{"key":"label","valueString":"Day 3"},{"key":"desc","valueString":"海边日落 + 返程"}]}]}]}}]}

请严格遵守上述 schema 和规则。现在开始处理用户输入。`;
}
