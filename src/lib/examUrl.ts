interface ExamRef {
  year: string;
  moed: string;
  shalon: string;
}

const MONTH_BY_MOED: Record<string, number> = { 'חורף': 1, 'א': 6, 'ב': 8 };

// Older notes store a 3-digit shalon; newer ones store the full 5-digit code.
const LEGACY_CODES: Record<string, string> = {
  '581': '35581', '582': '35582',
  '481': '16481', '381': '20381',
};

export function examPdfUrl(q: ExamRef): string {
  const month = MONTH_BY_MOED[q.moed] ?? 8;
  const code = LEGACY_CODES[q.shalon] ?? q.shalon;
  return `https://meyda.education.gov.il/sheeloney_bagrut/${q.year}/${month}/HEB/${code}.pdf`;
}
