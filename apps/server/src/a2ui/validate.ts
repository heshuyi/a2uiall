import type { ServerToClientMessage } from '@a2ui/protocol';

/**
 * A2UI v0.8: ServerToClientMessage MUST contain exactly ONE of:
 * beginRendering / surfaceUpdate / dataModelUpdate / deleteSurface
 *
 * 我们在服务端把 agent 输出当作“不可信输入”，因此必须做运行时校验。
 */
export function isValidServerToClientMessage(msg: unknown): msg is ServerToClientMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  const keys = ['beginRendering', 'surfaceUpdate', 'dataModelUpdate', 'deleteSurface'] as const;
  const present = keys.filter((k) => m[k] != null);
  return present.length === 1;
}

