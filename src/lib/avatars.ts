// ── Avatar System ─────────────────────────────────────────────────────────
// This file is the canonical contract for all avatar data.
// Other phases import from here; do not rename exports.

// AvatarShape is widened to accept both preset IDs and thrown encodings
export type PresetShapeId =
  | "round-belly"
  | "tall-slim"
  | "amphora"
  | "squat-wide"
  | "gourd"
  | "flared-rim";

// Widen AvatarShape to accept thrown encodings (string & {}) while keeping
// preset IDs autocomplete-friendly. tsc-strict-safe.
export type AvatarShape = PresetShapeId | (string & Record<never, never>);

export type AvatarGlaze =
  | "terracotta"
  | "celadon"
  | "cobalt"
  | "ivory"
  | "sage-matte"
  | "blush-gloss"
  | "midnight"
  | "honey";

export type AvatarPatternStyle =
  | "plain"
  | "stripes"
  | "dots"
  | "squiggle"
  | "flowers"
  | "draw";

// AvatarPattern is widened: still accepts preset ids, but also richer strings like
// "dots:#ffffff:1.4" (style:hexcolor:scale) or "draw:..." decoration encodings.
export type AvatarPattern = AvatarPatternStyle | (string & Record<never, never>);

export interface Avatar {
  shape: AvatarShape;
  glaze: AvatarGlaze | string;
  pattern: AvatarPattern;
}

// ── Shapes (64×64 viewBox, hand-drawn feeling silhouettes) ────────────────

export interface AvatarShapeData {
  id: PresetShapeId;
  label: string;
  /** SVG path in 0 0 64 64 viewBox */
  path: string;
}

export const AVATAR_SHAPES: AvatarShapeData[] = [
  {
    id: "round-belly",
    label: "Round Belly",
    // Classic round-bellied pot: narrow neck, wide belly, small foot
    path: "M 26 8 C 24 8 22 10 21.5 12 C 21 14 21.5 17 22 19 C 16 21 11 27 10 34 C 9 41 11 50 16 54 C 19 56 23 57 32 57 C 41 57 45 56 48 54 C 53 50 55 41 54 34 C 53 27 48 21 42 19 C 42.5 17 43 14 42.5 12 C 42 10 40 8 38 8 Z",
  },
  {
    id: "tall-slim",
    label: "Tall & Slim",
    // Elegant tall vase with graceful taper
    path: "M 27 6 C 25 6 23 8 22 10 C 21 12 21 15 22 18 C 18 21 16 26 15 33 C 14 40 15 50 18 54 C 20 56 24 58 32 58 C 40 58 44 56 46 54 C 49 50 50 40 49 33 C 48 26 46 21 42 18 C 43 15 43 12 42 10 C 41 8 39 6 37 6 Z",
  },
  {
    id: "amphora",
    label: "Amphora",
    // Amphora with side handles
    path: "M 25 6 C 23 6 22 8 22 10 L 22 16 C 18 17 12 20 10 26 L 8 30 C 7 32 8 34 10 34 L 14 34 C 14 41 16 50 19 54 C 22 57 26 58 32 58 C 38 58 42 57 45 54 C 48 50 50 41 50 34 L 54 34 C 56 34 57 32 56 30 L 54 26 C 52 20 46 17 42 16 L 42 10 C 42 8 41 6 39 6 Z",
  },
  {
    id: "squat-wide",
    label: "Squat Wide",
    // Wide low bowl-vase, very round and friendly
    path: "M 23 14 C 21 14 19 16 18 18 C 17 20 17 22 18 24 C 12 27 8 33 8 40 C 8 47 12 53 18 56 C 22 58 27 59 32 59 C 37 59 42 58 46 56 C 52 53 56 47 56 40 C 56 33 52 27 46 24 C 47 22 47 20 46 18 C 45 16 43 14 41 14 Z",
  },
  {
    id: "gourd",
    label: "Gourd",
    // Double-bulge gourd shape
    path: "M 28 5 C 26 5 24 7 24 9 C 24 12 25 14 26 16 C 22 18 19 22 19 27 C 19 32 22 35 25 37 C 20 40 16 45 16 51 C 16 56 20 60 32 60 C 44 60 48 56 48 51 C 48 45 44 40 39 37 C 42 35 45 32 45 27 C 45 22 42 18 38 16 C 39 14 40 12 40 9 C 40 7 38 5 36 5 Z",
  },
  {
    id: "flared-rim",
    label: "Flared Rim",
    // Vase with dramatically flared opening
    path: "M 16 8 C 14 8 14 10 15 11 C 17 13 22 14 24 15 C 22 17 21 20 21 23 C 20 27 20 32 20 37 C 18 40 14 44 14 50 C 14 55 19 58 32 58 C 45 58 50 55 50 50 C 50 44 46 40 44 37 C 44 32 44 27 43 23 C 43 20 42 17 40 15 C 42 14 47 13 49 11 C 50 10 50 8 48 8 C 44 8 37 10 32 10 C 27 10 20 8 16 8 Z",
  },
];

// ── Glazes ────────────────────────────────────────────────────────────────

export interface AvatarGlazeData {
  id: AvatarGlaze;
  label: string;
  fill: string;
}

export const AVATAR_GLAZES: AvatarGlazeData[] = [
  { id: "terracotta", label: "Terracotta",  fill: "#C1622E" },
  { id: "celadon",    label: "Celadon",     fill: "#8FB89A" },
  { id: "cobalt",     label: "Cobalt Blue", fill: "#1F4E8C" },
  { id: "ivory",      label: "Ivory",       fill: "#EDE0C4" },
  { id: "sage-matte", label: "Sage Matte",  fill: "#6B7D5C" },
  { id: "blush-gloss",label: "Blush Gloss", fill: "#D98B84" },
  { id: "midnight",   label: "Midnight",    fill: "#1A2640" },
  { id: "honey",      label: "Honey",       fill: "#C98A1A" },
];

// ── Patterns ──────────────────────────────────────────────────────────────

export interface AvatarPatternData {
  id: AvatarPatternStyle;
  label: string;
}

export const AVATAR_PATTERNS: AvatarPatternData[] = [
  { id: "plain",    label: "Plain" },
  { id: "stripes",  label: "Stripes" },
  { id: "dots",     label: "Dots" },
  { id: "squiggle", label: "Squiggle" },
  { id: "flowers",  label: "Flowers" },
  { id: "draw",     label: "Draw" },
];

// ── ParsedPattern ─────────────────────────────────────────────────────────

export interface ParsedPattern {
  /** The base pattern style */
  style: AvatarPatternStyle;
  /** Optional custom hex color for the pattern marks */
  color?: string;
  /** Optional scale/density multiplier (default 1.0) */
  scale?: number;
  /** If style === "draw", the full raw pattern string (including "draw:...") */
  drawData?: string;
}

/**
 * Parse a pattern value that may be:
 *   - A plain preset id: "dots" → { style: "dots" }
 *   - A richer form: "dots:#ffffff:1.4" → { style: "dots", color: "#ffffff", scale: 1.4 }
 *   - A draw pattern: "draw:x1,y1,...|..." → { style: "draw", drawData: "draw:..." }
 *   - Unknown → falls back to { style: "plain" }
 * Backward compatible: plain ids still work fine.
 */
const PRESET_PATTERN_STYLES = new Set<string>(["plain", "stripes", "dots", "squiggle", "flowers"]);

export function parsePattern(raw: string): ParsedPattern {
  if (!raw) return { style: "plain" };

  // draw decoration pattern
  if (raw.startsWith("draw:")) {
    return { style: "draw", drawData: raw };
  }

  // Try split on ":" — style:color:scale
  const parts = raw.split(":");
  const styleRaw = parts[0].trim();

  // Validate style
  const style: AvatarPatternStyle = PRESET_PATTERN_STYLES.has(styleRaw)
    ? (styleRaw as AvatarPatternStyle)
    : "plain";

  if (parts.length === 1) {
    // Plain id, no extra fields
    return { style };
  }

  // parts[1] = hex color (optional)
  let color: string | undefined;
  if (parts[1] && /^#[0-9A-Fa-f]{3,6}$/.test(parts[1].trim())) {
    color = parts[1].trim();
    // Expand shorthand
    if (color.length === 4) {
      color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
  }

  // parts[2] = scale (optional)
  let scale: number | undefined;
  if (parts[2]) {
    const s = parseFloat(parts[2].trim());
    if (!isNaN(s) && s > 0) scale = Math.max(0.3, Math.min(4.0, s));
  }

  return { style, color, scale };
}

/**
 * Encode a parsed pattern back to its string form.
 * If only style (no color or scale), returns just the style id for max compat.
 */
export function encodePattern(p: ParsedPattern): string {
  if (p.style === "draw" && p.drawData) return p.drawData;
  if (!p.color && !p.scale) return p.style;
  const colorPart = p.color ?? "";
  const scalePart = p.scale !== undefined ? p.scale.toFixed(2) : "";
  return `${p.style}:${colorPart}:${scalePart}`;
}

// ── parseDecorationDrawing ────────────────────────────────────────────────
// Decoration strokes use the same polyline encoding as face strokes,
// but live in the pattern field prefixed with "draw:".
// Re-uses DrawStroke + parseFaceDrawing / encodeFaceDrawing under the hood.
// Alias helpers for semantic clarity at call sites.

// ── Faces ─────────────────────────────────────────────────────────────────

export type FaceId = "none" | "happy" | "sleepy" | "winky" | "surprised";

export interface AvatarFaceData {
  id: FaceId;
  label: string;
}

export const AVATAR_FACES: AvatarFaceData[] = [
  { id: "none",      label: "No face" },
  { id: "happy",     label: "Happy" },
  { id: "sleepy",    label: "Sleepy" },
  { id: "winky",     label: "Winky" },
  { id: "surprised", label: "Surprised" },
];

// ── Thrown vase parameters ────────────────────────────────────────────────

export interface ThrownParams {
  /** Height factor 0..1 (tall ↔ squat) */
  h: number;
  /** Belly width factor 0..1 */
  b: number;
  /** Neck width factor 0..1 */
  n: number;
  /** Lip flare factor 0..1 */
  l: number;
  /** Foot width factor 0..1 */
  f: number;
}

// ── Encoding & parsing ────────────────────────────────────────────────────

const VALID_FACE_IDS = new Set<FaceId>(["none", "happy", "sleepy", "winky", "surprised"]);
const PRESET_IDS = new Set<string>(AVATAR_SHAPES.map((s) => s.id));

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Encode thrown vase params into a storable shape string. */
export function encodeThrownShape(params: ThrownParams, face: FaceId): string {
  const h = clamp01(params.h).toFixed(3);
  const b = clamp01(params.b).toFixed(3);
  const n = clamp01(params.n).toFixed(3);
  const l = clamp01(params.l).toFixed(3);
  const f = clamp01(params.f).toFixed(3);
  const faceId: FaceId = VALID_FACE_IDS.has(face) ? face : "none";
  return `thrown:h=${h},b=${b},n=${n},l=${l},f=${f};face=${faceId}`;
}

// Edge "straightness" is a continuous dial: 0 = fully round (default),
// 1 = fully angular/straight. The keywords "round"/"straight" remain accepted
// on parse for backward compatibility and map to 0 / 1.
export type EdgeStyle = "round" | "straight";

/** Parse an edge field value ("round", "straight", or a 0..1 number) → 0..1. */
export function parseEdge(raw: string | undefined): number {
  if (raw === undefined || raw === "round") return 0;
  if (raw === "straight") return 1;
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : clamp01(num);
}

export type ParsedShape =
  | { kind: "preset"; id: PresetShapeId }
  | { kind: "thrown"; params: ThrownParams; face: FaceId }
  | { kind: "thrown2"; h: number; widths: number[]; face: FaceId; edges: number[]; wobble: number };

/** Parse an avatar_shape string to either a preset or thrown shape. */
export function parseShape(shape: string): ParsedShape {
  // Empty or missing → default preset
  if (!shape) {
    return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
  }

  // Preset ID
  if (PRESET_IDS.has(shape)) {
    return { kind: "preset", id: shape as PresetShapeId };
  }

  // Thrown encoding: thrown:h=0.82,b=0.71,n=0.38,l=0.25,f=0.45;face=happy
  if (shape.startsWith("thrown:")) {
    try {
      const rest = shape.slice("thrown:".length);
      const [paramsPart, facePart] = rest.split(";");

      if (!paramsPart || !facePart) {
        return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
      }

      // Parse params
      const paramMap: Record<string, number> = {};
      for (const kv of paramsPart.split(",")) {
        const [k, v] = kv.split("=");
        const num = parseFloat(v);
        if (!k || isNaN(num)) {
          return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
        }
        paramMap[k.trim()] = clamp01(num);
      }

      const h = paramMap["h"];
      const b = paramMap["b"];
      const n = paramMap["n"];
      const l = paramMap["l"];
      const f = paramMap["f"];

      if (
        h === undefined ||
        b === undefined ||
        n === undefined ||
        l === undefined ||
        f === undefined
      ) {
        return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
      }

      // Parse face
      const faceMatch = facePart.match(/^face=(.+)$/);
      const rawFace = faceMatch ? faceMatch[1].trim() : "none";
      const face: FaceId = VALID_FACE_IDS.has(rawFace as FaceId)
        ? (rawFace as FaceId)
        : "none";

      return {
        kind: "thrown",
        params: { h, b, n, l, f },
        face,
      };
    } catch {
      return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
    }
  }

  // thrown2 encoding:
  //   thrown2:h=0.85;w=0.45,0.72,0.91,0.66,0.38;edge=0,1,0.5,...;face=happy
  //   edge can be a single 0..1 number (old form, applied to all bands) or
  //   a comma-joined array of per-band values (new form).
  //   face can be a preset id ("happy") or a draw string ("draw:x1,y1,...|...")
  if (shape.startsWith("thrown2:")) {
    try {
      const rest = shape.slice("thrown2:".length);
      // Split on ";" — expect h=..., w=..., edge=...(optional), face=...
      const parts: Record<string, string> = {};
      for (const seg of rest.split(";")) {
        const eqIdx = seg.indexOf("=");
        if (eqIdx < 0) return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
        parts[seg.slice(0, eqIdx).trim()] = seg.slice(eqIdx + 1).trim();
      }

      if (!parts["h"] || !parts["w"] || !parts["face"]) {
        return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
      }

      const h = clamp01(parseFloat(parts["h"]));
      if (isNaN(h)) return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };

      const rawWidths = parts["w"].split(",").map((v) => {
        const n = parseFloat(v);
        return isNaN(n) ? null : clamp01(n);
      });
      // Accept 2..7 width entries (expanded from 6)
      if (rawWidths.some((v) => v === null) || rawWidths.length < 2 || rawWidths.length > 7) {
        return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
      }
      const parsedWidths = rawWidths as number[];

      // Resample to the correct band count for this height
      const expectedBands = bandsForHeight(h);
      const widths =
        parsedWidths.length === expectedBands
          ? parsedWidths
          : resampleWidths(parsedWidths, expectedBands);

      // Parse face — preset id or "draw:..." encoding
      const rawFace = parts["face"];
      let face: FaceId | string;
      if (rawFace.startsWith("draw:")) {
        // Custom drawn face — keep as-is, validate it's well-formed below
        face = rawFace;
      } else {
        face = VALID_FACE_IDS.has(rawFace as FaceId) ? (rawFace as FaceId) : "none";
      }

      // Parse edge — single number (old form → apply to all bands) OR
      // comma-joined array (new per-band form). Missing → all 0 (round).
      let edges: number[];
      const rawEdge = parts["edge"];
      if (!rawEdge || rawEdge === "round") {
        edges = Array(widths.length).fill(0);
      } else if (rawEdge === "straight") {
        edges = Array(widths.length).fill(1);
      } else if (rawEdge.includes(",")) {
        // New per-band array form
        const parsed = rawEdge.split(",").map((v) => {
          const n = parseFloat(v);
          return isNaN(n) ? 0 : clamp01(n);
        });
        // Resample if needed to match band count
        edges =
          parsed.length === widths.length
            ? parsed
            : resampleWidths(parsed, widths.length);
      } else {
        // Old single-number form — apply to all bands
        const single = parseEdge(rawEdge);
        edges = Array(widths.length).fill(single);
      }

      // Parse wobble (optional asymmetry factor 0..1, default 0)
      const rawWobble = parts["wobble"];
      const wobble = rawWobble
        ? clamp01(parseFloat(rawWobble) || 0)
        : 0;

      return { kind: "thrown2", h, widths, face: face as FaceId, edges, wobble };
    } catch {
      return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
    }
  }

  // Unrecognized → default preset
  return { kind: "preset", id: DEFAULT_AVATAR.shape as PresetShapeId };
}

/** Re-encode a parsed thrown shape canonically (clamped). Used in auth.ts. */
export function canonicalizeShape(shape: string): string {
  const parsed = parseShape(shape);
  if (parsed.kind === "preset") {
    return parsed.id;
  }
  if (parsed.kind === "thrown2") {
    return encodeThrown2Shape(parsed.h, parsed.widths, parsed.face, parsed.edges, parsed.wobble);
  }
  return encodeThrownShape(parsed.params, parsed.face);
}

// ── thrown2 encoding ──────────────────────────────────────────────────────

/**
 * How many width-adjustable bands a given height produces.
 * h=0 → 2 bands (squat), h=1 → 7 bands (tall, maximum detail).
 * Formula: 2 + round(h * 5), giving [2, 3, 4, 5, 6, 7] across the range.
 */
export function bandsForHeight(h: number): number {
  return 2 + Math.round(clamp01(h) * 5);
}

/**
 * Encode a thrown2 vase to a storable string.
 * edges is a per-band array of 0..1 values (0 = round, 1 = straight).
 * Accepts either a number[] (new form) or a single number (old compat — applied to all bands).
 * wobble is an optional 0..1 asymmetry factor (default 0 = perfectly centered).
 *   When > 0, buildThrown2Path applies a subtle per-band horizontal skew.
 *   Missing or 0 → omitted from the string for backward compatibility.
 *
 * New format:
 *   thrown2:h=0.600;w=0.400,0.720,0.500;edge=0.00,0.00,0.00;face=happy
 *   thrown2:h=0.600;w=0.400,0.720,0.500;edge=0.00,0.00,0.00;face=happy;wobble=0.30
 *
 * face may be a preset id like "happy" or a draw string like "draw:x1,y1,...|..."
 */
export function encodeThrown2Shape(
  h: number,
  widths: number[],
  face: FaceId | string,
  edges: number[] | number = 0,
  wobble = 0
): string {
  const hStr = clamp01(h).toFixed(3);
  const wStr = widths.map((w) => clamp01(w).toFixed(3)).join(",");
  const faceStr = typeof face === "string" ? face : (VALID_FACE_IDS.has(face) ? face : "none");

  // Normalize edges to array
  let edgeArr: number[];
  if (typeof edges === "number") {
    edgeArr = Array(widths.length).fill(clamp01(edges));
  } else {
    edgeArr = edges.map(clamp01);
    // Ensure same length as widths
    if (edgeArr.length !== widths.length) {
      edgeArr = resampleWidths(edgeArr, widths.length);
    }
  }
  const edgeStr = edgeArr.map((e) => e.toFixed(2)).join(",");

  const base = `thrown2:h=${hStr};w=${wStr};edge=${edgeStr};face=${faceStr}`;
  // Only encode wobble when non-zero (backward-compatible: old parsers ignore unknown segments)
  const wobbleClamped = clamp01(wobble);
  if (wobbleClamped > 0.001) {
    return `${base};wobble=${wobbleClamped.toFixed(3)}`;
  }
  return base;
}

/**
 * Linearly interpolate a width list to a new length.
 * Preserves endpoints; samples evenly between them.
 */
export function resampleWidths(widths: number[], targetLen: number): number[] {
  if (widths.length === targetLen) return widths.slice();
  if (widths.length === 1) return Array(targetLen).fill(widths[0]);
  if (targetLen === 1) return [widths[Math.floor(widths.length / 2)]];
  const result: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    const t = i / (targetLen - 1);
    const srcIdx = t * (widths.length - 1);
    const lo = Math.floor(srcIdx);
    const hi = Math.min(Math.ceil(srcIdx), widths.length - 1);
    const frac = srcIdx - lo;
    result.push(widths[lo] + (widths[hi] - widths[lo]) * frac);
  }
  return result;
}

/** Default thrown2 widths for a pleasant S-curve at h=0.6 (4 bands with new formula) */
// h=0.6 → bandsForHeight(0.6) = 2 + round(0.6*5) = 2+3 = 5 bands
export const DEFAULT_THROWN2_WIDTHS = [0.35, 0.55, 0.72, 0.58, 0.42];
export const DEFAULT_THROWN2_H = 0.6;

// ── buildThrownPath ───────────────────────────────────────────────────────
// Generates a smooth symmetric SVG path from the 5 params.
// 64×64 viewBox; center = x=32.
// Profile: foot → belly → neck → lip, mirrored, closed.

export function buildThrownPath(params: ThrownParams): string {
  const { h, b, n, l, f } = {
    h: clamp01(params.h),
    b: clamp01(params.b),
    n: clamp01(params.n),
    l: clamp01(params.l),
    f: clamp01(params.f),
  };

  // Map params to pixel dimensions in 64×64 viewBox
  // Vertical: top of vase ↔ bottom
  const topY    = 4 + (1 - h) * 14;      // taller h → lower topY (more height)
  const bottomY = 60;                      // foot always near bottom

  // Horizontal half-widths (symmetric around x=32)
  const footHW  = 4  + f * 10;            // 4..14
  const bellyHW = 10 + b * 18;            // 10..28
  const neckHW  = 3  + n * 9;             // 3..12
  const lipHW   = neckHW + l * 8;         // neckHW..neckHW+8

  // Key Y positions
  const lipY    = topY;
  const neckY   = topY + (bottomY - topY) * 0.18;
  const bellyY  = topY + (bottomY - topY) * 0.55;
  const footY   = bottomY;

  // Right profile points
  const rLip    = 32 + lipHW;
  const rNeck   = 32 + neckHW;
  const rBelly  = 32 + bellyHW;
  const rFoot   = 32 + footHW;

  // Left profile points
  const lLip    = 32 - lipHW;
  const lNeck   = 32 - neckHW;
  const lBelly  = 32 - bellyHW;
  const lFoot   = 32 - footHW;

  // Bezier control points for right side (bottom to top)
  // Foot → belly: curve out
  const r_fToB_cp1x = rFoot;
  const r_fToB_cp1y = footY - (footY - bellyY) * 0.3;
  const r_fToB_cp2x = rBelly;
  const r_fToB_cp2y = bellyY + (footY - bellyY) * 0.3;

  // Belly → neck: curve in
  const r_bToN_cp1x = rBelly;
  const r_bToN_cp1y = bellyY - (bellyY - neckY) * 0.35;
  const r_bToN_cp2x = rNeck;
  const r_bToN_cp2y = neckY + (bellyY - neckY) * 0.35;

  // Neck → lip: gentle flare or taper
  const r_nToL_cp1x = rNeck;
  const r_nToL_cp1y = neckY - (neckY - lipY) * 0.4;
  const r_nToL_cp2x = rLip;
  const r_nToL_cp2y = lipY + (neckY - lipY) * 0.4;

  // Bezier control points for left side (top to bottom, mirrored)
  const l_nToL_cp1x = lLip;
  const l_nToL_cp1y = lipY + (neckY - lipY) * 0.4;
  const l_nToL_cp2x = lNeck;
  const l_nToL_cp2y = neckY - (neckY - lipY) * 0.4;

  const l_bToN_cp1x = lNeck;
  const l_bToN_cp1y = neckY + (bellyY - neckY) * 0.35;
  const l_bToN_cp2x = lBelly;
  const l_bToN_cp2y = bellyY - (bellyY - neckY) * 0.35;

  const l_fToB_cp1x = lBelly;
  const l_fToB_cp1y = bellyY + (footY - bellyY) * 0.3;
  const l_fToB_cp2x = lFoot;
  const l_fToB_cp2y = footY - (footY - bellyY) * 0.3;

  const p = (n: number) => n.toFixed(2);

  // Start at right foot, go up right side, across lip, down left side, close at foot
  return [
    `M ${p(rFoot)} ${p(footY)}`,
    // Right side: foot → belly
    `C ${p(r_fToB_cp1x)} ${p(r_fToB_cp1y)}, ${p(r_fToB_cp2x)} ${p(r_fToB_cp2y)}, ${p(rBelly)} ${p(bellyY)}`,
    // Right side: belly → neck
    `C ${p(r_bToN_cp1x)} ${p(r_bToN_cp1y)}, ${p(r_bToN_cp2x)} ${p(r_bToN_cp2y)}, ${p(rNeck)} ${p(neckY)}`,
    // Right side: neck → lip
    `C ${p(r_nToL_cp1x)} ${p(r_nToL_cp1y)}, ${p(r_nToL_cp2x)} ${p(r_nToL_cp2y)}, ${p(rLip)} ${p(lipY)}`,
    // Lip across top (slight arc)
    `Q 32 ${p(lipY - 2)}, ${p(lLip)} ${p(lipY)}`,
    // Left side: lip → neck
    `C ${p(l_nToL_cp1x)} ${p(l_nToL_cp1y)}, ${p(l_nToL_cp2x)} ${p(l_nToL_cp2y)}, ${p(lNeck)} ${p(neckY)}`,
    // Left side: neck → belly
    `C ${p(l_bToN_cp1x)} ${p(l_bToN_cp1y)}, ${p(l_bToN_cp2x)} ${p(l_bToN_cp2y)}, ${p(lBelly)} ${p(bellyY)}`,
    // Left side: belly → foot
    `C ${p(l_fToB_cp1x)} ${p(l_fToB_cp1y)}, ${p(l_fToB_cp2x)} ${p(l_fToB_cp2y)}, ${p(lFoot)} ${p(footY)}`,
    // Close along foot
    `Q 32 ${p(footY + 1.5)}, ${p(rFoot)} ${p(footY)}`,
    "Z",
  ].join(" ");
}

// ── buildThrown2Path ──────────────────────────────────────────────────────
// Generates a smooth symmetric SVG path from h + width stops.
// 64×64 viewBox; center = x=32.
// widths[0] = foot width (bottom), widths[N-1] = lip width (top).
// Visual height: foot sits at y≈57, lip y lerps from ~36 (h=0, squat) to ~4 (h=1, tall).
// Uses per-band vertical-tangent cubic bézier;
//   edges[i] = 0 → round bulge, 1 → straight facet for band i.

/** Compute the actual lip Y for a given h (used by VaseAvatar for face placement). */
export function thrown2LipY(h: number): number {
  // h=0 → 36 (squat), h=1 → 4 (tall) — widen range for tall pots
  return 36 - clamp01(h) * 32;
}

/** Compute the foot Y (constant — leaves ~7px bottom margin in the 64 viewBox). */
export const THROWN2_FOOT_Y = 57;

/**
 * Build the SVG path for a thrown2 vase.
 * edges: per-band array (0..1 per band, length = widths.length).
 *   0 = round/smooth bulge, 1 = straight/faceted.
 * wobble: 0..1 asymmetry factor — shifts each band's center-x slightly
 *   off-axis in a slow sine wave, giving a charming lopsided look.
 *   At wobble=1, max horizontal shift is ±5px at the widest band.
 *   Path always stays within the [2,62] viewBox x-range.
 * Falls back gracefully if edges is missing, shorter, or a plain number.
 */
export function buildThrown2Path(
  h: number,
  widths: number[],
  edges: number[] | number = 0,
  wobble = 0
): string {
  const safeH = clamp01(h);
  const p = (n: number) => n.toFixed(2);

  // Normalize edges to per-band array
  const N = widths.length;
  let edgeArr: number[];
  if (typeof edges === "number") {
    edgeArr = Array(N).fill(clamp01(edges));
  } else if (edges.length === N) {
    edgeArr = edges.map(clamp01);
  } else {
    edgeArr = resampleWidths(edges.map(clamp01), N);
  }

  // Vertical extents — lip y scales visibly with h
  const lipY    = thrown2LipY(safeH);   // h=0 → 36, h=1 → 4
  const bottomY = THROWN2_FOOT_Y;       // foot always near bottom (y≈57)

  // Compute Y positions for each band (evenly distributed foot→lip)
  // Band 0 = foot (bottomY), Band N-1 = lip (lipY)
  const bandY: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    bandY.push(bottomY - t * (bottomY - lipY)); // bottom to top
  }

  // Compute right-side X positions (half-widths clamped)
  // MAX_HW=24.5 ensures a full-width (w=1) pot at x=32+24.5=56.5 stays within [3.5,60.5]
  const MIN_HW = 3.2;
  const MAX_HW = 24.5;
  const safeWobble = clamp01(wobble);

  // Per-band wobble offset: a slow sine wave that oscillates the centerline.
  // At wobble=1 max shift is ±5px; stays well within [2,62] since MIN_HW≥3.2.
  function wobbleOffset(bandIndex: number): number {
    if (safeWobble < 0.001) return 0;
    // Phase: one full cycle over the bands, seeded by a fixed asymmetric wave
    const phase = (bandIndex / Math.max(1, N - 1)) * Math.PI * 1.5;
    return Math.sin(phase + 0.8) * safeWobble * 5;
  }

  const rightX: number[] = widths.map((w, i) => {
    const hw = MIN_HW + clamp01(w) * (MAX_HW - MIN_HW);
    const cx = 32 + wobbleOffset(i);
    return cx + hw;
  });

  // Compute matching left-side Xs considering per-band center offset
  const leftX: number[] = widths.map((w, i) => {
    const hw = MIN_HW + clamp01(w) * (MAX_HW - MIN_HW);
    const cx = 32 + wobbleOffset(i);
    return cx - hw;
  });

  // Small lip flare: the topmost point gets a slight extra flair
  const lipFlare = 1.5;
  const lipRightX = rightX[N - 1] + lipFlare;
  const lipCx = 32 + wobbleOffset(N - 1);
  const lipLeftX  = lipCx - (lipRightX - lipCx);

  // Build the right-side profile points
  interface Pt { x: number; y: number }
  const rightPts: Pt[] = rightX.map((rx, i) => ({
    x: i === N - 1 ? lipRightX : rx,
    y: bandY[i],
  }));

  // Build left-side profile: uses wobble-shifted left Xs, from lip → foot
  const leftPts: Pt[] = leftX.map((lx, i) => ({
    x: i === N - 1 ? lipLeftX : lx,
    y: bandY[i],
  })).reverse();

  const footY = bandY[0];
  const rFoot = rightPts[0].x;
  const lFoot = leftPts[leftPts.length - 1].x; // after reverse, foot is last

  // ── Per-band vertical-tangent spline ─────────────────────────────────────
  // Each segment i→i+1 uses edgeArr[i] to scale the handle length.
  // k(edge=0) ≈ 0.55 → round/smooth bulge
  // k(edge=1) ≈ 0.02 → handles collapse → straight facets
  function segmentK(edge: number): number {
    return 0.55 - clamp01(edge) * 0.53;
  }

  /** Cubic segments through a point chain, per-segment k. */
  function smoothSegments(pts: Pt[], bandEdges: number[]): string[] {
    const segs: string[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      // Use the edge of the band at index i for right side (foot→lip ordering)
      const k = segmentK(bandEdges[i] ?? 0);
      const handle = Math.abs(p2.y - p1.y) * k;
      const dir = p2.y < p1.y ? -1 : 1; // travel direction in y
      const cp1 = { x: p1.x, y: p1.y + dir * handle };
      const cp2 = { x: p2.x, y: p2.y - dir * handle };
      segs.push(
        `C ${p(cp1.x)} ${p(cp1.y)}, ${p(cp2.x)} ${p(cp2.y)}, ${p(p2.x)} ${p(p2.y)}`
      );
    }
    return segs;
  }

  // Right side: foot→lip uses edgeArr[0..N-2]
  const rightEdges = edgeArr.slice(0, N - 1);
  // Left side: lip→foot (reversed), uses edgeArr[N-2..0]
  const leftEdges = edgeArr.slice(0, N - 1).reverse();

  const rightSegments = smoothSegments(rightPts, rightEdges); // foot → lip
  const leftSegments  = smoothSegments(leftPts,  leftEdges);  // lip → foot

  // Lip/foot end-cap bulge also flattens as the top band straightens
  const topEdge = edgeArr[N - 1] ?? 0;
  const botEdge = edgeArr[0] ?? 0;
  const topRound = 1 - clamp01(topEdge);
  const botRound = 1 - clamp01(botEdge);

  // Lip/foot arc control points — shifted by wobble for the lopsided look
  const footCx = 32 + wobbleOffset(0);
  const lipArcCx = lipCx;

  return [
    // Start at right foot
    `M ${p(rFoot)} ${p(footY)}`,
    // Right side: foot → lip
    ...rightSegments,
    // Lip top arc (flat when straight, gently domed when round)
    `Q ${p(lipArcCx)} ${p(lipY - 2 * topRound)}, ${p(lipLeftX)} ${p(lipY)}`,
    // Left side: lip → foot
    ...leftSegments,
    // Close along foot
    `Q ${p(footCx)} ${p(footY + 1.5 * botRound)}, ${p(rFoot)} ${p(footY)}`,
    "Z",
  ].join(" ");
}

// ── resolveGlaze ──────────────────────────────────────────────────────────

/**
 * Resolve a glaze string to a hex color.
 * - Preset id (e.g. "terracotta") → looks up fill from AVATAR_GLAZES
 * - Raw hex (e.g. "#C47A3A") → returns as-is
 * - Unknown → returns default terracotta
 */
export function resolveGlaze(glaze: string): string {
  if (!glaze) return AVATAR_GLAZES[0].fill;
  // Raw hex
  if (/^#[0-9A-Fa-f]{6}$/.test(glaze)) return glaze;
  if (/^#[0-9A-Fa-f]{3}$/.test(glaze)) {
    // Expand shorthand hex
    const r = glaze[1] + glaze[1];
    const g = glaze[2] + glaze[2];
    const b = glaze[3] + glaze[3];
    return `#${r}${g}${b}`;
  }
  // Preset id lookup
  const found = AVATAR_GLAZES.find((g) => g.id === glaze);
  return found ? found.fill : AVATAR_GLAZES[0].fill;
}

// ── parseFaceDrawing ──────────────────────────────────────────────────────

export interface DrawStroke {
  /** Points as flat [x, y, x, y, ...] integers in face-zone space (0..100) */
  points: number[];
  /**
   * Stroke color as a hex string (e.g. "#2C1810").
   * Defaults to ink "#2C1810" when absent (backward compat with old draw strings).
   */
  color?: string;
  /**
   * Stroke width in canvas pixels at the reference canvas size.
   * Defaults to 1 (thin) when absent. Stored as an integer 1..9.
   */
  width?: number;
}

/**
 * Parse a "draw:..." face string into an array of strokes.
 *
 * NEW format (v2): each pipe-delimited segment carries optional color+width prefix:
 *   c#rrggbb;w3;x1,y1,x2,y2,...
 * where `c` = color prefix, `w` = width prefix, then comma-joined points.
 *
 * OLD format (v1, backward-compatible): each segment is just comma-joined integers.
 *   x1,y1,x2,y2,...
 * Old segments default to color="#2C1810" and width=1.
 */
export function parseFaceDrawing(face: string): DrawStroke[] {
  if (!face.startsWith("draw:")) return [];
  const data = face.slice("draw:".length);
  if (!data) return [];

  return data.split("|").map((seg) => {
    // Detect new v2 format: starts with 'c' or 'w' metadata prefix
    if (seg.startsWith("c") || seg.startsWith("w")) {
      // Format: cHEX;wN;x1,y1,...  (each field is optional but order: c then w then pts)
      let color: string | undefined;
      let width: number | undefined;
      let ptStr = seg;

      // Extract color
      const cMatch = ptStr.match(/^c(#[0-9A-Fa-f]{6});/);
      if (cMatch) {
        color = cMatch[1];
        ptStr = ptStr.slice(cMatch[0].length);
      }

      // Extract width
      const wMatch = ptStr.match(/^w([1-9]);/);
      if (wMatch) {
        width = parseInt(wMatch[1], 10);
        ptStr = ptStr.slice(wMatch[0].length);
      }

      const pts = ptStr.split(",").map(Number).filter((v) => !isNaN(v));
      return { points: pts, color, width } satisfies DrawStroke;
    }

    // Old v1 format — plain point list, defaults applied
    const pts = seg.split(",").map(Number).filter((v) => !isNaN(v));
    return { points: pts } satisfies DrawStroke;
  }).filter((s) => s.points.length >= 4);
}

/**
 * Encode an array of strokes to a "draw:..." face string.
 *
 * Strokes with non-default color or width use the v2 format prefix.
 * Strokes with default ink + thin use the v1 format for compactness.
 * Points are rounded to integers; each stroke is capped at 64 points (32 xy pairs).
 * Total strokes capped at 20.
 */
export function encodeFaceDrawing(strokes: DrawStroke[]): string {
  const DEFAULT_COLOR = "#2C1810";
  const DEFAULT_WIDTH = 1;

  const parts = strokes.slice(0, 20).map((s) => {
    const pts = s.points.slice(0, 64).map(Math.round).join(",");
    const color = s.color ?? DEFAULT_COLOR;
    const width = Math.max(1, Math.min(9, Math.round(s.width ?? DEFAULT_WIDTH)));

    const hasCustomColor = color !== DEFAULT_COLOR;
    const hasCustomWidth = width !== DEFAULT_WIDTH;

    if (!hasCustomColor && !hasCustomWidth) {
      // v1 compact format — backward compatible
      return pts;
    }

    // v2 format with prefix(es)
    let prefix = "";
    if (hasCustomColor) prefix += `c${color};`;
    if (hasCustomWidth) prefix += `w${width};`;
    return `${prefix}${pts}`;
  });
  return `draw:${parts.join("|")}`;
}

/**
 * Parse decoration draw strokes from a pattern string that starts with "draw:".
 * Shares the same encoding as face draw strings.
 */
export function parseDecorationDrawing(pattern: string): DrawStroke[] {
  return parseFaceDrawing(pattern);
}

/**
 * Encode decoration draw strokes into the "draw:..." pattern string.
 * Shares the same encoding as face draw strings.
 */
export function encodeDecorationDrawing(strokes: DrawStroke[]): string {
  return encodeFaceDrawing(strokes);
}

// ── Default ───────────────────────────────────────────────────────────────

export const DEFAULT_AVATAR: Avatar = {
  shape: "round-belly",
  glaze: "terracotta",
  pattern: "plain",
};

// Default thrown params (a pleasant medium vase)
export const DEFAULT_THROWN_PARAMS: ThrownParams = {
  h: 0.6,
  b: 0.55,
  n: 0.35,
  l: 0.3,
  f: 0.35,
};

// ── Lookup helpers ────────────────────────────────────────────────────────

export function getShape(id: string): AvatarShapeData {
  return AVATAR_SHAPES.find((s) => s.id === id) ?? AVATAR_SHAPES[0];
}

export function getGlaze(id: string): AvatarGlazeData {
  return AVATAR_GLAZES.find((g) => g.id === id) ?? AVATAR_GLAZES[0];
}

export function getPattern(id: string): AvatarPatternData {
  return AVATAR_PATTERNS.find((p) => p.id === id) ?? AVATAR_PATTERNS[0];
}
