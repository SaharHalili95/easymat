import path from 'path';
import { ANSWER_HEADING } from './examImport';
import { VAULT_DIR, readVault } from './vault';

export const QUESTIONS_DIR = path.join(VAULT_DIR, 'questions');

export interface PracticeQuestion {
  id: string;
  units: number;
  year: string;
  moed: string;
  shalon: string;
  number: number;
  chapter?: string;
  title: string;
  text: string;
  sourceUrl?: string;
  hasAnswer: boolean;
}

interface StoredQuestion extends PracticeQuestion {
  answer?: string;
}

const ID = /^bagrut-\d{4}-(?:winter|summer-a|summer-b)-35\d{3}-q\d{1,2}$/;

export function isQuestionId(id: string): boolean {
  return ID.test(id);
}

// Read on every request so edits made in Obsidian show up without a restart.
export function loadQuestions(dir: string = QUESTIONS_DIR): StoredQuestion[] {
  return readVault(dir)
    .filter(n => n.frontmatter.topic === 'bagrut-question' && n.frontmatter.searchable !== false)
    .map(n => {
      const fm = n.frontmatter;
      const [beforeAnswer, answer] = n.body.split(ANSWER_HEADING);
      const lines = beforeAnswer.trim().split('\n');
      const title = lines[0].replace(/^#\s*/, '').trim();
      return {
        id: path.basename(n.path, '.md'),
        units: Number((fm.units as unknown[])[0]),
        year: String(fm.year),
        moed: String(fm.moed),
        shalon: String(fm.shalon),
        number: Number(fm.question),
        ...(fm.chapter ? { chapter: String(fm.chapter) } : {}),
        title,
        text: lines.slice(1).join('\n').trim(),
        ...(fm.source_url ? { sourceUrl: String(fm.source_url) } : {}),
        hasAnswer: Boolean(answer?.trim()),
        ...(answer?.trim() ? { answer: answer.trim() } : {}),
      };
    });
}

export function chaptersFor(questions: StoredQuestion[], units: number): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    if (q.units === units && q.chapter) counts.set(q.chapter, (counts.get(q.chapter) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function pickQuestion(
  questions: StoredQuestion[],
  opts: { units: number; chapter?: string; exclude?: string[]; random?: () => number },
): PracticeQuestion | null {
  const exclude = new Set(opts.exclude ?? []);
  const matching = questions.filter(q => q.units === opts.units && (!opts.chapter || q.chapter === opts.chapter));
  // Once every matching question was seen, start over rather than stop.
  const pool = matching.filter(q => !exclude.has(q.id));
  const from = pool.length > 0 ? pool : matching;
  if (from.length === 0) return null;
  const picked = from[Math.floor((opts.random ?? Math.random)() * from.length)];
  const { answer: _answer, ...question } = picked;
  void _answer;
  return question;
}

export function findAnswer(questions: StoredQuestion[], id: string): string | null {
  if (!isQuestionId(id)) return null;
  return questions.find(q => q.id === id)?.answer ?? null;
}
