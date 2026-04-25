/**
 * GeminiAgentRunner —— 调用 @google/genai SDK，真实流式接收 NDJSON 并按行
 * 解析为 A2UI server-to-client 消息，逐条 yield 给 SSE。
 *
 * 核心保障：
 * 1. beginRendering 一定是首条消息（强制注入 + 去重）
 * 2. 大消息自动分片，前端逐步渲染
 * 3. 模型输出不合规时自动修正（normalize / wrap / unwrap）
 * 4. 每次调用的 I/O 写日志到 apps/server/log/
 */

import { GoogleGenAI } from '@google/genai';
import { STANDARD_CATALOG_ID, type ServerToClientMessage } from '@a2ui/protocol';
import { env } from '../env.js';
import type { Turn } from '../types.js';
import type { AgentInput, AgentRunner } from './types.js';
import { buildSystemPrompt } from './prompt.js';
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

    let stream: AsyncGenerator<Awaited<ReturnType<typeof this.ai.models.generateContent>>>;
    try {
      stream = (await this.ai.models.generateContentStream({
        model: env.GEMINI_MODEL,
        contents,
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
      })) as unknown as AsyncGenerator<Awaited<ReturnType<typeof this.ai.models.generateContent>>>;
    } catch (e) {
      void writeTurnLog({ ...logBase, rawOutput: '', parsedMessages: [], error: formatUpstreamError(e) });
      throw new Error(formatUpstreamError(e));
    }

    let buf = '';
    let anyYielded = false;
    let fullText = '';
    let beginSent = false;
    const parsedForLog: ServerToClientMessage[] = [];

    async function* yieldMessages(msgs: ServerToClientMessage[]): AsyncIterable<ServerToClientMessage> {
      for (const m of msgs) {
        if (!beginSent && !('beginRendering' in (m as any))) {
          beginSent = true;
          anyYielded = true;
          const begin = { beginRendering: { surfaceId: input.surfaceId, root: 'root' } } as ServerToClientMessage;
          parsedForLog.push(begin);
          yield begin;
          await sleep(STREAM_STEP_DELAY_MS);
        }
        if ('beginRendering' in (m as any)) {
          if (beginSent) continue;
          beginSent = true;
        }
        anyYielded = true;
        for await (const piece of explodeMessageForStreaming(m)) {
          parsedForLog.push(piece);
          yield piece;
          await sleep(STREAM_STEP_DELAY_MS);
        }
      }
    }

    try {
      for await (const chunk of stream) {
        const delta = (chunk as any)?.text ?? '';
        if (!delta) continue;
        fullText += delta;
        buf += delta;
        const { lines, rest } = splitCompleteLines(buf);
        buf = rest;
        for (const line of lines) {
          yield* yieldMessages(parseNdjsonLineToMessages(line, input.surfaceId));
        }
      }
    } catch (e) {
      void writeTurnLog({ ...logBase, rawOutput: fullText, parsedMessages: parsedForLog, error: formatUpstreamError(e) });
      throw new Error(formatUpstreamError(e));
    }

    if (buf.trim().length > 0) {
      yield* yieldMessages(parseNdjsonLineToMessages(buf, input.surfaceId));
    }

    if (!anyYielded) {
      const messages = parseGeminiOutput(fullText, input.surfaceId);
      if (messages.length > 0) {
        const begin = { beginRendering: { surfaceId: input.surfaceId, root: 'root' } } as ServerToClientMessage;
        parsedForLog.push(begin);
        yield begin;
        await sleep(STREAM_STEP_DELAY_MS);
        for (const m of messages) {
          if ('beginRendering' in (m as any)) continue;
          for await (const piece of explodeMessageForStreaming(m)) {
            parsedForLog.push(piece);
            yield piece;
            await sleep(STREAM_STEP_DELAY_MS);
          }
        }
      }
    }

    void writeTurnLog({ ...logBase, rawOutput: fullText, parsedMessages: parsedForLog });
  }
}

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

function parseGeminiOutput(text: string, surfaceId: string): ServerToClientMessage[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return errorMessages(surfaceId, `Gemini 输出无法解析为 JSON：${(e as Error).message}\n\n原文：\n${cleaned.slice(0, 400)}`);
  }
  const messages = (parsed as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return errorMessages(surfaceId, 'Gemini 输出缺少 messages 数组');
  }
  const list = (messages as ServerToClientMessage[]).map((m) => normalizeMessage(m));

  // 韧性兜底：如果 Gemini 没给 beginRendering，自动从第一个 surfaceUpdate 推断 root 并补一个
  const hasBegin = list.some((m) => 'beginRendering' in m);
  if (!hasBegin) {
    const firstSurfaceUpdate = list.find(
      (m): m is ServerToClientMessage & { surfaceUpdate: { components: Array<{ id: string }> } } =>
        'surfaceUpdate' in m,
    );
    const rootId =
      firstSurfaceUpdate?.surfaceUpdate.components.find((c) => c.id === 'root')?.id ??
      firstSurfaceUpdate?.surfaceUpdate.components[0]?.id;
    if (rootId) {
      list.push({ beginRendering: { surfaceId, root: rootId } } as ServerToClientMessage);
    }
  }
  return list;
}

function splitCompleteLines(s: string): { lines: string[]; rest: string } {
  // 兼容 \r\n / \n。只处理“完整行”，最后一行留在 rest 等下一 chunk 补齐。
  const parts = s.split(/\r?\n/);
  if (parts.length <= 1) return { lines: [], rest: s };
  const rest = parts.pop() ?? '';
  const lines = parts.map((x) => x.trim()).filter((x) => x.length > 0);
  return { lines, rest };
}

function parseNdjsonLineToMessages(line: string, surfaceId: string): ServerToClientMessage[] {
  const cleaned = line.trim();
  if (!cleaned) return [];
  // 容错：模型偶尔会输出 ``` / 前后空白
  if (cleaned === '```' || cleaned.toLowerCase() === '```json') return [];
  if (cleaned === '[DONE]') return [];

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    // 如果不是合法 JSON 行，忽略（避免整条流被打断）
    return [];
  }

  // 容错：如果仍然输出了 { messages: [...] }，拆开
  if (obj && typeof obj === 'object' && 'messages' in (obj as any) && Array.isArray((obj as any).messages)) {
    return ((obj as any).messages as ServerToClientMessage[]).map((m) => normalizeMessage(m));
  }

  // 只接受“合法顶层消息”，避免模型输出半成品 JSON（组件实例/裸 valueMap）污染前端。
  if (!looksLikeTopLevelMessage(obj)) {
    // 兼容：模型有时会直接输出单个组件实例 {id, component:{...}}，这里自动包成 surfaceUpdate
    if (looksLikeComponentInstance(obj)) {
      return [
        {
          surfaceUpdate: {
            surfaceId,
            catalogId: STANDARD_CATALOG_ID,
            components: [obj],
          },
        } as unknown as ServerToClientMessage,
      ];
    }
    // 兼容：模型有时会直接输出单个 data entry {key, valueString/...}，包成 dataModelUpdate
    if (looksLikeDataEntry(obj)) {
      return [
        normalizeMessage({
          dataModelUpdate: { surfaceId, contents: [obj] },
        } as unknown as ServerToClientMessage),
      ];
    }
    return [];
  }

  // 普通：一行一个 message
  const msg = obj as ServerToClientMessage;
  // surfaceId 防呆：如果模型没填，强制补上（尽量不影响渲染）
  if ('surfaceUpdate' in (msg as any) && (msg as any).surfaceUpdate && !(msg as any).surfaceUpdate.surfaceId) {
    (msg as any).surfaceUpdate.surfaceId = surfaceId;
  }
  if ('dataModelUpdate' in (msg as any) && (msg as any).dataModelUpdate && !(msg as any).dataModelUpdate.surfaceId) {
    (msg as any).dataModelUpdate.surfaceId = surfaceId;
  }
  if ('beginRendering' in (msg as any) && (msg as any).beginRendering && !(msg as any).beginRendering.surfaceId) {
    (msg as any).beginRendering.surfaceId = surfaceId;
  }
  return [normalizeMessage(msg)];
}

function looksLikeTopLevelMessage(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as any;
  return Boolean(o.surfaceUpdate || o.dataModelUpdate || o.beginRendering || o.deleteSurface || o.messages);
}

function looksLikeComponentInstance(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as any;
  return typeof o.id === 'string' && o.component && typeof o.component === 'object';
}

function looksLikeDataEntry(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as any;
  if (typeof o.key !== 'string') return false;
  return (
    Object.prototype.hasOwnProperty.call(o, 'valueString') ||
    Object.prototype.hasOwnProperty.call(o, 'valueNumber') ||
    Object.prototype.hasOwnProperty.call(o, 'valueBoolean') ||
    Array.isArray(o.valueMap) ||
    Array.isArray(o.valueList)
  );
}

async function* explodeMessageForStreaming(
  msg: ServerToClientMessage,
): AsyncIterable<ServerToClientMessage> {
  // 把“大块消息”拆成更细粒度的增量，前端就会像 Theater demo 一样逐步渲染。

  if ('surfaceUpdate' in (msg as any)) {
    const su = (msg as any).surfaceUpdate as { surfaceId: string; catalogId?: string; components?: any[] };
    const comps = Array.isArray(su.components) ? su.components : [];
    if (comps.length <= SURFACE_UPDATE_BATCH_SIZE) {
      yield msg;
      return;
    }
    for (let i = 0; i < comps.length; i += SURFACE_UPDATE_BATCH_SIZE) {
      yield {
        surfaceUpdate: {
          ...su,
          components: comps.slice(i, i + SURFACE_UPDATE_BATCH_SIZE),
        },
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
        dataModelUpdate: {
          ...du,
          contents: contents.slice(i, i + DATA_MODEL_BATCH_SIZE),
        },
      } as ServerToClientMessage;
    }
    return;
  }

  yield msg;
}

/**
 * 兼容 LLM 常见的“valueList”输出。
 *
 * 协议里 dataModelUpdate 没有 valueList（动态列表应使用 valueMap 表达，template.dataBinding 指向 map）。
 * 但 LLM 往往会产出：
 *   { key: "places", valueList: [ { valueMap: [...] }, ... ] }
 * 这里把它转换为：
 *   { key: "places", valueMap: [ { key:"0", valueMap:[...] }, { key:"1", valueMap:[...] } ] }
 */
function normalizeMessage(msg: ServerToClientMessage): ServerToClientMessage {
  if (!('dataModelUpdate' in msg)) return msg;
  const update = (msg as any).dataModelUpdate as { contents?: unknown; path?: string } | undefined;
  if (!update) return msg;

  // 兼容：LLM 可能直接输出 contents 为「对象数组」：
  // { dataModelUpdate: { path:"/items", contents: [ {name:"a"}, {name:"b"} ] } }
  // 运行时需要的是 adjacency list（DataEntry[]），这里转换成：
  // contents: [ { key:"0", valueMap:[{key:"name",valueString:"a"}] }, { key:"1", ... } ]
  const coerced = coerceContentsToEntries(update.contents);
  if (!Array.isArray(coerced)) return msg;

  const normalizedContents = normalizeEntries(coerced);
  return {
    ...(msg as any),
    dataModelUpdate: {
      ...(msg as any).dataModelUpdate,
      contents: normalizedContents,
    },
  } as ServerToClientMessage;
}

function coerceContentsToEntries(contents: unknown): any[] | null {
  if (!contents) return null;
  if (Array.isArray(contents)) {
    // 已经是 DataEntry[] 的话（有 key 字段），直接返回
    if (contents.every((x) => x && typeof x === 'object' && 'key' in (x as any))) return contents as any[];

    // 对象数组：转成 indexed valueMap entries
    if (contents.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
      return (contents as any[]).map((obj, idx) => ({
        key: String(idx),
        valueMap: objectToEntries(obj),
      }));
    }
    return null;
  }
  // 单个对象：转为 entries（写到 path 的 shallow merge）
  if (typeof contents === 'object') {
    return objectToEntries(contents as any);
  }
  return null;
}

function objectToEntries(obj: Record<string, unknown>): any[] {
  const out: any[] = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (typeof v === 'string') out.push({ key: k, valueString: v });
    else if (typeof v === 'number') out.push({ key: k, valueNumber: v });
    else if (typeof v === 'boolean') out.push({ key: k, valueBoolean: v });
    else if (v && typeof v === 'object' && !Array.isArray(v)) out.push({ key: k, valueMap: objectToEntries(v as any) });
    else out.push({ key: k, valueString: JSON.stringify(v) });
  }
  return out;
}

function normalizeEntries(entries: any[]): any[] {
  return entries.map((e) => normalizeEntry(e));
}

function normalizeEntry(entry: any): any {
  if (!entry || typeof entry !== 'object') return entry;

  // 兼容：LLM 会把真正字符串包一层 JSON 再塞进 valueString
  // valueString: "{\"valueString\":\"1. 狗不理包子\"}" => valueString: "1. 狗不理包子"
  if (typeof entry.valueString === 'string') {
    const unwrapped = unwrapJsonValueString(entry.valueString);
    if (unwrapped !== null) {
      entry = { ...entry, valueString: unwrapped };
    }
  }

  // 递归处理 valueMap
  if (Array.isArray(entry.valueMap)) {
    const normalized = normalizeEntries(entry.valueMap);
    // 兼容：LLM 可能把“列表”错误地输出成扁平的 valueMap（重复 key：name/desc/name/desc...）。
    // List.template.dataBinding 期望的是 map：{ snacks: { "0": {...}, "1": {...} } }
    // 这里把重复 key 的 primitive entry 序列折叠成按序号分组的 valueMap。
    const folded = foldFlatRepeatedKeyMapIntoIndexedMap(normalized);
    return { ...entry, valueMap: folded };
  }

  // 把 valueList 转为 valueMap
  if (Array.isArray(entry.valueList)) {
    const items = entry.valueList as any[];
    const mapped = items.map((it, idx) => {
      // 常见：list item 是 { valueMap: [...] } 或直接是 map entries 数组
      const inner = it && typeof it === 'object' && Array.isArray(it.valueMap) ? it.valueMap : it;
      if (Array.isArray(inner)) {
        return { key: String(idx), valueMap: normalizeEntries(inner) };
      }
      // 退化：如果 item 不是 map，尝试包成 primitive（字符串化）
      return { key: String(idx), valueString: typeof inner === 'string' ? inner : JSON.stringify(inner) };
    });
    return { key: entry.key, valueMap: mapped };
  }

  return entry;
}

function unwrapJsonValueString(s: string): string | null {
  const t = s.trim();
  if (!(t.startsWith('{') && t.endsWith('}'))) return null;
  try {
    const parsed = JSON.parse(t);
    if (parsed && typeof parsed === 'object') {
      if (typeof (parsed as any).valueString === 'string') return (parsed as any).valueString;
      if (typeof (parsed as any).literalString === 'string') return (parsed as any).literalString;
    }
  } catch {
    // ignore
  }
  return null;
}

function isPrimitiveEntry(e: any): boolean {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.key === 'string' &&
    (Object.prototype.hasOwnProperty.call(e, 'valueString') ||
      Object.prototype.hasOwnProperty.call(e, 'valueNumber') ||
      Object.prototype.hasOwnProperty.call(e, 'valueBoolean'))
  );
}

function foldFlatRepeatedKeyMapIntoIndexedMap(entries: any[]): any[] {
  if (!Array.isArray(entries) || entries.length === 0) return entries;

  // 只在“全是 primitive entries 且存在重复 key”时触发；否则保持原样。
  if (!entries.every((e) => isPrimitiveEntry(e))) return entries;

  const seen = new Set<string>();
  let hasDup = false;
  for (const e of entries) {
    if (seen.has(e.key)) {
      hasDup = true;
      break;
    }
    seen.add(e.key);
  }
  if (!hasDup) return entries;

  const groups: any[][] = [];
  let cur: any[] = [];
  const curKeys = new Set<string>();
  for (const e of entries) {
    if (curKeys.has(e.key)) {
      if (cur.length > 0) groups.push(cur);
      cur = [];
      curKeys.clear();
    }
    cur.push(e);
    curKeys.add(e.key);
  }
  if (cur.length > 0) groups.push(cur);

  return groups.map((g, idx) => ({
    key: String(idx),
    valueMap: g,
  }));
}

function errorMessages(surfaceId: string, errText: string): ServerToClientMessage[] {
  return [
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          { id: 'errRoot', component: { Card: { child: 'errBody' } } },
          {
            id: 'errBody',
            component: { Text: { text: { literalString: errText }, usageHint: 'body' } },
          },
        ],
      },
    } as unknown as ServerToClientMessage,
    { beginRendering: { surfaceId, root: 'errRoot' } } as ServerToClientMessage,
  ];
}
