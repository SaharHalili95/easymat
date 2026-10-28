import fs from 'fs';

export function loadEnv() {
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
  for (const key of ['PINECONE_API_KEY', 'PINECONE_INDEX_NAME']) {
    if (!process.env[key]) {
      console.error(`Missing ${key} (set it in .env.local)`);
      process.exit(1);
    }
  }
}
