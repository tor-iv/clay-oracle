// ── Reading generator — server-only ───────────────────────────────────────
// Build-time guard: importing this (which reads DEEPSEEK_API_KEY) from a
// Client Component fails the build instead of leaking the key at runtime.
import "server-only";

import OpenAI from "openai";
import type { Archetype } from "./personality";

// ── LLM client (lazy singleton) ───────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
      apiKey:  process.env.DEEPSEEK_API_KEY ?? "no-key",
    });
  }
  return _client;
}

// ── System prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Clay Oracle — a warm, witty pottery-reader who divines personality from the shape, glaze, and decoration of handmade vessels. You write short, bespoke personality readings in second person.

Rules:
- Write exactly 2-3 sentences.
- Reference the SPECIFIC traits given — make the reading feel tailor-made, not generic.
- Warm and encouraging; cosy and specific; never a generic horoscope platitude.
- No preamble, no "Based on your vase..." opener — dive straight in.
- End on a hopeful or affirming note.`;

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Generate a bespoke 2-3 sentence personality reading for a vase.
 *
 * - If `DEEPSEEK_API_KEY` is not set → returns `archetype.blurb` immediately.
 * - On any LLM error or timeout → returns `archetype.blurb`.
 * - NEVER throws; always returns a non-empty string.
 */
export async function generateReading(
  traits: string[],
  archetype: Archetype
): Promise<string> {
  // Fast-path: no API key configured.
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return archetype.blurb;
  }

  const model = process.env.LLM_MODEL ?? "deepseek-chat";
  const userMessage = `Archetype: "${archetype.name} ${archetype.emoji}"\nTraits: ${traits.join(", ")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);

    let result: string | null = null;
    try {
      const response = await getClient().chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user",   content: userMessage },
          ],
          temperature:  0.9,
          max_tokens:   160,
        },
        { signal: controller.signal }
      );
      result = response.choices[0]?.message?.content?.trim() ?? null;
    } finally {
      clearTimeout(timeout);
    }

    if (result && result.length > 0) return result;
    return archetype.blurb;
  } catch {
    // LLM unavailable, timed-out, or returned garbage — fall back gracefully.
    return archetype.blurb;
  }
}
