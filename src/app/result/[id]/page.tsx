import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARCHETYPES, readVase } from "@/lib/personality";
import { buildPotPlaylist, type PlaylistTrack } from "@/lib/playlist";
import { buildAuthorizeUrl } from "@/lib/spotify";
import VaseAvatar from "@/components/avatar/VaseAvatar";
import WobblyCard from "@/components/ui/WobblyCard";
import HandInput from "@/components/ui/HandInput";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";
import ArchetypeIcon from "@/components/avatar/ArchetypeIcon";
import ShareButton from "@/components/ShareButton";
import SaveImageButton from "@/components/SaveImageButton";
import { nameOnShelfAction, setPlaylistAction } from "@/actions/pot";

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rows = await db
    .select()
    .from(schema.pots)
    .where(eq(schema.pots.id, id))
    .limit(1);
  const pot = rows[0];
  if (!pot) {
    return { title: "Clay Oracle" };
  }

  const archetype = ARCHETYPES.find((a) => a.id === pot.archetype_id) ?? ARCHETYPES[0];
  const descSnippet = pot.reading.slice(0, 120) + (pot.reading.length > 120 ? "…" : "");

  return {
    title: `I'm ${archetype.name}`,
    description: descSnippet,
    openGraph: {
      title: `I'm ${archetype.name}`,
      description: descSnippet,
      images: [`/api/og/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `I'm ${archetype.name}`,
      description: descSnippet,
      images: [`/api/og/${id}`],
    },
  };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spotify?: string; playlist?: string }>;
}) {
  const { id } = await params;
  const { spotify: spotifyStatus, playlist: addedPlaylistId } = await searchParams;

  const rows = await db
    .select()
    .from(schema.pots)
    .where(eq(schema.pots.id, id))
    .limit(1);

  const pot = rows[0];
  if (!pot) notFound();

  const archetype = ARCHETYPES.find((a) => a.id === pot.archetype_id) ?? ARCHETYPES[0];
  const nameAction = nameOnShelfAction.bind(null, id);
  const playlistAction = setPlaylistAction.bind(null, id);

  // Parse stored tracklist defensively.
  let tracks: PlaylistTrack[] = [];
  if (pot.tracklist) {
    try {
      const parsed: unknown = JSON.parse(pot.tracklist);
      if (Array.isArray(parsed)) {
        tracks = parsed as PlaylistTrack[];
      }
    } catch {
      // Malformed JSON — fall back to empty list.
    }
  }

  // Determine display mode:
  //   override   → user pasted their own Spotify link → show that embed
  //   tracklist  → real per-pot tracks resolved → show track list
  // There is intentionally NO generic editorial-playlist fallback — every pot
  // gets its own custom tracklist.
  const hasOverride = Boolean(pot.playlist_url);

  // Lazy backfill: older pots (or any whose generation failed at create time)
  // have no stored tracklist. Generate one on first view and persist it, so the
  // music is always custom to this pot rather than a generic mood playlist.
  if (!hasOverride && tracks.length === 0) {
    const { traits } = readVase(pot.shape, pot.glaze, pot.pattern);
    const fresh = await buildPotPlaylist(traits, archetype);
    if (fresh.length > 0) {
      tracks = fresh;
      try {
        await db
          .update(schema.pots)
          .set({ tracklist: JSON.stringify(fresh) })
          .where(eq(schema.pots.id, id));
      } catch {
        // Persist is best-effort — we still render the freshly generated tracks.
      }
    }
  }

  const hasTracks    = !hasOverride && tracks.length > 0;
  const firstTracked = tracks.find((t) => t.spotifyId !== null) ?? null;

  // "Add to Spotify": let each visitor save this pot's tracks to THEIR own
  // account. Only offered when we have real track IDs and OAuth is configured.
  const hasSavableTracks = tracks.some((t) => t.spotifyId !== null);
  const spotifyAuthUrl = hasSavableTracks ? buildAuthorizeUrl(id) : null;

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-14"
      style={{ maxWidth: "100%" }}
    >
      <div className="mx-auto w-full" style={{ maxWidth: "480px" }}>

        {/* ── Back link ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{
              fontFamily: "var(--font-hand)",
              color: "var(--color-clay-ink-muted)",
            }}
          >
            <DoodleIcon name="pot" size={16} color="var(--color-clay-ink-muted)" />
            throw another
          </Link>
        </div>

        {/* ── Pot ───────────────────────────────────────────────────── */}
        <div
          className="flex flex-col items-center gap-2 mb-6"
          style={{ animation: "pop-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          {/* Decorative ring behind the pot */}
          <div
            aria-hidden="true"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Glowing accent halo */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 280,
                height: 280,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${archetype.accentHex}45 0%, ${archetype.accentHex}1a 45%, transparent 72%)`,
                filter: "blur(16px)",
                pointerEvents: "none",
              }}
            />
            {/* Soft contact shadow grounding the pot */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: 6,
                width: 130,
                height: 22,
                borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(44,24,16,0.18) 0%, transparent 70%)",
                filter: "blur(6px)",
                pointerEvents: "none",
              }}
            />
            <VaseAvatar
              shape={pot.shape}
              glaze={pot.glaze}
              pattern={pot.pattern}
              size={200}
            />
          </div>
        </div>

        {/* ── Archetype heading ─────────────────────────────────────── */}
        <div className="text-center mb-6">
          <div
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "clamp(2rem, 9vw, 3rem)",
              fontWeight: 700,
              color: archetype.accentHex,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25em" }}>
              <ArchetypeIcon id={archetype.id} size={40} color={archetype.accentHex} />
              {archetype.name}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.95rem",
              color: "var(--color-clay-ink-muted)",
              marginTop: "0.25rem",
            }}
          >
            your clay oracle reading
          </div>
        </div>

        {/* ── Reading card ──────────────────────────────────────────── */}
        <WobblyCard tone="warm" className="mb-6">
          {/* Decorative doodle flourish */}
          <div
            aria-hidden="true"
            className="absolute top-3 right-3 opacity-20"
          >
            <DoodleIcon name="squiggle" size={28} color="var(--color-clay-ink)" />
          </div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1.2rem",
              lineHeight: 1.8,
              color: "var(--color-clay-ink)",
              letterSpacing: "0.005em",
            }}
          >
            {pot.reading}
          </p>
        </WobblyCard>

        {/* ── Add-to-Spotify result banner ──────────────────────────── */}
        {spotifyStatus === "added" && (
          <div
            className="mb-3"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 0.8rem",
              borderRadius: 12,
              background: "rgba(29,185,84,0.14)",
              border: "1.5px solid #1DB954",
              fontFamily: "var(--font-body)",
              fontSize: "0.92rem",
              color: "var(--color-clay-ink)",
            }}
          >
            <span>✓ saved to your Spotify —</span>
            {addedPlaylistId && (
              <a
                href={`https://open.spotify.com/playlist/${addedPlaylistId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0b6b32", fontWeight: 700, textDecoration: "underline" }}
              >
                open playlist
              </a>
            )}
          </div>
        )}
        {(spotifyStatus === "denied" || spotifyStatus === "error") && (
          <div
            className="mb-3"
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: 12,
              background: "rgba(44,24,16,0.05)",
              border: "1.5px solid var(--color-clay-ink-muted)",
              fontFamily: "var(--font-body)",
              fontSize: "0.92rem",
              color: "var(--color-clay-ink-muted)",
            }}
          >
            {spotifyStatus === "denied"
              ? "Spotify sign-in was cancelled — your playlist is still here whenever you want it."
              : "Couldn't reach Spotify just then. Give it another try."}
          </div>
        )}

        {/* ── Spotify section ────────────────────────────────────────── */}
        {hasOverride ? (
          /* ── User's pasted soundtrack override ───────────────────── */
          <div className="mb-3 overflow-hidden rounded-xl" style={{ border: "2px solid var(--color-clay-ink)" }}>
            <iframe
              src={`https://open.spotify.com/embed/${pot.playlist_url}?utm_source=oembed`}
              width="100%"
              height="152"
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ display: "block", borderRadius: 10 }}
              title="your soundtrack"
            />
          </div>
        ) : hasTracks ? (
          /* ── Real per-pot tracklist ─────────────────────────────── */
          <WobblyCard tone="warm" className="mb-3">
            {/* Hover highlight via CSS (this is a Server Component — no JS handlers) */}
            <style>{`.pot-track-row:hover{background:rgba(0,0,0,0.05)}`}</style>
            {/* Optional single-track embed at the top for instant play */}
            {firstTracked && (
              <div className="mb-4 overflow-hidden rounded-xl" style={{ border: "1.5px solid var(--color-clay-ink)" }}>
                <iframe
                  src={`https://open.spotify.com/embed/track/${firstTracked.spotifyId}?utm_source=oembed`}
                  width="100%"
                  height="80"
                  frameBorder={0}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ display: "block", borderRadius: 10 }}
                  title={`${firstTracked.title} — ${firstTracked.artist}`}
                />
              </div>
            )}

            {/* Heading */}
            <div
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "1.1rem",
                fontWeight: 700,
                color: archetype.accentHex,
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4em",
              }}
            >
              <DoodleIcon name="moon" size={18} color={archetype.accentHex} />
              your pot playlist
            </div>

            {/* Track list */}
            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
              }}
            >
              {tracks.map((track, i) => {
                const inner = (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                    }}
                  >
                    {/* Album art or placeholder */}
                    {track.albumArt ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.albumArt}
                        alt=""
                        width={40}
                        height={40}
                        style={{
                          borderRadius: 6,
                          flexShrink: 0,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          flexShrink: 0,
                          background: "var(--color-clay-parchment, #F5F0E8)",
                          border: "1.5px solid var(--color-clay-ink)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <DoodleIcon name="pot" size={20} color="var(--color-clay-ink-muted)" />
                      </div>
                    )}

                    {/* Title + artist */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "var(--color-clay-ink)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8rem",
                          color: "var(--color-clay-ink-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <li key={i}>
                    {track.url ? (
                      <a
                        className="pot-track-row"
                        href={track.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          borderRadius: 8,
                          padding: "0.3rem 0.4rem",
                          transition: "background 0.15s",
                          textDecoration: "none",
                        }}
                      >
                        {inner}
                      </a>
                    ) : (
                      <div style={{ padding: "0.3rem 0.4rem" }}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ol>

            {/* Add to Spotify — creates this playlist in the visitor's own account */}
            {spotifyAuthUrl && (
              <a
                href={spotifyAuthUrl}
                style={{
                  marginTop: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.9rem",
                  borderRadius: 999,
                  background: "#1DB954",
                  border: "1.5px solid var(--color-clay-ink)",
                  color: "#0b2e18",
                  fontFamily: "var(--font-hand)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "2px 2px 0 var(--color-clay-ink)",
                }}
              >
                <DoodleIcon name="moon" size={16} color="#0b2e18" />
                add to my Spotify
              </a>
            )}
          </WobblyCard>
        ) : (
          /* ── No custom tracks yet (keys unset or generation failed) ─── */
          <WobblyCard tone="warm" className="mb-3">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "var(--font-body)",
                fontSize: "0.95rem",
                color: "var(--color-clay-ink-muted)",
              }}
            >
              <DoodleIcon name="moon" size={18} color={archetype.accentHex} />
              the oracle is still tuning this pot&apos;s playlist — paste a song below to set your own.
            </div>
          </WobblyCard>
        )}

        {/* Set your own soundtrack */}
        <form action={playlistAction} className="mb-6 flex flex-col gap-2 sm:flex-row">
          <HandInput
            name="playlist"
            placeholder="paste a Spotify link to set your own soundtrack"
            defaultValue=""
            className="flex-1"
            style={{ fontSize: "0.95rem" }}
          />
          <InkButton type="submit" variant="soft" className="shrink-0">
            {pot.playlist_url ? "change song" : "set song"}
          </InkButton>
        </form>

        {/* ── Sign or shelf link ────────────────────────────────────── */}
        <WobblyCard tone="cream" className="mb-6">
          {pot.name ? (
            /* Already signed */
            <div className="flex flex-col gap-3 items-start">
              <div
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "1.05rem",
                  color: "var(--color-clay-ink-muted)",
                }}
              >
                signed by{" "}
                <span
                  style={{
                    color: archetype.accentHex,
                    fontWeight: 700,
                  }}
                >
                  {pot.name}
                </span>{" "}
                <DoodleIcon name="pen" size={16} color="var(--color-clay-ink-muted)" />
              </div>
              <Link
                href="/shelf"
                className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "0.95rem",
                  color: "var(--color-clay-rust)",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: "3px",
                }}
              >
                <DoodleIcon name="pot" size={16} color="var(--color-clay-rust)" />
                view the shelf
              </Link>
            </div>
          ) : (
            /* Sign form */
            <div className="flex flex-col gap-3">
              <div
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "1.05rem",
                  color: "var(--color-clay-ink)",
                  fontWeight: 700,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3em" }}>
                  add your name to the shelf
                  <DoodleIcon name="amphora" size={18} color="var(--color-clay-ink)" />
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: "var(--color-clay-ink-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                leave a mark — or stay anonymous
              </p>
              <form action={nameAction} className="flex flex-col gap-3">
                <HandInput
                  name="name"
                  placeholder="your name (optional)"
                  maxLength={30}
                />
                <div className="flex gap-2 flex-wrap">
                  <InkButton type="submit" variant="primary">
                    <DoodleIcon name="leaf" size={16} color="#F5F0E8" />
                    sign the pot
                  </InkButton>
                  <Link href="/shelf">
                    <InkButton type="button" variant="ghost">
                      <DoodleIcon name="pot" size={16} color="var(--color-clay-ink)" />
                      view shelf
                    </InkButton>
                  </Link>
                </div>
              </form>
            </div>
          )}
        </WobblyCard>

        {/* ── Share row ─────────────────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap items-center justify-center mb-8">
          <SaveImageButton id={pot.id} archetypeName={archetype.name} />
          <ShareButton
            title={`I'm ${archetype.name} — Clay Oracle`}
            text={pot.reading.slice(0, 140)}
          />
          <Link href="/shelf">
            <InkButton type="button" variant="ghost">
              <DoodleIcon name="pot" size={16} color="var(--color-clay-ink)" />
              the shelf
            </InkButton>
          </Link>
          <Link href="/">
            <InkButton type="button" variant="ghost">
              <DoodleIcon name="flame" size={16} color="var(--color-clay-ink)" />
              throw another
            </InkButton>
          </Link>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <p
          className="text-center text-xs pb-4"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-clay-ink-muted)",
            opacity: 0.6,
          }}
        >
          Clay Oracle · every pot tells a story
        </p>
      </div>
    </main>
  );
}
