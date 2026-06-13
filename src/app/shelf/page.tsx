import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARCHETYPES } from "@/lib/personality";
import VaseAvatar from "@/components/avatar/VaseAvatar";
import WobblyCard from "@/components/ui/WobblyCard";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";
import ArchetypeIcon from "@/components/avatar/ArchetypeIcon";
import type { Pot } from "@/db/schema";

export const metadata: Metadata = {
  title: "The Shelf · Clay Oracle",
  description: "Pots thrown by visitors of Clay Oracle.",
};

// ── Shelf page ─────────────────────────────────────────────────────────────

export default async function ShelfPage() {
  const pots = await db
    .select()
    .from(schema.pots)
    .orderBy(desc(schema.pots.created_at))
    .limit(60);

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto w-full" style={{ maxWidth: "680px" }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-2">
            <DoodleIcon name="pot" size={28} color="var(--color-clay-rust)" />
            <h1
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "clamp(2.2rem, 8vw, 3.2rem)",
                fontWeight: 700,
                color: "var(--color-clay-rust)",
                lineHeight: 1.1,
              }}
            >
              the shelf
            </h1>
          </div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1rem",
              color: "var(--color-clay-ink-muted)",
              maxWidth: 340,
            }}
          >
            pots thrown by visitors — each one unique, each one true
          </p>
          <div className="mt-2">
            <Link href="/">
              <InkButton type="button" variant="primary">
                <DoodleIcon name="flame" size={16} color="#F5F0E8" />
                throw your own pot
              </InkButton>
            </Link>
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div
          aria-hidden="true"
          className="mb-8 w-full"
          style={{
            height: 2,
            background: "repeating-linear-gradient(90deg, var(--color-clay-ink) 0, var(--color-clay-ink) 6px, transparent 6px, transparent 12px)",
            opacity: 0.12,
            borderRadius: 2,
          }}
        />

        {/* ── Grid or empty state ──────────────────────────────────── */}
        {pots.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              columns: 2,
              columnGap: "1rem",
            }}
            className="sm:columns-3"
          >
            {pots.map((pot) => (
              <PotCard key={pot.id} pot={pot} />
            ))}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <p
          className="text-center text-xs mt-10 pb-4"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-clay-ink-muted)",
            opacity: 0.5,
          }}
        >
          Clay Oracle · every pot tells a story
        </p>
      </div>
    </main>
  );
}

// ── Pot card ───────────────────────────────────────────────────────────────

function PotCard({ pot }: { pot: Pot }) {
  const archetype = ARCHETYPES.find((a) => a.id === pot.archetype_id) ?? ARCHETYPES[0];

  return (
    <div
      className="mb-4"
      style={{ breakInside: "avoid", display: "inline-block", width: "100%" }}
    >
      <Link href={`/result/${pot.id}`} className="block group">
        <WobblyCard tone="cream" className="transition-all duration-150 group-hover:-translate-y-0.5">
          {/* Pot avatar */}
          <div className="flex justify-center mb-3">
            <VaseAvatar
              shape={pot.shape}
              glaze={pot.glaze}
              pattern={pot.pattern}
              size={100}
            />
          </div>

          {/* Archetype label */}
          <div
            className="text-center"
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: archetype.accentHex,
              lineHeight: 1.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3em",
            }}
          >
            <ArchetypeIcon id={archetype.id} size={18} color={archetype.accentHex} />
            {archetype.name}
          </div>

          {/* Signature */}
          <div
            className="text-center mt-1.5"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8rem",
              color: "var(--color-clay-ink-muted)",
              opacity: 0.75,
            }}
          >
            {pot.name ? (
              <span>
                by{" "}
                <span
                  style={{
                    fontFamily: "var(--font-hand)",
                    color: "var(--color-clay-ink)",
                    fontWeight: 600,
                  }}
                >
                  {pot.name}
                </span>
              </span>
            ) : (
              <span className="italic">anonymous</span>
            )}
          </div>
        </WobblyCard>
      </Link>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      {/* Big wobbly empty pot icon */}
      <div
        style={{
          animation: "gentle-bounce 2.5s ease-in-out infinite",
          display: "inline-block",
        }}
      >
        <DoodleIcon name="pot" size={72} color="var(--color-clay-rust)" />
      </div>

      <div>
        <p
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--color-clay-ink)",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3em" }}>
            the shelf is bare
            <DoodleIcon name="sprout" size={22} color="var(--color-clay-ink)" />
          </span>
        </p>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "1rem",
            color: "var(--color-clay-ink-muted)",
            maxWidth: 300,
            margin: "0 auto",
          }}
        >
          no pots yet — be the first to throw one and see what the oracle reads in your clay
        </p>
      </div>

      <Link href="/">
        <InkButton type="button" variant="primary">
          <DoodleIcon name="flame" size={16} color="#F5F0E8" />
          be the first
        </InkButton>
      </Link>
    </div>
  );
}
