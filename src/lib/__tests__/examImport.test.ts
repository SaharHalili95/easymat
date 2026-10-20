import { describe, expect, it } from 'vitest';
import { ANSWER_HEADING, examNoteName, examUnits, parseAnswerKey, parsePdfName, questionNote, splitQuestions } from '../examImport';

const pad = (left: string, right: string, width = 60) => left.padEnd(width) + right;

const paper = [
  'מדינת ישראל',
  'יש לענות על השאלות לפי ההוראות',
  ')1( הוראה בעמוד השער',
  '',
  'ענו על חמש מן השאלות (לכל שאלה – 20 נקודות).',
  'שימו לב :אם תענו על יותר מחמש שאלות ,ייבדקו רק חמש',
  'פרק ראשון – אלגברה והסתברות',
  pad('   רוכב אופניים יצא בשעה 9:00 מן היישוב B.', '.1'),
  '   מצאו את המהירות. א.',
  '                -2-',
  '   /המשך מעבר לדף/',
  'פרק שני – גאומטרייה',
  'S        .2בסרטוט שלפניכם פירמידה ישרה.',
  '   ב .מצאו את גובה הפירמידה.',
  pad('   נתונה הפונקצייה f(x) = x^2.', '.3'),
  '   זכות היוצרים שמורה למדינת ישראל',
].join('\n');

describe('splitQuestions', () => {
  const qs = splitQuestions(paper);

  it('finds every question in order, including glued markers', () => {
    expect(qs.map((q) => q.number)).toEqual([1, 2, 3]);
  });

  it('skips the cover page, page numbers and copyright lines', () => {
    const all = qs.map((q) => q.text).join('\n');
    expect(all).not.toMatch(/הוראה בעמוד השער|-2-|המשך מעבר לדף|זכות היוצרים|ענו על/);
  });

  it('keeps each question text and removes the marker', () => {
    expect(qs[0].text).toBe('רוכב אופניים יצא בשעה 9:00 מן היישוב B.\nמצאו את המהירות. א.');
    expect(qs[1].text).toMatch(/^S בסרטוט שלפניכם/);
    expect(qs[1].text).not.toContain('.2');
  });

  it('tags questions with their chapter', () => {
    expect(qs.map((q) => q.chapter)).toEqual(['אלגברה והסתברות', 'גאומטרייה', 'גאומטרייה']);
  });

  it('treats text before question 2 as question 1 when its marker is missing', () => {
    const noFirst = paper.replace(/\s+\.1$/m, '');
    expect(splitQuestions(noFirst).map((q) => q.number)).toEqual([1, 2, 3]);
    expect(splitQuestions(noFirst)[0].text).toContain('רוכב אופניים');
  });

  it('returns nothing for text without questions', () => {
    expect(splitQuestions('שלום')).toEqual([]);
  });
});

describe('parseAnswerKey', () => {
  const header = '  התשובה הנכונה          מספר השאלה                 התשובה הנכונה        מספר השאלה';
  const key = [
    'דגשים בנוגע לפרסום .1',
    header,
    '                                  .3                                              .1',
    '     x=3                         א.                         פי 3                א.',
    '     y=0                         ב.                     10.5ק"מ                 ב.',
    '                                  .4                                              .2',
    '     להראות                      א.                        הוכחה                א.',
    '                -2-',
    '   זכות היוצרים שמורה למדינת ישראל',
  ].join('\n');
  const answers = parseAnswerKey(key);

  it('reads both columns and ignores the preamble', () => {
    expect([...answers.keys()]).toEqual([1, 2, 3, 4]);
  });

  it('puts the section letter first', () => {
    expect(answers.get(1)).toBe('א. פי 3\nב. 10.5ק"מ');
    expect(answers.get(3)).toBe('א. x=3\nב. y=0');
  });

  it('drops footers', () => {
    expect([...answers.values()].join('\n')).not.toMatch(/-2-|זכות/);
  });

  it('reads only version א when a key holds several versions', () => {
    const versions = [
      "פתרון בחינת הבגרות במתמטיקה ,מס' 35572 ,גרסה א",
      key,
      "פתרון בחינת הבגרות במתמטיקה ,מס' 35572 ,גרסה ב",
      header,
      '                                                                                  .1',
      '                                                            פי 7                א.',
    ].join('\n');
    const parsed = parseAnswerKey(versions);
    expect(parsed.get(1)).toBe('א. פי 3\nב. 10.5ק"מ');
    expect([...parsed.values()].join('\n')).not.toMatch(/פי 7|פתרון בחינת/);
  });
});

describe('names and notes', () => {
  it('parses PDF names', () => {
    expect(parsePdfName('2026-6-35581-q.pdf')).toEqual({ year: '2026', month: '6', code: '35581', kind: 'q' });
    expect(parsePdfName('2026-1-35182-s.pdf')?.kind).toBe('s');
    expect(parsePdfName('2026-7-35581-q.pdf')).toBeNull();
    expect(parsePdfName('notes.pdf')).toBeNull();
  });

  it('maps codes to unit levels', () => {
    expect([examUnits('35182'), examUnits('35371'), examUnits('35481'), examUnits('35572')]).toEqual([3, 3, 4, 5]);
  });

  it('names notes by session', () => {
    expect(examNoteName({ year: '2026', month: '1', code: '35182' })).toBe('bagrut-2026-winter-35182');
    expect(examNoteName({ year: '2025', month: '8', code: '35581' })).toBe('bagrut-2025-summer-b-35581');
  });

  it('writes a searchable question note with its answer', () => {
    const note = questionNote({ year: '2026', month: '6', code: '35581' }, { number: 2, chapter: 'גאומטרייה', text: 'שאלה' }, 'א. 4');
    expect(note).toMatch(/^---\ntopic: bagrut-question\nunits: \[5\]/);
    expect(note).toContain('question: 2\nchapter: "גאומטרייה"\nexam: "[[bagrut-2026-summer-a-35581]]"');
    expect(note).toContain(`שאלה\n\n${ANSWER_HEADING}\n\nא. 4\n`);
  });

  it('leaves out the answer section when there is no answer', () => {
    expect(questionNote({ year: '2026', month: '6', code: '35581' }, { number: 1, text: 'שאלה' })).not.toContain(ANSWER_HEADING);
  });
});
