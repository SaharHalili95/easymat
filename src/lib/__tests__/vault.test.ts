import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildRecords, isIndexable, readVault, type VaultNote } from '../vault';

const body = 'תוכן '.repeat(60);
const note = (over: Partial<VaultNote> = {}): VaultNote => ({
  path: 'topics/derivatives.md',
  frontmatter: { topic: 'derivatives', units: [4, 5], tags: ['calculus'] },
  body,
  ...over,
});

describe('readVault', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };

  it('reads markdown recursively with frontmatter and skips Obsidian folders', () => {
    write('topics/a.md', '---\ntopic: a\nunits: [3]\n---\nhello');
    write('exams/2024/b.md', 'no frontmatter');
    write('.obsidian/app.md', 'x');
    write('.trash/old.md', 'x');
    write('topics/image.png', 'x');

    const notes = readVault(dir);
    expect(notes.map((n) => n.path)).toEqual(['exams/2024/b.md', 'topics/a.md']);
    expect(notes[1].frontmatter).toEqual({ topic: 'a', units: [3] });
    expect(notes[1].body.trim()).toBe('hello');
  });
});

describe('isIndexable', () => {
  it('needs a topic and unit levels', () => {
    expect(isIndexable(note())).toBe(true);
    expect(isIndexable(note({ frontmatter: { unit: 5, type: 'syllabus' } }))).toBe(false);
    expect(isIndexable(note({ frontmatter: { topic: 'x', units: [] } }))).toBe(false);
  });

  it('respects searchable: false', () => {
    expect(isIndexable(note({ frontmatter: { topic: 'x', units: [3], searchable: false } }))).toBe(false);
    expect(isIndexable(note({ frontmatter: { topic: 'x', units: [3], searchable: true } }))).toBe(true);
  });
});

describe('buildRecords', () => {
  it('stores metadata as strings and keeps the vault path as source', () => {
    const [r] = buildRecords([note({ path: 'exams/x.md', frontmatter: { topic: 'bagrut-exam', units: [5], type: 'bagrut', year: 2024, moed: 'א', shalon: 581 } })]);
    expect(r).toMatchObject({ topic: 'bagrut-exam', units: ['5'], source: 'exams/x.md', type: 'bagrut', year: '2024', moed: 'א', shalon: '581' });
    expect(r.id).toMatch(/^exams\/x\.md#[0-9a-f]{16}$/);
    expect(r).not.toHaveProperty('tags');
  });

  it('skips notes that are not indexable', () => {
    expect(buildRecords([note({ frontmatter: { type: 'syllabus' } })])).toEqual([]);
  });

  it('gives the same id to unchanged content', () => {
    expect(buildRecords([note()])[0].id).toBe(buildRecords([note()])[0].id);
  });

  it('changes the id when the text or the frontmatter changes', () => {
    const base = buildRecords([note()])[0].id;
    expect(buildRecords([note({ body: body + 'עוד' })])[0].id).not.toBe(base);
    expect(buildRecords([note({ frontmatter: { topic: 'derivatives', units: [5] } })])[0].id).not.toBe(base);
  });

  it('only changes ids of the edited chunk', () => {
    const second = 'שני '.repeat(80);
    const before = buildRecords([note({ body: `${body}\n---\n${second}` })]).map((r) => r.id);
    const after = buildRecords([note({ body: `${body}\n---\n${second}שינוי` })]).map((r) => r.id);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
  });

  it('keeps ids unique for duplicate chunks in one note', () => {
    const ids = buildRecords([note({ body: `${body}\n---\n${body}` })]).map((r) => r.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids[1]).toBe(`${ids[0]}-1`);
  });
});
