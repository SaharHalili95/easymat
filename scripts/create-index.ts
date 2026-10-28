import { loadEnv } from './env';
import { EMBED_MODEL, TEXT_FIELD, getPinecone } from '../src/lib/pinecone';

loadEnv();

async function main() {
  const name = process.env.PINECONE_INDEX_NAME!;
  const pc = getPinecone();
  const { indexes = [] } = await pc.listIndexes();
  const existing = indexes.find(i => i.name === name);

  if (existing) {
    console.log(`Index "${name}" already exists (embed model: ${existing.embed?.model ?? 'none'}).`);
    if (existing.embed?.model !== EMBED_MODEL) {
      console.error(`It does not use ${EMBED_MODEL}. Pick a new PINECONE_INDEX_NAME.`);
      process.exit(1);
    }
  } else {
    // The Starter plan only allows serverless indexes on AWS us-east-1.
    await pc.createIndexForModel({
      name,
      cloud: 'aws',
      region: 'us-east-1',
      embed: { model: EMBED_MODEL, fieldMap: { text: TEXT_FIELD } },
      waitUntilReady: true,
    });
    console.log(`Created index "${name}" with ${EMBED_MODEL}.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

