import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { questionNote } from '../examImport';
import { chaptersFor, findAnswer, isQuestionId, loadQuestions, pickQuestion } from '../practice';

let dir: string;
let questions: ReturnType<typeof loadQuestions>;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'questions-'));
  const add = (code: string, month: string, n: number, chapter: string | undefined, answer?: string) => {
    const id = { year: '2026', month, code };
    const name = `bagrut-2026-${month === '6' ? 'summer-a' : 'winter'}-${code}-q${n}`;
    fs.writeFileSync(path.join(dir, `${name}.md`), questionNote(id, { number: n, chapter, text: `טקסט שאלה ${n}` }, answer));
  };
  add('35581', '6', 1, 'אלגברה והסתברות', 'א. פי 3');
  add('35581', '6', 2, 'אלגברה והסתברות', 'א. 4');
  add('35581', '6', 4, 'גאומטרייה', 'א. 12');
  add('35481', '1', 1, 'סדרות');
  fs.writeFileSync(path.join(dir, 'hidden.md'), '---\ntopic: bagrut-question\nsearchable: false\nunits: [5]\n---\n# x\n');
  questions = loadQuestions(dir);
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('loadQuestions', () => {
  it('reads question notes and skips unsearchable ones', () => {
    expect(questions.map((q) => q.id).sort()).toEqual([
      'bagrut-2026-summer-a-35581-q1', 'bagrut-2026-summer-a-35581-q2', 'bagrut-2026-summer-a-35581-q4', 'bagrut-2026-winter-35481-q1',
    ]);
  });

  it('separates the title, the question and the answer', () => {
    const q = questions.find((x) => x.id === 'bagrut-2026-summer-a-35581-q1')!;
    expect(q).toMatchObject({ units: 5, year: '2026', moed: 'א', shalon: '35581', number: 1, chapter: 'אלגברה והסתברות', hasAnswer: true });
    expect(q.title).toBe('בגרות קיץ מועד א׳ 2026 — שאלון 35581, שאלה 1');
    expect(q.text).toBe('טקסט שאלה 1');
    expect(q.sourceUrl).toBe('https://meyda.education.gov.il/sheeloney_bagrut/2026/6/HEB/35581.pdf');
  });

  it('marks questions without an answer key', () => {
    expect(questions.find((x) => x.id === 'bagrut-2026-winter-35481-q1')!.hasAnswer).toBe(false);
  });
});

describe('chaptersFor', () => {
  it('counts chapters for one unit level, largest first', () => {
    expect(chaptersFor(questions, 5)).toEqual([{ name: 'אלגברה והסתברות', count: 2 }, { name: 'גאומטרייה', count: 1 }]);
    expect(chaptersFor(questions, 3)).toEqual([]);
  });
});

describe('pickQuestion', () => {
  it('filters by unit level and chapter and never includes the answer', () => {
    const q = pickQuestion(questions, { units: 5, chapter: 'גאומטרייה', random: () => 0 })!;
    expect(q.id).toBe('bagrut-2026-summer-a-35581-q4');
    expect(q).not.toHaveProperty('answer');
  });

  it('skips questions already seen', () => {
    const seen = ['bagrut-2026-summer-a-35581-q1'];
    expect(pickQuestion(questions, { units: 5, chapter: 'אלגברה והסתברות', exclude: seen, random: () => 0 })!.id).toBe('bagrut-2026-summer-a-35581-q2');
  });

  it('starts over once everything was seen', () => {
    const seen = ['bagrut-2026-summer-a-35581-q1', 'bagrut-2026-summer-a-35581-q2'];
    expect(pickQuestion(questions, { units: 5, chapter: 'אלגברה והסתברות', exclude: seen, random: () => 0 })).not.toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(pickQuestion(questions, { units: 3 })).toBeNull();
  });
});

describe('findAnswer', () => {
  it('returns the official answer by id', () => {
    expect(findAnswer(questions, 'bagrut-2026-summer-a-35581-q2')).toBe('א. 4');
  });

  it('rejects ids that are not question ids', () => {
    expect(isQuestionId('../../etc/passwd')).toBe(false);
    expect(findAnswer(questions, '../bagrut-2026-summer-a-35581-q2')).toBeNull();
  });

  it('returns null for unknown or answerless questions', () => {
    expect(findAnswer(questions, 'bagrut-2026-summer-a-35581-q9')).toBeNull();
    expect(findAnswer(questions, 'bagrut-2026-winter-35481-q1')).toBeNull();
  });
});
