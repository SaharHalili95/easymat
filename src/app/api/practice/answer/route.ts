import { NextRequest, NextResponse } from 'next/server';
import { findAnswer, isQuestionId, loadQuestions } from '@/lib/practice';

// GET /api/practice/answer?id=bagrut-2026-summer-a-35581-q1
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!isQuestionId(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  const answer = findAnswer(loadQuestions(), id);
  if (!answer) {
    return NextResponse.json({ error: 'no answer for this question' }, { status: 404 });
  }
  return NextResponse.json({ answer });
}
