import { describe, expect, it } from 'vitest';
import { chunkText } from '../chunk';

const para = (n: number, ch = 'א') => ch.repeat(n);

describe('chunkText', () => {
  it('keeps a short section whole', () => {
    const text = `## כותרת\n\n${para(300)}`;
    expect(chunkText(text)).toEqual([text]);
  });

  it('splits on --- question boundaries', () => {
    const chunks = chunkText(`${para(300)}\n---\n${para(300, 'ב')}`);
    expect(chunks).toEqual([para(300), para(300, 'ב')]);
  });

  it('drops fragments shorter than 200 characters', () => {
    expect(chunkText(`${para(300)}\n---\nקצר`)).toEqual([para(300)]);
  });

  it('splits long sections on paragraphs and repeats the heading', () => {
    const chunks = chunkText(`## נגזרות\n\n${para(1000)}\n\n${para(1000, 'ב')}`);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(`## נגזרות\n\n${para(1000)}`);
    expect(chunks[1]).toBe(`## נגזרות\n\n${para(1000, 'ב')}`);
  });

  it('does not split inside a display formula', () => {
    const formula = `$$\n${para(900, 'x')}\n\n${para(900, 'y')}\n$$`;
    const chunks = chunkText(`${para(300)}\n\n${formula}`);
    expect(chunks.some((c) => c.includes(formula))).toBe(true);
    chunks.forEach((c) => expect((c.match(/\$\$/g) ?? []).length % 2).toBe(0));
  });

  it('caps an unclosed formula instead of swallowing the note', () => {
    const paras = Array.from({ length: 10 }, (_, i) => para(800, String.fromCharCode(0x5d0 + i)));
    const chunks = chunkText(`$$ unclosed\n\n${paras.join('\n\n')}`);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(3000 + 802));
  });

  it('splits exam text without blank lines into line groups', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `שורה ${i} ${para(80)}`);
    const chunks = chunkText(`# בגרות 2024\n\n${lines.join('\n')}`);
    expect(chunks.length).toBeGreaterThan(2);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(1500 + '# בגרות 2024\n\n'.length));
    expect(chunks.slice(1).every((c) => c.startsWith('# בגרות 2024'))).toBe(true);
    expect(chunks.join('\n')).toContain('שורה 59');
  });
});
