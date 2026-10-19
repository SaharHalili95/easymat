import { describe, expect, it, vi } from 'vitest';
import type { VaultRecord } from '../vault';
import { planSync, syncVault, withRetry, type SyncIndex } from '../vaultSync';

const rec = (id: string): VaultRecord => ({ id, text: `text ${id}`, topic: 't', units: ['5'], source: 'a.md' });

function fakeIndex(existing: string[], pageSize = 2) {
  const index = {
    listPaginated: vi.fn(async ({ paginationToken }: { paginationToken?: string }) => {
      const start = Number(paginationToken ?? 0);
      const next = start + pageSize < existing.length ? String(start + pageSize) : undefined;
      return { vectors: existing.slice(start, start + pageSize).map((id) => ({ id })), pagination: { next } };
    }),
    upsertRecords: vi.fn(async () => {}),
    deleteMany: vi.fn(async () => {}),
  };
  return index satisfies SyncIndex;
}

const noSleep = async () => {};

describe('planSync', () => {
  it('upserts new ids, deletes unknown ids and counts the rest', () => {
    const plan = planSync([rec('a'), rec('b'), rec('c')], ['b', 'c', 'old', 'x.md-chunk-0']);
    expect(plan.toUpsert.map((r) => r.id)).toEqual(['a']);
    expect(plan.toDelete).toEqual(['old', 'x.md-chunk-0']);
    expect(plan.unchanged).toBe(2);
  });
});

describe('syncVault', () => {
  it('reads every page of existing ids', async () => {
    const index = fakeIndex(['a', 'b', 'c', 'd', 'e']);
    const plan = await syncVault(index, [rec('a')], { sleep: noSleep });
    expect(index.listPaginated).toHaveBeenCalledTimes(3);
    expect(plan.toDelete).toEqual(['b', 'c', 'd', 'e']);
    expect(index.deleteMany).toHaveBeenCalledWith(['b', 'c', 'd', 'e']);
  });

  it('sends records with _id and their fields', async () => {
    const index = fakeIndex([]);
    await syncVault(index, [rec('a')], { sleep: noSleep });
    expect(index.upsertRecords).toHaveBeenCalledWith([{ _id: 'a', text: 'text a', topic: 't', units: ['5'], source: 'a.md' }]);
  });

  it('batches upserts by 96', async () => {
    const index = fakeIndex([]);
    await syncVault(index, Array.from({ length: 200 }, (_, i) => rec(`r${i}`)), { sleep: noSleep });
    expect((index.upsertRecords.mock.calls as unknown as unknown[][][]).map((c) => c[0].length)).toEqual([96, 96, 8]);
  });

  it('sends nothing when nothing changed', async () => {
    const index = fakeIndex(['a', 'b']);
    const plan = await syncVault(index, [rec('a'), rec('b')], { sleep: noSleep });
    expect(plan.unchanged).toBe(2);
    expect(index.upsertRecords).not.toHaveBeenCalled();
    expect(index.deleteMany).not.toHaveBeenCalled();
  });

  it('only reports changes on a dry run', async () => {
    const index = fakeIndex(['old']);
    const plan = await syncVault(index, [rec('a')], { dryRun: true, sleep: noSleep });
    expect(plan.toUpsert).toHaveLength(1);
    expect(plan.toDelete).toEqual(['old']);
    expect(index.upsertRecords).not.toHaveBeenCalled();
    expect(index.deleteMany).not.toHaveBeenCalled();
  });
});

describe('withRetry', () => {
  it('retries rate limits with growing waits', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('HTTP 429 Too Many Requests'))
      .mockRejectedValueOnce(new Error('RESOURCE_EXHAUSTED'))
      .mockResolvedValue('ok');
    expect(await withRetry(fn, sleep)).toBe('ok');
    expect(sleep.mock.calls).toEqual([[5000], [10000]]);
  });

  it('does not retry other errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('invalid record'));
    await expect(withRetry(fn, noSleep)).rejects.toThrow('invalid record');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after five retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('429'));
    await expect(withRetry(fn, noSleep)).rejects.toThrow('429');
    expect(fn).toHaveBeenCalledTimes(6);
  });
});
