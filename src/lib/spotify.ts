// ── Spotify client-credentials helper — server-only ───────────────────────
// Build-time guard: importing this from a Client Component fails the build
// instead of leaking the API keys at runtime.
import "server-only";

// ── Types ─────────────────────────────────────────────────────────────────

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  url: string;
  albumArt: string | null;
}

// ── Token cache ───────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // ms since epoch
}

let _tokenCache: TokenCache | null = null;

/**
 * Fetch (or return cached) a Spotify client-credentials access token.
 * Returns null when SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are unset,
 * or when the network request fails. NEVER throws.
 */
async function getAccessToken(): Promise<string | null> {
  const clientId     = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) return null;

  // Return cached token if it still has >30s of life left.
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 30_000) {
    return _tokenCache.token;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    let res: Response;
    try {
      res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;

    const data = await res.json() as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) return null;

    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
    _tokenCache = {
      token:     data.access_token,
      expiresAt: now + expiresIn * 1_000,
    };

    return _tokenCache.token;
  } catch {
    // Network error, timeout, or JSON parse failure.
    return null;
  }
}

// ── Track search ──────────────────────────────────────────────────────────

/**
 * Search Spotify for a single track by title and artist.
 * Returns null when keys are absent, or on any error. NEVER throws.
 */
export async function searchTrack(
  title: string,
  artist: string
): Promise<SpotifyTrack | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const query = encodeURIComponent(`track:${title} artist:${artist}`);
    const url   = `https://api.spotify.com/v1/search?type=track&limit=1&q=${query}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const track = data?.tracks?.items?.[0];
    if (!track) return null;

    // Pick a medium-sized album image (prefer index 1, fallback to index 0 or null).
    const images: Array<{ url: string; width: number; height: number }> =
      track.album?.images ?? [];
    const albumArt: string | null =
      images[1]?.url ?? images[0]?.url ?? null;

    return {
      id:       track.id as string,
      name:     track.name as string,
      artist:   track.artists?.[0]?.name as string ?? artist,
      url:      track.external_urls?.spotify as string ?? `https://open.spotify.com/track/${track.id}`,
      albumArt,
    };
  } catch {
    return null;
  }
}
