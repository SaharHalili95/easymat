import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('../pinecone', () => ({ getPineconeIndex: () => ({ query }) }));
vi.mock('../embed', () => ({ embedText: vi.fn(async () => [0.1, 0.2]) }));

const { mapMatch, retrieveBagrutQuestion, retrieveContext } = await import('../rag');

beforeEach(() => query.mockReset());

describe('mapMatch', () => {
  it('converts stored unit strings back to numbers', () => {
    const chunk = mapMatch({ id: 'a', metadata: { text: 't', topic: 'x', units: ['4', '5'] } });
    expect(chunk.units).toEqual([4, 5]);
  });

  it('fills safe defaults when metadata is missing', () => {
    expect(mapMatch({ id: 'a' })).toEqual({
      id: 'a', text: '', topic: '', units: [], type: undefined, year: undefined, moed: undefined, shalon: undefined,
    });
  });
});

describe('retrieveContext', () => {
  it('filters by unit level as a string', async () => {
    query.mockResolvedValue({ matches: [] });
    await retrieveContext('derivative', 5);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ filter: { units: { $in: ['5'] } }, topK: 5 }));
  });

  it('does not filter when no unit level is given', async () => {
    query.mockResolvedValue({ matches: [] });
    await retrieveContext('derivative');
    expect(query.mock.calls[0][0].filter).toBeUndefined();
  });

  it('maps every match', async () => {
    query.mockResolvedValue({ matches: [{ id: '1', metadata: { text: 'a', topic: 't', units: ['3'] } }, { id: '2', metadata: {} }] });
    const chunks = await retrieveContext('q', undefined, 2);
    expect(chunks.map((c) => c.id)).toEqual(['1', '2']);
    expect(chunks[0].units).toEqual([3]);
  });
});

describe('retrieveBagrutQuestion', () => {
  it('asks only for past exam questions', async () => {
    query.mockResolvedValue({ matches: [] });
    await retrieveBagrutQuestion('q', 4);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      topK: 1,
      filter: { type: { $eq: 'bagrut' }, units: { $in: ['4'] } },
    }));
  });

  it('returns null when nothing matches', async () => {
    query.mockResolvedValue({ matches: [] });
    expect(await retrieveBagrutQuestion('q')).toBeNull();
  });

  it('returns the best question with its source and score', async () => {
    query.mockResolvedValue({ matches: [{ id: 'q', score: 0.87, metadata: { text: 'Solve', year: '2024', moed: 'א', shalon: '581', source: 'x.md' } }] });
    expect(await retrieveBagrutQuestion('q')).toEqual({ text: 'Solve', year: '2024', moed: 'א', shalon: '581', source: 'x.md', score: 0.87 });
  });
});
