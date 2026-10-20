# תהליכים ועלויות — EasyMat AI

---

## תהליך 1 — סנכרון מלא (`npm run sync` על index ריק)
**מתי:** פעם אחת, או אחרי יצירת index חדש

```
vault/**/*.md (719 קבצים, 538 עם topic + units)
    ↓
chunkText() — פיצול לפי ---, פסקאות ושורות + כיבוד LaTeX
    ↓ 630 chunks (שאלה אחת או קטע של עד 1,500 תווים)
Pinecone upsertRecords — Pinecone מחשב embeddings בעצמו (llama-text-embed-v2)
    ↓ ~1,100,000 tokens, עד 200K לדקה
```

| שירות | כמות | עלות |
|-------|------|------|
| Pinecone embedding | ~1.1M tokens | **$0** (Starter: 5M לחודש למודל, כלומר ~4 סנכרונים מלאים) |
| Pinecone write | 630 records | **$0** (Starter: 2GB) |
| זמן ריצה | ~5 דקות | — |
| **סה"כ** | | **$0** |

---

## תהליך 2 — שאלת תלמיד (per request)
**מתי:** כל שאלה

```
תלמיד שולח שאלה
    ↓
Rate limit check (20/min per IP) — $0
    ↓
Pinecone searchRecords × 2 — חיפוש context + שאלת בגרות (Pinecone עושה embed לשאלה)
    ↓ topK=5 + topK=1
buildSystemPrompt — הרכבת prompt
    ↓ system + syllabus + context
Claude — stream תשובה (Haiku 5.5 ברירת מחדל, Sonnet 5.5 לתמונות, הוכחות ווקטורים)
    ↓
תלמיד מקבל תשובה + לחצן "שאלה מבגרות אמיתית"
```

| שירות | tokens | עלות |
|-------|--------|------|
| Pinecone embedding (2 queries) | ~200 | $0 (Starter) |
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
עריכת פתק ב-Obsidian (vault/)
    ↓
npm run sync  (או --watch שרץ ברקע)
    ↓ רק chunks שהשתנו נשלחים, chunks שנמחקו נמחקים מ-Pinecone
```
עריכה של פתק אחד: ~3 שניות, כמה אלפי tokens = **$0**

---

## סיכום עלויות חודשיות

| תרחיש | שאלות/חודש | Claude | Embedding | Pinecone | Vercel | **סה"כ** |
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

5% = Pinecone (embedding + חיפוש)
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
