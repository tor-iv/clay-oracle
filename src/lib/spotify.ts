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

// ── User OAuth (Authorization Code flow) ───────────────────────────────────
// Lets each VISITOR create the pot's playlist in their OWN Spotify account.
// Distinct from the app-only client-credentials token used by searchTrack.

/** Scope needed to create a public playlist in the user's library. */
const OAUTH_SCOPE = "playlist-modify-public";

/**
 * The redirect URI registered on the Spotify app dashboard. MUST match exactly.
 * Override per-environment with SPOTIFY_REDIRECT_URI; defaults to production.
 */
export function spotifyRedirectUri(): string {
  return process.env.SPOTIFY_REDIRECT_URI?.trim() || "https://oracle.claydate.nyc/spotify";
}

/**
 * Build the Spotify "authorize" URL a visitor is sent to in order to log in and
 * grant playlist-creation. `state` round-trips the pot id back to our callback.
 * Returns null when SPOTIFY_CLIENT_ID is unset (feature simply hidden).
 */
export function buildAuthorizeUrl(state: string): string | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  if (!clientId) return null;

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    scope:         OAUTH_SCOPE,
    redirect_uri:  spotifyRedirectUri(),
    state,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization `code` for a short-lived USER access token.
 * Returns null on missing keys or any error. NEVER throws.
 */
export async function exchangeCodeForToken(code: string): Promise<string | null> {
  const clientId     = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    let res: Response;
    try {
      res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type:   "authorization_code",
          code,
          redirect_uri: spotifyRedirectUri(),
        }).toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a public playlist in the authorising user's account and fill it with
 * `trackUris` (e.g. "spotify:track:ID"). Returns the playlist's public URL, or
 * null on any failure. NEVER throws.
 */
export async function createUserPlaylist(
  userToken: string,
  name: string,
  description: string,
  trackUris: string[]
): Promise<{ id: string; url: string } | null> {
  if (trackUris.length === 0) return null;

  const authHeaders = {
    Authorization: `Bearer ${userToken}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Who is the user?
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (!meRes.ok) return null;
    const me = (await meRes.json()) as { id?: string };
    if (!me.id) return null;

    // 2. Create an empty playlist in their library.
    const createRes = await fetch(
      `https://api.spotify.com/v1/users/${encodeURIComponent(me.id)}/playlists`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name, description, public: true }),
      }
    );
    if (!createRes.ok) return null;
    const playlist = (await createRes.json()) as {
      id?: string;
      external_urls?: { spotify?: string };
    };
    if (!playlist.id) return null;

    // 3. Add the tracks (Spotify accepts up to 100 URIs per call).
    const addRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ uris: trackUris.slice(0, 100) }),
      }
    );
    // A failed add still leaves a (empty) playlist; report success only if it worked.
    if (!addRes.ok) return null;

    return {
      id:  playlist.id,
      url: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
    };
  } catch {
    return null;
  }
}
