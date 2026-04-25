/**
 * 容器组件（Row / Column / List）的子元素解析。
 *
 * - explicitList → 直接得到 [{ id }]
 * - template     → 取 dataModel 中 dataBinding 指向的 map，
 *                  对每个 value 复用同一个 componentId，并附带本项的 scope 路径
 */

import type { ChildrenSpec, DataModelObject } from '@a2ui/protocol';
import { isExplicitChildren, isTemplateChildren } from '@a2ui/protocol';
import { joinPath, readPath, splitPath } from './path.js';

/** 解析后的子项：每一项指向 components map 的某个 id，并可能带 scope。 */
export interface ResolvedChild {
  /** 用于 React key，区分模板内同 id 但不同数据项的多次渲染。 */
  reactKey: string;
  /** 实际要渲染的组件 id（在 surface.components 中查找）。 */
  componentId: string;
  /** 模板项的 scope 路径；非模板时为 undefined。 */
  scope?: string;
}

export function resolveChildren(
  spec: ChildrenSpec | undefined,
  dataModel: DataModelObject,
): ResolvedChild[] {
  if (!spec) return [];

  if (isExplicitChildren(spec)) {
    return spec.explicitList.map((id, idx) => ({
      reactKey: `${id}#${idx}`,
      componentId: id,
    }));
  }

  if (isTemplateChildren(spec)) {
    const { componentId, dataBinding } = spec.template;
    const map = readPath(dataModel, dataBinding);
    if (!map || typeof map !== 'object') return [];
    return Object.keys(map as Record<string, unknown>).map((key, idx) => ({
      reactKey: `${componentId}#${dataBinding}#${key}#${idx}`,
      componentId,
      scope: joinPath([...splitPath(dataBinding), key]),
    }));
  }

  return [];
}
