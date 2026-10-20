import { getPineconeIndex } from './pinecone';

export interface NoteChunk {
  id: string;
  text: string;
  topic: string;
  units: number[];
  type?: string;
  year?: string;
  moed?: string;
  shalon?: string;
}

export interface BagrutQuestion {
  text: string;
  year: string;
  moed: string;
  shalon: string;
  source: string;
  score: number;
}

export interface SearchHit {
  _id: string;
  _score?: number;
  fields?: object;
}

interface ChatMessage {
  role: string;
  content: unknown;
}

// Follow-ups like "now solve part b" carry no topic on their own, so short
// messages are searched together with the student's previous message.
const SHORT_QUERY_CHARS = 40;

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const block = content.find((b): b is { text: string } => typeof b?.text === 'string');
    return block?.text ?? '';
  }
  return '';
}

export function buildSearchQuery(messages: ChatMessage[]): string {
  const userTexts = messages.filter(m => m.role === 'user').map(m => textOf(m.content).trim());
  const last = userTexts.at(-1) ?? '';
  if (last.length >= SHORT_QUERY_CHARS || userTexts.length < 2) return last;
  return `${userTexts.at(-2)}\n${last}`.trim();
}

export function mapHit(hit: SearchHit): NoteChunk {
  const f = (hit.fields ?? {}) as Record<string, unknown>;
  return {
    id: hit._id,
    text: (f.text as string) ?? '',
    topic: (f.topic as string) ?? '',
    // Stored as strings so Pinecone's $in filter matches; converted back here.
    units: ((f.units as string[] | undefined) ?? []).map(Number),
    type: (f.type as string) ?? undefined,
    year: (f.year as string) ?? undefined,
    moed: (f.moed as string) ?? undefined,
    shalon: (f.shalon as string) ?? undefined,
  };
}

async function search(text: string, topK: number, filter?: object): Promise<SearchHit[]> {
  if (!text.trim()) return [];
  const res = await getPineconeIndex().searchRecords({
    query: { topK, inputs: { text }, ...(filter ? { filter } : {}) },
  });
  return res.result.hits;
}

export async function retrieveContext(
  query: string,
  unitLevel?: number,
  topK: number = 5
): Promise<NoteChunk[]> {
  const filter = unitLevel
    ? { units: { $in: [String(unitLevel)] } }
    : undefined;

  return (await search(query, topK, filter)).map(mapHit);
}

export async function retrieveBagrutQuestion(
  query: string,
  unitLevel?: number
): Promise<BagrutQuestion | null> {
  // Topic notes are also typed 'bagrut'; only real past papers have a year.
  const filter: Record<string, unknown> = { type: { $eq: 'bagrut' }, year: { $exists: true } };
  if (unitLevel) filter.units = { $in: [String(unitLevel)] };

  const hit = (await search(query, 1, filter))[0];
  if (!hit?.fields) return null;
  const f = hit.fields as Record<string, unknown>;

  return {
    text: (f.text as string) ?? '',
    year: (f.year as string) ?? '',
    moed: (f.moed as string) ?? '',
    shalon: (f.shalon as string) ?? '',
    source: (f.source as string) ?? '',
    score: hit._score ?? 0,
  };
}
