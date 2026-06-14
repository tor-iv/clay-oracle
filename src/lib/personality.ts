// ── Personality Engine ────────────────────────────────────────────────────
// Reads signals off a thrown2 vase shape string (plus glaze + pattern) and
// maps them to one of ~10 pottery-personality archetypes.
//
// Deliberately does NOT import from avatars.ts — that file is being changed
// by a parallel agent and we must stay decoupled.  We parse the thrown2
// encoding ourselves with simple defensive regex/split logic.

// ── Glaze hex map (matches AVATAR_GLAZES in avatars.ts) ──────────────────

const GLAZE_HEX: Record<string, string> = {
  terracotta:    "#C1622E",
  celadon:       "#8FB89A",
  cobalt:        "#1F4E8C",
  ivory:         "#EDE0C4",
  "sage-matte":  "#6B7D5C",
  "blush-gloss": "#D98B84",
  midnight:      "#1A2640",
  honey:         "#C98A1A",
};

// ── Colour math ───────────────────────────────────────────────────────────

/** Parse a 3-or-6-digit hex colour (with or without #) to { r, g, b } 0-255. */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace(/^#/, "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return isNaN(r + g + b) ? null : { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return isNaN(r + g + b) ? null : { r, g, b };
  }
  return null;
}

/** Convert RGB (0-255) to HSL: hue 0-360, sat/light 0-1. */
function rgbToHsl(r: number, g: number, b: number): { hue: number; sat: number; light: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn: h = ((gn - bn) / d + 6) % 6; break;
      case gn: h = (bn - rn) / d + 2; break;
      default:  h = (rn - gn) / d + 4; break;
    }
    h = h * 60;
  }
  return { hue: h, sat: s, light: l };
}

// ── Signal extraction ─────────────────────────────────────────────────────

/** Tolerant: handle edge being a single number OR a comma-separated list. */
function parseEdgeTolerant(raw: string): { edgeMix: number; edgeVariance: number } {
  if (!raw || raw === "round") return { edgeMix: 0, edgeVariance: 0 };
  if (raw === "straight") return { edgeMix: 1, edgeVariance: 0 };
  const parts = raw.split(",").map((s) => s.trim());
  const nums = parts
    .map((p) => parseFloat(p))
    .filter((n) => !isNaN(n))
    .map((n) => Math.max(0, Math.min(1, n)));
  if (nums.length === 0) return { edgeMix: 0, edgeVariance: 0 };
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance =
    nums.length < 2
      ? 0
      : Math.sqrt(nums.reduce((sum, v) => sum + (v - avg) ** 2, 0) / nums.length);
  return { edgeMix: avg, edgeVariance: variance };
}

/** Standard deviation of an array (returns 0 for length < 2). */
function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length);
}

export interface VaseSignals {
  /** How tall the vase is: 0 (squat) to 1 (tall). */
  height: number;
  /** Number of width bands in the thrown2 encoding (typically 2-4). */
  bandCount: number;
  /** Normalised width variation (stdev of band widths, 0-1). */
  widthVariance: number;
  /**
   * Where the widest band sits: 0 = foot (bottom), 1 = lip (top).
   * Low → ground-hugging; high → top-heavy / reaching.
   */
  bellyBias: number;
  /** Average edge "straightness": 0 = fully round, 1 = fully angular. */
  edgeMix: number;
  /**
   * How much edge straightness varies across bands.
   * High → mixed personality (some round, some angular sections).
   */
  edgeVariance: number;
  /** Glaze hue in degrees (0-360). */
  hue: number;
  /** Glaze saturation (0-1). */
  sat: number;
  /** Glaze lightness (0-1). */
  light: number;
  /** Raw glaze value as passed in (preset id or hex string). */
  glazeRaw: string;
  /** Pattern string as-is ("plain" | "stripes" | "dots" | "squiggle" | "flowers"). */
  pattern: string;
  /**
   * Parsed face kind.
   * Preset names → their id; "draw:..." strings → "drawn"; missing/unknown → "none".
   */
  faceKind: "none" | "happy" | "sleepy" | "winky" | "surprised" | "drawn";
  /** Raw normalised band widths (0-1) from the thrown2 encoding, in order foot→lip. Empty if not a thrown2 pot. */
  widths: number[];
}

const KNOWN_FACES = new Set(["none", "happy", "sleepy", "winky", "surprised"]);

/**
 * Defensively extract personality signals from a vase encoding.
 *
 * Works with the thrown2 format: `thrown2:h=0.6;w=0.4,0.72,0.5;edge=0,0.5,1;face=happy`
 * - `edge` may be a single number or a comma-separated list (future per-band values).
 * - `face` may be a preset id or a `draw:…` freehand string.
 *
 * throwScore: optional 0..1 throw quality from hard mode (ignored / defaulted to neutral here;
 *   it is passed directly to vaseToArchetype / readVase).
 *
 * Gracefully falls back to neutral defaults for any missing/malformed field.
 */
export function extractSignals(shape: string, glaze: string, pattern: string): VaseSignals {
  // ── Parse shape ───────────────────────────────────────────────────────────
  let height       = 0.5;
  let bandCount    = 3;
  let widthVariance = 0;
  let bellyBias    = 0.5;
  let edgeMix      = 0;
  let edgeVariance = 0;
  let faceKind: VaseSignals["faceKind"] = "none";
  let widths: number[] = [];

  if (shape.startsWith("thrown2:")) {
    const rest = shape.slice("thrown2:".length);
    // Split semicolon-separated segments into a key→value map.
    const seg: Record<string, string> = {};
    for (const part of rest.split(";")) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      seg[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }

    // h
    const hRaw = parseFloat(seg["h"] ?? "");
    if (!isNaN(hRaw)) height = Math.max(0, Math.min(1, hRaw));

    // w (widths)
    const wRaw = seg["w"] ?? "";
    if (wRaw) {
      const ws = wRaw.split(",")
        .map((v) => parseFloat(v.trim()))
        .filter((n) => !isNaN(n))
        .map((n) => Math.max(0, Math.min(1, n)));
      if (ws.length >= 2) {
        widths = ws;
        bandCount = ws.length;
        // Normalised stdev: raw stdev lives in [0, ~0.5]; cap at 0.5 and scale to 1.
        widthVariance = Math.min(stdev(ws) / 0.5, 1);
        // bellyBias: index of widest band, normalised to [0,1].
        const maxIdx = ws.reduce((iMax, v, i, arr) => (v > arr[iMax] ? i : iMax), 0);
        bellyBias = ws.length > 1 ? maxIdx / (ws.length - 1) : 0.5;
      }
    }

    // edge — may be per-band list or single value
    const edgeRaw = seg["edge"] ?? "";
    const edgeResult = parseEdgeTolerant(edgeRaw);
    edgeMix = edgeResult.edgeMix;
    edgeVariance = edgeResult.edgeVariance;

    // face
    const faceRaw = seg["face"] ?? "none";
    if (faceRaw.startsWith("draw:")) {
      faceKind = "drawn";
    } else if (KNOWN_FACES.has(faceRaw)) {
      faceKind = faceRaw as VaseSignals["faceKind"];
    }
  }

  // ── Parse glaze → HSL ─────────────────────────────────────────────────────
  let hue = 30, sat = 0.5, light = 0.5;
  const hexStr = GLAZE_HEX[glaze] ?? (glaze.startsWith("#") ? glaze : null);
  if (hexStr) {
    const rgb = parseHex(hexStr);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      hue = hsl.hue;
      sat = hsl.sat;
      light = hsl.light;
    }
  }

  // ── Normalise pattern → just the style prefix ─────────────────────────────
  // Rich patterns may be "dots:#ffffff:1.4" or "draw:..." encodings.
  // scoreArchetype does exact comparisons (pattern === "dots"), so extract style only.
  let patternStyle = pattern;
  if (pattern.startsWith("draw:")) {
    patternStyle = "draw"; // treat decoration as a distinct style
  } else if (pattern.includes(":")) {
    // style:color:scale → take style prefix
    patternStyle = pattern.split(":")[0].trim() || pattern;
  }
  // Further normalise: if unrecognised, fall back to "plain"
  const KNOWN_PATTERNS = new Set(["plain", "stripes", "dots", "squiggle", "flowers", "draw"]);
  if (!KNOWN_PATTERNS.has(patternStyle)) patternStyle = "plain";

  return {
    height,
    bandCount,
    widthVariance,
    bellyBias,
    edgeMix,
    edgeVariance,
    hue,
    sat,
    light,
    glazeRaw: glaze,
    pattern: patternStyle,
    faceKind,
    widths,
  };
}

// ── Vase description for LLM ─────────────────────────────────────────────

/**
 * Turns the signals from a thrown vase into one compact, factual paragraph of
 * raw material for the LLM.  NOT the final reading — neutral description only.
 * Deterministic: no Math.random, no side effects.
 */
export function describeVaseForReading(signals: VaseSignals): string {
  const parts: string[] = [];

  // 1. Proportion
  if (signals.height >= 0.72) {
    parts.push("tall and narrow, reaching well above its width");
  } else if (signals.height <= 0.35) {
    parts.push("squat and low, wider than it is tall");
  } else {
    parts.push("medium, fairly balanced height");
  }

  // 2. Where it's widest
  if (signals.bellyBias <= 0.25) {
    parts.push("widest at the foot, tapering upward");
  } else if (signals.bellyBias >= 0.75) {
    parts.push("flares widest at the lip, top-heavy");
  } else {
    parts.push("bulges at the belly, mid-height");
  }

  // 3. Curve drama
  if (signals.widthVariance >= 0.4) {
    parts.push("walls swing dramatically in and out");
  } else if (signals.widthVariance <= 0.1) {
    parts.push("nearly straight, even walls");
  } else {
    parts.push("a gentle curve");
  }

  // 4. Oddity hook — only when we have the raw widths
  if (signals.widths.length >= 2) {
    const ws = signals.widths;
    const mean = ws.reduce((a, b) => a + b, 0) / ws.length;
    let maxDev = 0;
    let maxIdx = 0;
    for (let i = 0; i < ws.length; i++) {
      const dev = Math.abs(ws[i] - mean);
      if (dev > maxDev) { maxDev = dev; maxIdx = i; }
    }

    if (maxDev < 0.06) {
      parts.push("thrown evenly, almost suspiciously symmetrical");
    } else {
      const outlierPos = maxIdx / (ws.length - 1); // 0=foot, 1=lip
      const outlierVal = ws[maxIdx];
      const lip  = ws[ws.length - 1];
      const base = ws[0];

      // Check if it's an interior pinch (not first or last band)
      const isInterior = maxIdx > 0 && maxIdx < ws.length - 1;
      if (isInterior && outlierVal < mean - 0.06) {
        // Pinched-in waist — describe position
        const posLabel = outlierPos <= 0.4 ? "low" : outlierPos >= 0.7 ? "high" : "mid";
        parts.push(`a pinched-in waist about ${posLabel} up`);
      } else if (lip - base > 0.12) {
        parts.push("an oddly wide, flared lip");
      } else if (base - lip > 0.12) {
        parts.push("a heavy, planted base and a tight mouth");
      } else {
        // Generic outlier — describe using same position label
        const posLabel = outlierPos <= 0.33 ? "low" : outlierPos >= 0.66 ? "high" : "mid";
        parts.push(`an uneven bulge ${posLabel} up`);
      }
    }
  }

  // 5. Edge character
  if (signals.edgeMix >= 0.7) {
    parts.push("crisp, angular walls");
  } else if (signals.edgeMix <= 0.25) {
    parts.push("soft and rounded throughout");
  } else if (signals.edgeVariance >= 0.2) {
    parts.push("mixed walls, some sharp and some soft");
  } else {
    parts.push("subtly shaped walls");
  }

  // 6. Glaze — preset name + HSL mood
  const PRESET_NAMES: Record<string, string> = {
    terracotta:    "terracotta",
    celadon:       "celadon green",
    cobalt:        "cobalt blue",
    ivory:         "ivory",
    "sage-matte":  "sage",
    "blush-gloss": "blush",
    midnight:      "midnight blue",
    honey:         "honey",
  };

  let glazeColour: string;
  if (PRESET_NAMES[signals.glazeRaw]) {
    glazeColour = PRESET_NAMES[signals.glazeRaw];
  } else {
    // Derive colour word from hue
    const { hue } = signals;
    if (hue <= 60 || hue >= 300) {
      glazeColour = "warm-toned";
    } else if (hue <= 150) {
      glazeColour = "green";
    } else if (hue <= 270) {
      glazeColour = "cool blue";
    } else {
      glazeColour = "violet";
    }
  }

  let glazeMood: string;
  if (signals.light < 0.35) {
    glazeMood = "dark, light-swallowing";
  } else if (signals.light > 0.7) {
    glazeMood = "pale, washed-out";
  } else if (signals.sat > 0.6) {
    glazeMood = "saturated, vivid";
  } else {
    glazeMood = "muted";
  }

  parts.push(`a ${glazeMood} ${glazeColour} glaze`);

  // 7. Pattern
  const PATTERN_DESC: Record<string, string> = {
    plain:    "left undecorated",
    stripes:  "banded with stripes",
    dots:     "scattered with dots",
    squiggle: "marked with a loose squiggle",
    flowers:  "dotted with small flowers",
    draw:     "covered in hand-scrawled marks",
  };
  parts.push(PATTERN_DESC[signals.pattern] ?? "left undecorated");

  // 8. Face
  const FACE_DESC: Record<string, string> = {
    none:      "no face — blank",
    happy:     "a small smiling face",
    sleepy:    "a drowsy half-closed face",
    winky:     "a single winking eye",
    surprised: "a wide-eyed, startled face",
    drawn:     "a hand-drawn face",
  };
  parts.push(FACE_DESC[signals.faceKind] ?? "no face — blank");

  return parts.join("; ") + ".";
}

// ── Archetype definitions ─────────────────────────────────────────────────

export interface ArchetypeWeights {
  /** Pulls toward this archetype when height is HIGH (>0.6). */
  tallHigh: number;
  /** Pulls toward this archetype when height is LOW (<0.4). */
  squatHigh: number;
  /** Pulls when width variance is HIGH. */
  wideVarianceHigh: number;
  /** Pulls when belly sits LOW (foot bias). */
  bellyLow: number;
  /** Pulls when belly sits HIGH (lip bias). */
  bellyHigh: number;
  /** Pulls when edge is ROUND (edgeMix near 0). */
  roundEdge: number;
  /** Pulls when edge is ANGULAR (edgeMix near 1). */
  sharpEdge: number;
  /** Pulls when edge mix is HIGH VARIANCE. */
  mixedEdge: number;
  /** Pulls when glaze is WARM (hue 0-60 or 300-360, high sat). */
  warmGlaze: number;
  /** Pulls when glaze is COOL (hue 180-270). */
  coolGlaze: number;
  /** Pulls when glaze is DARK (low lightness). */
  darkGlaze: number;
  /** Pulls when glaze is LIGHT / muted (high lightness or low sat). */
  lightGlaze: number;
  /** Pattern-specific pulls ("dots", "flowers", "squiggle", "stripes", "plain"). */
  patternDots: number;
  patternFlowers: number;
  patternSquiggle: number;
  patternStripes: number;
  patternPlain: number;
  /** Face-specific pulls. */
  faceHappy: number;
  faceSleepy: number;
  faceWinky: number;
  faceDrawn: number;
  faceNone: number;
  /**
   * Pulls when throw control is HIGH (steady hand, throwScore near 1).
   * Default 0 — most archetypes are throwScore-neutral.
   */
  throwControlHigh?: number;
  /**
   * Pulls when throw control is LOW (wild throw, throwScore near 0).
   * Default 0 — most archetypes are throwScore-neutral.
   */
  throwControlLow?: number;
}

export interface Archetype {
  id: string;
  name: string;
  emoji: string;
  /** DoodleIcon name for this archetype — use instead of emoji where hand-drawn style is preferred. */
  iconName: import("@/components/ui/DoodleIcon").DoodleName;
  /** 2-3 sentence fallback reading in second person (used when LLM is unavailable). */
  blurb: string;
  /** Spotify playlist ID (public editorial playlist). */
  playlistId: string;
  /** Human-readable playlist name (for comments / UI). */
  playlistName: string;
  /** Accent colour hex for UI theming. */
  accentHex: string;
  weights: ArchetypeWeights;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "slow-bloomer",
    name: "The Slow Bloomer",
    emoji: "🌱",
    iconName: "sprout",
    blurb:
      "You have a note in your phone from eight months ago that you haven't deleted and haven't acted on. " +
      "People who met you briefly still bring you up in conversations you weren't part of. " +
      "Things take longer with you than anyone expects, and they tend to last.",
    // Spotify "Peaceful Piano" — calm, patient, unhurried
    playlistId: "37i9dQZF1DX6ziVCJnEm59", // your favorite coffeehouse
    playlistName: "Peaceful Piano",
    accentHex: "#7A8C6E",
    weights: {
      tallHigh:         0.0,
      squatHigh:        0.4,
      wideVarianceHigh: 0.1,
      bellyLow:         0.5,  // wide at base — grounded
      bellyHigh:        0.0,
      roundEdge:        0.6,  // soft, patient curves
      sharpEdge:        0.0,
      mixedEdge:        0.0,
      warmGlaze:        0.1,
      coolGlaze:        0.3,
      darkGlaze:        0.0,
      lightGlaze:       0.4,
      patternDots:      0.1,
      patternFlowers:   0.3,
      patternSquiggle:  0.0,
      patternStripes:   0.0,
      patternPlain:     0.4,
      faceHappy:        0.2,
      faceSleepy:       0.3,
      faceWinky:        0.0,
      faceDrawn:        0.0,
      faceNone:         0.2,
    },
  },
  {
    id: "bold-vessel",
    name: "The Bold Vessel",
    emoji: "🔥",
    iconName: "flame",
    blurb:
      "You walk into a room and the air pressure changes slightly. " +
      "You have started arguments you didn't mean to start and won some you didn't want to. " +
      "There is a volume inside you that other people spend their lives searching for.",
    // Spotify "Mood Booster" — energetic, confident
    playlistId: "37i9dQZF1DXcF6B6QPhFDv", // Rock This
    playlistName: "Mood Booster",
    accentHex: "#B85C2A",
    weights: {
      tallHigh:         0.2,
      squatHigh:        0.1,
      wideVarianceHigh: 0.5,  // dramatic width changes
      bellyLow:         0.0,
      bellyHigh:        0.3,
      roundEdge:        0.0,
      sharpEdge:        0.5,  // bold, angular
      mixedEdge:        0.2,
      warmGlaze:        0.8,  // warm terracotta / honey
      coolGlaze:        0.0,
      darkGlaze:        0.1,
      lightGlaze:       0.0,
      patternDots:      0.0,
      patternFlowers:   0.0,
      patternSquiggle:  0.3,
      patternStripes:   0.4,
      patternPlain:     0.0,
      faceHappy:        0.3,
      faceSleepy:       0.0,
      faceWinky:        0.2,
      faceDrawn:        0.2,
      faceNone:         0.1,
    },
  },
  {
    id: "quiet-keeper",
    name: "The Quiet Keeper",
    emoji: "🌙",
    iconName: "moon",
    blurb:
      "You remember the exact shirt someone was wearing the first time you met them. " +
      "You have let things go unchallenged in the moment and catalogued them precisely afterward. " +
      "People tell you things in parking lots they have never said aloud before.",
    // Spotify "lofi beats" — quiet, introspective
    playlistId: "37i9dQZF1DWYcDQ1hSjOpY", // Deep Sleep
    playlistName: "lofi beats",
    accentHex: "#2C3E50",
    weights: {
      tallHigh:         0.2,
      squatHigh:        0.1,
      wideVarianceHigh: 0.0,
      bellyLow:         0.2,
      bellyHigh:        0.0,
      roundEdge:        0.3,
      sharpEdge:        0.1,
      mixedEdge:        0.0,
      warmGlaze:        0.0,
      coolGlaze:        0.3,
      darkGlaze:        0.7,  // midnight or deep cobalt
      lightGlaze:       0.0,
      patternDots:      0.0,
      patternFlowers:   0.0,
      patternSquiggle:  0.0,
      patternStripes:   0.1,
      patternPlain:     0.6,  // minimal, contained
      faceHappy:        0.0,
      faceSleepy:       0.5,
      faceWinky:        0.0,
      faceDrawn:        0.0,
      faceNone:         0.4,
      throwControlHigh: 0.3,  // deliberate, precise = quiet keeper
    },
  },
  {
    id: "wild-throw",
    name: "The Wild Throw",
    emoji: "🌀",
    iconName: "swirl",
    blurb:
      "You have rerouted mid-sentence more times than anyone in the room has noticed. " +
      "Your best decisions have been made while already moving. " +
      "You leave marks on places that don't remember your name.",
    // Spotify "Indie Pop" — eclectic, kinetic
    playlistId: "37i9dQZF1DWWBHeXOYZf74", // POLLEN
    playlistName: "Indie Pop",
    accentHex: "#D4847A",
    weights: {
      tallHigh:         0.1,
      squatHigh:        0.0,
      wideVarianceHigh: 0.8,  // erratic widths
      bellyLow:         0.0,
      bellyHigh:        0.0,
      roundEdge:        0.1,
      sharpEdge:        0.2,
      mixedEdge:        0.7,  // chaotic edge mix
      warmGlaze:        0.3,
      coolGlaze:        0.1,
      darkGlaze:        0.0,
      lightGlaze:       0.1,
      patternDots:      0.2,
      patternFlowers:   0.1,
      patternSquiggle:  0.7,  // squiggly = wild
      patternStripes:   0.2,
      patternPlain:     0.0,
      faceHappy:        0.3,
      faceSleepy:       0.0,
      faceWinky:        0.7,  // cheeky wink = wild
      faceDrawn:        0.5,  // hand-drawn faces
      faceNone:         0.0,
      throwControlLow:  0.6,  // a wild throw = this archetype
    },
  },
  {
    id: "sunny-optimist",
    name: "The Sunny Optimist",
    emoji: "☀️",
    iconName: "sun",
    blurb:
      "You make plans in the morning and by noon something has changed and you don't mind. " +
      "People clock your face first when something goes wrong in the room. " +
      "You have held a good mood through things that would have flattened someone else.",
    // Spotify "Feelin' Good" — upbeat, warm
    playlistId: "37i9dQZF1DXdPec7aLTmlC", // Happy Hits!
    playlistName: "Feelin' Good",
    accentHex: "#D4A840",
    weights: {
      tallHigh:         0.3,
      squatHigh:        0.1,
      wideVarianceHigh: 0.1,
      bellyLow:         0.0,
      bellyHigh:        0.4,  // reaches upward
      roundEdge:        0.5,
      sharpEdge:        0.0,
      mixedEdge:        0.0,
      warmGlaze:        0.6,  // honey, ivory, terracotta
      coolGlaze:        0.0,
      darkGlaze:        0.0,
      lightGlaze:       0.5,
      patternDots:      0.5,  // cheerful dots
      patternFlowers:   0.6,
      patternSquiggle:  0.1,
      patternStripes:   0.0,
      patternPlain:     0.1,
      faceHappy:        0.9,  // happy face is very on-brand
      faceSleepy:       0.0,
      faceWinky:        0.4,
      faceDrawn:        0.1,
      faceNone:         0.1,
    },
  },
  {
    id: "deep-well",
    name: "The Deep Well",
    emoji: "🌊",
    iconName: "ocean",
    blurb:
      "You have a thought about something most people don't think about at all, and you have had it for years. " +
      "Conversations with you take longer than they were supposed to. " +
      "Something surfaces in you occasionally that you can't entirely account for.",
    // Spotify "Deep Focus" — deep, layered, sustained
    playlistId: "37i9dQZF1DWZqd5JICZI0u", // Cinematic Chill Out
    playlistName: "Deep Focus",
    accentHex: "#4A7BAF",
    weights: {
      tallHigh:         0.6,  // tall, deep vessel
      squatHigh:        0.0,
      wideVarianceHigh: 0.0,
      bellyLow:         0.4,  // weight at the base
      bellyHigh:        0.0,
      roundEdge:        0.2,
      sharpEdge:        0.2,
      mixedEdge:        0.1,
      warmGlaze:        0.0,
      coolGlaze:        0.7,  // cobalt, celadon
      darkGlaze:        0.4,
      lightGlaze:       0.0,
      patternDots:      0.0,
      patternFlowers:   0.0,
      patternSquiggle:  0.0,
      patternStripes:   0.3,
      patternPlain:     0.5,
      faceHappy:        0.0,
      faceSleepy:       0.2,
      faceWinky:        0.0,
      faceDrawn:        0.1,
      faceNone:         0.5,
    },
  },
  {
    id: "tender-heart",
    name: "The Tender Heart",
    emoji: "🌸",
    iconName: "blossom",
    blurb:
      "You notice when someone's voice changes by a single register and you don't say anything about it. " +
      "You have cried at something you couldn't explain to anyone who wasn't there. " +
      "People leave conversations with you having said more than they intended.",
    // Spotify "Chill Vibes" — warm, gentle, open
    playlistId: "37i9dQZF1DWTwnEm1IYyoj", // Soft Pop Hits
    playlistName: "Chill Vibes",
    accentHex: "#D4847A",
    weights: {
      tallHigh:         0.0,
      squatHigh:        0.2,
      wideVarianceHigh: 0.1,
      bellyLow:         0.1,
      bellyHigh:        0.0,
      roundEdge:        0.7,  // soft, generous curves
      sharpEdge:        0.0,
      mixedEdge:        0.0,
      warmGlaze:        0.4,
      coolGlaze:        0.1,
      darkGlaze:        0.0,
      lightGlaze:       0.5,  // blush-gloss, ivory
      patternDots:      0.3,
      patternFlowers:   0.7,  // flowers = tender
      patternSquiggle:  0.1,
      patternStripes:   0.0,
      patternPlain:     0.1,
      faceHappy:        0.5,
      faceSleepy:       0.0,
      faceWinky:        0.1,
      faceDrawn:        0.3,
      faceNone:         0.0,
    },
  },
  {
    id: "steady-hand",
    name: "The Steady Hand",
    emoji: "🪨",
    iconName: "stone",
    blurb:
      "You are the person who checks whether the door is locked before anyone else remembers to ask. " +
      "You have absorbed someone else's crisis and handled it so cleanly they still don't know how bad it was. " +
      "Your name comes up in rooms you have already left.",
    // Spotify "Jazz Vibes" — steady, reliable, timeless groove
    playlistId: "37i9dQZF1DXbITWG1ZJKYt", // Jazz in the Background
    playlistName: "Jazz Vibes",
    accentHex: "#7A8C6E",
    weights: {
      tallHigh:         0.0,
      squatHigh:        0.5,  // solid, stable
      wideVarianceHigh: 0.0,  // consistent widths
      bellyLow:         0.6,  // wide base = grounded
      bellyHigh:        0.0,
      roundEdge:        0.2,
      sharpEdge:        0.4,  // clean, precise
      mixedEdge:        0.0,
      warmGlaze:        0.2,
      coolGlaze:        0.2,
      darkGlaze:        0.2,
      lightGlaze:       0.2,
      patternDots:      0.0,
      patternFlowers:   0.0,
      patternSquiggle:  0.0,
      patternStripes:   0.5,  // ordered, structured
      patternPlain:     0.4,
      faceHappy:        0.1,
      faceSleepy:       0.0,
      faceWinky:        0.0,
      faceDrawn:        0.0,
      faceNone:         0.5,  // no fuss, no theatrics
      throwControlHigh: 0.6,  // a perfectly centered throw = this archetype
    },
  },
  {
    id: "free-spirit",
    name: "The Free Spirit",
    emoji: "🪁",
    iconName: "kite",
    blurb:
      "You have taken a route no one recommended and arrived somewhere worth being. " +
      "There is a category of object in your home that no one else would think to keep. " +
      "You change direction without announcing it and people catch up or they don't.",
    // Spotify "Indie Pop" — free-ranging, adventurous
    playlistId: "37i9dQZF1DWYV7OOaGhoH0", // Roots Rising
    playlistName: "Indie Pop",
    accentHex: "#A8C5A0",
    weights: {
      tallHigh:         0.3,
      squatHigh:        0.0,
      wideVarianceHigh: 0.4,
      bellyLow:         0.0,
      bellyHigh:        0.5,  // reaching upward, light
      roundEdge:        0.3,
      sharpEdge:        0.1,
      mixedEdge:        0.3,
      warmGlaze:        0.2,
      coolGlaze:        0.3,
      darkGlaze:        0.0,
      lightGlaze:       0.4,  // celadon, sage — airy
      patternDots:      0.3,
      patternFlowers:   0.2,
      patternSquiggle:  0.4,
      patternStripes:   0.1,
      patternPlain:     0.1,
      faceHappy:        0.3,
      faceSleepy:       0.0,
      faceWinky:        0.3,
      faceDrawn:        0.4,
      faceNone:         0.1,
      throwControlLow:  0.3,  // a wild throw nudges toward free spirit too
    },
  },
  {
    id: "old-soul",
    name: "The Old Soul",
    emoji: "🍂",
    iconName: "leaf",
    blurb:
      "You own something old that you did not inherit and have never been able to fully explain. " +
      "You have sat with something uncomfortable long enough that it became familiar. " +
      "People your age have not caught up to the thing you already know.",
    // Spotify "Sad Songs" — reflective, autumnal, deeply felt
    playlistId: "37i9dQZF1DWWzBc3TOlaAV", // Soul Coffee
    playlistName: "Sad Songs",
    accentHex: "#D4A840",
    weights: {
      tallHigh:         0.2,
      squatHigh:        0.2,
      wideVarianceHigh: 0.0,
      bellyLow:         0.3,
      bellyHigh:        0.0,
      roundEdge:        0.4,
      sharpEdge:        0.1,
      mixedEdge:        0.0,
      warmGlaze:        0.5,  // terracotta, honey — earthy, aged
      coolGlaze:        0.0,
      darkGlaze:        0.2,
      lightGlaze:       0.1,
      patternDots:      0.0,
      patternFlowers:   0.2,
      patternSquiggle:  0.0,
      patternStripes:   0.1,
      patternPlain:     0.5,  // understated
      faceHappy:        0.1,
      faceSleepy:       0.3,
      faceWinky:        0.0,
      faceDrawn:        0.2,
      faceNone:         0.3,
    },
  },
];

// ── Scoring ───────────────────────────────────────────────────────────────

/**
 * Score a signals object against a single archetype.
 * Each weight multiplies a 0-1 "activation" for the corresponding signal.
 * Returns a non-negative score (higher = better match).
 */
function scoreArchetype(signals: VaseSignals, w: ArchetypeWeights): number {
  const { height, widthVariance, bellyBias, edgeMix, edgeVariance,
          hue, sat, light, pattern, faceKind } = signals;

  // ── Shape signals ───────────────────────────────────────────────────────
  const tallness  = Math.max(0, (height - 0.6) / 0.4);        // 0 unless h>0.6
  const squatness = Math.max(0, (0.4 - height) / 0.4);        // 0 unless h<0.4
  const bellowLow = 1 - bellyBias;                             // high when widest near foot
  const belowHigh = bellyBias;                                 // high when widest near lip

  // ── Edge signals ────────────────────────────────────────────────────────
  const roundness = 1 - edgeMix;                               // 0=sharp, 1=round
  const sharpness = edgeMix;
  const mixedness  = edgeVariance;

  // ── Colour signals ──────────────────────────────────────────────────────
  // Warm: hue 0..60 or 300..360 + reasonably saturated
  const hueWarm = (hue <= 60 || hue >= 300) ? 1 : 0;
  const hueCool = (hue >= 180 && hue <= 270) ? 1 : 0;
  const warmGlaze = hueWarm * Math.max(0, (sat - 0.2) / 0.8);
  const coolGlaze = hueCool * Math.max(0, (sat - 0.1) / 0.9);
  const darkGlaze  = Math.max(0, (0.35 - light) / 0.35);       // kicks in below 0.35
  const lightGlaze = Math.max(0, (light - 0.55) / 0.45);       // kicks in above 0.55

  // ── Pattern signals ─────────────────────────────────────────────────────
  const isDots     = pattern === "dots"     ? 1 : 0;
  const isFlowers  = pattern === "flowers"  ? 1 : 0;
  const isSquiggle = pattern === "squiggle" ? 1 : 0;
  const isStripes  = pattern === "stripes"  ? 1 : 0;
  const isPlain    = pattern === "plain"    ? 1 : 0;

  // ── Face signals ────────────────────────────────────────────────────────
  const isHappy   = faceKind === "happy"     ? 1 : 0;
  const isSleepy  = faceKind === "sleepy"    ? 1 : 0;
  const isWinky   = faceKind === "winky"     ? 1 : 0;
  const isDrawn   = faceKind === "drawn"     ? 1 : 0;
  const isNoFace  = faceKind === "none"      ? 1 : 0;

  return (
    w.tallHigh         * tallness        +
    w.squatHigh        * squatness       +
    w.wideVarianceHigh * widthVariance   +
    w.bellyLow         * bellowLow       +
    w.bellyHigh        * belowHigh       +
    w.roundEdge        * roundness       +
    w.sharpEdge        * sharpness       +
    w.mixedEdge        * mixedness       +
    w.warmGlaze        * warmGlaze       +
    w.coolGlaze        * coolGlaze       +
    w.darkGlaze        * darkGlaze       +
    w.lightGlaze       * lightGlaze      +
    w.patternDots      * isDots          +
    w.patternFlowers   * isFlowers       +
    w.patternSquiggle  * isSquiggle      +
    w.patternStripes   * isStripes       +
    w.patternPlain     * isPlain         +
    w.faceHappy        * isHappy         +
    w.faceSleepy       * isSleepy        +
    w.faceWinky        * isWinky         +
    w.faceDrawn        * isDrawn         +
    w.faceNone         * isNoFace
  );
}

// ── Trait phrase generation ───────────────────────────────────────────────

function traitPhrases(signals: VaseSignals, throwScore?: number): string[] {
  const traits: string[] = [];

  // Height
  if (signals.height >= 0.72)       traits.push("tall & reaching");
  else if (signals.height <= 0.35)  traits.push("low & grounded");
  else                              traits.push("balanced proportions");

  // Width shape
  if (signals.widthVariance >= 0.4)           traits.push("dramatic curves");
  else if (signals.widthVariance <= 0.1)       traits.push("even, steady form");
  else                                         traits.push("gentle undulation");

  // Belly bias
  if (signals.bellyBias <= 0.25)   traits.push("wide at the base, stable footing");
  else if (signals.bellyBias >= 0.75) traits.push("expansive upper body, wide at the lip");
  else                              traits.push("round belly at mid-height");

  // Edge
  if (signals.edgeMix >= 0.7)          traits.push("crisp angular edges");
  else if (signals.edgeMix <= 0.25)    traits.push("soft rounded curves");
  else if (signals.edgeVariance >= 0.2) traits.push("mixed edges — some bold, some soft");
  else                                 traits.push("subtly shaped walls");

  // Glaze — prefer the preset name; fall back to HSL-derived description for hex values
  const glazePresetNames: Record<string, string> = {
    terracotta:   "warm terracotta glaze",
    celadon:      "soft celadon green",
    cobalt:       "deep cobalt blue",
    ivory:        "pale ivory glaze",
    "sage-matte": "earthy sage-matte finish",
    "blush-gloss":"rosy blush gloss",
    midnight:     "dark midnight glaze",
    honey:        "golden honey glaze",
  };
  const glazeTrait =
    glazePresetNames[signals.glazeRaw] ??
    (signals.hue < 60 || signals.hue >= 300
      ? signals.light > 0.6 ? "pale warm glaze" : "rich warm glaze"
      : signals.hue < 150
      ? "cool green glaze"
      : signals.hue < 210
      ? "tranquil blue-green glaze"
      : "cool blue glaze");
  traits.push(glazeTrait);

  // Pattern
  if (signals.pattern !== "plain") {
    const patternDescriptions: Record<string, string> = {
      stripes:  "clean striped pattern",
      dots:     "playful dotted pattern",
      squiggle: "lively squiggle design",
      flowers:  "delicate floral motif",
    };
    traits.push(patternDescriptions[signals.pattern] ?? `${signals.pattern} pattern`);
  }

  // Face
  const faceDescriptions: Record<string, string> = {
    happy:     "a smiling face",
    sleepy:    "a drowsy, contented face",
    winky:     "a cheeky winked expression",
    surprised: "wide-eyed surprised face",
    drawn:     "a hand-drawn face",
  };
  if (signals.faceKind !== "none") {
    traits.push(faceDescriptions[signals.faceKind] ?? "a painted face");
  }

  // Throw quality (only emitted when hard mode provides a throwScore distinct from neutral)
  if (throwScore !== undefined && Math.abs(throwScore - 0.7) > 0.15) {
    if (throwScore >= 0.85) {
      traits.push("a perfectly centered, controlled throw");
    } else if (throwScore >= 0.6) {
      traits.push("a confident, practiced throw");
    } else if (throwScore >= 0.4) {
      traits.push("an honest, imperfect throw");
    } else {
      traits.push("a wild, off-kilter throw");
    }
  }

  return traits;
}

// ── Public API ────────────────────────────────────────────────────────────

export interface VaseReading {
  archetype: Archetype;
  traits: string[];
  /** Compact factual description of the pot, used as LLM context for the reading. */
  description: string;
}

/**
 * Deterministically map a signals object to the best-matching archetype
 * and a list of human-readable trait phrases.
 *
 * On a tie (extremely rare) the archetype that appears first in ARCHETYPES wins.
 * throwScore: optional 0..1 quality from hard mode (default ~0.7 = neutral, easy mode unaffected).
 */
export function vaseToArchetype(signals: VaseSignals, throwScore?: number): VaseReading {
  let best = ARCHETYPES[0];
  let bestScore = -Infinity;

  // throwScore: 0..1 from hard mode. Neutral = 0.7 (easy mode pots unaffected).
  // Deviation from neutral shifts scores toward throwControl archetypes.
  const safeThrowScore = throwScore !== undefined
    ? Math.max(0, Math.min(1, throwScore))
    : 0.7; // neutral default — easy mode unchanged

  for (const archetype of ARCHETYPES) {
    let score = scoreArchetype(signals, archetype.weights);

    // Apply throw control weights (only non-zero on affected archetypes)
    const w = archetype.weights;
    if (w.throwControlHigh) {
      // Activates when throwScore > 0.7 (above neutral)
      const highControl = Math.max(0, (safeThrowScore - 0.7) / 0.3);
      score += w.throwControlHigh * highControl;
    }
    if (w.throwControlLow) {
      // Activates when throwScore < 0.7 (below neutral)
      const lowControl = Math.max(0, (0.7 - safeThrowScore) / 0.7);
      score += w.throwControlLow * lowControl;
    }

    if (score > bestScore) {
      bestScore = score;
      best = archetype;
    }
  }

  return {
    archetype: best,
    traits: traitPhrases(signals, safeThrowScore),
    description: describeVaseForReading(signals),
  };
}

/**
 * Convenience wrapper: parse raw vase parameters straight to a reading.
 * This is the primary entry point for the result page.
 * throwScore: optional 0..1 from hard mode (default neutral ~0.7, easy mode unaffected).
 */
export function readVase(shape: string, glaze: string, pattern: string, throwScore?: number): VaseReading {
  return vaseToArchetype(extractSignals(shape, glaze, pattern), throwScore);
}
