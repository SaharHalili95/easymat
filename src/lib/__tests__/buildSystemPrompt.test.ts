import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../buildSystemPrompt';
import type { NoteChunk } from '../rag';

const note = (over: Partial<NoteChunk> = {}): NoteChunk => ({
  id: 'n1',
  text: 'f(x) = x^2',
  topic: 'Derivatives',
  units: [5],
  ...over,
});

describe('buildSystemPrompt', () => {
  it('introduces the tutor as EasyMat', () => {
    expect(buildSystemPrompt([])).toContain('You are "EasyMat"');
  });

  it('says when the unit level is unknown', () => {
    expect(buildSystemPrompt([])).toContain('has not specified their unit level');
  });

  it('states the unit level when given', () => {
    expect(buildSystemPrompt([], 4)).toContain('studying for the 4-unit Bagrut exam');
  });

  it('keeps an empty context block when nothing was retrieved', () => {
    expect(buildSystemPrompt([])).toContain('[CONTEXT]\n[/CONTEXT]');
  });

  it('labels plain notes with their topic', () => {
    const prompt = buildSystemPrompt([note()]);
    expect(prompt).toContain('[CONTEXT - Derivatives]\nf(x) = x^2');
  });

  it('labels past exam questions with year, moed and shalon', () => {
    const prompt = buildSystemPrompt([note({ year: '2023', moed: 'א', shalon: '581' })]);
    expect(prompt).toContain('[CONTEXT - Derivatives | בגרות 2023 מועד א שאלון 581]');
  });

  it('omits the shalon when it is missing', () => {
    const prompt = buildSystemPrompt([note({ year: '2023', moed: 'ב' })]);
    expect(prompt).toContain('[CONTEXT - Derivatives | בגרות 2023 מועד ב]');
  });

  it('separates multiple notes', () => {
    const prompt = buildSystemPrompt([note(), note({ id: 'n2', topic: 'Integrals', text: 'F(x)' })]);
    expect(prompt).toMatch(/\[CONTEXT - Derivatives\][\s\S]*\n\n\[CONTEXT - Integrals\]/);
  });

  it.each([3, 4, 5])('includes the %i-unit syllabus without its frontmatter', (units) => {
    const prompt = buildSystemPrompt([], units);
    expect(prompt).toContain('[SYLLABUS');
    expect(prompt).not.toMatch(/\[SYLLABUS[^\]]*\]\n---/);
  });

  it('skips the syllabus for an unknown unit level', () => {
    expect(buildSystemPrompt([], 7)).not.toContain('[SYLLABUS');
  });
});
