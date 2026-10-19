import type { VaultRecord } from './vault';

// Hosted embedding models accept at most 96 text records per upsert.
export const UPSERT_BATCH = 96;
export const DELETE_BATCH = 1000;
const MAX_RETRIES = 5;

export interface SyncIndex {
  listPaginated(options: { limit?: number; paginationToken?: string }): Promise<{
    vectors?: { id?: string }[];
    pagination?: { next?: string };
  }>;
  upsertRecords(records: Record<string, string | string[]>[]): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
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
      await sleep(5_000 * 2 ** attempt);
    }
  }
}

export async function syncVault(index: SyncIndex, records: VaultRecord[], opts: SyncOptions = {}): Promise<SyncPlan> {
  const log = opts.log ?? (() => {});
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));

  const plan = planSync(records, await listAllIds(index));
  log(`${plan.toUpsert.length} to upsert, ${plan.toDelete.length} to delete, ${plan.unchanged} unchanged`);
  if (opts.dryRun) return plan;

  for (let i = 0; i < plan.toUpsert.length; i += UPSERT_BATCH) {
    const batch = plan.toUpsert.slice(i, i + UPSERT_BATCH);
    await withRetry(() => index.upsertRecords(batch.map(({ id, ...fields }) => ({ _id: id, ...fields }) as Record<string, string | string[]>)), sleep);
    log(`upserted ${Math.min(i + UPSERT_BATCH, plan.toUpsert.length)}/${plan.toUpsert.length}`);
  }
  for (let i = 0; i < plan.toDelete.length; i += DELETE_BATCH) {
    const batch = plan.toDelete.slice(i, i + DELETE_BATCH);
    await withRetry(() => index.deleteMany(batch), sleep);
  }
  if (plan.toDelete.length > 0) log(`deleted ${plan.toDelete.length}`);
  return plan;
}
