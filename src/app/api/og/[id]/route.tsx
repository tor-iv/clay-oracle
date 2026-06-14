import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARCHETYPES } from "@/lib/personality";
import {
  parseShape,
  buildThrown2Path,
  buildThrownPath,
  getShape,
  resolveGlaze,
} from "@/lib/avatars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fetch Caveat once per cold-start. MUST be TTF/OTF/WOFF — Satori cannot parse
// woff2. Fontsource on jsDelivr serves a static TTF reliably.
let _caveatFont: ArrayBuffer | null | undefined = undefined; // undefined = not tried

async function loadCaveat(): Promise<ArrayBuffer | null> {
  if (_caveatFont !== undefined) return _caveatFont;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/caveat@latest/latin-700-normal.ttf",
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
    _caveatFont = await res.arrayBuffer();
  } catch {
    _caveatFont = null;
  }
  return _caveatFont;
}

/** A text-free card that needs no font — the always-works fallback. */
function fallbackCard(width = 1200, height = 630) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F0E8",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 220,
            height: 220,
            borderRadius: 32,
            backgroundColor: "#B85C2A",
            border: "8px solid #2C1810",
          }}
        />
      </div>
    ),
    { width, height }
  );
}

/**
 * Build an SVG data-URI string for an archetype glyph.
 * Embedded as <img> so Satori renders it without JSX-tree constraints.
 */
function ogArchetypeGlyphUri(iconName: string, color: string): string {
  const sw = "1.6";
  const cap = "round";
  const join = "round";
  const base = `fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"`;

  const pathsMap: Record<string, string> = {
    sprout: `<g ${base}><path d="M 10 18 Q 10 13 10 10"/><path d="M 10 13 Q 7 11 5 9 Q 6 7 8.5 8 Q 10 9 10 10"/><path d="M 10 13 Q 13 11 15 9 Q 14 7 11.5 8 Q 10 9 10 10"/><path d="M 10 10 Q 10 8.5 10 7"/><path d="M 10 7 Q 8.5 6 9 4.5 Q 10 3.5 11 4.5 Q 11.5 6 10 7 Z" stroke-width="1.3"/></g>`,
    flame: `<g ${base}><path d="M 10 18 Q 5 15 6 10 Q 7 7 9 6 Q 8 9 10 10 Q 9 7 11 4 Q 14 7 14 10 Q 16 8 15 6 Q 17 9 16 13 Q 15 17 10 18 Z"/></g>`,
    moon: `<g ${base}><path d="M 14.5 4 Q 19 8 17.5 13.5 Q 16 18.5 10.5 18.5 Q 5.5 18.5 3.5 15 Q 6.5 16 9.5 14 Q 14 11 14 6.5 Q 14 5 14.5 4 Z"/><path d="M 4.5 6.5 Q 5 5 5.5 6.5 Q 6 5 6 6.5 Q 7 7 5.5 7 Q 6 8 5.5 7 Q 5 8 5 7 Q 4 7 4.5 6.5 Z" stroke-width="1.1"/></g>`,
    swirl: `<g ${base}><path d="M 10 10 Q 10 8.5 11.5 8 Q 13.5 7.5 14.5 9.5 Q 15.5 11.5 14 13.5 Q 12.5 15.5 10 15.5 Q 6.5 15.5 5 13 Q 3.5 10 5 7.5 Q 7 5 10 4.5 Q 14 4 16.5 6.5 Q 19 9 18 13"/></g>`,
    sun: `<g ${base}><path d="M 10 7 Q 13 7 13 10 Q 13 13 10 13 Q 7 13 7 10 Q 7 7 10 7 Z"/><path d="M 10 2 Q 10 5 10 6.5"/><path d="M 17.5 4.5 Q 15.5 6.5 14.5 7.5"/><path d="M 18 10 Q 15.5 10 13.5 10"/><path d="M 17.5 15.5 Q 15.5 13.5 14.5 12.5"/><path d="M 10 18 Q 10 15 10 13.5"/><path d="M 2.5 15.5 Q 4.5 13.5 5.5 12.5"/><path d="M 2 10 Q 4.5 10 6.5 10"/><path d="M 2.5 4.5 Q 4.5 6.5 5.5 7.5"/></g>`,
    ocean: `<g ${base}><path d="M 1.5 9 Q 3 7 5 9 Q 7 11 9 9 Q 11 7 13 9 Q 15 11 17 9 Q 18.5 7.5 19 8.5"/><path d="M 1.5 13 Q 3.5 11 5.5 13 Q 7.5 15 9.5 13 Q 11.5 11 13.5 13 Q 15.5 15 17.5 13 Q 18.5 12 19 12.5"/><path d="M 2 17.5 Q 10 18.5 18 17.5" stroke-width="1" stroke-opacity="0.5"/></g>`,
    blossom: `<g ${base}><path d="M 10 10 Q 9 7.5 10 5 Q 11 7.5 10 10 Z"/><path d="M 10 10 Q 12.5 9 14.5 10 Q 12.5 11 10 10 Z"/><path d="M 10 10 Q 11 12.5 10 15 Q 9 12.5 10 10 Z"/><path d="M 10 10 Q 7.5 11 5.5 10 Q 7.5 9 10 10 Z"/><path d="M 10 10 Q 12 8 13.5 6.5 Q 12.5 9 10 10 Z" stroke-width="1.2"/><path d="M 10 10 Q 8 8 6.5 6.5 Q 8 9.5 10 10 Z" stroke-width="1.2"/><path d="M 10 10 Q 12 12 13.5 13.5 Q 11.5 11 10 10 Z" stroke-width="1.2"/><path d="M 10 10 Q 8 12 6.5 13.5 Q 8.5 11 10 10 Z" stroke-width="1.2"/><path d="M 10 9 Q 11.5 9 11.5 10 Q 11.5 11.5 10 11.5 Q 8.5 11.5 8.5 10 Q 8.5 9 10 9 Z" fill="${color}" stroke-width="0"/></g>`,
    stone: `<g ${base}><path d="M 5 15 Q 3 13 3.5 10 Q 4 6.5 7 5 Q 10 4 13.5 5.5 Q 17 7 17 10.5 Q 17 14 14.5 16 Q 12 17.5 8.5 17 Q 6 16.5 5 15 Z"/><path d="M 6.5 7.5 Q 8 6.5 10 7" stroke-width="1" stroke-opacity="0.55"/><path d="M 14.5 14 Q 13.5 13 14 12 Q 15 11.5 15.5 12.5 Q 16 13.5 15 14.5 Q 14.5 14.5 14.5 14 Z" stroke-width="1.2"/></g>`,
    kite: `<g ${base}><path d="M 10 2 Q 16.5 8 10 14 Q 3.5 8 10 2 Z"/><path d="M 3.5 8 Q 10 7.5 16.5 8" stroke-width="1"/><path d="M 10 2 Q 10 8 10 14" stroke-width="1"/><path d="M 10 14 Q 11 16 10 17.5 Q 9 19 10 20" stroke-width="1.3"/><path d="M 9 16.5 Q 7.5 16 8 17 Q 9 18 9.5 17 Q 9.5 16.5 9 16.5 Z" stroke-width="1.1"/><path d="M 10.5 18.5 Q 12 18 11.5 19 Q 10.5 20 10 19 Q 10 18.5 10.5 18.5 Z" stroke-width="1.1"/></g>`,
    leaf: `<g ${base}><path d="M 10 18 Q 3 14 4 8 Q 5 4 10 3 Q 15 4 16 8 Q 17 14 10 18 Z"/><path d="M 10 18 Q 10 12 10 3" stroke-width="1"/><path d="M 10 14 Q 7 12 5 11" stroke-width="0.8"/><path d="M 10 14 Q 13 12 15 11" stroke-width="0.8"/><path d="M 10 9 Q 8 7 6 7" stroke-width="0.8"/><path d="M 10 9 Q 12 7 14 7" stroke-width="0.8"/></g>`,
    sparkle: `<g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"><path d="M 10 2 Q 10.5 7 10 11 Q 9.5 16 10 19"/><path d="M 2 10 Q 7 10.5 11 10 Q 16 9.5 19 10"/><path d="M 4 4 Q 7.5 7.5 10 10 Q 12.5 12.5 16 16" stroke-opacity="0.55"/><path d="M 16 4 Q 12.5 7.5 10 10 Q 7.5 12.5 4 16" stroke-opacity="0.55"/></g>`,
    amphora: `<g ${base}><path d="M 8 4 Q 7.5 6 7 8"/><path d="M 12 4 Q 12.5 6 13 8"/><path d="M 7.5 3.5 Q 10 3 12.5 3.5"/><path d="M 7 8 Q 4 11 5 15 Q 6 17.5 10 17.5 Q 14 17.5 15 15 Q 16 11 13 8"/><path d="M 7 9 Q 4.5 9 4 11.5 Q 4 13 6.5 13.5"/><path d="M 13 9 Q 15.5 9 16 11.5 Q 16 13 13.5 13.5"/><path d="M 7 17.5 Q 10 19 13 17.5"/></g>`,
  };

  const pathsSvg = pathsMap[iconName] ?? pathsMap["sparkle"];
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 20 20" fill="none">${pathsSvg}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
}

/** Build a simple SVG string of the vase silhouette for the OG card. */
function buildVaseSvg(shape: string, glaze: string): string {
  const fill = resolveGlaze(glaze);
  const ink = "#2C1810";

  const parsed = parseShape(shape);
  let path: string;
  if (parsed.kind === "thrown2") {
    path = buildThrown2Path(parsed.h, parsed.widths, parsed.edges);
  } else if (parsed.kind === "thrown") {
    path = buildThrownPath(parsed.params);
  } else {
    path = getShape(parsed.id).path;
  }

  // Satori needs explicit style objects on every element.
  // We embed the vase as an <img> with a data-URI SVG.
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none"><path d="${path}" fill="${fill}"/><path d="${path}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const format = new URL(req.url).searchParams.get("format");
  const isSquare = format === "square";
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 630;

  try {
    const { id } = await params;

    const rows = await db
      .select()
      .from(schema.pots)
      .where(eq(schema.pots.id, id))
      .limit(1);
    const pot = rows[0];

    if (!pot) return fallbackCard(W, H);

    const caveat = await loadCaveat();
    // Satori needs the named font loaded; if it didn't load, use the text-free card.
    if (!caveat) return fallbackCard(W, H);

    const archetype = ARCHETYPES.find((a) => a.id === pot.archetype_id) ?? ARCHETYPES[0];
    const fontOptions = [
      { name: "Caveat", data: caveat, weight: 700 as const, style: "normal" as const },
    ];
    const titleFont = "Caveat";

    const vaseSvgUri = buildVaseSvg(pot.shape, pot.glaze);
    const archetypeGlyphUri = ogArchetypeGlyphUri(archetype.iconName, archetype.accentHex);
    const readingSnippet =
      pot.reading.slice(0, 120) + (pot.reading.length > 120 ? "…" : "");

    // ── Square 1080×1080 Instagram share card ────────────────────────────────
    if (isSquare) {
      const squareReading =
        pot.reading.slice(0, 240) + (pot.reading.length > 240 ? "…" : "");
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F5F0E8",
              backgroundImage:
                "radial-gradient(circle at 20% 80%, rgba(184,92,42,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(122,140,110,0.08) 0%, transparent 50%)",
              fontFamily: titleFont,
              padding: "72px 60px",
              gap: 32,
            }}
          >
            {/* Wordmark */}
            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: "#5C3D2E",
                fontFamily: titleFont,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              CLAY ORACLE
            </div>

            {/* Pot */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 460,
                height: 460,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vaseSvgUri}
                alt=""
                width={460}
                height={460}
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* Archetype row */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  fontSize: 84,
                  fontWeight: 700,
                  color: archetype.accentHex,
                  fontFamily: titleFont,
                  lineHeight: 1.05,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={archetypeGlyphUri} alt="" width={84} height={84} style={{ flexShrink: 0 }} />
                {archetype.name}
              </div>
            </div>

            {/* Reading */}
            <div
              style={{
                display: "flex",
                fontSize: 38,
                color: "#2C1810",
                fontFamily: titleFont,
                lineHeight: 1.5,
                textAlign: "center",
                maxWidth: 880,
              }}
            >
              {squareReading}
            </div>

            {/* Footer */}
            <div
              style={{
                position: "absolute",
                bottom: 40,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 24,
                color: "#5C3D2E",
                opacity: 0.55,
                fontFamily: titleFont,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ogArchetypeGlyphUri("amphora", "#5C3D2E")} alt="" width={24} height={24} style={{ flexShrink: 0 }} />
              oracle.claydate.nyc
            </div>

            {/* Ink border */}
            <div
              style={{
                position: "absolute",
                inset: 24,
                border: "3px solid rgba(44,24,16,0.12)",
                borderRadius: 28,
              }}
            />
          </div>
        ),
        {
          width: 1080,
          height: 1080,
          fonts: fontOptions,
        }
      );
    }

    // ── Default 1200×630 horizontal card (link-unfurl) ───────────────────────
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F5F0E8",
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(184,92,42,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(122,140,110,0.08) 0%, transparent 50%)",
            fontFamily: titleFont,
            padding: "64px 80px",
            gap: 0,
          }}
        >
          {/* Content row */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 64,
              width: "100%",
            }}
          >
            {/* Vase SVG */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 240,
                height: 240,
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vaseSvgUri}
                alt=""
                width={240}
                height={240}
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* Text column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 16,
                flex: 1,
              }}
            >
              {/* Oracle label */}
              <div
                style={{
                  fontSize: 22,
                  color: "#5C3D2E",
                  fontFamily: titleFont,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Clay Oracle
              </div>

              {/* Archetype */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 72,
                  fontWeight: 700,
                  color: archetype.accentHex,
                  fontFamily: titleFont,
                  lineHeight: 1.05,
                  letterSpacing: "-0.5px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={archetypeGlyphUri} alt="" width={72} height={72} style={{ flexShrink: 0 }} />
                {archetype.name}
              </div>

              {/* Reading snippet */}
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: "#2C1810",
                  fontFamily: titleFont,
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                {readingSnippet}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: 32,
              right: 64,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 20,
              color: "#5C3D2E",
              opacity: 0.55,
              fontFamily: titleFont,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ogArchetypeGlyphUri("amphora", "#5C3D2E")} alt="" width={20} height={20} style={{ flexShrink: 0 }} />
            oracle.claydate.nyc
          </div>

          {/* Ink border */}
          <div
            style={{
              position: "absolute",
              inset: 16,
              border: "3px solid rgba(44,24,16,0.12)",
              borderRadius: 20,
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontOptions,
      }
    );
  } catch (err) {
    // Never 500 the unfurl — the text-free card needs no font and always works.
    console.error("[OG] error:", err);
    return fallbackCard(W, H);
  }
}
