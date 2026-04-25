/**
 * 流式解析器：把字节流切成 JSONL 行，再 JSON.parse。
 *
 * 同时支持两种载体：
 *   1. 纯 JSONL（每行一个 JSON 对象，行间用 \n 分隔）
 *   2. SSE（每个事件以 `data: ` 开头，事件之间用空行分隔，可跨多行）
 *
 * 用 `parseSSEStream` 处理 SSE，用 `parseJSONLStream` 处理纯 JSONL。
 */

/** 分行器：处理 chunk 跨行情况，输出完整行（不含末尾 \n）。 */
export function createLineSplitter(): {
  push: (chunk: string) => string[];
  flush: () => string[];
} {
  let buf = '';
  return {
    push(chunk: string) {
      buf += chunk;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      return lines;
    },
    flush() {
      const last = buf;
      buf = '';
      return last.length > 0 ? [last] : [];
    },
  };
}

/** 把一个 ReadableStream<Uint8Array>（fetch().body）按 JSONL 解析为对象迭代器。 */
export async function* parseJSONLStream<T = unknown>(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<T, void, unknown> {
  const decoder = new TextDecoder('utf-8');
  const reader = body.getReader();
  const splitter = createLineSplitter();
  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = splitter.push(text);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        yield JSON.parse(trimmed) as T;
      }
    }
    const tail = splitter.flush();
    for (const line of tail) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      yield JSON.parse(trimmed) as T;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * SSE 解析器（按 https://html.spec.whatwg.org/multipage/server-sent-events.html）。
 * 这里的简化版只关心 `data:` 字段，把多行 data 拼成一个 JSON 串再 parse。
 */
export async function* parseSSEStream<T = unknown>(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<T, void, unknown> {
  const decoder = new TextDecoder('utf-8');
  const reader = body.getReader();
  const splitter = createLineSplitter();
  let dataBuf: string[] = [];

  const flushEvent = (): T | null => {
    if (dataBuf.length === 0) return null;
    const payload = dataBuf.join('\n');
    dataBuf = [];
    if (!payload || payload === '[DONE]') return null;
    try {
      return JSON.parse(payload) as T;
    } catch (err) {
      throw new Error(
        `[a2ui/runtime] SSE data 不是合法 JSON：${(err as Error).message}\n原文：${payload}`,
      );
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = splitter.push(text);
      for (const line of lines) {
        if (line === '') {
          const ev = flushEvent();
          if (ev !== null) yield ev;
          continue;
        }
        if (line.startsWith(':')) continue;
        if (line.startsWith('data:')) {
          dataBuf.push(line.slice(5).replace(/^ /, ''));
        }
      }
    }
    const tail = splitter.flush();
    for (const line of tail) {
      if (line.startsWith('data:')) dataBuf.push(line.slice(5).replace(/^ /, ''));
    }
    const ev = flushEvent();
    if (ev !== null) yield ev;
  } finally {
    reader.releaseLock();
  }
}
