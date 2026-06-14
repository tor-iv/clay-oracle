import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARCHETYPES } from "@/lib/personality";
import type { PlaylistTrack } from "@/lib/playlist";
import VaseAvatar from "@/components/avatar/VaseAvatar";
import WobblyCard from "@/components/ui/WobblyCard";
import HandInput from "@/components/ui/HandInput";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";
import ArchetypeIcon from "@/components/avatar/ArchetypeIcon";
import ShareButton from "@/components/ShareButton";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
  //   default    → archetype editorial playlist embed
  const hasOverride  = Boolean(pot.playlist_url);
  const hasTracks    = !hasOverride && tracks.length > 0;
  const firstTracked = tracks.find((t) => t.spotifyId !== null) ?? null;

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
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${archetype.accentHex}33 0%, transparent 70%)`,
                filter: "blur(12px)",
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
              fontSize: "1.05rem",
              lineHeight: 1.7,
              color: "var(--color-clay-ink)",
            }}
          >
            {pot.reading}
          </p>
        </WobblyCard>

        {/* ── Spotify section ────────────────────────────────────────── */}
        {hasTracks ? (
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
          </WobblyCard>
        ) : (
          /* ── Archetype editorial playlist / user override embed ─── */
          <div className="mb-3 overflow-hidden rounded-xl" style={{ border: "2px solid var(--color-clay-ink)" }}>
            <iframe
              src={`https://open.spotify.com/embed/${
                pot.playlist_url ?? `playlist/${archetype.playlistId}`
              }?utm_source=oembed`}
              width="100%"
              height="152"
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ display: "block", borderRadius: 10 }}
              title={pot.playlist_url ? "your soundtrack" : `${archetype.name} playlist`}
            />
          </div>
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
