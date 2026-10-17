import { getPineconeIndex } from './pinecone';
import { embedText } from './embed';

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

export function mapMatch(match: { id: string; score?: number; metadata?: Record<string, unknown> }): NoteChunk {
  return {
    id: match.id,
    text: (match.metadata?.text as string) ?? '',
    topic: (match.metadata?.topic as string) ?? '',
    // Stored as strings so Pinecone's $in filter matches; converted back here.
    units: ((match.metadata?.units as string[] | undefined) ?? []).map(Number),
    type: (match.metadata?.type as string) ?? undefined,
    year: (match.metadata?.year as string) ?? undefined,
    moed: (match.metadata?.moed as string) ?? undefined,
    shalon: (match.metadata?.shalon as string) ?? undefined,
  };
}

export async function retrieveContext(
  query: string,
  unitLevel?: number,
  topK: number = 5
): Promise<NoteChunk[]> {
  const queryVector = await embedText(query);
  const index = getPineconeIndex();

  const filter = unitLevel
    ? { units: { $in: [String(unitLevel)] } }
    : undefined;

  const results = await index.query({
    vector: queryVector,
    topK,
    filter,
    includeMetadata: true,
  });

  return results.matches.map(mapMatch);
}

export async function retrieveBagrutQuestion(
  query: string,
  unitLevel?: number
): Promise<BagrutQuestion | null> {
  const queryVector = await embedText(query);
  const index = getPineconeIndex();

  const filter: Record<string, unknown> = { type: { $eq: 'bagrut' } };
  if (unitLevel) filter.units = { $in: [String(unitLevel)] };

  const results = await index.query({
    vector: queryVector,
    topK: 1,
    filter,
    includeMetadata: true,
  });

  const match = results.matches[0];
  if (!match || !match.metadata) return null;

  return {
    text: (match.metadata.text as string) ?? '',
    year: (match.metadata.year as string) ?? '',
    moed: (match.metadata.moed as string) ?? '',
    shalon: (match.metadata.shalon as string) ?? '',
    source: (match.metadata.source as string) ?? '',
    score: match.score ?? 0,
  };
}
