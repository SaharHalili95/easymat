import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';
import { embedBatch } from '@/lib/embed';
import { PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret');
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notesDir = path.join(process.cwd(), 'src/data/notes');
  const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
  const index = getPineconeIndex();

  const chunkMeta: Array<{ file: string; chunk: string; i: number; frontmatter: Record<string, unknown> }> = [];
  const fileErrors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(notesDir, file), 'utf8');
      const { data: frontmatter, content: body } = matter(content);
      const chunks = chunkText(body);
      chunks.forEach((chunk, i) => chunkMeta.push({ file, chunk, i, frontmatter }));
    } catch (err) {
      fileErrors.push({ file, error: String(err) });
    }
  }

  if (chunkMeta.length === 0) {
    return NextResponse.json({ success: false, errors: fileErrors }, { status: 500 });
  }

  let embeddings: number[][];
  try {
    embeddings = await embedBatch(chunkMeta.map(c => c.chunk));
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err), fileErrors }, { status: 500 });
  }

  // Pinecone's TS types restrict metadata values to string[], but the runtime
  // supports number[] — required so $in filtering on units works correctly.
  const records = chunkMeta.map(({ file, chunk, i, frontmatter }, idx) => ({
    id: `${file}-chunk-${i}`,
    values: embeddings[idx],
    metadata: {
      text: chunk,
      topic: frontmatter.topic as string,
      units: (frontmatter.units as number[]).map(String),
      tags: frontmatter.tags as string[],
      source: file,
    },
  })) as unknown as PineconeRecord<RecordMetadata>[];

  try {
    await index.upsert({ records });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err), fileErrors }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    count: records.length,
    ...(fileErrors.length > 0 && { warnings: fileErrors }),
  });
}

// Split on paragraph boundaries, keeping $$ blocks intact
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
