import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchRecords = vi.fn();
vi.mock('../pinecone', () => ({ getPineconeIndex: () => ({ searchRecords }) }));

const { buildSearchQuery, mapHit, retrieveBagrutQuestion, retrieveContext } = await import('../rag');

const hits = (...h: object[]) => ({ result: { hits: h } });

beforeEach(() => searchRecords.mockReset());

describe('buildSearchQuery', () => {
  const long = 'מצא את נקודות הקיצון של הפונקציה f(x)=x^3-6x^2+9x+2';

  it('uses the last user message when it is long enough', () => {
    expect(buildSearchQuery([{ role: 'user', content: 'old question about vectors here' }, { role: 'assistant', content: 'a' }, { role: 'user', content: long }])).toBe(long);
  });

  it('adds the previous user message to a short follow-up', () => {
    expect(buildSearchQuery([{ role: 'user', content: long }, { role: 'assistant', content: 'a' }, { role: 'user', content: 'ועכשיו סעיף ב' }])).toBe(`${long}\nועכשיו סעיף ב`);
  });

  it('keeps a short first message as is', () => {
    expect(buildSearchQuery([{ role: 'user', content: 'נגזרת' }])).toBe('נגזרת');
  });

  it('reads text from content blocks', () => {
    expect(buildSearchQuery([{ role: 'user', content: [{ type: 'image' }, { type: 'text', text: long }] }])).toBe(long);
  });

  it('returns an empty string without user messages', () => {
    expect(buildSearchQuery([])).toBe('');
  });
});

describe('mapHit', () => {
  it('converts stored unit strings back to numbers', () => {
    const chunk = mapHit({ _id: 'a', fields: { text: 't', topic: 'x', units: ['4', '5'] } });
    expect(chunk.units).toEqual([4, 5]);
  });

  it('fills safe defaults when fields are missing', () => {
    expect(mapHit({ _id: 'a' })).toEqual({
      id: 'a', text: '', topic: '', units: [], type: undefined, year: undefined, moed: undefined, shalon: undefined,
    });
  });
});

describe('retrieveContext', () => {
  it('searches by text and filters by unit level as a string', async () => {
    searchRecords.mockResolvedValue(hits());
    await retrieveContext('derivative', 5);
    expect(searchRecords).toHaveBeenCalledWith({
      query: { topK: 5, inputs: { text: 'derivative' }, filter: { units: { $in: ['5'] } } },
    });
  });

  it('does not filter when no unit level is given', async () => {
    searchRecords.mockResolvedValue(hits());
    await retrieveContext('derivative');
    expect(searchRecords.mock.calls[0][0].query.filter).toBeUndefined();
  });

  it('skips the search for an empty query', async () => {
    expect(await retrieveContext('  ')).toEqual([]);
    expect(searchRecords).not.toHaveBeenCalled();
  });

  it('maps every hit', async () => {
    searchRecords.mockResolvedValue(hits({ _id: '1', fields: { text: 'a', topic: 't', units: ['3'] } }, { _id: '2', fields: {} }));
    const chunks = await retrieveContext('q', undefined, 2);
    expect(chunks.map((c) => c.id)).toEqual(['1', '2']);
    expect(chunks[0].units).toEqual([3]);
  });
});

describe('retrieveBagrutQuestion', () => {
  it('asks only for real past papers', async () => {
    searchRecords.mockResolvedValue(hits());
    await retrieveBagrutQuestion('q', 4);
    expect(searchRecords).toHaveBeenCalledWith({
      query: {
        topK: 1,
        inputs: { text: 'q' },
        filter: { type: { $eq: 'bagrut' }, year: { $exists: true }, units: { $in: ['4'] } },
      },
    });
  });

  it('returns null when nothing matches', async () => {
    searchRecords.mockResolvedValue(hits());
    expect(await retrieveBagrutQuestion('q')).toBeNull();
  });

  it('returns the best question with its source and score', async () => {
    searchRecords.mockResolvedValue(hits({ _id: 'q', _score: 0.87, fields: { text: 'Solve', year: '2024', moed: 'א', shalon: '581', source: 'exams/x.md' } }));
    expect(await retrieveBagrutQuestion('q')).toEqual({ text: 'Solve', year: '2024', moed: 'א', shalon: '581', source: 'exams/x.md', score: 0.87 });
  });
});
