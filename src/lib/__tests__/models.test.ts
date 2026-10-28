import { describe, expect, it } from 'vitest';
import { FAST_MODEL, STRONG_MODEL, effortFor, pickModel } from '../models';
import type { NoteChunk } from '../rag';

const chunk = (shalon?: string): NoteChunk => ({ id: 'x', text: '', topic: 't', units: [5], shalon });

describe('pickModel', () => {
  it('uses the fast model for ordinary questions', () => {
    expect(pickModel('מצא את הנגזרת של x^2', false, [])).toBe(FAST_MODEL);
  });

  it.each([
    ['הוכח שהמשולש שווה שוקיים'],
    ['הראה כי הסדרה חשבונית'],
    ['זווית בין שני וקטורים'],
    ['פתור במספרים מרוכבים'],
    ['Prove that n^2 is even'],
  ])('uses the strong model for "%s"', (q) => {
    expect(pickModel(q, false, [])).toBe(STRONG_MODEL);
  });

  it('uses the strong model for images', () => {
    expect(pickModel('', true, [])).toBe(STRONG_MODEL);
  });

  it('uses the strong model when the context comes from a second 5-unit paper', () => {
    expect(pickModel('q', false, [chunk('582')])).toBe(STRONG_MODEL);
    expect(pickModel('q', false, [chunk('35582')])).toBe(STRONG_MODEL);
    expect(pickModel('q', false, [chunk('581'), chunk()])).toBe(FAST_MODEL);
  });
});

describe('effortFor', () => {
  it('keeps the fast model at low effort and gives the strong model more', () => {
    expect(effortFor(FAST_MODEL)).toBe('low');
    expect(effortFor(STRONG_MODEL)).toBe('medium');
  });
});
