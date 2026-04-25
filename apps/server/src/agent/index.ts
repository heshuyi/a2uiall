import { isMock } from '../env.js';
import type { AgentRunner } from './types.js';
import { MockAgentRunner } from './mock.js';

export async function createAgent(): Promise<AgentRunner> {
  if (isMock) {
    console.warn('[a2ui/server] 未检测到 GEMINI_API_KEY，启用 MOCK Agent');
    return new MockAgentRunner();
  }
  const { GeminiAgentRunner } = await import('./gemini.js');
  return new GeminiAgentRunner();
}

export type { AgentRunner } from './types.js';
