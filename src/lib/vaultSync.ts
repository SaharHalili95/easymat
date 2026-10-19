import type { VaultRecord } from './vault';

// Hosted embedding models accept at most 96 text records per upsert.
export const UPSERT_BATCH = 96;
export const DELETE_BATCH = 1000;
// The Starter plan allows 250k passage tokens per minute; keep headroom.
export const TOKENS_PER_MINUTE = 200_000;
export const BATCH_TOKENS = 60_000;
const MAX_RETRIES = 5;

// Measured ~1.08 tokens per character on this vault (Hebrew + LaTeX).
export function estimateTokens(text: string): number {
  return Math.ceil(text.length * 1.2);
}

export function makeBatches(records: VaultRecord[]): VaultRecord[][] {
  const batches: VaultRecord[][] = [];
  let current: VaultRecord[] = [];
  let tokens = 0;
  for (const r of records) {
    const t = estimateTokens(r.text);
    if (current.length > 0 && (current.length >= UPSERT_BATCH || tokens + t > BATCH_TOKENS)) {
      batches.push(current);
      current = [];
      tokens = 0;
    }
    current.push(r);
    tokens += t;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export interface SyncIndex {
  listPaginated(options: { limit?: number; paginationToken?: string }): Promise<{
    vectors?: { id?: string }[];
    pagination?: { next?: string };
  }>;
  upsertRecords(records: Record<string, string | string[]>[]): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}

// SDK 7.x takes option objects; a bare array type-checks for deleteMany but
// is silently treated as an empty selection.
export interface PineconeNamespaceLike {
  listPaginated(options: { limit?: number; paginationToken?: string }): ReturnType<SyncIndex['listPaginated']>;
  upsertRecords(options: { records: Record<string, string | string[]>[] }): Promise<void>;
  deleteMany(options: { ids: string[] }): Promise<void>;
}

export function toSyncIndex(ns: PineconeNamespaceLike): SyncIndex {
  return {
    listPaginated: options => ns.listPaginated(options),
    upsertRecords: records => ns.upsertRecords({ records }),
    deleteMany: ids => ns.deleteMany({ ids }),
  };
}

export interface SyncPlan {
  toUpsert: VaultRecord[];
  toDelete: string[];
  unchanged: number;
}

export interface SyncOptions {
  dryRun?: boolean;
  log?: (msg: string) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export function planSync(records: VaultRecord[], existingIds: Iterable<string>): SyncPlan {
  const existing = new Set(existingIds);
  const wanted = new Set(records.map(r => r.id));
  const toUpsert = records.filter(r => !existing.has(r.id));
  return {
    toUpsert,
    toDelete: [...existing].filter(id => !wanted.has(id)),
    unchanged: records.length - toUpsert.length,
  };
}

export async function listAllIds(index: SyncIndex): Promise<string[]> {
  const ids: string[] = [];
  let paginationToken: string | undefined;
  do {
    const page = await index.listPaginated({ limit: 100, paginationToken });
    for (const v of page.vectors ?? []) if (v.id) ids.push(v.id);
    paginationToken = page.pagination?.next;
  } while (paginationToken);
  return ids;
}

function isRateLimited(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /429|rate.?limit|RESOURCE_EXHAUSTED|too many requests/i.test(msg);
}

export async function withRetry<T>(fn: () => Promise<T>, sleep: (ms: number) => Promise<void>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRateLimited(err) || attempt >= MAX_RETRIES) throw err;
      await sleep(15_000 * 2 ** attempt);
    }
  }
}

export async function syncVault(index: SyncIndex, records: VaultRecord[], opts: SyncOptions = {}): Promise<SyncPlan> {
  const log = opts.log ?? (() => {});
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));

  const plan = planSync(records, await listAllIds(index));
  log(`${plan.toUpsert.length} to upsert, ${plan.toDelete.length} to delete, ${plan.unchanged} unchanged`);
  if (opts.dryRun) return plan;

  const now = opts.now ?? Date.now;
  let windowStart = now();
  let windowTokens = 0;
  let done = 0;
  for (const batch of makeBatches(plan.toUpsert)) {
    const tokens = batch.reduce((sum, r) => sum + estimateTokens(r.text), 0);
    if (windowTokens > 0 && windowTokens + tokens > TOKENS_PER_MINUTE) {
      const wait = Math.max(0, 60_000 - (now() - windowStart));
      log(`waiting ${Math.ceil(wait / 1000)}s for the per-minute token limit`);
      await sleep(wait);
      windowStart = now();
      windowTokens = 0;
    }
    windowTokens += tokens;
    await withRetry(() => index.upsertRecords(batch.map(({ id, ...fields }) => ({ _id: id, ...fields }) as Record<string, string | string[]>)), sleep);
    done += batch.length;
    log(`upserted ${done}/${plan.toUpsert.length}`);
  }
  for (let i = 0; i < plan.toDelete.length; i += DELETE_BATCH) {
    const batch = plan.toDelete.slice(i, i + DELETE_BATCH);
    await withRetry(() => index.deleteMany(batch), sleep);
  }
  if (plan.toDelete.length > 0) log(`deleted ${plan.toDelete.length}`);
  return plan;
}
