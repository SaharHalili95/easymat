import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { chunkText } from './chunk';

export const VAULT_DIR = path.join(process.cwd(), 'vault');

const IGNORED_DIRS = new Set(['.obsidian', '.trash']);

export interface VaultNote {
  path: string; // relative to the vault, forward slashes
  frontmatter: Record<string, unknown>;
  body: string;
}

export interface VaultRecord {
  id: string;
  text: string;
  topic: string;
  units: string[];
  source: string;
  tags?: string[];
  type?: string;
  year?: string;
  moed?: string;
  shalon?: string;
}

export function readVault(dir: string = VAULT_DIR): VaultNote[] {
  const notes: VaultNote[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) {
        const { data, content } = matter(fs.readFileSync(full, 'utf8'));
        notes.push({ path: path.relative(dir, full).split(path.sep).join('/'), frontmatter: data, body: content });
      }
    }
  };
  walk(dir);
  return notes.sort((a, b) => a.path.localeCompare(b.path));
}

// Only notes tagged with a topic and unit levels are searchable; the syllabus
// and reference pages are read directly or not at all.
export function isIndexable(note: VaultNote): boolean {
  const { topic, units } = note.frontmatter;
  return typeof topic === 'string' && Array.isArray(units) && units.length > 0;
}

// IDs are content-addressed: editing a chunk produces a new ID and orphans the
// old one, so a sync is just "upsert missing IDs, delete unknown IDs".
export function buildRecords(notes: VaultNote[]): VaultRecord[] {
  const records: VaultRecord[] = [];
  for (const note of notes.filter(isIndexable)) {
    const fm = note.frontmatter;
    const meta = {
      topic: fm.topic as string,
      units: (fm.units as unknown[]).map(String),
      source: note.path,
      ...(Array.isArray(fm.tags) && fm.tags.length > 0 ? { tags: fm.tags.map(String) } : {}),
      ...(fm.type ? { type: String(fm.type) } : {}),
      ...(fm.year ? { year: String(fm.year) } : {}),
      ...(fm.moed ? { moed: String(fm.moed) } : {}),
      ...(fm.shalon ? { shalon: String(fm.shalon) } : {}),
    };
    const seen = new Map<string, number>();
    for (const text of chunkText(note.body)) {
      const hash = createHash('sha256').update(JSON.stringify([text, meta])).digest('hex').slice(0, 16);
      const n = seen.get(hash) ?? 0;
      seen.set(hash, n + 1);
      records.push({ id: `${note.path}#${hash}${n > 0 ? `-${n}` : ''}`, text, ...meta });
    }
  }
  return records;
}
