import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/claude';
import { retrieveContext, retrieveBagrutQuestion } from '@/lib/rag';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';

// In-memory rate limiter: 20 requests/minute per IP
// Replace with Vercel's @vercel/ratelimit before public deployment
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Prune expired entries to prevent unbounded growth across long-lived instances
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Trim history to fit within maxChars, keeping only complete turns (user+assistant pairs).
// Cuts from the oldest turn forward so the most recent context is always preserved.
function trimHistory(
  messages: Anthropic.MessageParam[],
  maxChars: number
): Anthropic.MessageParam[] {
  const msgLen = (m: Anthropic.MessageParam) =>
    typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length;

  // Walk from newest to oldest, collecting complete turns
  const kept: Anthropic.MessageParam[] = [];
  let total = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const len = msgLen(msg);

    // If this is an assistant message, peek at the preceding user message too
    if (msg.role === 'assistant' && i > 0 && messages[i - 1].role === 'user') {
      const pairLen = len + msgLen(messages[i - 1]);
      if (total + pairLen > maxChars) break;
      kept.unshift(messages[i - 1], msg);
      total += pairLen;
      i--; // skip the user message we already consumed
    } else {
      if (total + len > maxChars) break;
      kept.unshift(msg);
      total += len;
    }
  }

  return kept;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }

  const body = await req.json();
  const { messages, unitLevel, imageBase64 } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 });
  }

  const lastMessage = messages[messages.length - 1]?.content ?? '';
  const queryText = typeof lastMessage === 'string' ? lastMessage : lastMessage[0]?.text ?? '';

  const [context, bagrutQuestion] = await Promise.all([
    retrieveContext(queryText, unitLevel),
    retrieveBagrutQuestion(queryText, unitLevel),
  ]);
  const systemPrompt = buildSystemPrompt(context, unitLevel);

  const userContent: Anthropic.MessageParam['content'] = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: queryText },
      ]
    : queryText;

  const client = getAnthropicClient();

  const needsSonnet =
    !!imageBase64 ||
    /הוכח|הוכיח|הראה|prove|show that/i.test(queryText) ||
    /מספרים מרוכבים|וקטור|complex number|vector/i.test(queryText) ||
    context.some(c => c.shalon === '582');

  const model = needsSonnet ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  const MAX_HISTORY_CHARS = 40_000;
  const history = trimHistory(
    messages.slice(0, -1) as Anthropic.MessageParam[],
    MAX_HISTORY_CHARS
  );

  const stream = await client.messages.stream({
    model,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      ...history,
      { role: 'user', content: userContent },
    ],
  } as Parameters<typeof client.messages.stream>[0]);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
  };
  if (bagrutQuestion) {
    responseHeaders['X-Bagrut-Question'] = encodeURIComponent(JSON.stringify(bagrutQuestion));
  }

  return new Response(readable, { headers: responseHeaders });
}
