import type { ServerToClientMessage } from '@a2ui/protocol';
import type { Turn } from '../types.js';

export interface AgentInput {
  /** 当前会话所有历史 turn（按时间正序），用于 LLM 上下文。 */
  history: Turn[];
  /** 本轮用户输入。 */
  current: Turn['userInput'];
  /** 服务端为这一轮预先分配的 surfaceId，agent 必须使用它。 */
  surfaceId: string;
}

export interface AgentRunner {
  /**
   * 运行一次 agent，按顺序产出 A2UI server→client 消息。
   * 实现可以 yield 真实的流式增量，也可以一次性产出所有消息。
   */
  run(input: AgentInput): AsyncIterable<ServerToClientMessage>;
}
