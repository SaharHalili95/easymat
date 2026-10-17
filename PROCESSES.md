# תהליכים ועלויות — EasyMat AI

---

## תהליך 1 — Ingest (העלאת חומר)
**מתי:** פעם אחת / כל שינוי בחומר

```
src/data/notes/*.md (64 קבצים)
    ↓
chunkText() — פיצול לפי --- ופסקאות + כיבוד LaTeX
    ↓ 64 chunks, ממוצע ~1,681 tokens לחunk
Voyage AI — embedSingleBatch (BATCH_SIZE=2, 30s gap)
    ↓ 32 קריאות API, ~107,600 tokens סה"כ
Pinecone — upsert
    ↓ 64 vectors (512 dims)
```

| שירות | כמות | עלות |
|-------|------|------|
| Voyage AI | 107,600 tokens | **$0** (free tier: 200M) |
| Pinecone write | 64 vectors | **$0** (free tier: 2GB) |
| זמן ריצה | ~16-30 דקות | — |
| **סה"כ** | | **$0** |

---

## תהליך 2 — שאלת תלמיד (per request)
**מתי:** כל שאלה

```
תלמיד שולח שאלה
    ↓
Rate limit check (20/min per IP) — $0
    ↓
Voyage AI × 2 — embed השאלה
    ↓ ~150 tokens
Pinecone × 2 — חיפוש context + שאלת בגרות
    ↓ topK=5 + topK=1
buildSystemPrompt — הרכבת prompt
    ↓ system + syllabus + context
Claude claude-sonnet-4-6 — stream תשובה
    ↓
תלמיד מקבל תשובה + לחצן "שאלה מבגרות אמיתית"
```

| שירות | tokens | עלות |
|-------|--------|------|
| Voyage AI (2 queries) | ~150 | ~$0.000003 |
| Pinecone (2 queries) | 6 reads | ~$0 |
| Claude — cache read (system+syllabus) | ~2,700 | ~$0.0008 |
| Claude — input (context+history+user) | ~1,600 | ~$0.0048 |
| Claude — output (תשובה) | ~800 | ~$0.012 |
| **סה"כ לשאלה** | | **~$0.018** |

---

## תהליך 3 — טעינת אפליקציה
**מתי:** כל כניסה של משתמש

```
דפדפן → Vercel CDN → Next.js page
    ↓ HTML + JS bundle (static)
```
| שירות | עלות |
|-------|------|
| Vercel (free tier) | $0 עד 100GB bandwidth |

---

## תהליך 4 — עדכון תוכן
**מתי:** כל פעם שמוסיפים/משנים קבצים

```
עריכת קובץ ב-src/data/notes/
    ↓
POST /api/ingest (עם x-ingest-secret)
    ↓ תהליך 1 מחדש (upsert — לא מוחק ישן)
```
עלות = עלות תהליך 1 = **$0**

---

## סיכום עלויות חודשיות

| תרחיש | שאלות/חודש | Claude | Voyage | Pinecone | Vercel | **סה"כ** |
|--------|-----------|--------|--------|----------|--------|----------|
| אב טיפוס | 1,500 | $27 | $0 | $0 | $0 | **$27** |
| בטא | 15,000 | $270 | $0 | $0 | $20 | **$290** |
| App Store קטן | 60,000 | $1,080 | $0 | $0 | $20 | **$1,100** |
| App Store בינוני | 300,000 | $5,400 | $6 | $21 | $20 | **$5,447** |

---

## מה גורם לעלות לעלות

```
80% מהעלות = Claude output tokens
    ↓ כל תו שהבוט כותב = כסף

10% = Claude input (context + history)
    ↓ יותר היסטוריה = יותר עלות

5% = Claude cache miss (כל 5 דקות)
    ↓ system prompt + syllabus נטענים מחדש

5% = Voyage + Pinecone
    ↓ כמעט זניח
```

---

## אופטימיזציות שיכולות לחצות עלות ב-50%

| שינוי | חסכון |
|-------|-------|
| max_tokens: 2048 → 1024 | ~25% |
| Claude Haiku לשאלות פשוטות | ~75% על שאלות אלו |
| צמצום syllabus 5u (2,199→500 tokens) | ~$0.005/שאלה |
| topK: 5 → 3 | ~10% |
