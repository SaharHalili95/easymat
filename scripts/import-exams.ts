// Imports Ministry of Education math papers into the vault.
//
//   npm run import-exams -- <folder of PDFs> [--force]
//
// PDFs must be named <year>-<month>-<code>-q.pdf (paper) and -s.pdf (answer
// key), e.g. 2026-6-35581-q.pdf. Needs pdftotext (brew install poppler).
// Writes one searchable note per question to vault/questions, plus the whole
// paper (not indexed) to vault/exams and the answer key to vault/solutions.
// Existing notes are kept unless --force is given, so edits made in Obsidian
// survive a re-import.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  examNoteName, examPdfSource, examUnits, parseAnswerKey, parsePdfName, questionNote, splitQuestions, type ExamId,
} from '../src/lib/examImport';
import { VAULT_DIR } from '../src/lib/vault';

const BIDI = /[‎‏‪-‮⁦-⁩]/g;

function pdfText(file: string, layout: boolean): string {
  return execFileSync('pdftotext', ['-enc', 'UTF-8', ...(layout ? ['-layout'] : []), file, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
}

function plain(file: string): string {
  const text = pdfText(file, false).replace(BIDI, '').replace(/\f/g, '\n');
  return text.split('\n').map(l => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function write(file: string, content: string, force: boolean): boolean {
  if (fs.existsSync(file) && !force) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

function main() {
  const dir = process.argv[2];
  const force = process.argv.includes('--force');
  if (!dir || !fs.existsSync(dir)) {
    console.error('usage: npm run import-exams -- <folder of PDFs> [--force]');
    process.exit(1);
  }

  const pdfs = fs.readdirSync(dir).map(f => ({ f, id: parsePdfName(f) })).filter(p => p.id);
  const papers = pdfs.filter(p => p.id!.kind === 'q');
  let written = 0;
  const problems: string[] = [];

  for (const { f, id } of papers) {
    const exam: ExamId = { year: id!.year, month: id!.month, code: id!.code };
    const name = examNoteName(exam);
    const keyFile = path.join(dir, f.replace(/-q\.pdf$/, '-s.pdf'));
    const hasKey = fs.existsSync(keyFile);

    const questions = splitQuestions(pdfText(path.join(dir, f), true));
    const answers = hasKey ? parseAnswerKey(pdfText(keyFile, true)) : new Map<number, string>();
    if (questions.length < 4) problems.push(`${f}: only ${questions.length} questions found`);
    for (const q of questions) {
      if (hasKey && !answers.has(q.number)) problems.push(`${f}: no answer for question ${q.number}`);
      if (write(path.join(VAULT_DIR, 'questions', `${name}-q${q.number}.md`), questionNote(exam, q, answers.get(q.number)), force)) written++;
    }

    const units = examUnits(exam.code);
    const examFm = [
      'searchable: false  # indexed per question in vault/questions',
      'topic: bagrut-exam', `units: [${units}]`, 'type: bagrut',
      `year: ${exam.year}`, `shalon: ${exam.code}`, `source_url: ${examPdfSource(exam)}`,
      ...(hasKey ? [`solution: "[[${name}-solution]]"`] : []),
    ];
    if (write(path.join(VAULT_DIR, 'exams', `${name}.md`), `---\n${examFm.join('\n')}\n---\n\n${plain(path.join(dir, f))}`, false)) written++;
    if (hasKey) {
      const solFm = ['type: solution', `units: [${units}]`, `year: ${exam.year}`, `shalon: ${exam.code}`, `exam: "[[${name}]]"`];
      if (write(path.join(VAULT_DIR, 'solutions', `${name}-solution.md`), `---\n${solFm.join('\n')}\n---\n\n${plain(keyFile)}`, false)) written++;
    }
  }

  console.log(`${papers.length} papers, ${written} notes written${force ? ' (--force)' : ''}`);
  if (problems.length) console.log(`check these:\n  ${problems.join('\n  ')}`);
  console.log('next: npm run sync');
}

main();
