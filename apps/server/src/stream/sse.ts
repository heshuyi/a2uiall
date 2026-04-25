/**
 * SSE 写入工具：
 * - setupSse(res)：写入头 + 心跳
 * - sse.send(data)：发送一条 `data:` 事件（JSON.stringify）
 * - sse.done()：发送 `[DONE]` 并 end
 */

import type { Response } from 'express';

export interface SseWriter {
  send(payload: unknown): void;
  comment(text: string): void;
  done(): void;
  closed: boolean;
}

export function setupSse(res: Response, opts: { heartbeatMs?: number } = {}): SseWriter {
  const heartbeatMs = opts.heartbeatMs ?? 15000;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;

  const writer: SseWriter = {
    closed: false,
    send(payload) {
      if (closed) return;
      const line = `data: ${JSON.stringify(payload)}\n\n`;
      res.write(line);
    },
    comment(text) {
      if (closed) return;
      res.write(`: ${text}\n\n`);
    },
    done() {
      if (closed) return;
      res.write('data: [DONE]\n\n');
      res.end();
      closed = true;
      writer.closed = true;
    },
  };

  const hb = setInterval(() => writer.comment('hb'), heartbeatMs);
  const cleanup = () => {
    clearInterval(hb);
    closed = true;
    writer.closed = true;
  };
  res.on('close', cleanup);
  res.on('finish', cleanup);

  return writer;
}
