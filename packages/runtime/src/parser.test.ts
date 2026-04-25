import { describe, expect, it } from 'vitest';
import { createLineSplitter, parseJSONLStream, parseSSEStream } from './parser.js';

function streamFromStrings(parts: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (i >= parts.length) {
        ctrl.close();
        return;
      }
      ctrl.enqueue(enc.encode(parts[i]!));
      i++;
    },
  });
}

describe('createLineSplitter', () => {
  it('chunk 跨行也能正确切分', () => {
    const s = createLineSplitter();
    expect(s.push('foo')).toEqual([]);
    expect(s.push('bar\nbaz')).toEqual(['foobar']);
    expect(s.push('\n')).toEqual(['baz']);
    expect(s.flush()).toEqual([]);
  });
  it('flush 输出剩余 buffer', () => {
    const s = createLineSplitter();
    s.push('partial');
    expect(s.flush()).toEqual(['partial']);
  });
});

describe('parseJSONLStream', () => {
  it('能逐行解出 JSON 对象', async () => {
    const stream = streamFromStrings(['{"a":1}\n', '{"b":2}\n{"c":3}\n']);
    const out: unknown[] = [];
    for await (const m of parseJSONLStream(stream)) out.push(m);
    expect(out).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });
});

describe('parseSSEStream', () => {
  it('解析单条 data 事件', async () => {
    const stream = streamFromStrings(['data: {"hello":"world"}\n\n']);
    const out: unknown[] = [];
    for await (const m of parseSSEStream(stream)) out.push(m);
    expect(out).toEqual([{ hello: 'world' }]);
  });
  it('多事件 + 多 chunk + 注释行 + 空行', async () => {
    const stream = streamFromStrings([
      ': comment\n',
      'data: {"a":1}\n\n',
      'data: {"b":',
      '2}\n\ndata: {"c":3}\n\n',
    ]);
    const out: unknown[] = [];
    for await (const m of parseSSEStream(stream)) out.push(m);
    expect(out).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });
  it('忽略 [DONE]', async () => {
    const stream = streamFromStrings(['data: [DONE]\n\n']);
    const out: unknown[] = [];
    for await (const m of parseSSEStream(stream)) out.push(m);
    expect(out).toEqual([]);
  });
});
