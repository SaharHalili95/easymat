# EasyMat - AI Math Tutor for the Israeli Bagrut

An AI-powered math tutor for Israeli high school students preparing for the Bagrut exam (3, 4, and 5 units). Combines RAG architecture with the Claude API to deliver context-aware, curriculum-aligned answers with full LaTeX rendering.

## Features

- **RAG pipeline:** Obsidian-style markdown notes -> Voyage AI embeddings -> Pinecone vector search
- **Streamed Claude API** responses with prompt caching (~90% cost reduction)
- **LaTeX rendering** via KaTeX for clean formula display
- **Image upload** for handwritten equations - Claude transcribes to LaTeX and solves
- **Unit level selector** - adapts tone and curriculum to 3, 4, or 5 units
- **Bilingual** Hebrew/English with automatic RTL/LTR switching

## Tech Stack

Next.js 14 · TypeScript · Claude API (Anthropic) · Pinecone · Voyage AI · KaTeX · Tailwind CSS

## Getting Started

### Prerequisites

Three API keys are required:
- [Anthropic](https://console.anthropic.com) - Claude API
- [Pinecone](https://pinecone.io) - vector database (free tier)
- [Voyage AI](https://voyageai.com) - embeddings (free tier)

### Setup

```bash
git clone https://github.com/SaharHalili95/easymat.git
cd easymat
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=your-key
PINECONE_API_KEY=your-key
PINECONE_INDEX_NAME=bagrut-notes
VOYAGE_API_KEY=your-key
INGEST_SECRET=any-random-string
```

```bash
npm run dev
```

### Ingest Notes into Pinecone

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "x-ingest-secret: your-ingest-secret"
```

## Project Structure

```
src/
  app/
    page.tsx              # Chat UI
    api/chat/route.ts     # Claude + RAG endpoint (streaming)
    api/ingest/route.ts   # Notes ingestion endpoint
  components/
    ChatMessage.tsx       # Renders messages with LaTeX
    ChatInput.tsx         # Text input + image upload
    UnitSelector.tsx      # 3/4/5 unit level picker
  lib/
    claude.ts             # Anthropic client singleton
    pinecone.ts           # Pinecone client singleton
    rag.ts                # Vector retrieval
    embed.ts              # Voyage AI embeddings
    buildSystemPrompt.ts  # RAG context + system prompt
    __tests__/            # Vitest unit tests
  data/notes/             # Markdown knowledge base (Bagrut curriculum)
```

## Tests

```bash
npm test
```

27 unit tests cover the system prompt (citations, unit level, syllabus), Pinecone retrieval filters and the Voyage AI client (batching, 429 retries, errors). External APIs are mocked, so no keys are needed. CI runs lint, type-check, tests and a production build on every push.

## Design docs

Planning notes written while building the project (mostly in Hebrew):

- [Architecture](docs/ARCHITECTURE.md)
- [Requirements](docs/REQUIREMENTS.md)
- [Processes and data flow](docs/PROCESSES.md)
- [Cost analysis](docs/COST_ANALYSIS.md)
- [Model capabilities and limits](docs/HAIKU_CAPABILITIES.md)
- [Original execution plan](docs/PROJECT_PLAN.md)

## GitHub

[github.com/SaharHalili95/easymat](https://github.com/SaharHalili95/easymat)
