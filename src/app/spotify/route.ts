// ── Spotify OAuth callback ─────────────────────────────────────────────────
// A visitor is sent here by Spotify after they log in and approve playlist
// creation. We exchange the code for THEIR access token, then create the pot's
// playlist in THEIR account and bounce back to the pot with a success link.
//
// Registered redirect URI: https://oracle.claydate.nyc/spotify (see spotify.ts).
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARCHETYPES } from "@/lib/personality";
import type { PlaylistTrack } from "@/lib/playlist";
import { exchangeCodeForToken, createUserPlaylist, spotifyRedirectUri } from "@/lib/spotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Absolute redirect back into the app — never throws, never 500s the callback. */
function back(origin: string, potId: string | null, status: string, playlistId?: string): Response {
  const target = potId
    ? `/result/${potId}?spotify=${status}${playlistId ? `&playlist=${playlistId}` : ""}`
    : `/?spotify=${status}`;
  return Response.redirect(`${origin}${target}`, 302);
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Behind the reverse proxy, req.url's origin is the internal container address
  // (e.g. http://<container>:3000). Use the public origin from the registered
  // redirect URI so post-login redirects land on the real site.
  const origin = new URL(spotifyRedirectUri()).origin;
  const code  = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const potId = url.searchParams.get("state"); // we set state = pot id

  // User declined, or Spotify returned an error.
  if (error || !code) return back(origin, potId, "denied");

  try {
    const token = await exchangeCodeForToken(code);
    if (!token) return back(origin, potId, "error");

    // Load the pot's resolved tracks.
    if (!potId) return back(origin, null, "error");
    const rows = await db
      .select()
      .from(schema.pots)
      .where(eq(schema.pots.id, potId))
      .limit(1);
    const pot = rows[0];
    if (!pot || !pot.tracklist) return back(origin, potId, "error");

    let tracks: PlaylistTrack[] = [];
    try {
      const parsed: unknown = JSON.parse(pot.tracklist);
      if (Array.isArray(parsed)) tracks = parsed as PlaylistTrack[];
    } catch {
      return back(origin, potId, "error");
    }

    const uris = tracks
      .map((t) => t.spotifyId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .map((id) => `spotify:track:${id}`);
    if (uris.length === 0) return back(origin, potId, "error");

    const archetype = ARCHETYPES.find((a) => a.id === pot.archetype_id) ?? ARCHETYPES[0];
    const created = await createUserPlaylist(
      token,
      `${archetype.name} — Clay Oracle`,
      "Your pot's playlist, divined at oracle.claydate.nyc",
      uris
    );
    if (!created) return back(origin, potId, "error");

    return back(origin, potId, "added", created.id);
  } catch {
    return back(origin, potId, "error");
  }
}
