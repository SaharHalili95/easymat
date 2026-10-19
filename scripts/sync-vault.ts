import fs from 'fs';
import { loadEnv } from './env';
import { getPineconeIndex } from '../src/lib/pinecone';
import { VAULT_DIR, buildRecords, isIndexable, readVault } from '../src/lib/vault';
import { syncVault, type SyncIndex } from '../src/lib/vaultSync';

loadEnv();

const dryRun = process.argv.includes('--dry-run');
const watch = process.argv.includes('--watch');
const ns = getPineconeIndex();
const index: SyncIndex = {
  listPaginated: options => ns.listPaginated(options),
  upsertRecords: records => ns.upsertRecords({ records }),
  deleteMany: ids => ns.deleteMany(ids),
};

async function runOnce() {
  const started = Date.now();
  const notes = readVault();
  const skipped = notes.filter(n => !isIndexable(n)).map(n => n.path);
  const records = buildRecords(notes);
  console.log(`${notes.length} notes, ${records.length} chunks (${skipped.length} notes without topic/units skipped)`);
  await syncVault(index, records, { dryRun, log: m => console.log(`  ${m}`) });
  console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s${dryRun ? ' (dry run)' : ''}`);
}

async function main() {
  await runOnce();
  if (watch) startWatching();
}

function startWatching() {
  console.log(`watching ${VAULT_DIR} ...`);
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let pending = false;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) { pending = true; return; }
      running = true;
      try { await runOnce(); } catch (err) { console.error(err); }
      running = false;
      if (pending) { pending = false; trigger(); }
    }, 3_000);
  };
  fs.watch(VAULT_DIR, { recursive: true }, (_event, file) => {
    if (file && file.endsWith('.md') && !file.startsWith('.')) trigger();
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
