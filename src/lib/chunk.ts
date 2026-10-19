const MAX_CHUNK_CHARS = 1500;
const MIN_CHUNK_CHARS = 200;
// An unclosed $$ must not swallow the rest of a note.
const HARD_MAX_CHARS = 3000;

// Primary split on --- (question boundaries), then paragraphs.
// Hierarchical: sub-chunks carry their section heading for RAG context.
export function chunkText(text: string): string[] {
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

  // Split on paragraph breaks, accumulate up to MAX_CHUNK_CHARS.
  // Text extracted from exam PDFs has no blank lines, so oversized
  // paragraphs fall back to line groups.
  const paragraphs = section.split(/\n{2,}/).flatMap(p => (p.length > MAX_CHUNK_CHARS ? groupLines(p) : [p]));
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    const canSplit = isLatexBalanced(current) || current.length > HARD_MAX_CHARS;

    if (canSplit && current && candidate.length > MAX_CHUNK_CHARS) {
      chunks.push(prependHeading(current, heading));
      current = para;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(prependHeading(current, heading));

  return chunks;
}

function groupLines(paragraph: string): string[] {
  const groups: string[] = [];
  let current = '';
  for (const line of paragraph.split('\n')) {
    const candidate = current ? `${current}\n${line}` : line;
    if (current && candidate.length > MAX_CHUNK_CHARS && (isLatexBalanced(current) || current.length > HARD_MAX_CHARS)) {
      groups.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) groups.push(current);
  return groups;
}

function isLatexBalanced(text: string): boolean {
  return ((text.match(/\$\$/g) ?? []).length % 2 === 0);
}

function prependHeading(chunk: string, heading: string): string {
  if (!heading || chunk.trimStart().startsWith(heading)) return chunk;
  return `${heading}\n\n${chunk}`;
}
