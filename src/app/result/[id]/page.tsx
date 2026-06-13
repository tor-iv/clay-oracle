import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARCHETYPES } from "@/lib/personality";
import VaseAvatar from "@/components/avatar/VaseAvatar";
import WobblyCard from "@/components/ui/WobblyCard";
import HandInput from "@/components/ui/HandInput";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";
import ShareButton from "@/components/ShareButton";
import { nameOnShelfAction } from "@/actions/pot";

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
    return { title: "Clay Oracle 🔮" };
  }

  const archetype = ARCHETYPES.find((a) => a.id === pot.archetype_id) ?? ARCHETYPES[0];
  const descSnippet = pot.reading.slice(0, 120) + (pot.reading.length > 120 ? "…" : "");

  return {
    title: `I'm ${archetype.name} ${archetype.emoji} 🏺`,
    description: descSnippet,
    openGraph: {
      title: `I'm ${archetype.name} ${archetype.emoji} 🏺`,
      description: descSnippet,
      images: [`/api/og/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `I'm ${archetype.name} ${archetype.emoji} 🏺`,
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
            {archetype.emoji} {archetype.name}
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

        {/* ── Spotify playlist ──────────────────────────────────────── */}
        <div className="mb-6 overflow-hidden rounded-xl" style={{ border: "2px solid var(--color-clay-ink)" }}>
          <iframe
            src={`https://open.spotify.com/embed/playlist/${archetype.playlistId}?utm_source=oembed`}
            width="100%"
            height="152"
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ display: "block", borderRadius: 10 }}
            title={`${archetype.name} playlist`}
          />
        </div>

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
                🖊️
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
                add your name to the shelf 🏺
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
            title={`I'm ${archetype.name} ${archetype.emoji} 🏺 — Clay Oracle`}
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
