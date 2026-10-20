import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET as getQuestion } from '../route';
import { GET as getAnswer } from '../answer/route';

const get = (handler: (req: NextRequest) => Promise<Response>, query: string) => handler(new NextRequest(`http://localhost/api/practice?${query}`));

// These run against the real vault/questions notes.
describe('GET /api/practice', () => {
  it('returns a question for the level without its answer, plus chapters', async () => {
    const res = await get(getQuestion, 'units=4');
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.question.units).toBe(4);
    expect(data.question).not.toHaveProperty('answer');
    expect(data.chapters.length).toBeGreaterThan(0);
  });

  it('filters by chapter', async () => {
    const { chapters } = await (await get(getQuestion, 'units=5')).json();
    const chapter = chapters[0].name;
    const { question } = await (await get(getQuestion, `units=5&chapter=${encodeURIComponent(chapter)}`)).json();
    expect(question.chapter).toBe(chapter);
  });

  it('rejects other unit levels', async () => {
    expect((await get(getQuestion, 'units=7')).status).toBe(400);
  });

  it('returns 404 for a chapter that does not exist', async () => {
    expect((await get(getQuestion, 'units=3&chapter=nope')).status).toBe(404);
  });
});

describe('GET /api/practice/answer', () => {
  it('returns the official answer', async () => {
    const res = await get(getAnswer, 'id=bagrut-2026-summer-a-35581-q1');
    expect(res.status).toBe(200);
    expect((await res.json()).answer).toContain('פי 3');
  });

  it('rejects ids that are not question ids', async () => {
    expect((await get(getAnswer, 'id=../../.env.local')).status).toBe(400);
  });

  it('returns 404 for an unknown question', async () => {
    expect((await get(getAnswer, 'id=bagrut-2026-summer-a-35581-q9')).status).toBe(404);
  });
});
