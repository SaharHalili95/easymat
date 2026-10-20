import { Pinecone } from '@pinecone-database/pinecone';

// The index embeds text itself (integrated inference), so records are written
// and searched as plain text. These must match the index created by
// scripts/create-index.ts.
export const EMBED_MODEL = 'llama-text-embed-v2';
export const TEXT_FIELD = 'text';
export const NAMESPACE = '__default__';

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
  return getPinecone().index(process.env.PINECONE_INDEX_NAME!).namespace(NAMESPACE);
}
