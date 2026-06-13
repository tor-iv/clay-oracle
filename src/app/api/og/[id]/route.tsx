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

// Fetch Caveat font once per cold-start; fall back to no custom font on error.
let _caveatFont: ArrayBuffer | null | undefined = undefined; // undefined = not tried

async function loadCaveat(): Promise<ArrayBuffer | null> {
  if (_caveatFont !== undefined) return _caveatFont;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      "https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjcB9eIWpZQ.woff2",
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await db
      .select()
      .from(schema.pots)
      .where(eq(schema.pots.id, id))
      .limit(1);
    const pot = rows[0];

    if (!pot) {
      // Minimal fallback for unknown ids
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
              fontFamily: "sans-serif",
              fontSize: 48,
              color: "#2C1810",
            }}
          >
            Clay Oracle 🔮
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    const archetype = ARCHETYPES.find((a) => a.id === pot.archetype_id) ?? ARCHETYPES[0];
    const caveat = await loadCaveat();
    const fontOptions = caveat
      ? [{ name: "Caveat", data: caveat, weight: 700 as const, style: "normal" as const }]
      : [];
    const titleFont = caveat ? "Caveat" : "sans-serif";

    const vaseSvgUri = buildVaseSvg(pot.shape, pot.glaze);

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
                  fontSize: 72,
                  fontWeight: 700,
                  color: archetype.accentHex,
                  fontFamily: titleFont,
                  lineHeight: 1.05,
                  letterSpacing: "-0.5px",
                }}
              >
                {archetype.emoji} {archetype.name}
              </div>

              {/* Reading snippet */}
              <div
                style={{
                  fontSize: 26,
                  color: "#2C1810",
                  fontFamily: "sans-serif",
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                {pot.reading.slice(0, 120)}{pot.reading.length > 120 ? "…" : ""}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: 32,
              right: 64,
              fontSize: 20,
              color: "#5C3D2E",
              opacity: 0.55,
              fontFamily: "sans-serif",
            }}
          >
            clayoracle.app 🏺
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
    // Never 500 the unfurl — minimal fallback always works.
    console.error("[OG] error:", err);
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
            fontFamily: "sans-serif",
            fontSize: 52,
            color: "#B85C2A",
          }}
        >
          🏺 Clay Oracle
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
