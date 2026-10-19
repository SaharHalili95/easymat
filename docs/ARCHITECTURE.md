# EasyMat — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.6 App Router, React 19, Tailwind CSS 4 |
| LLM | Anthropic claude-sonnet-4-6 (streaming + prompt caching) |
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
│   ├── page.tsx                chat UI (client component)
│   └── api/
│       └── chat/route.ts       LLM endpoint + RAG + rate limiting
├── components/
│   ├── ChatMessage.tsx         markdown + LaTeX rendering
│   ├── ChatInput.tsx           text + image input
│   └── UnitSelector.tsx        3/4/5 unit level picker
├── lib/
│   ├── claude.ts               Anthropic client singleton
│   ├── pinecone.ts             Pinecone client, index namespace, embed model
│   ├── rag.ts                  search query + text search in Pinecone
│   ├── chunk.ts                note → chunks
│   ├── vault.ts                read vault, build content-addressed records
│   ├── vaultSync.ts            diff + batched, paced upload
│   └── buildSystemPrompt.ts   system prompt builder
scripts/
├── create-index.ts             create the integrated index
└── sync-vault.ts               npm run sync [--dry-run] [--watch]
vault/                          Obsidian vault
├── topics/                     26 notes: formulas, examples, solved questions
├── exams/                      38 past papers (text extracted from PDFs)
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

Chunking: primary split on `---`, then paragraphs, then lines (exam text extracted from PDFs has no blank lines). Max 1500 chars, min 200. Heading prepended to sub-chunks. Never splits inside a `$$` block unless it runs past 3000 chars. The vault produces 317 chunks, median ~1500 chars (~1,650 tokens, under the model's 2048).

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

- The `381` and `481` past papers in `vault/exams/` are not math exams: the 481 files are the English Bagrut (code 016481) and the 381 files are mostly Arabic. The links in `vault/reference/bagrut-links.md` use the same wrong codes. Until they are replaced, 3- and 4-unit searches can surface them.
