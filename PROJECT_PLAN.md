# Bagrut-Master AI — Execution Plan

**Goal:** Build a full-stack AI math tutor for the Israeli Bagrut exam (3/4/5 units) with RAG
powered by Obsidian notes + Pinecone, using Next.js and the Claude API.

**Tech Stack:**
- Frontend + API routes: Next.js 14 (App Router)
- LLM: Claude claude-sonnet-4-6 (text + vision)
- Vector DB: Pinecone (free tier)
- Embeddings: Voyage AI `voyage-3-lite` (512 dimensions)
- Math rendering: KaTeX (via `react-katex`)
- Language: TypeScript

---

## Prerequisites (Before Any Phase)

> **Setup note:** This project requires 3 API keys. Anthropic handles the LLM but has no
> embeddings endpoint, so Voyage AI is required separately for converting text to vectors.
> All three free tiers are sufficient for development.

1. Create a free Pinecone account at https://pinecone.io → get API key + create an index named `bagrut-notes` (dimension: **512**, metric: cosine)
2. Create a free Voyage AI account at https://voyageai.com → get API key (free tier supports development)
3. Locate your Anthropic API key (already exists in `~/Projects/nitai-bot/.env`)
4. Install Node.js 18+ if not already installed: `node --version`

---

## Phase 1 — Project Scaffolding

**Goal:** Create the Next.js project with all dependencies and environment setup.

**Estimated time per step: 2-4 minutes**

### Steps

**1.1 — Scaffold Next.js app**
```bash
cd ~/Projects
npx create-next-app@latest bagrut-master --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd bagrut-master
```

**1.2 — Install dependencies**
```bash
npm install @anthropic-ai/sdk @pinecone-database/pinecone react-katex katex
npm install -D @types/katex
```
- `@anthropic-ai/sdk` - Claude API client
- `@pinecone-database/pinecone` - Pinecone vector DB client
- `react-katex` + `katex` - LaTeX math rendering

**1.3 — Create environment file**

File: `/Projects/bagrut-master/.env.local`
```
ANTHROPIC_API_KEY=sk-ant-api03-...   # copy from nitai-bot/.env
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=bagrut-notes
VOYAGE_API_KEY=your-voyage-key
INGEST_SECRET=choose-a-random-string
```

**1.4 — Create folder structure**
```
src/
  app/
    page.tsx              ← main chat UI
    api/
      chat/route.ts       ← chat endpoint (Claude + RAG)
      ingest/route.ts     ← notes ingestion endpoint
  components/
    ChatMessage.tsx       ← renders a single message with LaTeX
    ChatInput.tsx         ← text input + image upload button
    UnitSelector.tsx      ← 3/4/5 unit level picker
  lib/
    pinecone.ts           ← Pinecone client singleton
    claude.ts             ← Anthropic client singleton
    rag.ts                ← retrieve relevant notes from Pinecone
    embed.ts              ← convert text to embedding vector
    buildSystemPrompt.ts  ← builds Claude system prompt with RAG context
  data/
    notes/                ← Obsidian-style Markdown files (sample notes)
```

### Verification
- `npm run dev` starts with no errors
- Browser opens `http://localhost:3000` showing default Next.js page
- `.env.local` has all 5 keys filled in (ANTHROPIC, PINECONE, PINECONE_INDEX_NAME, VOYAGE, INGEST_SECRET)

---

## Phase 2 — Sample Obsidian Notes

**Goal:** Create realistic Bagrut math notes in Markdown format that will be ingested into Pinecone. This is the "knowledge base" Claude will cite.

**Estimated time per step: 2-5 minutes**

### Steps

**2.1 — Create notes directory**
```
src/data/notes/
```

**2.2 — Write note: Quadratic Equations (3-5 units)**

File: `src/data/notes/quadratic-equations.md`
```markdown
---
topic: quadratic-equations
units: [3, 4, 5]
tags: [algebra, equations]
---
# משוואה ריבועית (Quadratic Equation)

## הצורה הכללית
$$ax^2 + bx + c = 0 \quad (a \neq 0)$$

## נוסחת הפתרון (Quadratic Formula)
$$x_{1,2} = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

## הדיסקרימיננטה
$$\Delta = b^2 - 4ac$$
- $\Delta > 0$: שני פתרונות שונים
- $\Delta = 0$: פתרון אחד (כפול)
- $\Delta < 0$: אין פתרונות ממשיים
```

**2.3 — Write note: Derivatives (4-5 units)**

File: `src/data/notes/derivatives.md`
```markdown
---
topic: derivatives
units: [4, 5]
tags: [calculus, differentiation]
---
# נגזרות (Derivatives)

## הגדרה
$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$

## כללי גזירה
| פונקציה | נגזרת |
|---------|-------|
| $x^n$ | $nx^{n-1}$ |
| $\sin x$ | $\cos x$ |
| $\cos x$ | $-\sin x$ |
| $e^x$ | $e^x$ |
| $\ln x$ | $\frac{1}{x}$ |

## כלל השרשרת
$$[f(g(x))]' = f'(g(x)) \cdot g'(x)$$
```

**2.4 — Write note: Trigonometry (4-5 units)**

File: `src/data/notes/trigonometry.md`
```markdown
---
topic: trigonometry
units: [4, 5]
tags: [trigonometry]
---
# טריגונומטריה

## זהויות יסוד
$$\sin^2 x + \cos^2 x = 1$$
$$\tan x = \frac{\sin x}{\cos x}$$

## נוסחאות כפל זווית
$$\sin(2x) = 2\sin x \cos x$$
$$\cos(2x) = \cos^2 x - \sin^2 x = 1 - 2\sin^2 x$$
```

**2.5 — Write note: Vectors (5 units only)**

File: `src/data/notes/vectors.md`
```markdown
---
topic: vectors
units: [5]
tags: [vectors, linear-algebra]
---
# וקטורים (Vectors)

## פעולות בסיסיות
$$\vec{u} + \vec{v} = (u_1 + v_1, u_2 + v_2)$$

## מכפלה סקלרית (Dot Product)
$$\vec{u} \cdot \vec{v} = u_1 v_1 + u_2 v_2$$

## גודל וקטור
$$|\vec{u}| = \sqrt{u_1^2 + u_2^2}$$

## זווית בין וקטורים
$$\cos\theta = \frac{\vec{u} \cdot \vec{v}}{|\vec{u}||\vec{v}|}$$
```

**2.6 — Write note: Percentages & Linear equations (3 units)**

File: `src/data/notes/percentages-linear.md`
```markdown
---
topic: percentages-linear
units: [3]
tags: [algebra, arithmetic]
---
# אחוזים ומשוואות לינאריות

## אחוז
$$p\% \text{ מ-} N = \frac{p}{100} \cdot N$$

## משוואה לינארית
$$ax + b = c \Rightarrow x = \frac{c - b}{a}$$

## שיעור שינוי באחוזים
$$\text{שינוי} = \frac{\text{ערך חדש} - \text{ערך ישן}}{\text{ערך ישן}} \times 100\%$$
```

### Verification
- Directory `src/data/notes/` contains 5 `.md` files
- Each file has valid frontmatter with `topic`, `units`, and `tags`
- Notes contain LaTeX math wrapped in `$$`

---

## Phase 3 — Pinecone & Embedding Infrastructure

**Goal:** Build the code that converts notes to vectors and stores them in Pinecone. This is the core of RAG.

**Estimated time per step: 3-5 minutes**

### Steps

**3.1 — Create Pinecone client singleton**

File: `src/lib/pinecone.ts`
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export function getPineconeIndex() {
  return getPinecone().index(process.env.PINECONE_INDEX_NAME!);
}
```

**Why:** Singleton prevents creating multiple connections on each request.

**3.2 — Create embedding function**

File: `src/lib/embed.ts`
```typescript
import Anthropic from '@anthropic-ai/sdk';

// NOTE: Claude doesn't have an embeddings endpoint.
// We use a simple hash-based approach for learning purposes,
// then swap to a real embedding model (Voyage AI / OpenAI) for production.

// For this project, use Voyage AI embeddings via Anthropic partnership.
// Alternatively, use OpenAI text-embedding-3-small.

export async function embedText(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'voyage-3-lite',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage AI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  if (!data.data?.[0]?.embedding) {
    throw new Error('Voyage AI returned unexpected response shape');
  }
  return data.data[0].embedding;
}
```

Add to `.env.local`:
```
VOYAGE_API_KEY=your-voyage-key   # free at voyageai.com
INGEST_SECRET=choose-a-random-string
```

**3.3 — Create RAG retrieval function**

File: `src/lib/rag.ts`
```typescript
import { getPineconeIndex } from './pinecone';
import { embedText } from './embed';

export interface NoteChunk {
  id: string;
  text: string;
  topic: string;
  units: number[];
}

export async function retrieveContext(
  query: string,
  unitLevel?: number,
  topK: number = 3
): Promise<NoteChunk[]> {
  const queryVector = await embedText(query);
  const index = getPineconeIndex();

  // Filter by unit level — requires metadata.units to be stored as number[]
  // (e.g. [3, 4, 5]). If stored as strings, $in will never match.
  const filter = unitLevel
    ? { units: { $in: [unitLevel] } }
    : undefined;

  const results = await index.query({
    vector: queryVector,
    topK,
    filter,
    includeMetadata: true,
  });

  return results.matches.map((match) => ({
    id: match.id,
    text: (match.metadata?.text as string) ?? '',
    topic: (match.metadata?.topic as string) ?? '',
    units: (match.metadata?.units as number[]) ?? [],
  }));
}
```

**3.4 — Install gray-matter**
```bash
npm install gray-matter
```

**3.5 — Create ingestion API route**

File: `src/app/api/ingest/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';
import { embedText } from '@/lib/embed';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';  // npm install gray-matter

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret');
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notesDir = path.join(process.cwd(), 'src/data/notes');
  const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
  const index = getPineconeIndex();
  const vectors = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(notesDir, file), 'utf8');
    const { data: frontmatter, content: body } = matter(content);

    const chunks = chunkText(body);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      vectors.push({
        id: `${file}-chunk-${i}`,
        values: embedding,
        metadata: {
          text: chunks[i],
          topic: frontmatter.topic,
          units: frontmatter.units,
          tags: frontmatter.tags,
          source: file,
        },
      });
    }
  }

  await index.upsert(vectors);
  return NextResponse.json({ success: true, count: vectors.length });
}

// Split on blank lines (paragraph boundaries), then verify no $$ is cut.
// Character-count chunking is unreliable for Hebrew + LaTeX mixed text.
function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;
    const openCount = (candidate.match(/\$\$/g) ?? []).length;
    if (openCount % 2 === 0) {
      chunks.push(candidate);
      current = '';
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(c => c.trim().length > 0);
}
```

### Verification
- `POST http://localhost:3000/api/ingest` (with `x-ingest-secret` header) returns `{ success: true, count: N }`
- Pinecone dashboard shows vectors in the `bagrut-notes` index
- In Pinecone dashboard: open one vector → confirm `metadata.units` is a **number array** (e.g. `[3,4,5]`), not strings — the `$in` filter depends on this
- No TypeScript errors: `npm run build`

---

## Phase 4 — Claude Chat API Route

**Goal:** Build the main `/api/chat` endpoint that receives a message, retrieves context from Pinecone, builds the system prompt, and streams Claude's response.

**Estimated time per step: 4-5 minutes**

### Steps

**4.1 — Create Anthropic client singleton**

File: `src/lib/claude.ts`
```typescript
import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}
```

**4.2 — Create the system prompt builder**

File: `src/lib/buildSystemPrompt.ts`
```typescript
import { NoteChunk } from './rag';

export function buildSystemPrompt(context: NoteChunk[]): string {
  const contextBlock = context.length > 0
    ? context.map(c => `[CONTEXT - ${c.topic}]\n${c.text}`).join('\n\n')
    : '';

  return `You are the "Bagrut-Master AI," a specialized math tutor for the Israeli High School Matriculation (Bagrut) for 3, 4, and 5 units.

${contextBlock ? `[CONTEXT]\n${contextBlock}\n[/CONTEXT]` : '[CONTEXT]\n[/CONTEXT]'}

### RULES
1. Always prioritize context provided. When using a formula from context, state: "According to the notes: [Formula]".
2. If context is empty, state: "I am basing this solution on standard curriculum principles as no specific notes were found in the database."
3. If unit level is ambiguous, ask: "Are you studying for 3, 4, or 5 units?"
4. For images: transcribe all text/symbols to LaTeX, describe visual elements, then confirm with the student.
5. ALL math MUST be in LaTeX: inline $x$ or display $$formula$$.
6. Respond in the student's language (Hebrew or English).
7. Tone by level: 3-unit = high encouragement, 4-unit = balanced, 5-unit = professional coaching.
8. Out of scope: "I am your dedicated Math Tutor. Please ask me a math-related question!"`;
}
```

**4.3 — Create the chat API route**

File: `src/app/api/chat/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/claude';
import { retrieveContext } from '@/lib/rag';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, unitLevel, imageBase64 } = body;

  // Last user message text (for RAG query)
  const lastMessage = messages[messages.length - 1]?.content ?? '';
  const queryText = typeof lastMessage === 'string' ? lastMessage : lastMessage[0]?.text ?? '';

  // Retrieve relevant notes from Pinecone
  const context = await retrieveContext(queryText, unitLevel);
  const systemPrompt = buildSystemPrompt(context);

  // Build Claude message content (text + optional image)
  const userContent: Anthropic.MessageParam['content'] = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: queryText },
      ]
    : queryText;

  const client = getAnthropicClient();

  // Trim history to ~40K chars (~20K tokens) to avoid context window overflow
  const MAX_HISTORY_CHARS = 40_000;
  const priorMessages = messages.slice(0, -1);
  let charCount = 0;
  const history = priorMessages.reverse().filter((m) => {
    const len = typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length;
    charCount += len;
    return charCount <= MAX_HISTORY_CHARS;
  }).reverse();

  // Stream the response — cache the system prompt to reduce costs by ~90%
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      ...history,
      { role: 'user', content: userContent },
    ],
  } as Parameters<typeof client.messages.stream>[0]);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

### Verification
- `POST /api/chat` with `{ messages: [{ role: "user", content: "פתור: 2x+3=7" }] }` returns a streamed response
- Response includes LaTeX formatted math
- No errors in terminal

---

## Phase 5 — Frontend Chat UI

**Goal:** Build the chat interface with LaTeX rendering, image upload, and Hebrew/English support.

**Estimated time per step: 3-5 minutes**

### Steps

**5.1 — Create ChatMessage component**

File: `src/components/ChatMessage.tsx`
```tsx
'use client';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

// Returns true if the string looks like LaTeX (contains \cmd, _, ^, { or })
// Prevents matching plain prices like $50 or $1,000
function looksLikeLatex(s: string): boolean {
  return /[\\_{^}]/.test(s);
}

// Parse text and render LaTeX: $$...$$ as block, $...$ as inline
function renderWithLatex(text: string) {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      try {
        return <BlockMath key={i} math={part.slice(2, -2)} />;
      } catch {
        return <code key={i} className="text-red-500">{part}</code>;
      }
    }
    if (part.startsWith('$') && part.endsWith('$') && looksLikeLatex(part.slice(1, -1))) {
      try {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      } catch {
        return <code key={i} className="text-red-500">{part}</code>;
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
        dir="auto"
      >
        {renderWithLatex(content)}
      </div>
    </div>
  );
}
```

**5.2 — Create ChatInput component**

File: `src/components/ChatInput.tsx`
```tsx
'use client';
import { useState, useRef } from 'react';

interface Props {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !image) return;
    onSend(text, image ?? undefined);
    setText('');
    setImage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImage}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="px-3 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
        title="Upload image"
      >
        📷
      </button>
      {image && (
        <span className="self-center text-xs text-green-600">Image attached</span>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="שאל שאלת מתמטיקה... / Ask a math question..."
        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        dir="auto"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || (!text.trim() && !image)}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
      >
        שלח
      </button>
    </form>
  );
}
```

**5.3 — Create UnitSelector component**

File: `src/components/UnitSelector.tsx`
```tsx
'use client';

interface Props {
  value: number | null;
  onChange: (unit: number | null) => void;
}

export function UnitSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 p-3 justify-center border-b bg-gray-50">
      <span className="text-sm text-gray-500 self-center">רמת יחידות:</span>
      {[3, 4, 5].map((u) => (
        <button
          key={u}
          onClick={() => onChange(value === u ? null : u)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            value === u
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {u} יחידות
        </button>
      ))}
    </div>
  );
}
```

**5.4 — Build main page**

File: `src/app/page.tsx`
```tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { UnitSelector } from '@/components/UnitSelector';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unitLevel, setUnitLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string, imageBase64?: string) => {
    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          unitLevel,
          imageBase64,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: assistantText },
        ]);
      }
    } catch (err) {
      setMessages((prev) => {
        // If streaming already added an empty placeholder, replace it instead of appending
        const last = prev[prev.length - 1];
        const base = last?.role === 'assistant' && last.content === ''
          ? prev.slice(0, -1)
          : prev;
        return [...base, { role: 'assistant', content: 'שגיאה בחיבור לשרת. נסה שנית.' }];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <header className="p-4 border-b text-center">
        <h1 className="text-xl font-bold text-blue-700">Bagrut-Master AI</h1>
        <p className="text-xs text-gray-500">מורה מתמטיקה לבגרות | 3, 4, 5 יחידות</p>
      </header>

      <UnitSelector value={unitLevel} onChange={setUnitLevel} />

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-20 text-sm">
            שאל שאלת מתמטיקה ואענה לך צעד אחר צעד
          </p>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="text-center text-gray-400 text-sm">חושב...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
```

### Verification
- Chat interface renders at `http://localhost:3000`
- Can type a message and receive a streamed response
- LaTeX renders correctly (not as raw `$...$` text)
- Unit selector highlights the selected level
- Image upload button works (file picker opens)

---

## Phase 6 — End-to-End Testing

**Goal:** Verify the full RAG loop works: question → Pinecone retrieval → Claude answer with citations.

**Estimated time per step: 2-3 minutes**

### Steps

**6.1 — Run ingestion**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "x-ingest-secret: $(grep INGEST_SECRET .env.local | cut -d= -f2)"
# Expected: { "success": true, "count": 15 }
# Without the header → 401 Unauthorized (expected behavior — confirms auth works)
```
Check Pinecone dashboard that vectors appear in `bagrut-notes` index.

**6.2 — Test 3-unit question**

Send in chat: `"מהי נוסחת השורשים?"` with unit level = 3
Expected: Claude cites quadratic formula from notes, adds encouragement.

**6.3 — Test 5-unit question**

Send in chat: `"מהו כלל השרשרת?"` with unit level = 5
Expected: Claude retrieves derivatives note, cites chain rule, uses professional tone.

**6.4 — Test out-of-scope**

Send: `"מה מזג האוויר היום?"`
Expected: `"I am your dedicated Math Tutor. Please ask me a math-related question!"`

**6.5 — Test Hebrew/English detection**

Send: `"Solve: x^2 - 5x + 6 = 0"`
Expected: English response with LaTeX solution.

**6.6 — Test image upload**

Upload a photo of a handwritten equation.
Expected: Claude transcribes the equation to LaTeX and confirms with the student.

### Verification
- All 6 test cases behave as expected
- No console errors in browser dev tools
- No errors in Next.js terminal

---

## Phase 7 — Deployment (Optional)

**Goal:** Deploy to Vercel so the tutor is accessible from any device.

> **Required before making the URL public — do not skip:**
>
> 1. **Auth on `/api/chat`:** Add an `x-api-key` header check (same pattern as `INGEST_SECRET`).
>    Without it, anyone with the URL drains your Anthropic quota.
>
> 2. **Rate limiting on `/api/chat`:** Even with auth, a single user can spam requests and burn
>    your quota. Add per-IP rate limiting via Vercel's `@vercel/ratelimit` middleware, or a simple
>    in-memory counter if traffic is low. Without this, a short burst of requests can exhaust
>    your free-tier limits in minutes.

**Estimated time per step: 3-5 minutes**

### Steps

**7.1 — Push to GitHub**
```bash
git init
git add src package.json tsconfig.json tailwind.config.ts next.config.ts
git commit -m "feat: initial Bagrut-Master AI implementation"
gh repo create bagrut-master --public --push
```

**7.2 — Deploy to Vercel**
```bash
npx vercel
```
Or connect GitHub repo at vercel.com.

**7.3 — Add environment variables in Vercel dashboard**
- `ANTHROPIC_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `VOYAGE_API_KEY`

**7.4 — Re-run ingestion on production**

> **Vercel filesystem note:** `src/data/notes/` is part of the build output, so
> `fs.readdirSync` works on Vercel. However, the filesystem is **read-only** in production —
> you cannot add notes via the API. Workflow: add notes locally → commit → deploy → re-ingest.

```bash
curl -X POST https://your-app.vercel.app/api/ingest \
  -H "x-ingest-secret: YOUR_INGEST_SECRET"
```

### Verification
- Production URL loads the chat
- A test question returns a correct LaTeX-formatted answer

---

## Summary Table

| Phase | Goal | Key Output |
|-------|------|-----------|
| 1 | Scaffolding | Next.js project with all deps |
| 2 | Sample Notes | 5 Markdown files with math content |
| 3 | RAG Infrastructure | Pinecone ingestion pipeline |
| 4 | Claude Chat API | Streaming `/api/chat` with RAG context |
| 5 | Frontend UI | Chat interface with LaTeX rendering |
| 6 | E2E Testing | All 6 test cases pass |
| 7 | Deployment | Live on Vercel (optional) |

## What You Will Learn

- **RAG:** How to convert documents to vectors and retrieve them at query time
- **Embeddings:** What they are and how `text → number[]` enables semantic search
- **Pinecone:** How a vector database differs from a regular database
- **Prompt Engineering:** How retrieved context changes Claude's answers
- **Streaming:** How to stream LLM responses to the browser in real time
- **Vision:** How to send images to Claude via the API
