# בגרות מאסטר — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.6 App Router, React 19, Tailwind CSS 4 |
| LLM | Anthropic claude-sonnet-4-6 (streaming + prompt caching) |
| Vector DB | Pinecone (index: bagrut-notes, 512 dims, cosine) |
| Embeddings | Voyage AI voyage-3-lite |
| Math render | KaTeX via react-katex |
| Language | TypeScript |

## External Services

| Service | Key env var | What for |
|---------|------------|---------|
| Anthropic | `ANTHROPIC_API_KEY` | Chat responses (streaming) |
| Pinecone | `PINECONE_API_KEY` + `PINECONE_INDEX_NAME` | Vector storage and retrieval |
| Voyage AI | `VOYAGE_API_KEY` | Text embeddings (ingest + query) |

## Data Flow

```
User message
    ↓
page.tsx — POST /api/chat
    ↓
chat/route.ts
    ├── Rate limit (20 req/min per IP)
    ├── embed query → Voyage AI
    ├── query Pinecone (filter by unitLevel)
    ├── build system prompt with RAG context
    └── stream Claude API → client
```

```
POST /api/ingest (x-ingest-secret header)
    ↓
ingest/route.ts
    ├── read src/data/notes/*.md
    ├── parse frontmatter (gray-matter)
    ├── chunk text (split on ---, then paragraphs)
    ├── embed in batches of 4, 25s gap (Voyage AI 3 RPM limit)
    └── upsert to Pinecone
```

## File Map

```
src/
├── app/
│   ├── layout.tsx              root layout
│   ├── page.tsx                chat UI (client component)
│   └── api/
│       ├── chat/route.ts       LLM endpoint + RAG + rate limiting
│       └── ingest/route.ts     notes → Pinecone pipeline
├── components/
│   ├── ChatMessage.tsx         markdown + LaTeX rendering
│   ├── ChatInput.tsx           text + image input
│   └── UnitSelector.tsx        3/4/5 unit level picker
├── lib/
│   ├── claude.ts               Anthropic client singleton
│   ├── pinecone.ts             Pinecone client singleton
│   ├── embed.ts                Voyage AI batch embedder
│   ├── rag.ts                  Pinecone query + context retrieval
│   └── buildSystemPrompt.ts   system prompt builder
└── data/
    └── notes/                  36 markdown files (knowledge base)
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

Chunking: primary split on `---`, then paragraphs. Max 1500 chars, min 200. Heading prepended to sub-chunks. LaTeX `$$` balance respected.

## Pinecone Metadata Schema

```
{
  text: string       — chunk content
  topic: string      — from frontmatter
  units: string[]    — stored as strings (["3","4","5"])
  tags: string[]     — from frontmatter
  source: string     — filename
}
```

Filter at query time: `{ units: { $in: [String(unitLevel)] } }`

## Rate Limits

| Service | Limit | How handled |
|---------|-------|------------|
| Voyage AI | 3 RPM, 10K TPM | BATCH_SIZE=4, 25s between batches, retry on 429 |
| /api/chat | 20 req/min per IP | In-memory Map with pruning at 500 entries |

## Obsidian

No integration. Notes live in `src/data/notes/` as local markdown files. Obsidian-compatible format (YAML frontmatter) but not connected to any vault or plugin.

## Auth

- `/api/ingest` — `x-ingest-secret` header required
- `/api/chat` — rate limiting only (no API key)

## Knowledge Base (36 files)

- **Formulas:** derivatives, integrals, limits, logarithms, trigonometry, sequences, probability, statistics, quadratic-equations, percentages-linear, vectors
- **Examples:** same topics
- **Bagrut exams:** 2020, 2022, 2023, 2024 (3/4/5 unit variants), derivatives-bagrut, integrals-bagrut, trigonometry-bagrut, sequences-bagrut
