'use client';
import { useCallback, useEffect, useState } from 'react';
import type { PracticeQuestion } from '@/lib/practice';

interface Props {
  unitLevel: number | null;
  onAskTutor: (prompt: string) => void;
}

interface Chapter {
  name: string;
  count: number;
}

interface Loaded {
  question: PracticeQuestion | null;
  chapters: Chapter[];
  error: string | null;
}

async function fetchQuestion(units: number, chapter: string, exclude: string[]): Promise<Loaded> {
  try {
    const params = new URLSearchParams({ units: String(units), exclude: exclude.join(',') });
    if (chapter) params.set('chapter', chapter);
    const res = await fetch(`/api/practice?${params}`);
    const data = await res.json();
    const found = res.ok && data.question;
    return { question: found ? data.question : null, chapters: data.chapters ?? [], error: found ? null : 'לא נמצאו שאלות לבחירה הזאת.' };
  } catch {
    return { question: null, chapters: [], error: 'שגיאה בטעינת שאלה. נסו שנית.' };
  }
}

export function PracticePanel({ unitLevel, onAskTutor }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapter, setChapter] = useState('');
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [loading, setLoading] = useState(unitLevel !== null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((loaded: Loaded) => {
    if (loaded.chapters.length > 0) setChapters(loaded.chapters);
    setQuestion(loaded.question);
    setError(loaded.error);
    const id = loaded.question?.id;
    if (id) setSeen(s => [...s, id]);
    setLoading(false);
  }, []);

  const next = (chapterName: string) => {
    if (!unitLevel) return;
    setLoading(true);
    setAnswer(null);
    void fetchQuestion(unitLevel, chapterName, seen).then(apply);
  };

  // The parent remounts this panel (key={unitLevel}) when the level changes,
  // so state starts fresh and only the first question needs loading here.
  useEffect(() => {
    if (!unitLevel) return;
    let cancelled = false;
    void fetchQuestion(unitLevel, '', []).then(loaded => {
      if (!cancelled) apply(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [unitLevel, apply]);

  const showAnswer = async () => {
    if (!question) return;
    setError(null);
    try {
      const res = await fetch(`/api/practice/answer?id=${encodeURIComponent(question.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setAnswer(data.answer);
    } catch {
      setError('לא הצלחתי לטעון את התשובה הרשמית.');
    }
  };

  if (!unitLevel) {
    return <p className="text-center text-gray-500 mt-20 text-sm">בחרו רמת יחידות למעלה כדי לקבל שאלה מבגרות.</p>;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2 items-center">
        <select
          value={chapter}
          onChange={(e) => {
            setChapter(e.target.value);
            next(e.target.value);
          }}
          className="w-0 flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white text-gray-900"
          aria-label="נושא"
        >
          <option value="">כל הנושאים</option>
          {chapters.map((c) => (
            <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
          ))}
        </select>
        <button
          onClick={() => next(chapter)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          שאלה חדשה
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && !question && <p className="text-sm text-gray-400">טוען...</p>}

      {question && (
        <article className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-gray-900">
          <header className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="font-semibold text-blue-700 text-sm">{question.title}</h2>
              {question.chapter && <p className="text-xs text-gray-500 mt-0.5">{question.chapter}</p>}
            </div>
            {question.sourceUrl && (
              <a href={question.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 underline shrink-0">
                השאלון המקורי
              </a>
            )}
          </header>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{question.text}</p>
          <p className="text-[11px] text-gray-400 mt-3">
            הטקסט חולץ אוטומטית מה-PDF, ושברים או סרטוטים עלולים להופיע לא תקין. בספק, פתחו את השאלון המקורי.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {question.hasAnswer && !answer && (
              <button onClick={() => void showAnswer()} className="px-3 py-1.5 rounded-lg border text-sm bg-white text-gray-900 hover:bg-gray-100">
                הצג תשובה רשמית
              </button>
            )}
            <button
              onClick={() => onAskTutor(`עזור לי לפתור את השאלה הזאת מבגרות (${question.title}), צעד אחר צעד:\n\n${question.text}`)}
              className="px-3 py-1.5 rounded-lg border text-sm bg-white text-gray-900 hover:bg-gray-100"
            >
              פתרו איתי עם המורה
            </button>
          </div>

          {answer && (
            <div className="mt-4 border-t pt-3">
              <h3 className="text-sm font-semibold mb-1">תשובה רשמית (תשובות סופיות בלבד)</h3>
              <p className="text-sm whitespace-pre-wrap break-words">{answer}</p>
              <p className="text-[11px] text-gray-500 mt-2">בבחינה צריך לכתוב פתרון מלא ומנומק. תשובה סופית בלי דרך לא מקבלת ניקוד מלא.</p>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
