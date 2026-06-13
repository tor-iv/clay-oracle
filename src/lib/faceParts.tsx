// ── Face Part Library ─────────────────────────────────────────────────────
// Part-based "Mii/Tomodachi-style" face rendering for Clay Oracle.
//
// All parts are designed in a coordinate system where:
//   cx, cy = face center   s = scale factor (1.0 at full size in the 64px viewBox)
//
// ENVELOPE: every part MUST stay within ±7.2px horizontal and ±6px vertical
// of (cx, cy) at s=1. This matches getFacePosition's FACE_HALF_EXTENT.
//
// The `ink` argument colors eyes/brows/mouth strokes.
// Cheeks and accessories use their own palette colors.

import React from "react";

export interface FacePart {
  id: string;
  label: string;
  render: (cx: number, cy: number, s: number, ink: string) => React.ReactNode;
}

const BLUSH = "rgba(212,132,122,0.55)";
const ROSY  = "rgba(220,100,90,0.45)";

// ── EYE_PARTS ─────────────────────────────────────────────────────────────

export const EYE_PARTS: FacePart[] = [
  {
    id: "dot",
    label: "Dot",
    render: (cx, cy, s, ink) => (
      <g key="eye-dot">
        <circle cx={cx - 3.5 * s} cy={cy - 1 * s} r={1.1 * s} fill={ink} />
        <circle cx={cx + 3.5 * s} cy={cy - 1 * s} r={1.1 * s} fill={ink} />
      </g>
    ),
  },
  {
    id: "round",
    label: "Round",
    render: (cx, cy, s, ink) => (
      <g key="eye-round">
        <circle cx={cx - 3.5 * s} cy={cy - 1.2 * s} r={1.7 * s} fill={ink} />
        <circle cx={cx + 3.5 * s} cy={cy - 1.2 * s} r={1.7 * s} fill={ink} />
        <circle cx={cx - 4 * s}   cy={cy - 1.7 * s} r={0.6 * s} fill="white" />
        <circle cx={cx + 3 * s}   cy={cy - 1.7 * s} r={0.6 * s} fill="white" />
      </g>
    ),
  },
  {
    id: "sleepy",
    label: "Sleepy",
    render: (cx, cy, s, ink) => (
      <g key="eye-sleepy">
        <path
          d={`M ${cx - 5 * s} ${cy - 0.5 * s} Q ${cx - 3.5 * s} ${cy - 2.5 * s} ${cx - 2 * s} ${cy - 0.5 * s}`}
          stroke={ink} strokeWidth={1.1 * s} fill="none" strokeLinecap="round"
        />
        <path
          d={`M ${cx + 2 * s} ${cy - 0.5 * s} Q ${cx + 3.5 * s} ${cy - 2.5 * s} ${cx + 5 * s} ${cy - 0.5 * s}`}
          stroke={ink} strokeWidth={1.1 * s} fill="none" strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "wink",
    label: "Wink",
    render: (cx, cy, s, ink) => (
      <g key="eye-wink">
        <circle cx={cx - 3.5 * s} cy={cy - 1 * s} r={1.1 * s} fill={ink} />
        <path
          d={`M ${cx + 2 * s} ${cy - 1 * s} Q ${cx + 3.5 * s} ${cy - 3 * s} ${cx + 5 * s} ${cy - 1 * s}`}
          stroke={ink} strokeWidth={1.1 * s} fill="none" strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "sparkle",
    label: "Sparkle",
    render: (cx, cy, s, ink) => (
      <g key="eye-sparkle">
        <circle cx={cx - 3.5 * s} cy={cy - 1.2 * s} r={1.6 * s} fill={ink} />
        <circle cx={cx + 3.5 * s} cy={cy - 1.2 * s} r={1.6 * s} fill={ink} />
        {/* star-shaped shine — cross pattern */}
        <circle cx={cx - 4.2 * s} cy={cy - 1.9 * s} r={0.7 * s} fill="white" />
        <circle cx={cx + 2.8 * s} cy={cy - 1.9 * s} r={0.7 * s} fill="white" />
        <circle cx={cx - 3.5 * s} cy={cy - 0.8 * s} r={0.3 * s} fill="white" fillOpacity="0.7" />
        <circle cx={cx + 3.5 * s} cy={cy - 0.8 * s} r={0.3 * s} fill="white" fillOpacity="0.7" />
      </g>
    ),
  },
  {
    id: "surprised",
    label: "Wide",
    render: (cx, cy, s, ink) => (
      <g key="eye-surprised">
        <circle cx={cx - 3.5 * s} cy={cy - 1.5 * s} r={2.0 * s} stroke={ink} strokeWidth={1.1 * s} fill="white" />
        <circle cx={cx + 3.5 * s} cy={cy - 1.5 * s} r={2.0 * s} stroke={ink} strokeWidth={1.1 * s} fill="white" />
        <circle cx={cx - 3.5 * s} cy={cy - 1.5 * s} r={1.0 * s} fill={ink} />
        <circle cx={cx + 3.5 * s} cy={cy - 1.5 * s} r={1.0 * s} fill={ink} />
      </g>
    ),
  },
];

// ── BROW_PARTS ────────────────────────────────────────────────────────────

export const BROW_PARTS: FacePart[] = [
  {
    id: "none",
    label: "None",
    render: () => null,
  },
  {
    id: "flat",
    label: "Flat",
    render: (cx, cy, s, ink) => (
      <g key="brow-flat">
        <line
          x1={cx - 5 * s} y1={cy - 3.8 * s}
          x2={cx - 1.5 * s} y2={cy - 3.8 * s}
          stroke={ink} strokeWidth={1.1 * s} strokeLinecap="round"
        />
        <line
          x1={cx + 1.5 * s} y1={cy - 3.8 * s}
          x2={cx + 5 * s} y2={cy - 3.8 * s}
          stroke={ink} strokeWidth={1.1 * s} strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "raised",
    label: "Raised",
    render: (cx, cy, s, ink) => (
      <g key="brow-raised">
        <path
          d={`M ${cx - 5 * s} ${cy - 3.5 * s} Q ${cx - 3.5 * s} ${cy - 5 * s} ${cx - 1.5 * s} ${cy - 3.5 * s}`}
          stroke={ink} strokeWidth={1.1 * s} fill="none" strokeLinecap="round"
        />
        <path
          d={`M ${cx + 1.5 * s} ${cy - 3.5 * s} Q ${cx + 3.5 * s} ${cy - 5 * s} ${cx + 5 * s} ${cy - 3.5 * s}`}
          stroke={ink} strokeWidth={1.1 * s} fill="none" strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "angry",
    label: "Angry",
    render: (cx, cy, s, ink) => (
      <g key="brow-angry">
        {/* Angled inward (inner ends lower) */}
        <line
          x1={cx - 5.2 * s} y1={cy - 4.5 * s}
          x2={cx - 1.5 * s} y2={cy - 3.2 * s}
          stroke={ink} strokeWidth={1.3 * s} strokeLinecap="round"
        />
        <line
          x1={cx + 1.5 * s} y1={cy - 3.2 * s}
          x2={cx + 5.2 * s} y2={cy - 4.5 * s}
          stroke={ink} strokeWidth={1.3 * s} strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "worried",
    label: "Worried",
    render: (cx, cy, s, ink) => (
      <g key="brow-worried">
        {/* Angled outward (inner ends higher) */}
        <line
          x1={cx - 5.2 * s} y1={cy - 3.2 * s}
          x2={cx - 1.5 * s} y2={cy - 4.5 * s}
          stroke={ink} strokeWidth={1.1 * s} strokeLinecap="round"
        />
        <line
          x1={cx + 1.5 * s} y1={cy - 4.5 * s}
          x2={cx + 5.2 * s} y2={cy - 3.2 * s}
          stroke={ink} strokeWidth={1.1 * s} strokeLinecap="round"
        />
      </g>
    ),
  },
];

// ── MOUTH_PARTS ───────────────────────────────────────────────────────────

export const MOUTH_PARTS: FacePart[] = [
  {
    id: "smile",
    label: "Smile",
    render: (cx, cy, s, ink) => (
      <path
        key="mouth-smile"
        d={`M ${cx - 3 * s} ${cy + 2.5 * s} Q ${cx} ${cy + 5.5 * s} ${cx + 3 * s} ${cy + 2.5 * s}`}
        stroke={ink} strokeWidth={1.1 * s} fill="none" strokeLinecap="round"
      />
    ),
  },
  {
    id: "grin",
    label: "Grin",
    render: (cx, cy, s, ink) => (
      <g key="mouth-grin">
        <path
          d={`M ${cx - 3.5 * s} ${cy + 2 * s} Q ${cx} ${cy + 6 * s} ${cx + 3.5 * s} ${cy + 2 * s} Z`}
          stroke={ink} strokeWidth={1.0 * s} fill={ink} strokeLinecap="round"
        />
        {/* Teeth glint */}
        <line
          x1={cx - 2 * s} y1={cy + 2.5 * s}
          x2={cx + 2 * s} y2={cy + 2.5 * s}
          stroke="white" strokeWidth={0.9 * s} strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "o",
    label: "Oh!",
    render: (cx, cy, s, ink) => (
      <ellipse
        key="mouth-o"
        cx={cx} cy={cy + 3.5 * s} rx={1.5 * s} ry={1.8 * s}
        fill={ink}
      />
    ),
  },
  {
    id: "cat",
    label: "Cat",
    render: (cx, cy, s, ink) => (
      <g key="mouth-cat">
        {/* ω shape: two small arcs meeting at center */}
        <path
          d={`M ${cx - 3 * s} ${cy + 2.5 * s} Q ${cx - 2 * s} ${cy + 4.5 * s} ${cx} ${cy + 3 * s} Q ${cx + 2 * s} ${cy + 4.5 * s} ${cx + 3 * s} ${cy + 2.5 * s}`}
          stroke={ink} strokeWidth={1.0 * s} fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    ),
  },
  {
    id: "flat",
    label: "Flat",
    render: (cx, cy, s, ink) => (
      <line
        key="mouth-flat"
        x1={cx - 2.5 * s} y1={cy + 3.5 * s}
        x2={cx + 2.5 * s} y2={cy + 3.5 * s}
        stroke={ink} strokeWidth={1.1 * s} strokeLinecap="round"
      />
    ),
  },
  {
    id: "tongue",
    label: "Tongue",
    render: (cx, cy, s, ink) => (
      <g key="mouth-tongue">
        <path
          d={`M ${cx - 2.8 * s} ${cy + 2.2 * s} Q ${cx} ${cy + 5.5 * s} ${cx + 2.8 * s} ${cy + 2.2 * s}`}
          stroke={ink} strokeWidth={1.0 * s} fill="none" strokeLinecap="round"
        />
        {/* Tongue sticking out */}
        <ellipse cx={cx} cy={cy + 4.8 * s} rx={1.4 * s} ry={1.0 * s} fill="#D4847A" />
      </g>
    ),
  },
];

// ── CHEEK_PARTS ───────────────────────────────────────────────────────────

export const CHEEK_PARTS: FacePart[] = [
  {
    id: "none",
    label: "None",
    render: () => null,
  },
  {
    id: "blush",
    label: "Blush",
    render: (cx, cy, s) => (
      <g key="cheek-blush">
        <ellipse cx={cx - 5 * s} cy={cy + 2 * s} rx={2.2 * s} ry={1.4 * s} fill={BLUSH} />
        <ellipse cx={cx + 5 * s} cy={cy + 2 * s} rx={2.2 * s} ry={1.4 * s} fill={BLUSH} />
      </g>
    ),
  },
  {
    id: "freckles",
    label: "Freckles",
    render: (cx, cy, s) => (
      <g key="cheek-freckles">
        <circle cx={cx - 5.5 * s} cy={cy + 1.5 * s} r={0.5 * s} fill={BLUSH} />
        <circle cx={cx - 4.5 * s} cy={cy + 2.5 * s} r={0.45 * s} fill={BLUSH} />
        <circle cx={cx - 6 * s}   cy={cy + 2.8 * s} r={0.4 * s} fill={BLUSH} />
        <circle cx={cx + 5.5 * s} cy={cy + 1.5 * s} r={0.5 * s} fill={BLUSH} />
        <circle cx={cx + 4.5 * s} cy={cy + 2.5 * s} r={0.45 * s} fill={BLUSH} />
        <circle cx={cx + 6 * s}   cy={cy + 2.8 * s} r={0.4 * s} fill={BLUSH} />
      </g>
    ),
  },
  {
    id: "rosy",
    label: "Rosy",
    render: (cx, cy, s) => (
      <g key="cheek-rosy">
        <ellipse cx={cx - 5 * s} cy={cy + 2 * s} rx={3.0 * s} ry={2.0 * s} fill={ROSY} />
        <ellipse cx={cx + 5 * s} cy={cy + 2 * s} rx={3.0 * s} ry={2.0 * s} fill={ROSY} />
      </g>
    ),
  },
];

// ── ACCESSORY_PARTS ───────────────────────────────────────────────────────

export const ACCESSORY_PARTS: FacePart[] = [
  {
    id: "none",
    label: "None",
    render: () => null,
  },
  {
    id: "glasses",
    label: "Glasses",
    render: (cx, cy, s) => (
      <g key="acc-glasses">
        {/* Left lens */}
        <circle cx={cx - 3.5 * s} cy={cy - 1 * s} r={2.2 * s}
          stroke="#2C1810" strokeWidth={0.9 * s} fill="none" />
        {/* Right lens */}
        <circle cx={cx + 3.5 * s} cy={cy - 1 * s} r={2.2 * s}
          stroke="#2C1810" strokeWidth={0.9 * s} fill="none" />
        {/* Bridge */}
        <line
          x1={cx - 1.3 * s} y1={cy - 1 * s}
          x2={cx + 1.3 * s} y2={cy - 1 * s}
          stroke="#2C1810" strokeWidth={0.7 * s} strokeLinecap="round"
        />
        {/* Temples */}
        <line
          x1={cx - 5.7 * s} y1={cy - 1 * s}
          x2={cx - 6.8 * s} y2={cy - 0.2 * s}
          stroke="#2C1810" strokeWidth={0.7 * s} strokeLinecap="round"
        />
        <line
          x1={cx + 5.7 * s} y1={cy - 1 * s}
          x2={cx + 6.8 * s} y2={cy - 0.2 * s}
          stroke="#2C1810" strokeWidth={0.7 * s} strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "sunglasses",
    label: "Sunnies",
    render: (cx, cy, s) => (
      <g key="acc-sunglasses">
        {/* Left lens — filled dark */}
        <circle cx={cx - 3.5 * s} cy={cy - 1 * s} r={2.2 * s}
          fill="rgba(44,24,16,0.82)" />
        {/* Right lens */}
        <circle cx={cx + 3.5 * s} cy={cy - 1 * s} r={2.2 * s}
          fill="rgba(44,24,16,0.82)" />
        {/* Bridge */}
        <line
          x1={cx - 1.3 * s} y1={cy - 1 * s}
          x2={cx + 1.3 * s} y2={cy - 1 * s}
          stroke="#2C1810" strokeWidth={0.7 * s} strokeLinecap="round"
        />
        {/* Shine glints */}
        <circle cx={cx - 4.3 * s} cy={cy - 1.8 * s} r={0.55 * s} fill="rgba(255,255,255,0.35)" />
        <circle cx={cx + 2.7 * s} cy={cy - 1.8 * s} r={0.55 * s} fill="rgba(255,255,255,0.35)" />
      </g>
    ),
  },
  {
    id: "mustache",
    label: "Mustache",
    render: (cx, cy, s, ink) => (
      <g key="acc-mustache">
        {/* Two curling swirls below mouth */}
        <path
          d={`M ${cx} ${cy + 5.5 * s} Q ${cx - 1.5 * s} ${cy + 4.5 * s} ${cx - 3.5 * s} ${cy + 5 * s} Q ${cx - 5 * s} ${cy + 5.5 * s} ${cx - 4.5 * s} ${cy + 6.2 * s}`}
          stroke={ink} strokeWidth={1.0 * s} fill="none" strokeLinecap="round"
        />
        <path
          d={`M ${cx} ${cy + 5.5 * s} Q ${cx + 1.5 * s} ${cy + 4.5 * s} ${cx + 3.5 * s} ${cy + 5 * s} Q ${cx + 5 * s} ${cy + 5.5 * s} ${cx + 4.5 * s} ${cy + 6.2 * s}`}
          stroke={ink} strokeWidth={1.0 * s} fill="none" strokeLinecap="round"
        />
      </g>
    ),
  },
  {
    id: "star",
    label: "Star",
    render: (cx, cy, s) => {
      // Small 5-point star near upper-right cheek/brow area
      const starCx = cx + 6 * s;
      const starCy = cy - 3 * s;
      const r = 1.2 * s;
      const ri = r * 0.45;
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const ao = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const ai = ao + Math.PI / 5;
        pts.push(`${(starCx + Math.cos(ao) * r).toFixed(2)},${(starCy + Math.sin(ao) * r).toFixed(2)}`);
        pts.push(`${(starCx + Math.cos(ai) * ri).toFixed(2)},${(starCy + Math.sin(ai) * ri).toFixed(2)}`);
      }
      return (
        <polygon
          key="acc-star"
          points={pts.join(" ")}
          fill="#C9901A"
          stroke="#2C1810"
          strokeWidth={0.5 * s}
          strokeLinejoin="round"
        />
      );
    },
  },
];

// ── Safe getters ──────────────────────────────────────────────────────────

export function getEyePart(index: number): FacePart {
  return EYE_PARTS[Math.max(0, Math.min(EYE_PARTS.length - 1, index))];
}

export function getBrowPart(index: number): FacePart {
  return BROW_PARTS[Math.max(0, Math.min(BROW_PARTS.length - 1, index))];
}

export function getMouthPart(index: number): FacePart {
  return MOUTH_PARTS[Math.max(0, Math.min(MOUTH_PARTS.length - 1, index))];
}

export function getCheekPart(index: number): FacePart {
  return CHEEK_PARTS[Math.max(0, Math.min(CHEEK_PARTS.length - 1, index))];
}

export function getAccessoryPart(id: string): FacePart {
  return ACCESSORY_PARTS.find((p) => p.id === id) ?? ACCESSORY_PARTS[0];
}
