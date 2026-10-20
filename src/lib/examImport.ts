// Turns `pdftotext -layout` output of Ministry of Education math papers into
// one note per question, and the published answer keys into answers per
// question.

const BIDI = /[‎‏‪-‮⁦-⁩]/g;
const HEBREW = '֐-׿';

const NOISE = [
  /^-\s*\d+\s*-$/,
  /המשך מעבר לדף/,
  /המשך בעמוד/,
  /זכות היוצרים|שמורה למדינת ישראל|ברשות משרד החינוך/,
  /^מתמטיקה\s*,.*מס'/,
  /^בהצלחה/,
  /^שימו לב\s*:/,
  /ענו על/,
];

export interface ExamQuestion {
  number: number;
  chapter?: string;
  text: string;
}

function lines(layout: string): string[] {
  return layout.replace(BIDI, '').replace(/\f/g, '\n').split('\n');
}

function tidy(rows: string[]): string {
  return rows
    .map(r => r.trim().replace(/\s{2,}/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Question numbers sit at the right edge of the line (".3"), or are glued to
// the first word when the line is short (".2בסרטוט").
function questionMarker(line: string, expected: number): { rest: string } | null {
  const end = line.match(/^(.*?)(?:^|\s{2,})\.(\d{1,2})\s*$/);
  if (end && Number(end[2]) === expected) return { rest: end[1] };
  const glued = line.match(new RegExp(`^(.*?)(?:^|\\s{2,})\\.(\\d{1,2})(?=[${HEBREW}])(.*)$`));
  if (glued && Number(glued[2]) === expected) return { rest: `${glued[1]} ${glued[3]}` };
  return null;
}

function chapterName(line: string): string | undefined {
  const m = line.trim().match(/^פרק\s+\S+\s*(?:[–-]\s*(.+))?$/);
  if (!m) return undefined;
  return (m[1] ?? line.trim()).replace(/\s+/g, ' ').replace(/\s*,\s*$/, '').trim();
}

export function splitQuestions(layout: string): ExamQuestion[] {
  const all = lines(layout);
  // Questions follow the "answer N of the questions" instruction; papers
  // that word it differently start at the "השאלות" heading.
  let start = all.findIndex(l => /ענו על/.test(l));
  if (start < 0) start = all.findIndex(l => l.trim() === 'השאלות');

  const questions: { number: number; chapter?: string; rows: string[] }[] = [];
  let chapter: string | undefined;
  const pending: string[] = [];

  for (const line of all.slice(start + 1)) {
    const heading = chapterName(line);
    if (heading) {
      chapter = heading;
      continue;
    }
    if (NOISE.some(re => re.test(line.trim()))) continue;

    const marker = questionMarker(line, questions.length + 1);
    if (marker) {
      questions.push({ number: questions.length + 1, chapter, rows: [marker.rest] });
      continue;
    }
    // Some papers drop the marker of question 1; question 2's marker then
    // shows that everything before it was question 1.
    if (questions.length === 0 && questionMarker(line, 2)) {
      questions.push({ number: 1, chapter, rows: pending });
      questions.push({ number: 2, chapter, rows: [questionMarker(line, 2)!.rest] });
      continue;
    }
    if (questions.length === 0) pending.push(line);
    else questions[questions.length - 1].rows.push(line);
  }
  return questions
    .map(q => ({ number: q.number, ...(q.chapter ? { chapter: q.chapter } : {}), text: tidy(q.rows) }))
    .filter(q => q.text.length > 0);
}

// The answer key is a table with "question number | correct answer" columns,
// usually two such column pairs side by side (questions 1-4 on the right,
// 5-8 on the left).
export function parseAnswerKey(layout: string): Map<number, string> {
  const rows = new Map<number, string[]>();
  let split: number | null = null;
  const current: Record<'left' | 'right', number | null> = { left: null, right: null };

  const add = (col: 'left' | 'right', segment: string) => {
    let text = segment;
    const m = text.match(/^(.*?)(?:^|\s+)\.(\d{1,2})\s*$/);
    if (m) {
      current[col] = Number(m[2]);
      text = m[1];
    }
    const cells = text.trim().split(/\s{2,}/).filter(Boolean).reverse();
    if (cells.length === 0 || current[col] === null) return;
    const list = rows.get(current[col]!) ?? [];
    list.push(cells.join(' '));
    rows.set(current[col]!, list);
  };

  for (const line of lines(layout)) {
    // Some keys hold versions א, ב and ג of the paper back to back; the
    // published paper is version א, so stop where another version starts.
    const version = line.match(/גרסה\s*([א-ת])/);
    if (version && version[1] !== 'א') break;
    if (/פתרון בחינת הבגרות/.test(line)) continue;
    if (NOISE.some(re => re.test(line.trim())) || /שמורה למדינת ישראל|ברשות משרד החינוך/.test(line)) continue;
    const headers = line.split('מספר השאלה').length - 1;
    if (headers > 0) {
      // Right-column answers can start left of their own header, so split
      // just after the left column's question-number header instead.
      split = headers >= 2 ? line.indexOf('מספר השאלה') + 'מספר השאלה'.length + 6 : 0;
      if (split === 0) current.right = Math.max(current.left ?? 0, current.right ?? 0) || null;
      continue;
    }
    if (split === null) continue;
    if (split > 0) add('left', line.slice(0, split));
    add('right', split > 0 ? line.slice(split) : line);
  }

  const answers = new Map<number, string>();
  for (const [n, list] of [...rows].sort((a, b) => a[0] - b[0])) answers.set(n, list.join('\n'));
  return answers;
}

const SESSIONS: Record<string, { session: string; moed: string; label: string }> = {
  '1': { session: 'winter', moed: 'חורף', label: 'חורף' },
  '6': { session: 'summer-a', moed: 'א', label: 'קיץ מועד א׳' },
  '8': { session: 'summer-b', moed: 'ב', label: 'קיץ מועד ב׳' },
};

export interface ExamId {
  year: string;
  month: string;
  code: string;
}

// PDFs are named <year>-<month>-<code>-q.pdf (questions) or -s.pdf (answer key).
export function parsePdfName(name: string): (ExamId & { kind: 'q' | 's' }) | null {
  const m = name.match(/^(\d{4})-(\d{1,2})-(35\d{3})-([qs])\.pdf$/);
  if (!m || !SESSIONS[m[2]]) return null;
  return { year: m[1], month: m[2], code: m[3], kind: m[4] as 'q' | 's' };
}

export function examUnits(code: string): number {
  return { '1': 3, '3': 3, '4': 4, '5': 5 }[code[2]] ?? 0;
}

export function examNoteName({ year, month, code }: ExamId): string {
  return `bagrut-${year}-${SESSIONS[month].session}-${code}`;
}

export function examPdfSource({ year, month, code }: ExamId): string {
  return `https://meyda.education.gov.il/sheeloney_bagrut/${year}/${month}/HEB/${code}.pdf`;
}

export function questionNote(id: ExamId, q: ExamQuestion, answer?: string): string {
  const s = SESSIONS[id.month];
  const units = examUnits(id.code);
  const fm = [
    'topic: bagrut-question',
    `units: [${units}]`,
    `tags: [bagrut, exam-${id.year}, ${s.session}, shalon-${id.code}, official, question]`,
    'type: bagrut',
    `year: ${id.year}`,
    `moed: ${s.moed}`,
    `session: ${s.session}`,
    `shalon: ${id.code}`,
    `question: ${q.number}`,
    ...(q.chapter ? [`chapter: "${q.chapter.replace(/"/g, "'")}"`] : []),
    `exam: "[[${examNoteName(id)}]]"`,
    `source_url: ${examPdfSource(id)}`,
  ];
  const body = [`# בגרות ${s.label} ${id.year} — שאלון ${id.code}, שאלה ${q.number}`, '', q.text];
  if (answer) body.push('', ANSWER_HEADING, '', answer);
  return `---\n${fm.join('\n')}\n---\n\n${body.join('\n')}\n`;
}

export const ANSWER_HEADING = '## תשובה רשמית (תשובות סופיות בלבד)';
