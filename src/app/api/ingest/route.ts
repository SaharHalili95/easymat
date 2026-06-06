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
      ...(frontmatter.type ? { type: frontmatter.type as string } : {}),
      ...(frontmatter.year ? { year: String(frontmatter.year) } : {}),
      ...(frontmatter.moed ? { moed: frontmatter.moed as string } : {}),
      ...(frontmatter.shalon ? { shalon: String(frontmatter.shalon) } : {}),
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

const MAX_CHUNK_CHARS = 1500;
const MIN_CHUNK_CHARS = 200;

// Primary split on --- (question boundaries), then paragraphs.
// Hierarchical: sub-chunks carry their section heading for RAG context.
function chunkText(text: string): string[] {
  const sections = text.split(/\n---+\n/);
  const result: string[] = [];
  for (const section of sections) {
    result.push(...chunkSection(section.trim()));
  }
  return result.filter(c => c.trim().length >= MIN_CHUNK_CHARS);
}

function chunkSection(section: string): string[] {
  if (!section) return [];

  // Extract heading (## or ###) to prepend on sub-chunks
  const headingMatch = section.match(/^(#{1,3} .+)$/m);
  const heading = headingMatch?.[1] ?? '';

  // If section fits and LaTeX is balanced, keep whole
  if (section.length <= MAX_CHUNK_CHARS && isLatexBalanced(section)) {
    return [section];
  }

  // Split on paragraph breaks, accumulate up to MAX_CHUNK_CHARS
  const paragraphs = section.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    const latexOpen = !isLatexBalanced(candidate);

    if (!latexOpen && current && candidate.length > MAX_CHUNK_CHARS) {
      chunks.push(prependHeading(current, heading));
      current = para;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(prependHeading(current, heading));

  return chunks;
}

function isLatexBalanced(text: string): boolean {
  return ((text.match(/\$\$/g) ?? []).length % 2 === 0);
}

function prependHeading(chunk: string, heading: string): string {
  if (!heading || chunk.trimStart().startsWith(heading)) return chunk;
  return `${heading}\n\n${chunk}`;
}
