"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import VaseAvatar from "./VaseAvatar";
import {
  AVATAR_SHAPES,
  AVATAR_GLAZES,
  AVATAR_PATTERNS,
  AVATAR_FACES,
  DEFAULT_AVATAR,
  DEFAULT_THROWN_PARAMS,
  encodeThrownShape,
  buildThrownPath,
  encodeThrown2Shape,
  buildThrown2Path,
  bandsForHeight,
  resampleWidths,
  DEFAULT_THROWN2_WIDTHS,
  DEFAULT_THROWN2_H,
} from "@/lib/avatars";
import type {
  AvatarShape,
  AvatarGlaze,
  AvatarPattern,
  FaceId,
} from "@/lib/avatars";

interface AvatarBuilderProps {
  defaultShape?:   AvatarShape;
  defaultGlaze?:   AvatarGlaze;
  defaultPattern?: AvatarPattern;
  /** If true, renders hidden inputs for form submission */
  formMode?: boolean;
}

// ── Wheel shimmer animation keyframes (component-scoped) ──────────────────
const WHEEL_STYLE = `
@keyframes wheelSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes highlightSweep {
  0%   { stroke-dashoffset: 0;   opacity: 0.7; }
  50%  { stroke-dashoffset: -40; opacity: 0.4; }
  100% { stroke-dashoffset: -80; opacity: 0.7; }
}
@keyframes highlightSweep2 {
  0%   { stroke-dashoffset: -20; opacity: 0.5; }
  50%  { stroke-dashoffset: -60; opacity: 0.2; }
  100% { stroke-dashoffset: -100; opacity: 0.5; }
}
@keyframes zoneHintFade {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes wheelGlow {
  0%   { opacity: 0.4; }
  50%  { opacity: 0.7; }
  100% { opacity: 0.4; }
}
`;

// Slightly randomize params for "surprise me" (thrown2)
function randomThrown2Params(): { h: number; widths: number[] } {
  const h = 0.2 + Math.random() * 0.8;
  const n = bandsForHeight(h);
  const widths = Array.from({ length: n }, () => 0.2 + Math.random() * 0.8);
  return { h, widths };
}

// ── WheelVasePreview ──────────────────────────────────────────────────────
// The big pottery-wheel sculpting area — now uses thrown2.

interface WheelVasePreviewProps {
  h: number;
  widths: number[];
  glaze: AvatarGlaze;
  pattern: AvatarPattern;
  face: FaceId;
  edge: number;
  onHeightChange: (h: number) => void;
  onWidthsChange: (widths: number[]) => void;
}

function WheelVasePreview({
  h,
  widths,
  glaze,
  pattern,
  face,
  edge,
  onHeightChange,
  onWidthsChange,
}: WheelVasePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startH: number;
    startWidths: number[];
    activeBandIndex: number;
    relYAtDown: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startH: h,
    startWidths: widths.slice(),
    activeBandIndex: 0,
    relYAtDown: 0.5,
  });
  const [hoveredBandIndex, setHoveredBandIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Size of preview in px
  const PREVIEW_SIZE = 220;

  // Convert pointer event to relative vase coords
  function getRelativePos(e: PointerEvent | React.PointerEvent): {
    relX: number;
    relY: number;
  } {
    if (!containerRef.current) return { relX: 0.5, relY: 0.5 };
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    return { relX, relY };
  }

  /**
   * Map a pointer relY (0=top, 1=bottom) to the nearest band index.
   * Bands are indexed 0=foot (bottom) to N-1=lip (top).
   */
  function bandIndexForRelY(relY: number, n: number): number {
    // relY=0 → lip (top, index N-1), relY=1 → foot (bottom, index 0)
    const t = 1 - relY; // 0=foot, 1=lip
    const idx = Math.round(t * (n - 1));
    return Math.max(0, Math.min(n - 1, idx));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);

    const { relY } = getRelativePos(e);
    const n = widths.length;
    const activeBandIndex = bandIndexForRelY(relY, n);

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startH: h,
      startWidths: widths.slice(),
      activeBandIndex,
      relYAtDown: relY,
    };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) {
      // Update hover band
      const { relY } = getRelativePos(e);
      setHoveredBandIndex(bandIndexForRelY(relY, widths.length));
      return;
    }

    e.preventDefault();
    const dy = e.clientY - dragRef.current.startY;
    const dx = e.clientX - dragRef.current.startX;

    const vSens = 1 / PREVIEW_SIZE;
    const hSens = 1 / PREVIEW_SIZE;

    // Vertical drag adjusts height
    const hDelta = -dy * vSens * 1.4; // pull up = taller
    const newH = Math.max(0, Math.min(1, dragRef.current.startH + hDelta));

    // Horizontal drag adjusts the active band's width
    const wDelta = dx * hSens * 1.6;
    const bi = dragRef.current.activeBandIndex;
    const newWidths = dragRef.current.startWidths.slice();

    // When height crosses band thresholds, resample widths live
    const prevBands = bandsForHeight(dragRef.current.startH);
    const newBands = bandsForHeight(newH);
    let adjustedWidths: number[];
    if (newBands !== prevBands) {
      // Resample so silhouette doesn't jump
      adjustedWidths = resampleWidths(newWidths, newBands);
    } else {
      adjustedWidths = newWidths;
    }

    // Apply horizontal drag to the band nearest to drag start relY,
    // mapped to the (potentially resampled) new band array
    const newBandIdx = Math.round(
      (dragRef.current.activeBandIndex / Math.max(1, prevBands - 1)) *
        Math.max(1, newBands - 1)
    );
    const clampedIdx = Math.max(0, Math.min(newBands - 1, newBandIdx));
    adjustedWidths[clampedIdx] = Math.max(
      0,
      Math.min(1, (adjustedWidths[clampedIdx] ?? 0.5) + wDelta)
    );

    onHeightChange(newH);
    onWidthsChange(adjustedWidths);
  }

  function handlePointerUp() {
    dragRef.current.active = false;
    setIsDragging(false);
  }

  function handlePointerLeave() {
    setHoveredBandIndex(null);
    if (!dragRef.current.active) {
      setIsDragging(false);
    }
  }

  // Compute band boundary Y positions (in the 180px preview space)
  // Band 0 = foot (bottom), Band N-1 = lip (top)
  const N = widths.length;
  const bandBoundaryYs: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // t=0 → top (lip side), t=1 → bottom (foot side)
    bandBoundaryYs.push(t * PREVIEW_SIZE);
  }

  const shapeStr = encodeThrown2Shape(h, widths, face, edge);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* The pottery-wheel assembly */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          width: PREVIEW_SIZE,
          height: PREVIEW_SIZE,
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        role="img"
        aria-label="Drag to sculpt your vase"
      >
        {/* Per-band dashed boundary lines + handle dots */}
        {!isDragging && (
          <svg
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 5,
            }}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            viewBox={`0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}`}
            fill="none"
          >
            {Array.from({ length: N - 1 }, (_, i) => {
              // Band boundaries between band i and i+1 (from top)
              // The boundary at index i+1 from top = fraction (i+1)/N of height
              const fracFromTop = (i + 1) / N;
              const yPos = fracFromTop * PREVIEW_SIZE;
              const bandIdxFromBottom = N - 1 - i; // which band this boundary is below
              const isHovered = hoveredBandIndex === bandIdxFromBottom || hoveredBandIndex === bandIdxFromBottom - 1;
              return (
                <g key={i}>
                  <line
                    x1="10"
                    y1={yPos}
                    x2={PREVIEW_SIZE - 10}
                    y2={yPos}
                    stroke="#B85C2A"
                    strokeWidth="0.8"
                    strokeDasharray="3 5"
                    opacity={isHovered ? 0.7 : 0.25}
                    style={{ transition: "opacity 0.15s ease" }}
                  />
                </g>
              );
            })}
            {/* Handle dot for hovered band */}
            {hoveredBandIndex !== null && (() => {
              const bandFromTop = N - 1 - hoveredBandIndex;
              const centerFrac = (bandFromTop + 0.5) / N;
              const cy = centerFrac * PREVIEW_SIZE;
              return (
                <circle
                  cx={PREVIEW_SIZE / 2}
                  cy={cy}
                  r={4}
                  fill="#B85C2A"
                  opacity={0.55}
                />
              );
            })()}
          </svg>
        )}

        {/* Vase avatar — stays still, symmetry implies the spinning */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <VaseAvatar
            shape={shapeStr}
            glaze={glaze}
            pattern={pattern}
            size={PREVIEW_SIZE - 20}
          />
          {/* Animated highlight streaks (CSS-only, no viewBox mutation) */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 3,
            }}
            width={PREVIEW_SIZE - 20}
            height={PREVIEW_SIZE - 20}
            viewBox="0 0 64 64"
            fill="none"
          >
            <path
              d={buildThrown2Path(h, widths, edge)}
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="8 52"
              strokeDashoffset="0"
              style={{
                animation: "highlightSweep 2.1s linear infinite",
              }}
            />
            <path
              d={buildThrown2Path(h, widths, edge)}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="5 60"
              strokeDashoffset="-20"
              style={{
                animation: "highlightSweep2 3.3s linear infinite",
              }}
            />
          </svg>
        </div>

        {/* Band count indicator */}
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            fontFamily: "var(--font-hand)",
            fontSize: "0.68rem",
            color: "#B85C2A",
            background: "rgba(245,240,232,0.82)",
            border: "1px dashed #B85C2A",
            borderRadius: 4,
            padding: "1px 5px",
            pointerEvents: "none",
            opacity: isDragging ? 0.6 : 0.9,
            zIndex: 10,
          }}
        >
          {N} bands
        </div>

        {/* Zone hint label — show which band is hovered */}
        {!isDragging && hoveredBandIndex !== null && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${((N - 1 - hoveredBandIndex + 0.5) / N) * 100}%`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.72rem",
                color: "#B85C2A",
                background: "rgba(245,240,232,0.88)",
                border: "1px dashed #B85C2A",
                borderRadius: 4,
                padding: "1px 6px",
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
              }}
            >
              ← band {hoveredBandIndex + 1} →
            </span>
          </div>
        )}
      </div>

      {/* Wheel base (spinning) */}
      <div style={{ position: "relative", marginTop: -8, zIndex: 1 }}>
        <svg
          width={PREVIEW_SIZE + 20}
          height={40}
          viewBox="0 0 200 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wheel shadow */}
          <ellipse
            cx="100"
            cy="32"
            rx="85"
            ry="7"
            fill="rgba(44,24,16,0.12)"
          />
          {/* Wheel body */}
          <ellipse cx="100" cy="22" rx="78" ry="14" fill="#5C3D2E" />
          <ellipse cx="100" cy="18" rx="78" ry="12" fill="#7A5540" />

          {/* Spinning lines on wheel surface */}
          <g style={{ transformOrigin: "100px 18px", animation: "wheelSpin 3s linear infinite" }}>
            {[0, 45, 90, 135].map((angle) => (
              <line
                key={angle}
                x1="100"
                y1="18"
                x2={100 + Math.cos((angle * Math.PI) / 180) * 68}
                y2={18 + Math.sin((angle * Math.PI) / 180) * 10}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            ))}
            {/* Concentric rings on the wheel */}
            <ellipse cx="100" cy="18" rx="30" ry="5" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
            <ellipse cx="100" cy="18" rx="55" ry="9" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
          </g>

          {/* Wheel rim highlight */}
          <ellipse cx="100" cy="15" rx="78" ry="12" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />

          {/* Glowing center */}
          <ellipse
            cx="100"
            cy="18"
            rx="8"
            ry="3"
            fill="rgba(255,255,255,0.18)"
            style={{ animation: "wheelGlow 2s ease-in-out infinite" }}
          />

          {/* Wheel shaft */}
          <rect x="94" y="30" width="12" height="8" rx="2" fill="#3C2518" />
        </svg>
      </div>

      {/* Drag hint text */}
      <p
        style={{
          fontFamily: "var(--font-hand)",
          fontSize: "0.8rem",
          color: "var(--color-clay-ink-muted)",
          marginTop: 6,
          textAlign: "center",
          opacity: isDragging ? 0.4 : 0.85,
          transition: "opacity 0.15s",
        }}
      >
        {isDragging ? "shaping…" : "drag up/down = height · left/right = width"}
      </p>
    </div>
  );
}

// ── MiniVaseFace ─────────────────────────────────────────────────────────
// Small chip showing a vase wearing a specific face

function MiniVaseFace({
  face,
  glaze,
  pattern,
  selected,
  onClick,
  label,
}: {
  face: FaceId;
  glaze: AvatarGlaze;
  pattern: AvatarPattern;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  const shapeStr = encodeThrown2Shape(DEFAULT_THROWN2_H, DEFAULT_THROWN2_WIDTHS, face);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: "6px 8px",
        borderRadius: 10,
        background: selected ? "rgba(184,92,42,0.12)" : "rgba(232,213,176,0.3)",
        border: selected ? "2px solid #2C1810" : "2px solid transparent",
        cursor: "pointer",
        transform: selected ? "scale(1.08)" : "scale(1)",
        transition: "transform 0.12s ease, border-color 0.12s ease, background 0.12s ease",
      }}
    >
      <VaseAvatar shape={shapeStr} glaze={glaze} pattern={pattern} size={38} />
      <span
        style={{
          fontFamily: "var(--font-hand)",
          fontSize: "0.7rem",
          color: "var(--color-clay-ink-muted)",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ── AvatarBuilder (main export) ───────────────────────────────────────────

export default function AvatarBuilder({
  defaultShape   = DEFAULT_AVATAR.shape,
  defaultGlaze   = DEFAULT_AVATAR.glaze,
  defaultPattern = DEFAULT_AVATAR.pattern,
  formMode = true,
}: AvatarBuilderProps) {
  // Mode: "throw" = minigame; "classic" = preset picker (via disclosure)
  const [mode, setMode] = useState<"throw" | "classic">("throw");

  // Thrown2 vase state
  const [thrown2H, setThrown2H] = useState<number>(DEFAULT_THROWN2_H);
  const [thrown2Widths, setThrown2Widths] = useState<number[]>(DEFAULT_THROWN2_WIDTHS.slice());
  const [face, setFace] = useState<FaceId>("happy");
  // edge dial: 0 = pretty round (default) … 1 = fully angular
  const [edge, setEdge] = useState<number>(0);

  // Shared state
  const [glaze,   setGlaze]   = useState<AvatarGlaze>(defaultGlaze);
  const [pattern, setPattern] = useState<AvatarPattern>(defaultPattern);

  // Classic preset state
  const [classicShape, setClassicShape] = useState<string>(defaultShape);

  // Classic disclosure open/closed
  const [classicOpen, setClassicOpen] = useState(false);

  // Handle height changes — resampling widths if band count changes
  function handleHeightChange(newH: number) {
    const prevBands = bandsForHeight(thrown2H);
    const newBands = bandsForHeight(newH);
    setThrown2H(newH);
    if (newBands !== prevBands) {
      setThrown2Widths((prev) => resampleWidths(prev, newBands));
    }
  }

  // Handle width array changes from the wheel (already resampled by wheel)
  function handleWidthsChange(newWidths: number[]) {
    setThrown2Widths(newWidths);
  }

  // The final shape string to emit
  const shapeValue = mode === "throw"
    ? encodeThrown2Shape(thrown2H, thrown2Widths, face, edge)
    : classicShape;

  function handleSurprise() {
    const { h, widths } = randomThrown2Params();
    setThrown2H(h);
    setThrown2Widths(widths);
    const faces: FaceId[] = ["happy", "sleepy", "winky", "surprised", "none"];
    setFace(faces[Math.floor(Math.random() * faces.length)]);
    // Randomize edge: mostly roundish, occasionally fully angular
    setEdge(Math.random() < 0.35 ? Math.random() : 0);
  }

  function handleReset() {
    setThrown2H(DEFAULT_THROWN2_H);
    setThrown2Widths(DEFAULT_THROWN2_WIDTHS.slice());
    setFace("happy");
    setEdge(0);
  }

  function switchToClassic(id: string) {
    setClassicShape(id);
    setMode("classic");
  }

  function switchToThrow() {
    setMode("throw");
  }

  return (
    <div className="flex flex-col gap-5">
      <style>{WHEEL_STYLE}</style>

      {/* Hidden inputs for form submission */}
      {formMode && (
        <>
          <input type="hidden" name="avatarShape"   value={shapeValue} />
          <input type="hidden" name="avatarGlaze"   value={glaze} />
          <input type="hidden" name="avatarPattern" value={pattern} />
        </>
      )}

      {/* ── Pottery Wheel (throw mode) ─────────────────────────────────── */}
      {mode === "throw" && (
        <div className="flex flex-col items-center gap-3">
          <WheelVasePreview
            h={thrown2H}
            widths={thrown2Widths}
            glaze={glaze}
            pattern={pattern}
            face={face}
            edge={edge}
            onHeightChange={handleHeightChange}
            onWidthsChange={handleWidthsChange}
          />

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleSurprise}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.85rem",
                color: "#2C1810",
                background: "rgba(212,168,64,0.18)",
                border: "1.5px solid rgba(44,24,16,0.3)",
                borderRadius: 8,
                padding: "4px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ✨ surprise me
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.85rem",
                color: "#5C3D2E",
                background: "rgba(232,213,176,0.4)",
                border: "1.5px solid rgba(44,24,16,0.2)",
                borderRadius: 8,
                padding: "4px 12px",
                cursor: "pointer",
              }}
            >
              ↺ start over
            </button>
          </div>
        </div>
      )}

      {/* ── Classic picker (shown when mode=classic) ────────────────────── */}
      {mode === "classic" && (
        <div className="flex flex-col items-center gap-3">
          {/* Preview of selected preset */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "12px 20px",
              background: "rgba(232,213,176,0.3)",
              borderRadius: 16,
            }}
          >
            <VaseAvatar shape={classicShape} glaze={glaze} pattern={pattern} size={100} />
            <span
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.85rem",
                color: "var(--color-clay-ink-muted)",
              }}
            >
              {AVATAR_SHAPES.find((s) => s.id === classicShape)?.label ?? "Classic"}
            </span>
          </div>

          <button
            type="button"
            onClick={switchToThrow}
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "0.85rem",
              color: "#B85C2A",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textDecorationStyle: "dotted",
            }}
          >
            ← back to wheel
          </button>
        </div>
      )}

      {/* ── Face + Edge picker ──────────────────────────────────────────── */}
      {mode === "throw" && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h4
              className="text-sm"
              style={{ fontFamily: "var(--font-hand)", color: "#2C1810" }}
            >
              Face
            </h4>
            {/* Edge dial — round ◠ … angular ◇ */}
            <label
              className="flex items-center gap-2"
              style={{ fontFamily: "var(--font-hand)", fontSize: "0.78rem", color: "#5C3D2E" }}
            >
              <span aria-hidden="true">◠</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={edge}
                onChange={(e) => setEdge(parseFloat(e.target.value))}
                aria-label="Edge style: rounded to angular"
                style={{ accentColor: "#B85C2A", width: 92, cursor: "pointer" }}
              />
              <span aria-hidden="true">◇</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_FACES.map((f) => (
              <MiniVaseFace
                key={f.id}
                face={f.id}
                glaze={glaze}
                pattern={pattern}
                selected={face === f.id}
                onClick={() => setFace(f.id)}
                label={f.label}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Glaze picker ─────────────────────────────────────────────────── */}
      <section>
        <h4
          className="text-sm mb-2 tracking-wide"
          style={{ fontFamily: "var(--font-hand)", color: "#2C1810" }}
        >
          Glaze
        </h4>
        <div className="flex flex-wrap gap-3">
          {AVATAR_GLAZES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGlaze(g.id)}
              title={g.label}
              className="relative transition-transform"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: g.fill,
                border: glaze === g.id ? "2.5px solid #2C1810" : "2px solid rgba(44,24,16,0.25)",
                transform: glaze === g.id ? "scale(1.15)" : "scale(1)",
                cursor: "pointer",
                boxShadow: glaze === g.id ? "0 0 0 3px rgba(44,24,16,0.15)" : "none",
                transition: "transform 0.1s ease, box-shadow 0.1s ease",
              }}
              aria-label={g.label}
              aria-pressed={glaze === g.id}
            />
          ))}
        </div>
      </section>

      {/* ── Pattern picker ───────────────────────────────────────────────── */}
      <section>
        <h4
          className="text-sm mb-2 tracking-wide"
          style={{ fontFamily: "var(--font-hand)", color: "#2C1810" }}
        >
          Pattern
        </h4>
        <div className="flex flex-wrap gap-2">
          {AVATAR_PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPattern(p.id)}
              aria-label={p.label}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-transform"
              style={{
                background: pattern === p.id ? "rgba(184,92,42,0.12)" : "rgba(232,213,176,0.3)",
                border: pattern === p.id ? "2px solid #2C1810" : "2px solid transparent",
                transform: pattern === p.id ? "scale(1.08)" : "scale(1)",
                cursor: "pointer",
                transition: "transform 0.1s ease",
              }}
              aria-pressed={pattern === p.id}
            >
              <VaseAvatar
                shape={mode === "throw" ? encodeThrown2Shape(thrown2H, thrown2Widths, face, edge) : classicShape}
                glaze={glaze}
                pattern={p.id}
                size={32}
              />
              <span
                className="text-xs leading-none"
                style={{ fontFamily: "var(--font-hand)", color: "var(--color-clay-ink-muted)" }}
              >
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Classic shapes disclosure ─────────────────────────────────────── */}
      <section>
        <button
          type="button"
          onClick={() => setClassicOpen((v) => !v)}
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "0.85rem",
            color: "#5C3D2E",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: 0,
            opacity: 0.75,
          }}
          aria-expanded={classicOpen}
        >
          <span
            style={{
              display: "inline-block",
              transform: classicOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              fontSize: "0.8rem",
            }}
          >
            ▶
          </span>
          classic shapes (no wheel needed)
        </button>

        {classicOpen && (
          <div className="flex flex-wrap gap-2 mt-3">
            {AVATAR_SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => switchToClassic(s.id)}
                aria-label={s.label}
                className="relative flex flex-col items-center gap-1 p-2 rounded-lg"
                style={{
                  background:
                    mode === "classic" && classicShape === s.id
                      ? "rgba(184,92,42,0.12)"
                      : "rgba(232,213,176,0.3)",
                  border:
                    mode === "classic" && classicShape === s.id
                      ? "2px solid #2C1810"
                      : "2px solid transparent",
                  transform:
                    mode === "classic" && classicShape === s.id
                      ? "scale(1.08)"
                      : "scale(1)",
                  cursor: "pointer",
                  transition: "transform 0.1s ease",
                }}
              >
                <VaseAvatar shape={s.id} glaze={glaze} pattern={pattern} size={40} />
                <span
                  className="text-xs leading-none"
                  style={{
                    fontFamily: "var(--font-hand)",
                    color: "var(--color-clay-ink-muted)",
                  }}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
