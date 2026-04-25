/**
 * @a2ui/protocol —— A2UI 0.8 协议的 TypeScript 类型定义。
 *
 * 完全按官方协议规范手写实现，不依赖任何已存在的 a2ui 三方包。
 *
 * 协议入口：
 *   - 规范文档:   https://a2ui.org/specification/v0.8-a2ui/
 *   - 标准目录:   https://a2ui.org/specification/v0_8/standard_catalog_definition.json
 *   - 服务端→客户端 schema: https://a2ui.org/specification/v0_8/server_to_client.json
 *   - 客户端→服务端 schema: https://a2ui.org/specification/v0_8/client_to_server.json
 */

export * from './bound-value.js';
export * from './data-model.js';
export * from './messages.js';
export * from './events.js';
export * from './catalog.js';
export * from './components/index.js';
export * from './guards.js';

export const A2UI_PROTOCOL_VERSION = '0.8' as const;
