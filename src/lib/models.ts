import type { NoteChunk } from './rag';

export const FAST_MODEL = 'claude-haiku-5-5';
export const STRONG_MODEL = 'claude-sonnet-5-5';

// Both models think by default and thinking counts toward max_tokens, so the
// cap leaves room for it on top of a full worked solution.
export const MAX_TOKENS = 16_000;

// Low on the fast model keeps the first word under ~2s and answered every
// known-answer check correctly; proofs, vectors and images get more thinking.
export function effortFor(model: string): 'low' | 'medium' {
  return model === FAST_MODEL ? 'low' : 'medium';
}

export const REFUSAL_MESSAGE = 'לא הצלחתי לענות על השאלה הזאת. נסו לנסח אותה מחדש, או לשאול שאלה אחרת במתמטיקה.';
export const STREAM_ERROR_MESSAGE = '\n\nהתשובה נקטעה בגלל תקלה. נסו לשלוח שוב.';

export function pickModel(queryText: string, hasImage: boolean, context: NoteChunk[]): string {
  const needsStrong =
    hasImage ||
    /הוכח|הוכיח|הראה|prove|show that/i.test(queryText) ||
    /מספרים מרוכבים|וקטור|complex number|vector/i.test(queryText) ||
    context.some(c => c.shalon?.endsWith('582'));
  return needsStrong ? STRONG_MODEL : FAST_MODEL;
}
