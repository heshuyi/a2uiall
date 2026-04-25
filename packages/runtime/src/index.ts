/**
 * @a2ui/runtime —— A2UI 0.8 客户端运行时（手写实现，不依赖任何 a2ui 三方包）。
 *
 * 框架无关核心 API：
 *   - parseSSEStream / parseJSONLStream：JSONL 流解析
 *   - SurfaceStore：多 surface 内存模型 + 订阅
 *   - applyDataModelUpdate / writePathImmutable：数据模型操作
 *   - resolveBoundValue 系列 + getBoundValueInit：BoundValue 求值
 *   - resolveChildren：容器子元素（explicitList / template）展开
 *   - createA2UIClient：把上面这些缝合起来的便利入口
 *
 * React 适配 API（按需 `import { ... } from '@a2ui/runtime/react'`）。
 */

export * from './path.js';
export * from './data-model.js';
export * from './bound-value.js';
export * from './children.js';
export * from './parser.js';
export * from './store.js';
export * from './client.js';
