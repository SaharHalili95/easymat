import { describe, expect, it, vi } from 'vitest';
import type { VaultRecord } from '../vault';
import { estimateTokens, makeBatches, planSync, syncVault, toSyncIndex, withRetry, type SyncIndex } from '../vaultSync';

const rec = (id: string, text = `text ${id}`): VaultRecord => ({ id, text, topic: 't', units: ['5'], source: 'a.md' });

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

describe('makeBatches', () => {
  it('caps a batch at 96 records', () => {
    expect(makeBatches(Array.from({ length: 200 }, (_, i) => rec(`r${i}`))).map((b) => b.length)).toEqual([96, 96, 8]);
  });

  it('caps a batch by estimated tokens', () => {
    const big = 'א'.repeat(20_000);
    expect(estimateTokens(big)).toBe(24_000);
    expect(makeBatches([rec('a', big), rec('b', big), rec('c', big)]).map((b) => b.length)).toEqual([2, 1]);
  });

  it('keeps an oversized record in its own batch', () => {
    expect(makeBatches([rec('a', 'א'.repeat(100_000)), rec('b')]).map((b) => b.length)).toEqual([1, 1]);
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

describe('syncVault pacing', () => {
  it('waits out the minute before going over the token budget', async () => {
    const index = fakeIndex([]);
    let clock = 0;
    const sleep = vi.fn(async (ms: number) => { clock += ms; });
    const big = 'א'.repeat(40_000); // 48k estimated tokens, one record per batch
    await syncVault(index, Array.from({ length: 6 }, (_, i) => rec(`r${i}`, big)), {
      sleep,
      now: () => clock,
    });
    expect(index.upsertRecords).toHaveBeenCalledTimes(6);
    expect(sleep.mock.calls).toEqual([[60_000]]);
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
    expect(sleep.mock.calls).toEqual([[15000], [30000]]);
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

describe('toSyncIndex', () => {
  it('wraps records and ids in the option objects the SDK expects', async () => {
    const ns = {
      listPaginated: vi.fn(async () => ({ vectors: [] })),
      upsertRecords: vi.fn(async () => {}),
      deleteMany: vi.fn(async () => {}),
    };
    const index = toSyncIndex(ns);
    await index.listPaginated({ limit: 100 });
    await index.upsertRecords([{ _id: 'a', text: 't' }]);
    await index.deleteMany(['a', 'b']);
    expect(ns.listPaginated).toHaveBeenCalledWith({ limit: 100 });
    expect(ns.upsertRecords).toHaveBeenCalledWith({ records: [{ _id: 'a', text: 't' }] });
    expect(ns.deleteMany).toHaveBeenCalledWith({ ids: ['a', 'b'] });
  });
});
