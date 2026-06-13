"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import VaseAvatar from "./VaseAvatar";
import DoodleIcon from "@/components/ui/DoodleIcon";
import {
  AVATAR_GLAZES,
  AVATAR_PATTERNS,
  AVATAR_FACES,
  encodeThrown2Shape,
  buildThrown2Path,
  bandsForHeight,
  resampleWidths,
  clamp01,
  thrown2LipY,
  THROWN2_FOOT_Y,
} from "@/lib/avatars";
import type { AvatarPattern, FaceId } from "@/lib/avatars";

// ── Animation keyframes ───────────────────────────────────────────────────

const HARD_MODE_STYLES = `
@keyframes hmWheelSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes hmWheelSpinFast {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes hmClayWobble {
  0%   { transform: translate(var(--wx, 0px), 0px) scale(1, 1); }
  25%  { transform: translate(calc(var(--wx, 0px) * 0.7), -1px) scale(1.02, 0.98); }
  50%  { transform: translate(calc(var(--wx, 0px) * -0.4), 0px) scale(1, 1); }
  75%  { transform: translate(calc(var(--wx, 0px) * 0.9), 1px) scale(0.98, 1.02); }
  100% { transform: translate(var(--wx, 0px), 0px) scale(1, 1); }
}
@keyframes hmPulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
@keyframes hmSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hmRingPop {
  0%   { r: 0; opacity: 0.9; }
  60%  { r: 18; opacity: 0.5; }
  100% { r: 26; opacity: 0; }
}
@keyframes hmShimmer {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -80; }
}
@keyframes hmGlowPulse {
  0%, 100% { opacity: 0.3; filter: blur(2px); }
  50%       { opacity: 0.7; filter: blur(3px); }
}
@keyframes hmWallRise {
  from { transform: scaleY(0); transform-origin: bottom; opacity: 0; }
  to   { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
}
@keyframes hmWobbleSettle {
  0%   { transform: translateX(var(--wobble-x)); }
  100% { transform: translateX(0px); }
}
@keyframes hmStageIn {
  from { opacity: 0; transform: translateY(6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

// ── Stage definitions ─────────────────────────────────────────────────────

type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STAGE_LABELS: Record<Stage, string> = {
  0: "choose your pulls",
  1: "center the clay",
  2: "open the floor",
  3: "pull up the walls",
  4: "finish the form",
  5: "glaze & pattern",
  6: "ready to throw",
};

const STAGE_HINTS: Record<Stage, string> = {
  0: "fewer pulls = more challenge",
  1: "press & hold to steady the wobble",
  2: "drag outward to widen the opening",
  3: "drag upward & outward to pull the walls",
  4: "flare the lip, set the edge style",
  5: "choose your glaze, pattern & face",
  6: "your pot is ready",
};

// ── The spinning wheel SVG ────────────────────────────────────────────────

function SpinningWheel({ speed = 1, glowing = false }: { speed?: number; glowing?: boolean }) {
  return (
    <svg width="260" height="50" viewBox="0 0 260 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="130" cy="44" rx="108" ry="6" fill="rgba(0,0,0,0.22)" />
      {/* Wheel body */}
      <ellipse cx="130" cy="30" rx="106" ry="16" fill="#3A2215" />
      <ellipse cx="130" cy="26" rx="106" ry="14" fill="#4A2E1A" />
      {/* Spinning grooves */}
      <g
        style={{
          transformOrigin: "130px 26px",
          animation: `hmWheelSpin ${3 / speed}s linear infinite`,
        }}
      >
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <line
            key={angle}
            x1="130"
            y1="26"
            x2={130 + Math.cos((angle * Math.PI) / 180) * 96}
            y2={26 + Math.sin((angle * Math.PI) / 180) * 12}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.2"
          />
        ))}
        <ellipse cx="130" cy="26" rx="40" ry="5.5" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
        <ellipse cx="130" cy="26" rx="72" ry="10" stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />
      </g>
      {/* Highlight rim */}
      <ellipse cx="130" cy="22" rx="106" ry="14" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {/* Center hub glow */}
      {glowing && (
        <ellipse
          cx="130"
          cy="26"
          rx="14"
          ry="4"
          fill="rgba(184,92,42,0.5)"
          style={{ animation: "hmGlowPulse 1.4s ease-in-out infinite" }}
        />
      )}
      <ellipse cx="130" cy="24" rx="12" ry="3.5" fill="rgba(255,255,255,0.14)" style={{ animation: "hmPulse 2s ease-in-out infinite" }} />
      {/* Wheel shaft */}
      <rect x="123" y="38" width="14" height="10" rx="2" fill="#2A1810" />
    </svg>
  );
}

// ── Coaching text component ───────────────────────────────────────────────

function CoachText({ text, key: _k }: { text: string; key?: string }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-hand)",
        fontSize: "1rem",
        color: "#E8D5B0",
        textAlign: "center",
        opacity: 0.9,
        animation: "hmSlideUp 0.35s ease both",
        minHeight: "1.5em",
      }}
    >
      {text}
    </p>
  );
}

// ── Stage 0: Choose pulls ─────────────────────────────────────────────────

function ChoosePulls({ onChoose }: { onChoose: (n: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: "hmStageIn 0.4s ease both" }}>
      <p style={{ fontFamily: "var(--font-hand)", fontSize: "1.05rem", color: "#E8D5B0", textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
        how many pulls will you take?
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {[3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChoose(n)}
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#F5F0E8",
              background: "rgba(184,92,42,0.18)",
              border: "2px solid rgba(184,92,42,0.55)",
              borderRadius: 14,
              width: 72,
              height: 72,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              transition: "background 0.15s, transform 0.1s, border-color 0.15s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(184,92,42,0.38)";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06) translateY(-2px)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184,92,42,0.85)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(184,92,42,0.18)";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184,92,42,0.55)";
            }}
          >
            <span>{n}</span>
            <span style={{ fontSize: "0.55rem", color: "rgba(232,213,176,0.6)", letterSpacing: 1 }}>
              {n === 3 ? "HARD" : n === 4 ? "BALANCED" : "GUIDED"}
            </span>
          </button>
        ))}
      </div>
      <p style={{ fontFamily: "var(--font-hand)", fontSize: "0.82rem", color: "rgba(232,213,176,0.5)", textAlign: "center" }}>
        fewer pulls = fewer chances to shape the clay
      </p>
    </div>
  );
}

// ── Stage 1: Center the clay ──────────────────────────────────────────────

interface CenterStageProps {
  onComplete: (centerScore: number) => void;
}

function CenterStage({ onComplete }: CenterStageProps) {
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const holdingRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const wobbleAmplitudeRef = useRef(1); // 0..1 (1 = max off-center)
  const [wobbleX, setWobbleX] = useState(0);
  const [wobbleAmp, setWobbleAmp] = useState(1);
  const [isHolding, setIsHolding] = useState(false);
  const [coaching, setCoaching] = useState("press & hold the clay to steady it…");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animate = () => {
      const now = performance.now();
      const t = (now - startTimeRef.current) / 1000;
      const amp = wobbleAmplitudeRef.current;

      // Wobble: sum of harmonics for organic feel
      const wx =
        Math.sin(t * 2.3) * 18 * amp +
        Math.sin(t * 3.7 + 0.8) * 9 * amp +
        Math.sin(t * 5.1 + 1.4) * 4 * amp;

      setWobbleX(wx);

      // If holding, shrink amplitude
      if (holdingRef.current && holdStartRef.current !== null) {
        const holdDuration = (now - holdStartRef.current) / 1000;
        // Converges toward 0 over ~2.5 seconds
        const newAmp = Math.max(0, 1 - holdDuration / 2.5);
        wobbleAmplitudeRef.current = newAmp;
        setWobbleAmp(newAmp);

        if (newAmp < 0.08) {
          setCoaching("✓ perfectly centered — release to continue");
        } else if (newAmp < 0.35) {
          setCoaching("almost there… keep holding…");
        } else {
          setCoaching("press & hold to steady the clay…");
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    holdingRef.current = true;
    holdStartRef.current = performance.now();
    setIsHolding(true);
  }

  function handlePointerUp() {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setIsHolding(false);

    // centerScore = 1 - final amplitude (inverted: lower wobble = better score)
    const centerScore = 1 - wobbleAmplitudeRef.current;
    onComplete(centerScore);
  }

  function handlePointerCancel() {
    holdingRef.current = false;
    setIsHolding(false);
  }

  // Color of the clay lump: gets more "centered" (warmer, calmer) as wobble drops
  const lumpHue = Math.round(20 + (1 - wobbleAmp) * 8);
  const lumpLight = Math.round(38 + (1 - wobbleAmp) * 12);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, animation: "hmStageIn 0.4s ease both" }}>
      <CoachText text={coaching} />

      {/* The centering arena */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          width: 240,
          height: 160,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isHolding ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Wheel surface concentric rings */}
        <svg width="240" height="160" viewBox="0 0 240 160" style={{ position: "absolute", inset: 0 }}>
          {[70, 55, 40, 25, 12].map((r, i) => (
            <ellipse
              key={i}
              cx="120"
              cy="80"
              rx={r}
              ry={r * 0.42}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              fill="none"
            />
          ))}
          {/* Center cross-hair */}
          <line x1="116" y1="80" x2="124" y2="80" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="120" y1="76" x2="120" y2="84" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="2 2" />
        </svg>

        {/* Clay lump — wobbles off-axis */}
        <div
          style={{
            position: "relative",
            transform: `translateX(${wobbleX}px)`,
            transition: isHolding ? "none" : undefined,
            zIndex: 2,
          }}
        >
          {/* Glow ring when holding */}
          {isHolding && (
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(184,92,42,${0.3 + (1 - wobbleAmp) * 0.3}) 0%, transparent 70%)`,
                animation: "hmPulse 0.8s ease-in-out infinite",
              }}
            />
          )}
          <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
            {/* Clay lump shape — organic blob */}
            <path
              d={`M 40 10
                  C 54 10 68 20 70 32
                  C 72 44 62 56 48 58
                  C 42 59 38 59 32 58
                  C 18 56 8 44 10 32
                  C 12 20 26 10 40 10 Z`}
              fill={`hsl(${lumpHue}, 55%, ${lumpLight}%)`}
              stroke="rgba(44,24,16,0.6)"
              strokeWidth="1.5"
            />
            {/* Clay texture lines */}
            <path d="M 26 28 Q 40 25 54 28" stroke="rgba(44,24,16,0.2)" strokeWidth="1" fill="none" />
            <path d="M 22 36 Q 40 32 58 36" stroke="rgba(44,24,16,0.15)" strokeWidth="1" fill="none" />
            {/* Wet clay sheen */}
            <ellipse cx="30" cy="22" rx="8" ry="5" fill="rgba(255,255,255,0.18)" transform="rotate(-15 30 22)" />
          </svg>
        </div>

        {/* Wobble amplitude indicator bar */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 20,
            right: 20,
            height: 4,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 2,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(1 - wobbleAmp) * 100}%`,
              background: `hsl(${90 + (1 - wobbleAmp) * 40}, 60%, 55%)`,
              borderRadius: 2,
              transition: "width 0.1s ease",
            }}
          />
        </div>
        <span style={{ position: "absolute", bottom: 14, right: 20, fontFamily: "var(--font-hand)", fontSize: "0.7rem", color: "rgba(232,213,176,0.5)" }}>
          {Math.round((1 - wobbleAmp) * 100)}% centered
        </span>
      </div>

      <p style={{ fontFamily: "var(--font-hand)", fontSize: "0.8rem", color: "rgba(232,213,176,0.45)", textAlign: "center" }}>
        release at any time — how centered you are shapes the reading
      </p>
    </div>
  );
}

// ── Stage 2: Open the floor ───────────────────────────────────────────────

interface OpenFloorStageProps {
  onComplete: (footWidth: number) => void;
}

function OpenFloorStage({ onComplete }: OpenFloorStageProps) {
  const [radius, setRadius] = useState(0.15); // 0..1 = foot width
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; startR: number } | null>(null);
  const CENTER = 90; // px

  function getDistance(cx: number, cy: number, ex: number, ey: number): number {
    return Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    const rect = containerRef.current!.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    startRef.current = { x: ex, y: ey, startR: radius };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !startRef.current || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const dist = getDistance(CENTER, CENTER, ex, ey);
    // Map dist 0..CENTER-10 to 0..1 foot width
    const newR = clamp01(dist / (CENTER - 10));
    setRadius(newR);
  }

  function handlePointerUp() {
    setIsDragging(false);
    startRef.current = null;
  }

  const displayR = Math.round(radius * 78) + 8; // px radius in the SVG (8..86)

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animation: "hmStageIn 0.4s ease both" }}>
      <CoachText text={isDragging ? `opening to ${Math.round(radius * 100)}%…` : "drag outward to open the clay floor"} />

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: CENTER * 2,
          height: CENTER * 2,
          borderRadius: "50%",
          background: "radial-gradient(circle at 45% 40%, #3D2310, #1A0E08)",
          border: "2px solid rgba(255,255,255,0.08)",
          position: "relative",
          cursor: isDragging ? "grabbing" : "crosshair",
          touchAction: "none",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <svg width={CENTER * 2} height={CENTER * 2} viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`} style={{ position: "absolute", inset: 0 }}>
          {/* Top-down wheel rings */}
          {[80, 65, 50, 35, 20].map((r) => (
            <circle key={r} cx={CENTER} cy={CENTER} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />
          ))}
          {/* Spinning spokes */}
          {[0, 45, 90, 135].map((a) => (
            <line
              key={a}
              x1={CENTER}
              y1={CENTER}
              x2={CENTER + Math.cos((a * Math.PI) / 180) * 84}
              y2={CENTER + Math.sin((a * Math.PI) / 180) * 84}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "hmWheelSpin 4s linear infinite" }}
            />
          ))}

          {/* Clay ring — the opening */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={84}
            fill="none"
            stroke="rgba(120,60,20,0.5)"
            strokeWidth="10"
          />
          {/* Opening hole */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={displayR}
            fill="rgba(0,0,0,0.7)"
            stroke="rgba(184,92,42,0.7)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          {/* Inner glow at opening edge */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={displayR}
            fill="none"
            stroke="rgba(184,92,42,0.35)"
            strokeWidth="5"
            style={{ filter: "blur(2px)" }}
          />
          {/* Center dot */}
          <circle cx={CENTER} cy={CENTER} r={4} fill="rgba(184,92,42,0.6)" />
          {/* Radius dimension line */}
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + displayR}
            y2={CENTER}
            stroke="rgba(232,213,176,0.3)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </svg>
      </div>

      <p style={{ fontFamily: "var(--font-hand)", fontSize: "0.88rem", color: "#E8D5B0" }}>
        floor opening: <strong>{Math.round(radius * 100)}%</strong>
      </p>

      <button
        type="button"
        onClick={() => onComplete(radius)}
        style={{
          fontFamily: "var(--font-hand)",
          fontSize: "1rem",
          color: "#F5F0E8",
          background: "rgba(184,92,42,0.3)",
          border: "1.5px solid rgba(184,92,42,0.6)",
          borderRadius: 10,
          padding: "8px 28px",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.5)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.3)"; }}
      >
        continue ▶
      </button>
    </div>
  );
}

// ── Stage 3: Pull up the walls ────────────────────────────────────────────

interface PullWallsStageProps {
  pullCount: number;
  initialFootWidth: number;
  onComplete: (h: number, widths: number[], throwScore: number) => void;
}

interface PullResult {
  bandIndex: number;
  width: number;
}

function PullWallsStage({ pullCount, initialFootWidth, onComplete }: PullWallsStageProps) {
  const [currentPull, setCurrentPull] = useState(0);
  const [totalH, setTotalH] = useState(0.05); // starts very short, grows
  const [bandWidths, setBandWidths] = useState<number[]>(() => [initialFootWidth]);
  const [penaltyScore, setPenaltyScore] = useState(1); // 1 = perfect, decreases on over-pull
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<{ dy: number; dx: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const PREVIEW_W = 200;
  const PREVIEW_H = 260;

  // Max h gain per pull (clamped so you can't over-pull in one go)
  const MAX_H_PER_PULL = 0.85 / pullCount;

  // Build current shape for preview
  const targetBands = bandsForHeight(totalH);
  const currentWidths = bandWidths.length === targetBands
    ? bandWidths
    : resampleWidths(bandWidths, targetBands);
  const edges = Array(targetBands).fill(0);
  const previewPath = buildThrown2Path(totalH, currentWidths, edges);

  function handlePointerDown(e: React.PointerEvent) {
    if (currentPull >= pullCount) return;
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setDragProgress({ dy: 0, dx: 0 });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !dragStartRef.current) return;
    e.preventDefault();
    const dy = dragStartRef.current.y - e.clientY; // positive = upward drag
    const dx = e.clientX - dragStartRef.current.x;
    setDragProgress({ dy, dx });
  }

  function handlePointerUp() {
    if (!isDragging || !dragStartRef.current || !dragProgress) return;
    setIsDragging(false);

    const { dy, dx } = dragProgress;
    dragStartRef.current = null;
    setDragProgress(null);

    // Calculate height gain from upward drag (positive dy)
    const hGain = clamp01((dy / PREVIEW_H) * 1.8) * MAX_H_PER_PULL;
    const newH = clamp01(totalH + hGain);

    // Width for the new band from horizontal drag
    const rawWidthFromDrag = 0.4 + (dx / PREVIEW_W) * 0.8;
    // Clamp — over-pulling adds penalty
    const isOverpull = rawWidthFromDrag > 0.95 || rawWidthFromDrag < 0.05;
    const bandWidth = clamp01(rawWidthFromDrag);

    if (isOverpull) {
      setPenaltyScore((s) => Math.max(0.3, s - 0.12));
    }

    // Add the new band
    const newBands = bandsForHeight(newH);
    const newBandWidths = resampleWidths([...bandWidths.slice(), bandWidth], newBands);
    setBandWidths(newBandWidths);
    setTotalH(newH);
    setCurrentPull((p) => p + 1);

    if (currentPull + 1 >= pullCount) {
      // Done — compute final throw score
      const finalScore = penaltyScore * (isOverpull ? 0.88 : 1) * (hGain > 0.02 ? 1 : 0.85);
      setTimeout(() => onComplete(newH, newBandWidths, clamp01(finalScore)), 300);
    }
  }

  function handlePointerCancel() {
    setIsDragging(false);
    dragStartRef.current = null;
    setDragProgress(null);
  }

  // Live preview: adjust current height/width from drag progress
  let previewH = totalH;
  let previewWidths = currentWidths.slice();
  if (isDragging && dragProgress) {
    const { dy, dx } = dragProgress;
    const liveHGain = clamp01((dy / PREVIEW_H) * 1.8) * MAX_H_PER_PULL;
    previewH = clamp01(totalH + liveHGain);
    const liveBands = bandsForHeight(previewH);
    const liveBandWidth = clamp01(0.4 + (dx / PREVIEW_W) * 0.8);
    const liveWidths = resampleWidths([...bandWidths, liveBandWidth], liveBands);
    previewWidths = liveWidths;
  }

  const liveEdges = Array(bandsForHeight(previewH)).fill(0);
  const livePath = buildThrown2Path(previewH, previewWidths.length === bandsForHeight(previewH) ? previewWidths : resampleWidths(previewWidths, bandsForHeight(previewH)), liveEdges);

  const coaching =
    currentPull >= pullCount
      ? "walls raised — moving on…"
      : isDragging
      ? `pull ${currentPull + 1} of ${pullCount}: drag up to raise, left/right to shape`
      : `pull ${currentPull + 1} of ${pullCount} — drag upward from the clay`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, animation: "hmStageIn 0.4s ease both" }}>
      <CoachText text={coaching} />

      {/* Pull progress dots */}
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: pullCount }, (_, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: i < currentPull
                ? "#B85C2A"
                : i === currentPull
                ? "rgba(184,92,42,0.5)"
                : "rgba(255,255,255,0.15)",
              transition: "background 0.2s",
              border: i === currentPull ? "1.5px solid rgba(184,92,42,0.8)" : "none",
            }}
          />
        ))}
      </div>

      {/* Vessel side-view sculpting area */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          width: PREVIEW_W,
          height: PREVIEW_H,
          position: "relative",
          cursor: currentPull >= pullCount ? "default" : isDragging ? "grabbing" : "ns-resize",
          touchAction: "none",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Background grid lines */}
        <svg style={{ position: "absolute", inset: 0 }} width={PREVIEW_W} height={PREVIEW_H} fill="none">
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1="0"
              y1={PREVIEW_H * t}
              x2={PREVIEW_W}
              y2={PREVIEW_H * t}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          ))}
        </svg>

        {/* Live vase preview */}
        <svg
          width={PREVIEW_W}
          height={PREVIEW_H}
          viewBox="0 0 64 64"
          fill="none"
          style={{ position: "absolute", inset: 0, transition: isDragging ? "none" : "all 0.15s ease" }}
        >
          {/* Vase fill */}
          <path d={livePath} fill="rgba(120,60,20,0.7)" />
          {/* Vase outline */}
          <path d={livePath} fill="none" stroke="#B85C2A" strokeWidth="1.5" strokeLinecap="round" />
          {/* Animated shimmer */}
          <path
            d={livePath}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
            strokeDasharray="6 50"
            style={{ animation: "hmShimmer 2s linear infinite" }}
          />
          {/* Band markers */}
          {Array.from({ length: bandsForHeight(previewH) }, (_, i) => {
            const t = i / (bandsForHeight(previewH) - 1);
            const y = THROWN2_FOOT_Y - t * (THROWN2_FOOT_Y - thrown2LipY(previewH));
            return (
              <line
                key={i}
                x1="6"
                y1={y}
                x2="10"
                y2={y}
                stroke="rgba(232,213,176,0.3)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Drag hint arrows */}
        {!isDragging && currentPull < pullCount && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontFamily: "var(--font-hand)", fontSize: "1.8rem", color: "rgba(232,213,176,0.18)", letterSpacing: "-0.05em" }}>
              ↑
            </span>
          </div>
        )}
      </div>

      {/* Height indicator */}
      <p style={{ fontFamily: "var(--font-hand)", fontSize: "0.82rem", color: "rgba(232,213,176,0.6)" }}>
        height: {Math.round(totalH * 100)}% &nbsp;·&nbsp; {pullCount - currentPull} pull{pullCount - currentPull !== 1 ? "s" : ""} remaining
      </p>
    </div>
  );
}

// ── Stage 4: Finish the form ──────────────────────────────────────────────

interface FinishFormStageProps {
  h: number;
  widths: number[];
  onComplete: (widths: number[], edges: number[]) => void;
}

function FinishFormStage({ h, widths: initialWidths, onComplete }: FinishFormStageProps) {
  const N = bandsForHeight(h);
  const [widths, setWidths] = useState<number[]>(() =>
    initialWidths.length === N ? initialWidths : resampleWidths(initialWidths, N)
  );
  const [edges, setEdges] = useState<number[]>(() => Array(N).fill(0));
  const [lipFlare, setLipFlare] = useState(0.5); // 0=collar, 1=flared
  const PREVIEW_W = 200;
  const PREVIEW_H = 260;

  // Apply lip flare to the top band
  const displayWidths = widths.map((w, i) => {
    if (i === N - 1) {
      // Lip band: scale between collar (0.3) and flare (original + boost)
      return clamp01(0.25 + lipFlare * (w + 0.15 - 0.25));
    }
    return w;
  });

  const liveShape = encodeThrown2Shape(h, displayWidths, "none", edges);
  const livePath = buildThrown2Path(h, displayWidths, edges);

  function setEdgeStyle(style: "round" | "straight" | "mixed") {
    if (style === "round") setEdges(Array(N).fill(0));
    else if (style === "straight") setEdges(Array(N).fill(1));
    else {
      // Mixed: alternate round/straight
      setEdges(Array.from({ length: N }, (_, i) => (i % 2 === 0 ? 0 : 0.85)));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animation: "hmStageIn 0.4s ease both" }}>
      <CoachText text="shape the lip & set the edge style" />

      {/* Live preview */}
      <svg width={PREVIEW_W} height={PREVIEW_H} viewBox="0 0 64 64" fill="none">
        <path d={livePath} fill="rgba(120,60,20,0.7)" />
        <path d={livePath} fill="none" stroke="#B85C2A" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d={livePath}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeDasharray="6 50"
          style={{ animation: "hmShimmer 2.2s linear infinite" }}
        />
      </svg>

      {/* Lip flare control */}
      <div style={{ width: "100%", maxWidth: 260, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.82rem", color: "rgba(232,213,176,0.7)" }}>collar</span>
          <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.88rem", color: "#E8D5B0" }}>lip shape</span>
          <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.82rem", color: "rgba(232,213,176,0.7)" }}>flared</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(lipFlare * 100)}
          onChange={(e) => setLipFlare(parseInt(e.target.value) / 100)}
          style={{ width: "100%", accentColor: "#B85C2A" }}
        />
      </div>

      {/* Edge style */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.88rem", color: "rgba(232,213,176,0.7)" }}>edge style</span>
        <div style={{ display: "flex", gap: 10 }}>
          {(["round", "straight", "mixed"] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setEdgeStyle(style)}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.85rem",
                color: "#F5F0E8",
                background: "rgba(184,92,42,0.15)",
                border: "1.5px solid rgba(184,92,42,0.4)",
                borderRadius: 8,
                padding: "5px 14px",
                cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.35)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.15)"; }}
            >
              {style === "round" ? "◠ round" : style === "straight" ? "◇ crisp" : "◈ mixed"}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onComplete(displayWidths, edges)}
        style={{
          fontFamily: "var(--font-hand)",
          fontSize: "1rem",
          color: "#F5F0E8",
          background: "rgba(184,92,42,0.3)",
          border: "1.5px solid rgba(184,92,42,0.6)",
          borderRadius: 10,
          padding: "8px 28px",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.5)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.3)"; }}
      >
        continue ▶
      </button>
    </div>
  );
}

// ── Stage 5: Glaze, pattern & face ────────────────────────────────────────

interface GlazeStageProps {
  h: number;
  widths: number[];
  edges: number[];
  onComplete: (glaze: string, pattern: AvatarPattern, face: FaceId) => void;
}

function GlazePicker({ glaze, onGlazeChange }: { glaze: string; onGlazeChange: (v: string) => void }) {
  const resolvedHex = /^#[0-9A-Fa-f]{6}$/.test(glaze)
    ? glaze
    : (AVATAR_GLAZES.find((g) => g.id === glaze)?.fill ?? "#B85C2A");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", alignItems: "center" }}>
      {AVATAR_GLAZES.map((g) => {
        const isSelected = glaze === g.id || glaze === g.fill;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onGlazeChange(g.id)}
            title={g.label}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: g.fill,
              border: isSelected ? "2.5px solid #F5F0E8" : "2px solid rgba(255,255,255,0.15)",
              transform: isSelected ? "scale(1.2)" : "scale(1)",
              cursor: "pointer",
              boxShadow: isSelected ? "0 0 0 3px rgba(184,92,42,0.5)" : "none",
              transition: "all 0.12s",
              flexShrink: 0,
            }}
            aria-label={g.label}
          />
        );
      })}
      {/* Custom color */}
      <label
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: resolvedHex,
          border: "2px dashed rgba(255,255,255,0.3)",
          cursor: "pointer",
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
        title="Custom color"
      >
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>+</span>
        <input
          type="color"
          value={resolvedHex}
          onChange={(e) => onGlazeChange(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
        />
      </label>
    </div>
  );
}

function GlazeStage({ h, widths, edges, onComplete }: GlazeStageProps) {
  const [glaze, setGlaze] = useState<string>("terracotta");
  const [pattern, setPattern] = useState<AvatarPattern>("plain");
  const [face, setFace] = useState<FaceId>("happy");
  const PREVIEW_SIZE = 160;

  const shapeStr = encodeThrown2Shape(h, widths, face, edges);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, animation: "hmStageIn 0.4s ease both" }}>
      <CoachText text="fire it up — choose your glaze & face" />

      {/* Live preview */}
      <VaseAvatar shape={shapeStr} glaze={glaze} pattern={pattern} size={PREVIEW_SIZE} />

      {/* Glaze */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", width: "100%" }}>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.88rem", color: "rgba(232,213,176,0.7)" }}>glaze</span>
        <GlazePicker glaze={glaze} onGlazeChange={setGlaze} />
      </div>

      {/* Pattern */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.88rem", color: "rgba(232,213,176,0.7)" }}>pattern</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {AVATAR_PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPattern(p.id)}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.78rem",
                color: pattern === p.id ? "#F5F0E8" : "rgba(232,213,176,0.6)",
                background: pattern === p.id ? "rgba(184,92,42,0.4)" : "rgba(255,255,255,0.05)",
                border: pattern === p.id ? "1.5px solid rgba(184,92,42,0.7)" : "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "4px 12px",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Face */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.88rem", color: "rgba(232,213,176,0.7)" }}>face</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {AVATAR_FACES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFace(f.id)}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.78rem",
                color: face === f.id ? "#F5F0E8" : "rgba(232,213,176,0.6)",
                background: face === f.id ? "rgba(184,92,42,0.4)" : "rgba(255,255,255,0.05)",
                border: face === f.id ? "1.5px solid rgba(184,92,42,0.7)" : "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "4px 12px",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onComplete(glaze, pattern, face)}
        style={{
          fontFamily: "var(--font-hand)",
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "#F5F0E8",
          background: "rgba(184,92,42,0.45)",
          border: "2px solid rgba(184,92,42,0.8)",
          borderRadius: 12,
          padding: "10px 32px",
          cursor: "pointer",
          transition: "background 0.15s, transform 0.1s",
          boxShadow: "0 2px 12px rgba(184,92,42,0.3)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.65)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(184,92,42,0.45)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35em" }}>
          <DoodleIcon name="flame" size={18} color="#F5F0E8" />
          fire it
        </span>
      </button>
    </div>
  );
}

// ── Stage 6: Ready ────────────────────────────────────────────────────────

function ReadyStage({
  shapeStr,
  glaze,
  pattern,
  throwScore,
}: {
  shapeStr: string;
  glaze: string;
  pattern: AvatarPattern;
  throwScore: number;
}) {
  const quality = throwScore >= 0.85 ? "masterwork" : throwScore >= 0.65 ? "well thrown" : throwScore >= 0.4 ? "honest work" : "beautifully wonky";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, animation: "hmStageIn 0.5s ease both" }}>
      <p style={{ fontFamily: "var(--font-hand)", fontSize: "1.1rem", color: "#E8D5B0", textAlign: "center" }}>
        {quality} — submit to read your pot
      </p>
      <VaseAvatar shape={shapeStr} glaze={glaze} pattern={pattern} size={200} />
      <div style={{
        display: "flex",
        gap: 10,
        background: "rgba(0,0,0,0.25)",
        borderRadius: 10,
        padding: "6px 16px",
        alignItems: "center",
      }}>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.82rem", color: "rgba(232,213,176,0.55)" }}>throw quality</span>
        <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
          <div style={{
            height: "100%",
            width: `${throwScore * 100}%`,
            background: `hsl(${80 + throwScore * 40}, 65%, 55%)`,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }} />
        </div>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.82rem", color: "#E8D5B0" }}>{Math.round(throwScore * 100)}%</span>
      </div>
    </div>
  );
}

// ── HardModeWheel (main export) ───────────────────────────────────────────

export default function HardModeWheel() {
  const [stage, setStage] = useState<Stage>(0);
  const [pullCount, setPullCount] = useState(4);

  // Shape state accumulated across stages
  const [centerScore, setCenterScore] = useState(0.7);
  const [footWidth, setFootWidth] = useState(0.35);
  const [thrownH, setThrownH] = useState(0.5);
  const [thrownWidths, setThrownWidths] = useState<number[]>([0.35, 0.5, 0.45]);
  const [thrownEdges, setThrownEdges] = useState<number[]>([0, 0, 0]);
  const [throwScore, setThrowScore] = useState(0.7);
  const [glaze, setGlaze] = useState("terracotta");
  const [pattern, setPattern] = useState<AvatarPattern>("plain");
  const [face, setFace] = useState<FaceId>("happy");

  // Derived wobble from centerScore (low center = higher wobble)
  const wobble = Math.max(0, (1 - centerScore) * 0.7);

  // Final encoded shape
  const N = bandsForHeight(thrownH);
  const finalWidths = thrownWidths.length === N ? thrownWidths : resampleWidths(thrownWidths, N);
  const finalEdges = thrownEdges.length === N ? thrownEdges : resampleWidths(thrownEdges, N);
  const shapeStr = encodeThrown2Shape(thrownH, finalWidths, face, finalEdges, wobble);

  function handleChoosePulls(n: number) {
    setPullCount(n);
    setStage(1);
  }

  function handleCenterComplete(score: number) {
    setCenterScore(score);
    setStage(2);
  }

  function handleFloorComplete(fw: number) {
    setFootWidth(fw);
    setStage(3);
  }

  function handleWallsComplete(h: number, widths: number[], score: number) {
    setThrownH(h);
    setThrownWidths(widths);
    // Blend center score into throw score
    const blended = clamp01((score * 0.6) + (centerScore * 0.4));
    setThrowScore(blended);
    setThrownEdges(Array(bandsForHeight(h)).fill(0));
    setStage(4);
  }

  function handleFormComplete(widths: number[], edges: number[]) {
    setThrownWidths(widths);
    setThrownEdges(edges);
    setStage(5);
  }

  function handleGlazeComplete(g: string, p: AvatarPattern, f: FaceId) {
    setGlaze(g);
    setPattern(p);
    setFace(f);
    setStage(6);
  }

  const stageProgress = (stage / 6) * 100;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        // Dark kiln-room atmosphere
        background: "linear-gradient(180deg, #1A0E08 0%, #0F0804 100%)",
        borderRadius: 20,
        border: "1.5px solid rgba(184,92,42,0.25)",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        width: "100%",
        maxWidth: 380,
        margin: "0 auto",
      }}
    >
      <style>{HARD_MODE_STYLES}</style>

      {/* Hidden form inputs — always present so the parent form can submit */}
      <input type="hidden" name="shape" value={shapeStr} />
      <input type="hidden" name="glaze" value={glaze} />
      <input type="hidden" name="pattern" value={pattern} />
      <input type="hidden" name="throw" value={throwScore.toFixed(3)} />

      {/* Header bar */}
      <div style={{
        width: "100%",
        background: "rgba(0,0,0,0.35)",
        borderBottom: "1px solid rgba(184,92,42,0.2)",
        padding: "12px 16px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.78rem", color: "rgba(232,213,176,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            hard mode
          </span>
          <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.78rem", color: "rgba(184,92,42,0.7)" }}>
            {STAGE_LABELS[stage]}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1 }}>
          <div style={{
            height: "100%",
            width: `${stageProgress}%`,
            background: "linear-gradient(90deg, #B85C2A, #D4A840)",
            borderRadius: 1,
            transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.72rem", color: "rgba(232,213,176,0.35)" }}>
          {STAGE_HINTS[stage]}
        </span>
      </div>

      {/* Spinning wheel — always visible */}
      <div style={{ paddingTop: 14, paddingBottom: 0 }}>
        <SpinningWheel speed={stage === 3 ? 1.8 : 1} glowing={stage === 3} />
      </div>

      {/* Stage content */}
      <div style={{
        padding: "16px 20px 20px",
        width: "100%",
        minHeight: 340,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
      }}>
        {stage === 0 && <ChoosePulls onChoose={handleChoosePulls} />}
        {stage === 1 && <CenterStage onComplete={handleCenterComplete} />}
        {stage === 2 && <OpenFloorStage onComplete={handleFloorComplete} />}
        {stage === 3 && (
          <PullWallsStage
            pullCount={pullCount}
            initialFootWidth={footWidth}
            onComplete={handleWallsComplete}
          />
        )}
        {stage === 4 && (
          <FinishFormStage
            h={thrownH}
            widths={thrownWidths}
            onComplete={handleFormComplete}
          />
        )}
        {stage === 5 && (
          <GlazeStage
            h={thrownH}
            widths={finalWidths}
            edges={finalEdges}
            onComplete={handleGlazeComplete}
          />
        )}
        {stage === 6 && (
          <ReadyStage
            shapeStr={shapeStr}
            glaze={glaze}
            pattern={pattern}
            throwScore={throwScore}
          />
        )}
      </div>

      {/* Stage back button (except stage 0 and 6) */}
      {stage > 0 && stage < 6 && (
        <div style={{
          width: "100%",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 16px",
          display: "flex",
          justifyContent: "flex-start",
        }}>
          <button
            type="button"
            onClick={() => setStage((s) => Math.max(0, s - 1) as Stage)}
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "0.8rem",
              color: "rgba(232,213,176,0.4)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 0",
            }}
          >
            ← back
          </button>
        </div>
      )}
    </div>
  );
}
