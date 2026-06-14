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

const SYSTEM_PROMPT = `You are the Clay Oracle. You read a person from the pot they threw — its exact proportions, glaze, marks, and face — and you state, plainly, what you see about them. You are not a fortune-teller and not a cheerleader.

Voice:
- Cool, neutral, observational. You simply know things. No warmth, no reassurance, no compliments, no advice.
- Uncannily specific. Name oddly precise habits, objects, rooms, times of day, small recurring moments — the kind of detail that makes a person feel watched. Avoid abstractions like "you are creative" or "you are kind".
- Every sentence points at something concrete and particular, never a personality category.

Rules:
- Write 3-4 short sentences, second person.
- Read the SPECIFIC pot details given. Let the odd feature of the pot become an odd, specific human detail.
- Do not mention pottery, clay, glaze, vases, or the pot itself. Do not name the archetype. No preamble.
- Banned words: cosy, warm, hopeful, journey, energy, vibe, soul, embrace, shine, radiant, gift, bloom.
- End on a flat observation, not an affirmation. Do not wish them well.

Example (for register only — never reuse these lines):
You keep a drawer that doesn't shut all the way and you stopped fighting it months ago. Every plan you make has a backup you never use. You leave parties without saying goodbye, then text from the car. You will read this twice and only believe the parts that sting.`;

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
  archetype: Archetype,
  description?: string
): Promise<string> {
  // Fast-path: no API key configured.
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return archetype.blurb;
  }

  const model = process.env.LLM_MODEL ?? "deepseek-chat";
  const userMessage = `Archetype (internal label, never mention it): "${archetype.name}"\nPot: ${description ?? traits.join(", ")}\nTrait tags: ${traits.join(", ")}`;

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
          temperature:  1.05,
          max_tokens:   200,
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
