// ── Pot playlist generator — server-only ──────────────────────────────────
// Asks DeepSeek to write a 10-track themed tracklist for a pot, then
// resolves each song to a real Spotify track via the Search API.
import "server-only";

import OpenAI from "openai";
import type { Archetype } from "./personality";
import { searchTrack } from "./spotify";

// ── Types ─────────────────────────────────────────────────────────────────

export interface PlaylistTrack {
  title:     string;
  artist:    string;
  url:       string | null;
  albumArt:  string | null;
  spotifyId: string | null;
}

// ── LLM client (lazy singleton, mirrors reading.ts) ───────────────────────

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

// ── Tracklist generation via LLM ──────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are a music-savvy pottery oracle. Given a pot\'s personality, pick exactly 10 REAL, existing songs (varied artists/eras) that match its vibe. Respond with ONLY a JSON array of objects {"title":"...","artist":"..."}. No prose, no markdown fences.';

async function generateTracklist(
  traits: string[],
  archetype: Archetype
): Promise<{ title: string; artist: string }[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return [];

  const model       = process.env.LLM_MODEL ?? "deepseek-chat";
  const userMessage = `Archetype: "${archetype.name} ${archetype.emoji}"\nTraits: ${traits.join(", ")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    let raw: string | null = null;
    try {
      const response = await getClient().chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user",   content: userMessage },
          ],
          temperature: 0.9,
          max_tokens:  500,
        },
        { signal: controller.signal }
      );
      raw = response.choices[0]?.message?.content?.trim() ?? null;
    } finally {
      clearTimeout(timeout);
    }

    if (!raw) return [];

    // Defensive JSON extraction: strip ```json fences if present, find first [ … last ].
    let jsonStr = raw;

    // Strip markdown code fences.
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

    // Find the outer JSON array brackets.
    const firstBracket = jsonStr.indexOf("[");
    const lastBracket  = jsonStr.lastIndexOf("]");
    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      return [];
    }
    jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);

    const parsed: unknown = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    const tracks: { title: string; artist: string }[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).title  === "string" &&
        typeof (item as Record<string, unknown>).artist === "string"
      ) {
        tracks.push({
          title:  (item as { title: string; artist: string }).title,
          artist: (item as { title: string; artist: string }).artist,
        });
      }
    }

    return tracks.slice(0, 10);
  } catch {
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Generate a personalised playlist for a pot.
 *
 * - If DEEPSEEK_API_KEY is unset → returns [].
 * - If Spotify keys are unset → returns tracks with url/albumArt/spotifyId = null.
 * - On any error → returns [] (or partial list with nulled-out Spotify fields).
 * - NEVER throws.
 */
export async function buildPotPlaylist(
  traits: string[],
  archetype: Archetype
): Promise<PlaylistTrack[]> {
  const llmTracks = await generateTracklist(traits, archetype);
  if (llmTracks.length === 0) return [];

  // Resolve all tracks via Spotify in parallel.
  const resolved = await Promise.all(
    llmTracks.map(async ({ title, artist }) => {
      const match = await searchTrack(title, artist);
      return {
        title,
        artist,
        url:       match?.url       ?? null,
        albumArt:  match?.albumArt  ?? null,
        spotifyId: match?.id        ?? null,
      } satisfies PlaylistTrack;
    })
  );

  return resolved;
}
