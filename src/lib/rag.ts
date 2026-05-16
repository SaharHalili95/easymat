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
  topK: number = 5
): Promise<NoteChunk[]> {
  const queryVector = await embedText(query);
  const index = getPineconeIndex();

  // Filter by unit level — units stored as string[] in Pinecone (server rejects number[])
  const filter = unitLevel
    ? { units: { $in: [String(unitLevel)] } }
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
    units: (match.metadata?.units as unknown as number[]) ?? [],
  }));
}
