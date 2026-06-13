import { useId } from "react";
import {
  getShape,
  getGlaze,
  getPattern,
  parseShape,
  buildThrownPath,
  buildThrown2Path,
  thrown2LipY,
  THROWN2_FOOT_Y,
} from "@/lib/avatars";
import type { AvatarShape, AvatarGlaze, AvatarPattern, FaceId, ThrownParams } from "@/lib/avatars";

interface VaseAvatarProps {
  shape?: AvatarShape | string;
  glaze?: AvatarGlaze | string;
  pattern?: AvatarPattern | string;
  size?: number;
  className?: string;
}

/** Darken a hex color by mixing with ink */
function darkenFill(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const ink = [0x2c, 0x18, 0x10];
  const nr = Math.round(r + (ink[0] - r) * amount);
  const ng = Math.round(g + (ink[1] - g) * amount);
  const nb = Math.round(b + (ink[2] - b) * amount);
  return `rgb(${nr},${ng},${nb})`;
}

/** Lighten a hex color by mixing with cream */
function lightenFill(hex: string, amount = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const cream = [0xf5, 0xf0, 0xe8];
  const nr = Math.round(r + (cream[0] - r) * amount);
  const ng = Math.round(g + (cream[1] - g) * amount);
  const nb = Math.round(b + (cream[2] - b) * amount);
  return `rgb(${nr},${ng},${nb})`;
}

/**
 * Render a face onto the vase at the given position.
 * cx/cy = center of face area; scale = size factor.
 */
function FaceOverlay({
  face,
  cx,
  cy,
  scale,
}: {
  face: FaceId;
  cx: number;
  cy: number;
  scale: number;
}) {
  if (face === "none") return null;

  const ink = "#2C1810";
  const blushColor = "rgba(212,132,122,0.55)";
  const s = scale; // shorthand

  switch (face) {
    case "happy":
      return (
        <g>
          {/* Eyes: two filled dots */}
          <circle cx={cx - 3.5 * s} cy={cy - 1 * s} r={1.1 * s} fill={ink} />
          <circle cx={cx + 3.5 * s} cy={cy - 1 * s} r={1.1 * s} fill={ink} />
          {/* Smile: small arc */}
          <path
            d={`M ${cx - 3 * s} ${cy + 2.5 * s} Q ${cx} ${cy + 5.5 * s} ${cx + 3 * s} ${cy + 2.5 * s}`}
            stroke={ink}
            strokeWidth={1.1 * s}
            fill="none"
            strokeLinecap="round"
          />
          {/* Blush circles */}
          <ellipse cx={cx - 5 * s} cy={cy + 2 * s} rx={2.2 * s} ry={1.4 * s} fill={blushColor} />
          <ellipse cx={cx + 5 * s} cy={cy + 2 * s} rx={2.2 * s} ry={1.4 * s} fill={blushColor} />
        </g>
      );

    case "sleepy":
      return (
        <g>
          {/* Half-closed eyes: arcs */}
          <path
            d={`M ${cx - 5 * s} ${cy - 0.5 * s} Q ${cx - 3.5 * s} ${cy - 2.5 * s} ${cx - 2 * s} ${cy - 0.5 * s}`}
            stroke={ink}
            strokeWidth={1.1 * s}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${cx + 2 * s} ${cy - 0.5 * s} Q ${cx + 3.5 * s} ${cy - 2.5 * s} ${cx + 5 * s} ${cy - 0.5 * s}`}
            stroke={ink}
            strokeWidth={1.1 * s}
            fill="none"
            strokeLinecap="round"
          />
          {/* Zzz dots */}
          <circle cx={cx + 5.8 * s} cy={cy - 3 * s} r={0.7 * s} fill={ink} fillOpacity="0.6" />
          <circle cx={cx + 7.2 * s} cy={cy - 4.5 * s} r={0.5 * s} fill={ink} fillOpacity="0.4" />
          {/* Gentle smile */}
          <path
            d={`M ${cx - 2.5 * s} ${cy + 3 * s} Q ${cx} ${cy + 5 * s} ${cx + 2.5 * s} ${cy + 3 * s}`}
            stroke={ink}
            strokeWidth={1 * s}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );

    case "winky":
      return (
        <g>
          {/* Left eye: filled dot */}
          <circle cx={cx - 3.5 * s} cy={cy - 1 * s} r={1.1 * s} fill={ink} />
          {/* Right eye: wink arc */}
          <path
            d={`M ${cx + 2 * s} ${cy - 1 * s} Q ${cx + 3.5 * s} ${cy - 3 * s} ${cx + 5 * s} ${cy - 1 * s}`}
            stroke={ink}
            strokeWidth={1.1 * s}
            fill="none"
            strokeLinecap="round"
          />
          {/* Wide grin */}
          <path
            d={`M ${cx - 3.5 * s} ${cy + 2 * s} Q ${cx} ${cy + 6 * s} ${cx + 3.5 * s} ${cy + 2 * s}`}
            stroke={ink}
            strokeWidth={1.1 * s}
            fill="none"
            strokeLinecap="round"
          />
          {/* One blush */}
          <ellipse cx={cx + 5.5 * s} cy={cy + 2.5 * s} rx={2 * s} ry={1.3 * s} fill={blushColor} />
        </g>
      );

    case "surprised":
      return (
        <g>
          {/* Wide round eyes */}
          <circle cx={cx - 3.5 * s} cy={cy - 1.5 * s} r={1.7 * s} fill={ink} />
          <circle cx={cx + 3.5 * s} cy={cy - 1.5 * s} r={1.7 * s} fill={ink} />
          {/* Tiny white shine dots */}
          <circle cx={cx - 4 * s} cy={cy - 2 * s} r={0.6 * s} fill="white" />
          <circle cx={cx + 3 * s} cy={cy - 2 * s} r={0.6 * s} fill="white" />
          {/* Open-O mouth */}
          <ellipse cx={cx} cy={cy + 3.5 * s} rx={2 * s} ry={2.5 * s} fill={ink} />
          <ellipse cx={cx} cy={cy + 3.5 * s} rx={1.2 * s} ry={1.7 * s} fill={lightenFill("#B85C2A", 0.6)} />
        </g>
      );

    default:
      return null;
  }
}

/** Compute face center position relative to the vase shape */
function getFacePosition(
  kind: "preset" | "thrown" | "thrown2",
  path: string,
  thrownParams?: ThrownParams,
  thrown2?: { h: number; widths: number[] }
): { cx: number; cy: number; scale: number } {
  if (kind === "thrown" && thrownParams) {
    const { h, b } = thrownParams;
    // topY = 4 + (1 - h) * 14
    const topY = 4 + (1 - h) * 14;
    const bottomY = 60;
    // Face at ~55% of height (upper body / chest area)
    const faceY = topY + (bottomY - topY) * 0.52;
    // Scale based on belly width
    const scale = 0.55 + b * 0.35;
    return { cx: 32, cy: faceY, scale };
  }
  if (kind === "thrown2" && thrown2) {
    const { h, widths } = thrown2;
    // Use the actual lip/foot ys from the path builder helpers
    const lipY = thrown2LipY(h);    // h=0 → 34, h=1 → 6
    const footY = THROWN2_FOOT_Y;  // 58
    // Place face near the widest band in the upper portion
    const N = widths.length;
    const upperThirdEnd = Math.ceil(N * 0.67);
    let maxW = -1;
    let maxIdx = Math.floor(N * 0.5);
    for (let i = 1; i < upperThirdEnd; i++) {
      if (widths[i] > maxW) { maxW = widths[i]; maxIdx = i; }
    }
    const t = maxIdx / (N - 1);
    // bandY at maxIdx: footY - t*(footY-lipY)
    const faceY = footY - t * (footY - lipY);
    const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
    const scale = 0.5 + avgWidth * 0.4;
    return { cx: 32, cy: faceY, scale };
  }
  // For preset shapes: center vertically around 57% of viewBox height, centered X
  return { cx: 32, cy: 36, scale: 0.9 };
}

export default function VaseAvatar({
  shape: shapeProp,
  glaze: glazeProp,
  pattern: patternProp,
  size = 32,
  className,
}: VaseAvatarProps) {
  // Parse shape
  const parsed = parseShape(shapeProp ?? "round-belly");
  const isThrownShape = parsed.kind === "thrown";
  const isThrown2Shape = parsed.kind === "thrown2";

  // Resolve the SVG path
  const vasePath = isThrownShape
    ? buildThrownPath(parsed.params)
    : isThrown2Shape
      ? buildThrown2Path(parsed.h, parsed.widths, parsed.edge)
      : getShape(parsed.id).path;

  const glazeData  = getGlaze(glazeProp  ?? "terracotta");
  const patternId  = (patternProp ?? "plain") as AvatarPattern;

  // Face only exists on thrown vases
  const face: FaceId = (isThrownShape || isThrown2Shape) ? parsed.face : "none";

  // useId guarantees document-unique, SSR/hydration-stable ids even when the
  // same shape/glaze/pattern combo renders multiple times on one page.
  // Strip the delimiter chars (e.g. «r1» / :r1:) — they break url(#...) refs.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `clip-${uid}`;
  const patId  = `pat-${uid}`;

  const fill        = glazeData.fill;
  const patternFill = darkenFill(fill, 0.28);
  const patternFillLight = lightenFill(fill, 0.35);
  const ink         = "#2C1810";

  // Render pattern defs
  function renderPatternDef() {
    switch (patternId) {
      case "stripes":
        return (
          <pattern id={patId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={patternFill} strokeWidth="3" strokeOpacity="0.5" />
          </pattern>
        );
      case "dots":
        return (
          <pattern id={patId} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1.8" fill={patternFill} fillOpacity="0.55" />
          </pattern>
        );
      case "squiggle":
        return (
          <pattern id={patId} width="14" height="12" patternUnits="userSpaceOnUse">
            <path
              d="M 0 6 C 2 3 4 3 7 6 C 10 9 12 9 14 6"
              stroke={patternFill}
              strokeWidth="1.4"
              strokeOpacity="0.55"
              fill="none"
              strokeLinecap="round"
            />
          </pattern>
        );
      case "flowers":
        return (
          <pattern id={patId} width="14" height="14" patternUnits="userSpaceOnUse">
            <g transform="translate(7,7)">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <ellipse
                  key={deg}
                  cx={0}
                  cy={-3}
                  rx={1.2}
                  ry={2.4}
                  fill={patternFill}
                  fillOpacity="0.5"
                  transform={`rotate(${deg})`}
                />
              ))}
              <circle cx={0} cy={0} r={1.2} fill={patternFillLight} fillOpacity="0.8" />
            </g>
          </pattern>
        );
      default:
        return null;
    }
  }

  // Face position
  const { cx: faceCx, cy: faceCy, scale: faceScale } = getFacePosition(
    parsed.kind,
    vasePath,
    isThrownShape ? parsed.params : undefined,
    isThrown2Shape ? { h: parsed.h, widths: parsed.widths } : undefined
  );

  // Scale the face rendering (faces are designed at scale=1 for ~64px, so adjust)
  const faceSizeScale = (size / 64) * faceScale;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={vasePath} />
        </clipPath>
        {renderPatternDef()}
      </defs>

      {/* Vase fill */}
      <path
        d={vasePath}
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pattern overlay (clipped to vase) */}
      {patternId !== "plain" && (
        <rect
          x="0"
          y="0"
          width="64"
          height="64"
          fill={`url(#${patId})`}
          clipPath={`url(#${clipId})`}
        />
      )}

      {/* Face overlay (only for thrown vases with a face) */}
      {face !== "none" && (
        <FaceOverlay
          face={face}
          cx={faceCx}
          cy={faceCy}
          scale={faceSizeScale}
        />
      )}

      {/* Ink outline – hand-drawn feel with slight dasharray */}
      <path
        d={vasePath}
        fill="none"
        stroke={ink}
        strokeWidth={size < 40 ? 1.8 : 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Subtle glaze highlight */}
      <path
        d={vasePath}
        fill="none"
        stroke={lightenFill(fill, 0.6)}
        strokeWidth={size < 40 ? 1 : 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 28"
        strokeDashoffset="6"
        opacity="0.7"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
