/**
 * GeminiAgentRunner —— 使用 @google/genai SDK 的 JSON mode + responseJsonSchema
 * 实现流式接收并逐条 yield A2UI server-to-client 消息。
 *
 * 核心设计：
 * 1. responseMimeType: "application/json" —— Gemini constrained decoding 保证输出合法 JSON
 * 2. responseJsonSchema —— API 层强制 { messages: [...] } 结构
 * 3. 流式渐进提取 —— 用花括号深度追踪从 JSON 数组中逐步提取完整消息对象（不依赖换行）
 * 4. beginRendering 一定是首条消息（强制注入 + 去重）
 * 5. 大消息自动分片，前端逐步渲染
 * 6. 每次调用的 I/O 写日志到 apps/server/log/
 */

import { GoogleGenAI } from '@google/genai';
import { type ServerToClientMessage } from '@a2ui/protocol';
import { env } from '../env.js';
import type { Turn } from '../types.js';
import type { AgentInput, AgentRunner } from './types.js';
import { buildSystemPrompt, buildResponseJsonSchema } from './prompt.js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STREAM_STEP_DELAY_MS = 25;
const SURFACE_UPDATE_BATCH_SIZE = 4;
const DATA_MODEL_BATCH_SIZE = 1;

export class GeminiAgentRunner implements AgentRunner {
  private readonly ai: GoogleGenAI;

  constructor() {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 未设置');
    this.ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        baseUrl: env.GEMINI_BASE_URL,
        timeout: env.GEMINI_TIMEOUT_MS,
      },
    });
  }

  async *run(input: AgentInput): AsyncIterable<ServerToClientMessage> {
    const systemPrompt = buildSystemPrompt(input.surfaceId);
    const userPrompt = formatUserPrompt(input);

    const contents = [
      ...input.history.flatMap((t) => historyToContents(t)),
      { role: 'user', parts: [{ text: userPrompt }] },
    ];

    const startedAt = new Date();
    const logCtx = {
      surfaceId: input.surfaceId,
      startedAt: startedAt.toISOString(),
      model: env.GEMINI_MODEL,
      isMock: false,
    };
    const logBase = { ...logCtx, systemPrompt, userPrompt, contents };

    let stream: AsyncIterable<{ text?: string }>;
    try {
      stream = (await this.ai.models.generateContentStream({
        model: env.GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: buildResponseJsonSchema() as any,
        },
      })) as AsyncIterable<{ text?: string }>;
    } catch (e) {
      void writeTurnLog({ ...logBase, rawOutput: '', parsedMessages: [], error: formatUpstreamError(e) });
      throw new Error(formatUpstreamError(e));
    }

    let fullText = '';
    let beginSent = false;
    let extractionCursor = 0;
    const parsedForLog: ServerToClientMessage[] = [];

    // ── 流式渐进提取 ──
    try {
      for await (const chunk of stream) {
        const delta = (chunk as any)?.text ?? '';
        if (!delta) continue;
        fullText += delta;

        const { messages, nextCursor } = extractCompleteMessages(fullText, extractionCursor);
        extractionCursor = nextCursor;

        for (const raw of messages) {
          const msg = patchSurfaceId(raw, input.surfaceId);
          yield* this.yieldMessage(msg, parsedForLog, input.surfaceId, beginSent);
          if ('beginRendering' in (msg as any)) beginSent = true;
          if (!beginSent) beginSent = true;
        }
      }
    } catch (e) {
      void writeTurnLog({ ...logBase, rawOutput: fullText, parsedMessages: parsedForLog, error: formatUpstreamError(e) });
      throw new Error(formatUpstreamError(e));
    }

    // ── 兜底：完整解析 fullText，补发流式阶段可能遗漏的消息 ──
    const allMessages = parseFullOutput(fullText, input.surfaceId);
    if (allMessages.length > countTopLevelMessages(parsedForLog)) {
      for (const msg of allMessages) {
        const type = getMessageType(msg);
        if (type && !parsedForLog.some((m) => getMessageType(m) === type)) {
          console.warn(`[a2ui/server] 兜底补发遗漏的 ${type} 消息`);
          yield* this.yieldMessage(msg, parsedForLog, input.surfaceId, beginSent);
          if (!beginSent) beginSent = true;
        }
      }
    }

    if (parsedForLog.length === 0 && allMessages.length === 0) {
      const errMsgs = errorMessages(input.surfaceId, `Gemini 输出无法解析为有效的 A2UI 消息。\n\n原文：\n${fullText.slice(0, 400)}`);
      for (const m of errMsgs) {
        parsedForLog.push(m);
        yield m;
      }
    }

    void writeTurnLog({ ...logBase, rawOutput: fullText, parsedMessages: parsedForLog });
  }

  private async *yieldMessage(
    msg: ServerToClientMessage,
    parsedForLog: ServerToClientMessage[],
    surfaceId: string,
    beginSent: boolean,
  ): AsyncIterable<ServerToClientMessage> {
    if (!beginSent && !('beginRendering' in (msg as any))) {
      const begin = { beginRendering: { surfaceId, root: 'root' } } as ServerToClientMessage;
      parsedForLog.push(begin);
      yield begin;
      await sleep(STREAM_STEP_DELAY_MS);
    }
    if ('beginRendering' in (msg as any) && beginSent) {
      return;
    }
    for await (const piece of explodeMessageForStreaming(msg)) {
      parsedForLog.push(piece);
      yield piece;
      await sleep(STREAM_STEP_DELAY_MS);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 渐进式 JSON 提取 —— 从流式累积的 JSON 文本中逐步提取 messages 数组内的完整对象
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 从 { "messages": [ {obj1}, {obj2}, ... ] } 的流式文本中，
 * 用花括号深度追踪提取已完成的顶层对象。不依赖换行符。
 */
function extractCompleteMessages(
  text: string,
  startFrom: number,
): { messages: ServerToClientMessage[]; nextCursor: number } {
  // 首次：跳过 '{"messages":[' 部分，定位到数组内容开头
  if (startFrom === 0) {
    const arrayStart = text.indexOf('[');
    if (arrayStart === -1) return { messages: [], nextCursor: 0 };
    startFrom = arrayStart + 1;
  }

  const messages: ServerToClientMessage[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objStart = -1;
  let nextCursor = startFrom;

  for (let i = startFrom; i < text.length; i++) {
    const c = text[i];

    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (c === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        const objStr = text.slice(objStart, i + 1);
        try {
          messages.push(JSON.parse(objStr) as ServerToClientMessage);
        } catch {
          console.warn('[a2ui/server] extractCompleteMessages: JSON.parse 失败', objStr.slice(0, 200));
        }
        nextCursor = i + 1;
        objStart = -1;
      }
    }
  }

  return { messages, nextCursor };
}

// ══════════════════════════════════════════════════════════════════════════════
// 完整输出解析（兜底 / 非流式）
// ══════════════════════════════════════════════════════════════════════════════

function parseFullOutput(text: string, surfaceId: string): ServerToClientMessage[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    const messages: unknown[] = Array.isArray(parsed?.messages) ? parsed.messages : Array.isArray(parsed) ? parsed : [];
    return messages
      .filter((m): m is ServerToClientMessage => m != null && typeof m === 'object')
      .map((m) => patchSurfaceId(m as ServerToClientMessage, surfaceId));
  } catch {
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ══════════════════════════════════════════════════════════════════════════════

function patchSurfaceId(msg: ServerToClientMessage, surfaceId: string): ServerToClientMessage {
  const m = msg as any;
  if (m.surfaceUpdate && !m.surfaceUpdate.surfaceId) m.surfaceUpdate.surfaceId = surfaceId;
  if (m.dataModelUpdate && !m.dataModelUpdate.surfaceId) m.dataModelUpdate.surfaceId = surfaceId;
  if (m.beginRendering && !m.beginRendering.surfaceId) m.beginRendering.surfaceId = surfaceId;
  return msg;
}

function getMessageType(msg: ServerToClientMessage): string | null {
  const m = msg as any;
  if (m.beginRendering) return 'beginRendering';
  if (m.surfaceUpdate) return 'surfaceUpdate';
  if (m.dataModelUpdate) return 'dataModelUpdate';
  if (m.deleteSurface) return 'deleteSurface';
  return null;
}

function countTopLevelMessages(msgs: ServerToClientMessage[]): number {
  const types = new Set(msgs.map(getMessageType).filter(Boolean));
  return types.size;
}

async function* explodeMessageForStreaming(
  msg: ServerToClientMessage,
): AsyncIterable<ServerToClientMessage> {
  if ('surfaceUpdate' in (msg as any)) {
    const su = (msg as any).surfaceUpdate as { surfaceId: string; catalogId?: string; components?: any[] };
    const comps = Array.isArray(su.components) ? su.components : [];
    if (comps.length <= SURFACE_UPDATE_BATCH_SIZE) {
      yield msg;
      return;
    }
    for (let i = 0; i < comps.length; i += SURFACE_UPDATE_BATCH_SIZE) {
      yield {
        surfaceUpdate: { ...su, components: comps.slice(i, i + SURFACE_UPDATE_BATCH_SIZE) },
      } as ServerToClientMessage;
    }
    return;
  }

  if ('dataModelUpdate' in (msg as any)) {
    const du = (msg as any).dataModelUpdate as { surfaceId: string; path?: string; contents?: any[] };
    const contents = Array.isArray(du.contents) ? du.contents : [];
    if (contents.length <= DATA_MODEL_BATCH_SIZE) {
      yield msg;
      return;
    }
    for (let i = 0; i < contents.length; i += DATA_MODEL_BATCH_SIZE) {
      yield {
        dataModelUpdate: { ...du, contents: contents.slice(i, i + DATA_MODEL_BATCH_SIZE) },
      } as ServerToClientMessage;
    }
    return;
  }

  yield msg;
}

// ══════════════════════════════════════════════════════════════════════════════
// 日志 / 格式化
// ══════════════════════════════════════════════════════════════════════════════

async function writeTurnLog(payload: {
  surfaceId: string;
  startedAt: string;
  model: string;
  isMock: boolean;
  systemPrompt: string;
  userPrompt: string;
  contents: unknown;
  rawOutput: string;
  parsedMessages: ServerToClientMessage[];
  error?: string;
}) {
  try {
    const logDir = path.resolve(process.cwd(), 'log');
    await mkdir(logDir, { recursive: true });
    const ts = payload.startedAt.replace(/[:.]/g, '-');
    const safeSurface = payload.surfaceId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${ts}__${safeSurface}.json`;
    const filePath = path.join(logDir, filename);
    await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // 不要因为日志写入失败影响主流程
  }
}

function formatUpstreamError(e: unknown): string {
  const err = e as { name?: string; message?: string; stack?: string; cause?: unknown };
  const base = err?.message ? String(err.message) : String(e);
  const cause = (err as { cause?: { message?: string } })?.cause;
  const causeMsg =
    cause && typeof cause === 'object' && 'message' in cause ? String((cause as any).message) : '';
  const hint =
    /fetch failed/i.test(base) || /sending request/i.test(base)
      ? `\n\n可能原因：当前网络无法直连 Google（DNS/防火墙/代理），或需要在 apps/server/.env 配置 HTTP(S)_PROXY。`
      : '';
  const stackHint = err?.stack ? `\n\nstack:\n${String(err.stack).slice(0, 1200)}` : '';
  return `exception ${err?.name ?? 'Error'}: ${base}${causeMsg ? ` (cause: ${causeMsg})` : ''}${hint}${stackHint}`;
}

function formatUserPrompt(input: AgentInput): string {
  if (input.current.action) {
    const a = input.current.action;
    return [
      `用户在上一轮 surface 中触发了组件操作。`,
      `- sourceComponentId: ${a.sourceComponentId}`,
      `- actionName: ${a.actionName}`,
      `- 上下文数据：`,
      '```json',
      JSON.stringify(a.context, null, 2),
      '```',
      '请基于以上 action 给出下一个 surface（A2UI JSON）。',
    ].join('\n');
  }
  return input.current.text ?? '（空消息）';
}

function historyToContents(t: Turn): Array<{ role: string; parts: Array<{ text: string }> }> {
  const userText = t.userInput.text
    ? t.userInput.text
    : t.userInput.action
      ? `[action ${t.userInput.action.actionName}] ${JSON.stringify(t.userInput.action.context)}`
      : '';
  const agentText = JSON.stringify({ messages: t.agentMessages });
  return [
    { role: 'user', parts: [{ text: userText }] },
    { role: 'model', parts: [{ text: agentText }] },
  ];
}

function errorMessages(surfaceId: string, errText: string): ServerToClientMessage[] {
  return [
    { beginRendering: { surfaceId, root: 'errRoot' } } as ServerToClientMessage,
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          { id: 'errRoot', component: { Card: { child: 'errBody' } } },
          { id: 'errBody', component: { Text: { text: { literalString: errText }, usageHint: 'body' } } },
        ],
      },
    } as unknown as ServerToClientMessage,
  ];
}
