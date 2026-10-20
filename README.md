# EasyMat - AI Math Tutor for the Israeli Bagrut

An AI-powered math tutor for Israeli high school students preparing for the Bagrut exam (3, 4, and 5 units). Combines RAG architecture with the Claude API to deliver context-aware, curriculum-aligned answers with full LaTeX rendering.

## Features

- **Obsidian vault as the knowledge base:** edit any note in `vault/`, run `npm run sync`, and the next answer uses it
- **RAG pipeline:** Pinecone index with integrated embedding (`llama-text-embed-v2`), so no separate embedding service
- **Streamed Claude API** responses with prompt caching (~90% cost reduction)
- **LaTeX rendering** via KaTeX for clean formula display
- **Image upload** for handwritten equations - Claude transcribes to LaTeX and solves
- **Unit level selector** - adapts tone and curriculum to 3, 4, or 5 units
- **Bilingual** Hebrew/English with automatic RTL/LTR switching

## Tech Stack

Next.js 16 · TypeScript · Claude API (Anthropic) · Pinecone · Obsidian · KaTeX · Tailwind CSS

## Getting Started

### Prerequisites

Two API keys are required:
- [Anthropic](https://console.anthropic.com) - Claude API
- [Pinecone](https://pinecone.io) - vector database and embeddings (free Starter plan)

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
PINECONE_INDEX_NAME=easymat-vault
```

```bash
npm run dev
```

### Load the vault into Pinecone

```bash
npm run create-index   # once: creates the index on AWS us-east-1 with llama-text-embed-v2
npm run sync           # uploads every chunk (~2 minutes the first time)
```

## Editing content in Obsidian

Open the `vault/` folder as a vault in Obsidian (*Open folder as vault*). It holds:

- `topics/` - formulas, worked examples and solved Bagrut questions per topic
- `exams/` - past papers as extracted from the Ministry of Education PDFs (all math questionnaires for 2025-2026; 5 units plus mislabeled 3/4-unit files for 2020-2024)
- `solutions/` - official answer keys for 2025-2026, linked from each exam; not searched yet
- `syllabus/` - the yearly focus (מיקוד) per unit level, loaded straight into the prompt
- `reference/` - official links, not searched

A note is searchable when its frontmatter has a `topic` and `units`:

```yaml
---
topic: derivatives
units: [4, 5]
tags: [calculus]
type: bagrut        # optional; past papers also set year, moed and shalon
---
```

After editing, run `npm run sync`, or leave `npm run sync -- --watch` running to sync a few seconds after every save. A sync only uploads chunks whose text or frontmatter changed and deletes chunks that no longer exist, so editing one note takes a few seconds. `npm run sync -- --dry-run` shows what would change.

The old `bagrut-notes` index (Voyage, 512 dims) is no longer used and can be deleted in the Pinecone console.

## Project Structure

```
src/
  app/
    page.tsx              # Chat UI
    api/chat/route.ts     # Claude + RAG endpoint (streaming)
  components/
    ChatMessage.tsx       # Renders messages with LaTeX
    ChatInput.tsx         # Text input + image upload
    UnitSelector.tsx      # 3/4/5 unit level picker
  lib/
    claude.ts             # Anthropic client singleton
    pinecone.ts           # Pinecone client singleton
    rag.ts                # Text search in Pinecone
    vault.ts              # Reads the vault and builds content-addressed chunks
    chunk.ts              # Splits notes into chunks
    vaultSync.ts          # Diffs the vault against the index
    buildSystemPrompt.ts  # RAG context + system prompt
    __tests__/            # Vitest unit tests
scripts/
  create-index.ts         # Creates the Pinecone index
  sync-vault.ts           # npm run sync [--dry-run] [--watch]
vault/                    # Obsidian vault (knowledge base)
```

## Tests

```bash
npm test
```

Unit tests cover the system prompt, chunking, reading the vault, content-addressed IDs, the sync diff (batching, token pacing, 429 retries, deletes) and Pinecone search filters. External APIs are mocked, so no keys are needed. CI runs lint, type-check, tests and a production build on every push.

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
