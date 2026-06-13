"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  parseShape,
  encodeThrown2Shape,
  encodeThrownShape,
  AVATAR_PATTERNS,
  DEFAULT_AVATAR,
} from "@/lib/avatars";
import { readVase } from "@/lib/personality";
import { generateReading } from "@/lib/reading";

// ── Helpers ────────────────────────────────────────────────────────────────

const KNOWN_GLAZES = new Set([
  "terracotta", "celadon", "cobalt", "ivory",
  "sage-matte", "blush-gloss", "midnight", "honey",
]);
const KNOWN_PATTERNS = new Set(AVATAR_PATTERNS.map((p) => p.id));

/** Canonicalise shape string — invalid → default preset, never throws. */
function canonShape(raw: string): string {
  if (!raw) return DEFAULT_AVATAR.shape;
  const parsed = parseShape(raw);
  if (parsed.kind === "preset") return parsed.id;
  if (parsed.kind === "thrown2") {
    return encodeThrown2Shape(parsed.h, parsed.widths, parsed.face, parsed.edges);
  }
  if (parsed.kind === "thrown") {
    return encodeThrownShape(parsed.params, parsed.face);
  }
  return DEFAULT_AVATAR.shape;
}

/** Validate glaze — unknown hex/id → terracotta default. */
function canonGlaze(raw: string): string {
  if (!raw) return DEFAULT_AVATAR.glaze;
  if (KNOWN_GLAZES.has(raw)) return raw;
  // Accept raw hex colours
  if (/^#[0-9A-Fa-f]{3}$/.test(raw) || /^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
  return DEFAULT_AVATAR.glaze;
}

/** Validate pattern — unknown → plain. */
function canonPattern(raw: string): string {
  if (!raw) return DEFAULT_AVATAR.pattern;
  // KNOWN_PATTERNS is Set<AvatarPattern> — cast raw for the lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return KNOWN_PATTERNS.has(raw as any) ? raw : DEFAULT_AVATAR.pattern;
}

// ── readPotAction ──────────────────────────────────────────────────────────

/**
 * Server action bound to the sculpt form.
 * Validates inputs, generates a reading, persists a pot row, then redirects.
 * redirect() is called OUTSIDE any try/catch.
 */
export async function readPotAction(formData: FormData): Promise<void> {
  const rawShape   = String(formData.get("shape")   ?? "");
  const rawGlaze   = String(formData.get("glaze")   ?? "");
  const rawPattern = String(formData.get("pattern") ?? "");
  const rawThrow   = String(formData.get("throw")   ?? "");

  const shape   = canonShape(rawShape);
  const glaze   = canonGlaze(rawGlaze);
  const pattern = canonPattern(rawPattern);

  // Parse optional throw quality score (0..1) from hard mode.
  // Easy mode does not send this field → undefined → readVase defaults to neutral.
  const throwScore = rawThrow
    ? Math.max(0, Math.min(1, parseFloat(rawThrow) || 0.7))
    : undefined;

  // Personality + reading
  const { archetype, traits } = readVase(shape, glaze, pattern, throwScore);
  const reading = await generateReading(traits, archetype);

  // Persist
  const id = nanoid();
  await db.insert(schema.pots).values({
    id,
    shape,
    glaze,
    pattern,
    archetype_id: archetype.id,
    reading,
    created_at: Date.now(),
  });

  // Redirect outside try/catch — Next.js throws internally to implement this.
  redirect(`/result/${id}`);
}

// ── nameOnShelfAction ──────────────────────────────────────────────────────

/**
 * Sign a pot with an optional name.
 * All pots appear on /shelf; the name is an optional signature.
 * Name is trimmed and capped at 30 chars.
 */
export async function nameOnShelfAction(
  potId: string,
  formData: FormData
): Promise<void> {
  const rawName = String(formData.get("name") ?? "").trim().slice(0, 30);
  const name    = rawName || null;

  await db
    .update(schema.pots)
    .set({ name })
    .where(eq(schema.pots.id, potId));

  revalidatePath("/shelf");
  revalidatePath(`/result/${potId}`);
}
