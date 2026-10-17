import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { embedBatch, embedText } from '../embed';

const ok = (vectors: number[][]) => new Response(JSON.stringify({ data: vectors.map((embedding) => ({ embedding })) }), { status: 200 });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('embed', () => {
  it('returns the single vector for one text', async () => {
    vi.mocked(fetch).mockResolvedValue(ok([[1, 2, 3]]));
    expect(await embedText('hello')).toEqual([1, 2, 3]);
  });

  it('sends the voyage-3-lite model and the API key', async () => {
    process.env.VOYAGE_API_KEY = 'test-key';
    vi.mocked(fetch).mockResolvedValue(ok([[1]]));
    await embedText('hello');
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init!.body as string)).toEqual({ input: ['hello'], model: 'voyage-3-lite' });
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
  });

  it('splits large inputs into batches of two and keeps the order', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(ok([[1], [2]]))
      .mockResolvedValueOnce(ok([[3], [4]]))
      .mockResolvedValueOnce(ok([[5]]));
    const pending = embedBatch(['a', 'b', 'c', 'd', 'e']);
    await vi.runAllTimersAsync();
    expect(await pending).toEqual([[1], [2], [3], [4], [5]]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('retries after a 429 rate limit', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('slow down', { status: 429 }))
      .mockResolvedValueOnce(ok([[9]]));
    const pending = embedText('hello');
    await vi.runAllTimersAsync();
    expect(await pending).toEqual([9]);
  });

  it('gives up after three retries', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response('slow down', { status: 429 }));
    const pending = embedText('hello');
    const assertion = expect(pending).rejects.toThrow('Voyage AI error 429');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('reports API errors with the status code', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('bad key', { status: 401 }));
    await expect(embedText('hello')).rejects.toThrow('Voyage AI error 401: bad key');
  });

  it('rejects an unexpected response shape', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await expect(embedText('hello')).rejects.toThrow('unexpected response shape');
  });
});
