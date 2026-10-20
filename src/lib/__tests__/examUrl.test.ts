import { describe, expect, it } from 'vitest';
import { examPdfUrl } from '../examUrl';

const base = 'https://meyda.education.gov.il/sheeloney_bagrut';

describe('examPdfUrl', () => {
  it('maps legacy 3-digit codes to the published file', () => {
    expect(examPdfUrl({ year: '2024', moed: 'א', shalon: '581' })).toBe(`${base}/2024/6/HEB/35581.pdf`);
  });

  it('uses a full 5-digit code as is', () => {
    expect(examPdfUrl({ year: '2026', moed: 'ב', shalon: '35481' })).toBe(`${base}/2026/8/HEB/35481.pdf`);
  });

  it('puts winter exams in January', () => {
    expect(examPdfUrl({ year: '2026', moed: 'חורף', shalon: '35182' })).toBe(`${base}/2026/1/HEB/35182.pdf`);
  });
});
