import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FAST_MODEL, REFUSAL_MESSAGE, STREAM_ERROR_MESSAGE, STRONG_MODEL } from '@/lib/models';

const stream = vi.fn();
vi.mock('@/lib/claude', () => ({ getAnthropicClient: () => ({ messages: { stream } }) }));
vi.mock('@/lib/rag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag')>()),
  retrieveContext: vi.fn(async () => []),
  retrieveBagrutQuestion: vi.fn(async () => ({ text: 'שאלה', year: '2026', moed: 'א', shalon: '35581', source: 'q.md', score: 0.4 })),
}));

const { POST } = await import('../route');

type Event = Record<string, unknown>;
function events(list: Event[], failAfter?: Error) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of list) yield e;
      if (failAfter) throw failAfter;
    },
  };
}
const text = (t: string): Event => ({ type: 'content_block_delta', delta: { type: 'text_delta', text: t } });

let ip = 0;
function post(body: unknown, forwardedFor = `10.0.0.${++ip}`) {
  return POST(new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'x-forwarded-for': forwardedFor },
    body: JSON.stringify(body),
  }));
}
const ask = (content: string, unitLevel = 5) => post({ messages: [{ role: 'user', content }], unitLevel });

beforeEach(() => stream.mockReset());

describe('POST /api/chat', () => {
  it('rejects a request without messages', async () => {
    expect((await post({})).status).toBe(400);
  });

  it('streams the answer text and attaches the real exam question', async () => {
    stream.mockReturnValue(events([{ type: 'message_start' }, { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: '' } }, text('שלום '), text('עולם')]));
    const res = await ask('מצא את הנגזרת של x^2');
    expect(await res.text()).toBe('שלום עולם');
    expect(JSON.parse(decodeURIComponent(res.headers.get('X-Bagrut-Question')!))).toMatchObject({ year: '2026', shalon: '35581' });
  });

  it('uses the fast model at low effort with room for thinking', async () => {
    stream.mockReturnValue(events([text('x')]));
    await (await ask('מצא את הנגזרת של x^2')).text();
    expect(stream.mock.calls[0][0]).toMatchObject({ model: FAST_MODEL, max_tokens: 16000, output_config: { effort: 'low' } });
  });

  it('uses the strong model for vectors', async () => {
    stream.mockReturnValue(events([text('x')]));
    await (await ask('זווית בין שני וקטורים')).text();
    expect(stream.mock.calls[0][0]).toMatchObject({ model: STRONG_MODEL, output_config: { effort: 'medium' } });
  });

  it('explains a refusal instead of sending an empty reply', async () => {
    stream.mockReturnValue(events([{ type: 'message_delta', delta: { stop_reason: 'refusal' } }]));
    expect(await (await ask('שאלה')).text()).toBe(REFUSAL_MESSAGE);
  });

  it('closes the reply with a notice when the stream fails midway', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stream.mockReturnValue(events([text('חלק')], new Error('boom')));
    expect(await (await ask('שאלה')).text()).toBe(`חלק${STREAM_ERROR_MESSAGE}`);
  });

  it('rate limits after 20 requests a minute from one address', async () => {
    stream.mockImplementation(() => events([text('x')]));
    const statuses = [];
    for (let i = 0; i < 21; i++) statuses.push((await post({ messages: [{ role: 'user', content: 'q' }] }, '192.168.1.1')).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
