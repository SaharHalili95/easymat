# EasyMat — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.6 App Router, React 19, Tailwind CSS 4 |
| LLM | Anthropic `claude-haiku-5-5` at effort `low` by default; `claude-sonnet-5-5` at `medium` for images, proofs, vectors, complex numbers and 582 context (streaming + prompt caching, `src/lib/models.ts`) |
| Vector DB | Pinecone serverless (index: easymat-vault, AWS us-east-1) |
| Embeddings | Pinecone integrated inference, `llama-text-embed-v2` (1024 dims, 2048 tokens, multilingual incl. Hebrew) |
| Content | Obsidian vault in `vault/` |
| Math render | KaTeX via react-katex |
| Language | TypeScript |

## External Services

| Service | Key env var | What for |
|---------|------------|---------|
| Anthropic | `ANTHROPIC_API_KEY` | Chat responses (streaming) |
| Pinecone | `PINECONE_API_KEY` + `PINECONE_INDEX_NAME` | Embedding, storage and retrieval |

## Data Flow

```
User message
    ↓
page.tsx — POST /api/chat
    ↓
chat/route.ts
    ├── Rate limit (20 req/min per IP)
    ├── search text = last user message (+ previous one if under 40 chars)
    ├── Pinecone searchRecords × 2 (notes topK=5, past paper topK=1; filter by unitLevel)
    ├── build system prompt with RAG context
    └── stream Claude API → client
```

```
Edit a note in Obsidian
    ↓
npm run sync  (or --watch: 3s after a save)
    ├── read vault/**/*.md (skips .obsidian, .trash)
    ├── keep notes with topic + units frontmatter
    ├── chunk text → ID = <path>#<sha256(text + metadata)>
    ├── list IDs in the index
    ├── upsertRecords for new IDs (≤96 records, ≤60k est. tokens per batch, ≤200k tokens/min)
    └── deleteMany for IDs no longer in the vault
```

IDs are content-addressed, so the diff needs no state: an edited chunk gets a new ID and its old ID is deleted. Unchanged chunks are never re-embedded.

## File Map

```
src/
├── app/
│   ├── layout.tsx              root layout
│   ├── page.tsx                chat + practice tabs (client component)
│   └── api/
│       ├── chat/route.ts       LLM endpoint + RAG + rate limiting
│       ├── practice/route.ts   random question by level/chapter (no model call)
│       └── practice/answer/    official answer for one question
├── components/
│   ├── ChatMessage.tsx         markdown + LaTeX rendering
│   ├── ChatInput.tsx           text + image input
│   ├── UnitSelector.tsx        3/4/5 unit level picker
│   └── PracticePanel.tsx       practice mode UI
├── lib/
│   ├── claude.ts               Anthropic client singleton
│   ├── models.ts               model routing, effort, refusal/error messages
│   ├── practice.ts             load question notes, pick one, find its answer
│   ├── examImport.ts           split pdftotext -layout papers and answer keys
│   ├── examUrl.ts              link to the original PDF
│   ├── pinecone.ts             Pinecone client, index namespace, embed model
│   ├── rag.ts                  search query + text search in Pinecone
│   ├── chunk.ts                note → chunks
│   ├── vault.ts                read vault, build content-addressed records
│   ├── vaultSync.ts            diff + batched, paced upload
│   └── buildSystemPrompt.ts   system prompt builder
scripts/
├── create-index.ts             create the integrated index
├── import-exams.ts             npm run import-exams -- <pdf folder> [--force]
└── sync-vault.ts               npm run sync [--dry-run] [--watch]
vault/                          Obsidian vault
├── topics/                     26 notes: formulas, examples, solved questions
├── questions/                  492 question notes with answers, 2025-2026 (indexed)
├── exams/                      116 whole past papers (2025-2026 and the 381/481 files not indexed)
├── solutions/                  78 official answer keys, 2025-2026 (not indexed; answers are in the question notes)
├── syllabus/                   6 מיקוד files, read directly by the prompt builder
└── reference/                  official links (not indexed)
```

## Notes Structure

Each file has YAML frontmatter:
```yaml
---
topic: derivatives-formulas
units: [3, 4, 5]
tags: [calculus, derivatives]
---
```

Chunking: primary split on `---`, then paragraphs, then lines (exam text extracted from PDFs has no blank lines). Max 1500 chars, min 200. Heading prepended to sub-chunks. Never splits inside a `$$` block unless it runs past 3000 chars. The vault produces 630 indexed chunks, median ~1500 chars (~1,650 tokens, under the model's 2048).

## Pinecone Record Schema

```
{
  _id: string        — <vault path>#<16 hex of sha256>
  text: string       — chunk content (embedded by Pinecone via fieldMap)
  topic: string      — from frontmatter
  units: string[]    — stored as strings (["3","4","5"])
  tags?: string[]    — from frontmatter
  source: string     — path inside the vault
  type?, year?, moed?, shalon? — past papers only
}
```

Namespace: `__default__`.

Filter at query time: `{ units: { $in: [String(unitLevel)] } }`

## Rate Limits

| Service | Limit | How handled |
|---------|-------|------------|
| Pinecone embedding (Starter) | 250K passage tokens/min, 5M tokens/month per model | Batches ≤60K est. tokens, ≤200K per minute, retry on 429 (15s backoff, doubling) |
| /api/chat | 20 req/min per IP | In-memory Map with pruning at 500 entries |

## Obsidian

`vault/` is opened directly as an Obsidian vault; no plugin is needed. Obsidian's workspace files and trash are git-ignored. Notes without `topic` + `units` frontmatter (syllabus, reference) are not indexed.

## Auth

- `/api/chat` — rate limiting only (no API key)

## Known data issues

- 2025-2026 covers all 13 math questionnaires (35182, 35371/2, 35381/2, 35471/2, 35481/2, 35571/2, 35581/2) with full 5-digit `shalon` codes. Text comes from `pdftotext`, so fractions and formulas are flattened.
- The 2020-2024 `381` and `481` past papers in `vault/exams/` are not math exams: the 481 files are the English Bagrut (code 016481) and the 381 files are mostly Arabic. The links in `vault/reference/bagrut-links.md` use the same wrong codes. They are kept in the vault with `searchable: false`, so they are not indexed.
