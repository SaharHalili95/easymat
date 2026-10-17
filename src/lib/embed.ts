export async function embedText(text: string): Promise<number[]> {
  const results = await embedBatch([text]);
  return results[0];
}

// Batch embed with rate-limit awareness.
// Free tier: 3 RPM + 10K TPM. Splits into chunks of BATCH_SIZE with a
// 30s gap between calls so we stay inside both limits.
const BATCH_SIZE = 2;

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length <= BATCH_SIZE) {
    return embedSingleBatch(texts);
  }

  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, 30_000));
    }
    const chunk = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedSingleBatch(chunk);
    results.push(...embeddings);
  }
  return results;
}

async function embedSingleBatch(texts: string[], retries = 3): Promise<number[][]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: 'voyage-3-lite',
    }),
  });

  if (response.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 22_000));
    return embedSingleBatch(texts, retries - 1);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage AI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.data) || data.data.length === 0) {
    throw new Error('Voyage AI returned unexpected response shape');
  }
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}
