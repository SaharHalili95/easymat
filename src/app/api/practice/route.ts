import { NextRequest, NextResponse } from 'next/server';
import { chaptersFor, loadQuestions, pickQuestion } from '@/lib/practice';

// GET /api/practice?units=5&chapter=...&exclude=id1,id2
// A random past-paper question (without its answer) plus the chapters
// available at that level. No model call.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const units = Number(params.get('units'));
  if (![3, 4, 5].includes(units)) {
    return NextResponse.json({ error: 'units must be 3, 4 or 5' }, { status: 400 });
  }
  const chapter = params.get('chapter') || undefined;
  const exclude = (params.get('exclude') ?? '').split(',').filter(Boolean).slice(0, 500);

  const questions = loadQuestions();
  const question = pickQuestion(questions, { units, chapter, exclude });
  return NextResponse.json(
    { question, chapters: chaptersFor(questions, units) },
    { status: question ? 200 : 404 },
  );
}
