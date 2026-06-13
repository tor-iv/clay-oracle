"use client";

import { useState, useRef, useCallback } from "react";
import VaseAvatar from "./VaseAvatar";
import FaceDrawPad from "./FaceDrawPad";
import DecoratePad from "./DecoratePad";
import {
  AVATAR_SHAPES,
  AVATAR_GLAZES,
  AVATAR_PATTERNS,
  AVATAR_FACES,
  DEFAULT_AVATAR,
  encodeThrown2Shape,
  buildThrown2Path,
  bandsForHeight,
  resampleWidths,
  DEFAULT_THROWN2_WIDTHS,
  DEFAULT_THROWN2_H,
  parseFaceDrawing,
  parseDecorationDrawing,
  resolveGlaze,
  parsePattern,
  encodePattern,
} from "@/lib/avatars";
import type {
  AvatarShape,
  AvatarGlaze,
  AvatarPattern,
  AvatarPatternStyle,
  FaceId,
} from "@/lib/avatars";

interface AvatarBuilderProps {
  defaultShape?:   AvatarShape;
  defaultGlaze?:   AvatarGlaze | string;
  defaultPattern?: AvatarPattern | string;
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
@keyframes wheelGlow {
  0%   { opacity: 0.4; }
  50%  { opacity: 0.7; }
  100% { opacity: 0.4; }
}
@keyframes bandPop {
  0%   { transform: scaleX(1); }
  40%  { transform: scaleX(1.06); }
  100% { transform: scaleX(1); }
}
`;

// Default per-band edges (all round)
function defaultEdges(n: number): number[] {
  return Array(n).fill(0);
}

// Slightly randomize params for "surprise me" (thrown2)
function randomThrown2Params(): {
  h: number;
  widths: number[];
  edges: number[];
  glaze: string;
  face: FaceId;
} {
  const h = 0.2 + Math.random() * 0.8;
  const n = bandsForHeight(h);
  const widths = Array.from({ length: n }, () => 0.2 + Math.random() * 0.8);
  const edges  = Array.from({ length: n }, () => Math.random() < 0.3 ? Math.random() : 0);

  // Glaze: sometimes a preset, sometimes a random hex
  let glaze: string;
  if (Math.random() < 0.4) {
    // Random hex — earthy range
    const hue = Math.floor(Math.random() * 60);    // 0..60 = reds/oranges/golds
    const sat = 30 + Math.floor(Math.random() * 50);
    const lit = 30 + Math.floor(Math.random() * 35);
    glaze = hslToHex(hue, sat, lit);
  } else {
    glaze = AVATAR_GLAZES[Math.floor(Math.random() * AVATAR_GLAZES.length)].id;
  }

  const faces: FaceId[] = ["happy", "sleepy", "winky", "surprised", "none"];
  const face = faces[Math.floor(Math.random() * faces.length)];

  return { h, widths, edges, glaze, face };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ── Per-section edge toggles ──────────────────────────────────────────────

function EdgeToggleColumn({
  edges,
  onEdgesChange,
  n,
  previewSize,
}: {
  edges: number[];
  onEdgesChange: (edges: number[]) => void;
  n: number;
  previewSize: number;
}) {
  function toggle(i: number) {
    const next = edges.slice();
    next[i] = next[i] > 0.5 ? 0 : 1;
    onEdgesChange(next);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        height: previewSize,
        width: 28,
        padding: "4px 0",
        gap: 2,
      }}
    >
      {/* Bands rendered top=lip(N-1) to bottom=foot(0) */}
      {Array.from({ length: n }, (_, i) => {
        const bandIdx = n - 1 - i; // top → bottom visual order
        const isRound = edges[bandIdx] < 0.5;
        return (
          <button
            key={bandIdx}
            type="button"
            title={`Band ${bandIdx + 1}: ${isRound ? "round" : "straight"}`}
            aria-label={`Band ${bandIdx + 1} edge: ${isRound ? "round" : "straight"}`}
            onClick={() => toggle(bandIdx)}
            style={{
              width: 24,
              height: Math.floor(previewSize / n) - 3,
              minHeight: 14,
              borderRadius: isRound ? "50% 50% 40% 40%" : 4,
              background: isRound
                ? "rgba(168,197,160,0.55)"
                : "rgba(74,123,175,0.45)",
              border: isRound
                ? "1.5px solid rgba(122,140,110,0.7)"
                : "1.5px solid rgba(74,123,175,0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              fontSize: "0.6rem",
              color: "#2C1810",
              transition: "all 0.12s ease",
              lineHeight: 1,
            }}
          >
            {isRound ? "◠" : "◇"}
          </button>
        );
      })}
    </div>
  );
}

// ── WheelVasePreview ──────────────────────────────────────────────────────

interface WheelVasePreviewProps {
  h: number;
  widths: number[];
  glaze: string;
  pattern: string;
  face: FaceId | string;
  edges: number[];
  onHeightChange: (h: number) => void;
  onWidthsChange: (widths: number[]) => void;
  onEdgesChange: (edges: number[]) => void;
}

function WheelVasePreview({
  h,
  widths,
  glaze,
  pattern,
  face,
  edges,
  onHeightChange,
  onWidthsChange,
  onEdgesChange,
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
    hasDragged: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startH: h,
    startWidths: widths.slice(),
    activeBandIndex: 0,
    relYAtDown: 0.5,
    hasDragged: false,
  });
  const [hoveredBandIndex, setHoveredBandIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const PREVIEW_SIZE = 300;
  const TAP_THRESHOLD = 6; // pixels — move less than this = tap, not drag

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

  function bandIndexForRelY(relY: number, n: number): number {
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
      hasDragged: false,
    };
    // Don't set isDragging immediately — wait until we know it's a real drag
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) {
      const { relY } = getRelativePos(e);
      setHoveredBandIndex(bandIndexForRelY(relY, widths.length));
      return;
    }

    const totalDx = e.clientX - dragRef.current.startX;
    const totalDy = e.clientY - dragRef.current.startY;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

    // Promote to drag once threshold exceeded
    if (!dragRef.current.hasDragged && totalDist > TAP_THRESHOLD) {
      dragRef.current.hasDragged = true;
      setIsDragging(true);
    }

    if (!dragRef.current.hasDragged) return;

    e.preventDefault();
    const dy = totalDy;
    const dx = totalDx;

    const vSens = 1 / PREVIEW_SIZE;
    const hSens = 1 / PREVIEW_SIZE;

    const hDelta = -dy * vSens * 1.4;
    const newH = Math.max(0, Math.min(1, dragRef.current.startH + hDelta));

    const wDelta = dx * hSens * 1.6;
    const newWidths = dragRef.current.startWidths.slice();

    const prevBands = bandsForHeight(dragRef.current.startH);
    const newBands = bandsForHeight(newH);
    let adjustedWidths: number[];
    let adjustedEdges: number[];
    if (newBands !== prevBands) {
      adjustedWidths = resampleWidths(newWidths, newBands);
      adjustedEdges  = resampleWidths(edges, newBands);
    } else {
      adjustedWidths = newWidths;
      adjustedEdges  = edges;
    }

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
    if (newBands !== prevBands) {
      onEdgesChange(adjustedEdges);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;

    if (!dragRef.current.hasDragged) {
      // It was a tap — toggle the edge of the band under the pointer
      const { relY } = getRelativePos(e);
      const n = widths.length;
      const bandIdx = bandIndexForRelY(relY, n);
      const next = edges.slice();
      next[bandIdx] = next[bandIdx] > 0.5 ? 0 : 1;
      onEdgesChange(next);
    }

    dragRef.current.active = false;
    dragRef.current.hasDragged = false;
    setIsDragging(false);
  }

  function handlePointerCancel() {
    dragRef.current.active = false;
    dragRef.current.hasDragged = false;
    setIsDragging(false);
  }

  function handlePointerLeave() {
    setHoveredBandIndex(null);
    if (!dragRef.current.active) {
      setIsDragging(false);
    }
  }

  const N = widths.length;
  const shapeStr = encodeThrown2Shape(h, widths, face as FaceId, edges);

  // For the hover highlight: which band is under the cursor, and what will tap do?
  const showHoverHint = !isDragging && hoveredBandIndex !== null;
  const hoverEdgeIsRound = hoveredBandIndex !== null ? (edges[hoveredBandIndex] ?? 0) < 0.5 : true;
  const tapLabel = hoverEdgeIsRound ? "tap: → straight ◇" : "tap: → round ◠";

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Wheel assembly row: vase center only (no side column) */}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* Pottery wheel sculpting area */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
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
          aria-label="Drag to sculpt your vase; tap a section to toggle round or straight edge"
        >
          {/* Band highlight overlay: faint translucent band under hover/press */}
          {showHoverHint && hoveredBandIndex !== null && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${((N - 1 - hoveredBandIndex) / N) * 100}%`,
                height: `${(1 / N) * 100}%`,
                background: hoverEdgeIsRound
                  ? "rgba(74,123,175,0.13)"
                  : "rgba(168,197,160,0.16)",
                border: hoverEdgeIsRound
                  ? "1px dashed rgba(74,123,175,0.35)"
                  : "1px dashed rgba(122,140,110,0.45)",
                borderRadius: 4,
                pointerEvents: "none",
                zIndex: 6,
                transition: "top 0.08s ease, background 0.1s ease",
              }}
            />
          )}

          {/* Per-band dashed boundary lines */}
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
                const fracFromTop = (i + 1) / N;
                const yPos = fracFromTop * PREVIEW_SIZE;
                const bandIdxFromBottom = N - 1 - i;
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
            </svg>
          )}

          {/* Vase avatar */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <VaseAvatar
              shape={shapeStr}
              glaze={glaze}
              pattern={pattern}
              size={PREVIEW_SIZE - 20}
            />
            {/* Animated highlight streaks */}
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
                d={buildThrown2Path(h, widths, edges)}
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="8 52"
                strokeDashoffset="0"
                style={{ animation: "highlightSweep 2.1s linear infinite" }}
              />
              <path
                d={buildThrown2Path(h, widths, edges)}
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="5 60"
                strokeDashoffset="-20"
                style={{ animation: "highlightSweep2 3.3s linear infinite" }}
              />
            </svg>
          </div>

          {/* Band count indicator */}
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              fontFamily: "var(--font-hand)",
              fontSize: "0.72rem",
              color: "#B85C2A",
              background: "rgba(245,240,232,0.85)",
              border: "1px dashed #B85C2A",
              borderRadius: 5,
              padding: "2px 6px",
              pointerEvents: "none",
              opacity: isDragging ? 0.5 : 0.9,
              zIndex: 10,
            }}
          >
            {N} bands
          </div>

          {/* Tap hint tooltip: shows what a tap will do on the hovered band */}
          {showHoverHint && hoveredBandIndex !== null && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                top: `${((N - 1 - hoveredBandIndex + 0.5) / N) * 100}%`,
                marginTop: -14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "0.7rem",
                  color: hoverEdgeIsRound ? "#2A5C8A" : "#3A6B32",
                  background: hoverEdgeIsRound
                    ? "rgba(220,235,248,0.95)"
                    : "rgba(218,238,215,0.95)",
                  border: hoverEdgeIsRound
                    ? "1px dashed rgba(74,123,175,0.6)"
                    : "1px dashed rgba(100,155,95,0.6)",
                  borderRadius: 5,
                  padding: "2px 8px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                {tapLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Wheel base */}
      <div style={{ position: "relative", marginTop: -8, zIndex: 1 }}>
        <svg
          width={PREVIEW_SIZE + 40}
          height={40}
          viewBox="0 0 240 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="120" cy="32" rx="100" ry="7" fill="rgba(44,24,16,0.12)" />
          <ellipse cx="120" cy="22" rx="92" ry="14" fill="#5C3D2E" />
          <ellipse cx="120" cy="18" rx="92" ry="12" fill="#7A5540" />
          <g style={{ transformOrigin: "120px 18px", animation: "wheelSpin 3s linear infinite" }}>
            {[0, 45, 90, 135].map((angle) => (
              <line
                key={angle}
                x1="120"
                y1="18"
                x2={120 + Math.cos((angle * Math.PI) / 180) * 82}
                y2={18 + Math.sin((angle * Math.PI) / 180) * 10}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            ))}
            <ellipse cx="120" cy="18" rx="36" ry="5" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
            <ellipse cx="120" cy="18" rx="66" ry="9" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
          </g>
          <ellipse cx="120" cy="15" rx="92" ry="12" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
          <ellipse
            cx="120"
            cy="18"
            rx="9"
            ry="3"
            fill="rgba(255,255,255,0.18)"
            style={{ animation: "wheelGlow 2s ease-in-out infinite" }}
          />
          <rect x="113" y="30" width="14" height="8" rx="2" fill="#3C2518" />
        </svg>
      </div>

      {/* Hint text */}
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
        {isDragging ? "shaping…" : "↕ height  ↔ band width  tap section: ◠↔◇"}
      </p>
    </div>
  );
}

// ── GlazePicker ───────────────────────────────────────────────────────────
// Combines preset swatches, a color input, and hue/lightness sliders.

function GlazePicker({
  glaze,
  onGlazeChange,
}: {
  glaze: string;
  onGlazeChange: (v: string) => void;
}) {
  // Determine if glaze is currently a custom hex
  const isCustom = /^#[0-9A-Fa-f]{6}$/.test(glaze) &&
    !AVATAR_GLAZES.some((g) => g.fill === glaze);

  // For the color picker, show the resolved hex
  const resolvedHex = /^#[0-9A-Fa-f]{6}$/.test(glaze)
    ? glaze
    : (AVATAR_GLAZES.find((g) => g.id === glaze)?.fill ?? "#B85C2A");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Preset swatches */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {AVATAR_GLAZES.map((g) => {
          const isSelected = glaze === g.id || glaze === g.fill;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onGlazeChange(g.id)}
              title={g.label}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: g.fill,
                border: isSelected ? "3px solid #2C1810" : "2px solid rgba(44,24,16,0.2)",
                transform: isSelected ? "scale(1.18)" : "scale(1)",
                cursor: "pointer",
                boxShadow: isSelected ? "0 0 0 3px rgba(44,24,16,0.15)" : "none",
                transition: "transform 0.1s ease, box-shadow 0.1s ease, border 0.1s ease",
                flexShrink: 0,
              }}
              aria-label={g.label}
              aria-pressed={isSelected}
            />
          );
        })}

        {/* Custom color swatch (visible when a custom hex is active) */}
        {isCustom && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: glaze,
              border: "3px solid #2C1810",
              boxShadow: "0 0 0 3px rgba(44,24,16,0.15)",
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Custom color picker row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(232,213,176,0.3)",
          borderRadius: 10,
          padding: "8px 12px",
          border: "1.5px dashed rgba(44,24,16,0.2)",
        }}
      >
        {/* Color swatch / trigger */}
        <label
          htmlFor="custom-glaze-color"
          style={{
            position: "relative",
            width: 36,
            height: 36,
            borderRadius: 8,
            background: resolvedHex,
            border: "2px solid rgba(44,24,16,0.35)",
            cursor: "pointer",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Pick custom color"
          aria-label="Open color picker"
        >
          <span
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "0.65rem",
              color: "rgba(44,24,16,0.6)",
              background: "rgba(245,240,232,0.7)",
              borderRadius: 3,
              padding: "1px 2px",
              pointerEvents: "none",
            }}
          >
            +
          </span>
          <input
            id="custom-glaze-color"
            type="color"
            value={resolvedHex}
            onChange={(e) => onGlazeChange(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              width: "100%",
              height: "100%",
              padding: 0,
              border: "none",
            }}
            aria-label="Custom glaze color"
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "0.72rem",
              color: "var(--color-clay-ink-muted)",
            }}
          >
            custom glaze
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "0.7rem",
              color: "#5C3D2E",
              letterSpacing: "0.05em",
            }}
          >
            {resolvedHex}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── FacePicker ────────────────────────────────────────────────────────────

function FacePicker({
  face,
  glaze,
  pattern,
  thrown2H,
  thrown2Widths,
  edges,
  onFaceChange,
}: {
  face: FaceId | string;
  glaze: string;
  pattern: string;
  thrown2H: number;
  thrown2Widths: number[];
  edges: number[];
  onFaceChange: (f: FaceId | string) => void;
}) {
  const [drawMode, setDrawMode] = useState(false);
  const glazeHex = resolveGlaze(glaze);

  function handlePresetClick(f: FaceId) {
    setDrawMode(false);
    onFaceChange(f);
  }

  function handleDrawChange(encoding: string) {
    onFaceChange(encoding === "none" || !encoding ? "none" : encoding);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Preset face chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {AVATAR_FACES.map((f) => {
          const shapeStr = encodeThrown2Shape(thrown2H, thrown2Widths, f.id, edges);
          const isSelected = !drawMode && face === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => handlePresetClick(f.id)}
              aria-label={f.label}
              aria-pressed={isSelected}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 8px",
                borderRadius: 10,
                background: isSelected ? "rgba(184,92,42,0.12)" : "rgba(232,213,176,0.3)",
                border: isSelected ? "2px solid #2C1810" : "2px solid transparent",
                cursor: "pointer",
                transform: isSelected ? "scale(1.08)" : "scale(1)",
                transition: "transform 0.12s ease, border-color 0.12s, background 0.12s",
              }}
            >
              <VaseAvatar shape={shapeStr} glaze={glaze} pattern={pattern} size={40} />
              <span
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "0.7rem",
                  color: "var(--color-clay-ink-muted)",
                  lineHeight: 1,
                }}
              >
                {f.label}
              </span>
            </button>
          );
        })}

        {/* Draw mode toggle */}
        <button
          type="button"
          onClick={() => {
            setDrawMode((v) => !v);
            if (!drawMode && !face.toString().startsWith("draw:")) {
              onFaceChange("none");
            }
          }}
          aria-pressed={drawMode}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "6px 8px",
            borderRadius: 10,
            background: drawMode ? "rgba(212,168,64,0.15)" : "rgba(232,213,176,0.3)",
            border: drawMode ? "2px solid #D4A840" : "2px dashed rgba(44,24,16,0.25)",
            cursor: "pointer",
            transform: drawMode ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.12s ease, border-color 0.12s, background 0.12s",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="rgba(245,240,232,0.6)" />
            <path d="M 10 28 Q 15 18 20 22 Q 25 26 30 14" stroke="#2C1810" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle cx="30" cy="12" r="2.5" fill="#B85C2A" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "0.7rem",
              color: drawMode ? "#D4A840" : "var(--color-clay-ink-muted)",
              lineHeight: 1,
            }}
          >
            draw
          </span>
        </button>
      </div>

      {/* Draw pad (shown when drawMode is on) */}
      {drawMode && (
        <div
          style={{
            background: "rgba(232,213,176,0.25)",
            borderRadius: 12,
            padding: "12px 12px 8px",
            border: "1.5px dashed rgba(44,24,16,0.2)",
          }}
        >
          <FaceDrawPad
            onChange={handleDrawChange}
            glazeColor={glazeHex}
            initialStrokes={
              typeof face === "string" && face.startsWith("draw:")
                ? parseFaceDrawing(face)
                : []
            }
          />
        </div>
      )}

    </div>
  );
}

// ── PatternPicker ─────────────────────────────────────────────────────────

function PatternPicker({
  pattern,
  glaze,
  shapeStr,
  onPatternChange,
}: {
  pattern: string;
  glaze: string;
  shapeStr: string;
  onPatternChange: (p: string) => void;
}) {
  const parsedPat = parsePattern(pattern);
  const activeStyle = parsedPat.style;
  const activeColor = parsedPat.color ?? "";
  const activeScale = parsedPat.scale ?? 1.0;
  const [decorateMode, setDecorateMode] = useState(pattern.startsWith("draw:"));
  const glazeHex = resolveGlaze(glaze);

  // Non-draw presets (excluding "draw" from the pill list — handled separately)
  const presetPatterns = AVATAR_PATTERNS.filter((p) => p.id !== "draw");

  function buildPattern(style: AvatarPatternStyle, color: string, scale: number): string {
    if (style === "plain") return "plain";
    // Only encode color/scale if they're non-default
    const hasColor = color && /^#[0-9A-Fa-f]{6}$/.test(color);
    const hasScale = Math.abs(scale - 1.0) > 0.04;
    if (!hasColor && !hasScale) return style;
    return encodePattern({ style, color: hasColor ? color : undefined, scale: hasScale ? scale : undefined });
  }

  function handleStyleClick(style: AvatarPatternStyle) {
    setDecorateMode(false);
    onPatternChange(buildPattern(style, activeColor, activeScale));
  }

  function handleColorChange(hex: string) {
    if (activeStyle === "plain" || activeStyle === "draw") return;
    onPatternChange(buildPattern(activeStyle, hex, activeScale));
  }

  function handleScaleChange(scale: number) {
    if (activeStyle === "plain" || activeStyle === "draw") return;
    onPatternChange(buildPattern(activeStyle, activeColor, scale));
  }

  function handleDecorateToggle() {
    const newMode = !decorateMode;
    setDecorateMode(newMode);
    if (!newMode) {
      // Return to plain when exiting decorate mode
      onPatternChange("plain");
    }
  }

  function handleDecorationChange(enc: string) {
    onPatternChange(enc);
  }

  const showCustomize = activeStyle !== "plain" && !decorateMode;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Preset pills + draw button */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
        {presetPatterns.map((p) => {
          const isSelected = !decorateMode && activeStyle === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleStyleClick(p.id)}
              aria-label={p.label}
              aria-pressed={isSelected}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 8px",
                borderRadius: 10,
                background: isSelected ? "rgba(184,92,42,0.12)" : "rgba(232,213,176,0.3)",
                border: isSelected ? "2px solid #2C1810" : "2px solid transparent",
                cursor: "pointer",
                transform: isSelected ? "scale(1.08)" : "scale(1)",
                transition: "transform 0.1s ease",
              }}
            >
              <VaseAvatar
                shape={shapeStr}
                glaze={glaze}
                pattern={p.id}
                size={34}
              />
              <span
                className="text-xs leading-none"
                style={{ fontFamily: "var(--font-hand)", color: "var(--color-clay-ink-muted)" }}
              >
                {p.label}
              </span>
            </button>
          );
        })}

        {/* Draw/Decorate toggle */}
        <button
          type="button"
          onClick={handleDecorateToggle}
          aria-pressed={decorateMode}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "6px 8px",
            borderRadius: 10,
            background: decorateMode ? "rgba(212,168,64,0.15)" : "rgba(232,213,176,0.3)",
            border: decorateMode ? "2px solid #D4A840" : "2px dashed rgba(44,24,16,0.25)",
            cursor: "pointer",
            transform: decorateMode ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.12s ease, border-color 0.12s",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <rect width="34" height="34" rx="8" fill="rgba(245,240,232,0.6)" />
            <path d="M 7 24 C 10 18 13 20 17 17 C 21 14 23 10 27 8" stroke="#B85C2A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="11" cy="13" r="2" fill="#5B8EC4" fillOpacity="0.7" />
            <circle cx="22" cy="20" r="1.5" fill="#C9901A" fillOpacity="0.7" />
          </svg>
          <span
            className="text-xs leading-none"
            style={{ fontFamily: "var(--font-hand)", color: decorateMode ? "#D4A840" : "var(--color-clay-ink-muted)" }}
          >
            ✏️ draw
          </span>
        </button>
      </div>

      {/* Pattern customization: color swatch + scale slider */}
      {showCustomize && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            background: "rgba(232,213,176,0.3)",
            borderRadius: 10,
            padding: "8px 12px",
            border: "1.5px dashed rgba(44,24,16,0.18)",
          }}
        >
          {/* Color picker */}
          <label
            title="Pattern color"
            style={{
              position: "relative",
              width: 30,
              height: 30,
              borderRadius: 8,
              background: activeColor || glazeHex,
              border: "2px solid rgba(44,24,16,0.3)",
              cursor: "pointer",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{
              fontFamily: "var(--font-hand)", fontSize: "0.6rem",
              color: "rgba(44,24,16,0.7)", background: "rgba(245,240,232,0.7)",
              borderRadius: 3, padding: "1px 2px", pointerEvents: "none",
            }}>🎨</span>
            <input
              type="color"
              value={activeColor || glazeHex}
              onChange={(e) => handleColorChange(e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", padding: 0, border: "none" }}
              aria-label="Pattern color"
            />
          </label>

          {/* Scale slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 100 }}>
            <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.68rem", color: "var(--color-clay-ink-muted)" }}>
              density · {activeScale.toFixed(1)}×
            </span>
            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.1"
              value={activeScale}
              onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
              style={{ width: "100%", cursor: "pointer", accentColor: "#B85C2A" }}
              aria-label="Pattern density"
            />
          </div>
        </div>
      )}

      {/* Decoration draw pad */}
      {decorateMode && (
        <div
          style={{
            background: "rgba(232,213,176,0.2)",
            borderRadius: 12,
            padding: "12px 12px 8px",
            border: "1.5px dashed rgba(44,24,16,0.2)",
          }}
        >
          <DecoratePad
            onChange={handleDecorationChange}
            shapeStr={shapeStr}
            glaze={glaze}
            glazeColor={glazeHex}
            initialStrokes={
              pattern.startsWith("draw:")
                ? parseDecorationDrawing(pattern)
                : []
            }
          />
        </div>
      )}
    </div>
  );
}

// ── AvatarBuilder (main export) ───────────────────────────────────────────

export default function AvatarBuilder({
  defaultShape   = DEFAULT_AVATAR.shape,
  defaultGlaze   = DEFAULT_AVATAR.glaze,
  defaultPattern = DEFAULT_AVATAR.pattern,
}: AvatarBuilderProps) {
  const [mode, setMode] = useState<"throw" | "classic">("throw");

  // Thrown2 vase state
  const [thrown2H, setThrown2H] = useState<number>(DEFAULT_THROWN2_H);
  const [thrown2Widths, setThrown2Widths] = useState<number[]>(DEFAULT_THROWN2_WIDTHS.slice());
  const [face, setFace] = useState<FaceId | string>("happy");
  const [edges, setEdges] = useState<number[]>(() => defaultEdges(bandsForHeight(DEFAULT_THROWN2_H)));

  // Glaze: can be a preset id or a raw hex
  const [glaze, setGlaze]     = useState<string>(defaultGlaze as string);
  // Pattern: can be a preset id, a richer "style:#hex:scale" string, or a "draw:..." decoration
  const [pattern, setPattern] = useState<string>(defaultPattern as string ?? DEFAULT_AVATAR.pattern);

  // Classic preset state
  const [classicShape, setClassicShape] = useState<string>(defaultShape as string);
  const [classicOpen, setClassicOpen] = useState(false);

  // Handle height changes — resampling widths AND edges if band count changes
  function handleHeightChange(newH: number) {
    const prevBands = bandsForHeight(thrown2H);
    const newBands = bandsForHeight(newH);
    setThrown2H(newH);
    if (newBands !== prevBands) {
      setThrown2Widths((prev) => resampleWidths(prev, newBands));
      setEdges((prev) => resampleWidths(prev.map((v) => v), newBands));
    }
  }

  function handleWidthsChange(newWidths: number[]) {
    setThrown2Widths(newWidths);
  }

  function handleEdgesChange(newEdges: number[]) {
    setEdges(newEdges);
  }

  function setAllEdges(val: number) {
    setEdges(Array(thrown2Widths.length).fill(val));
  }

  const shapeValue = mode === "throw"
    ? encodeThrown2Shape(thrown2H, thrown2Widths, face as FaceId, edges)
    : classicShape;

  function handleSurprise() {
    const { h, widths, edges: newEdges, glaze: newGlaze, face: newFace } = randomThrown2Params();
    const newBands = bandsForHeight(h);
    setThrown2H(h);
    setThrown2Widths(widths.length === newBands ? widths : resampleWidths(widths, newBands));
    setEdges(newEdges.length === newBands ? newEdges : resampleWidths(newEdges, newBands));
    setGlaze(newGlaze);
    setFace(newFace);
  }

  function handleReset() {
    const defaultBands = bandsForHeight(DEFAULT_THROWN2_H);
    setThrown2H(DEFAULT_THROWN2_H);
    setThrown2Widths(DEFAULT_THROWN2_WIDTHS.slice());
    setFace("happy");
    setEdges(defaultEdges(defaultBands));
    setGlaze(DEFAULT_AVATAR.glaze);
    setPattern("plain");
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
      <input type="hidden" name="shape"   value={shapeValue} />
      <input type="hidden" name="glaze"   value={glaze} />
      <input type="hidden" name="pattern" value={pattern} />

      {/* ── Pottery Wheel (throw mode) ─────────────────────────────────── */}
      {mode === "throw" && (
        <div className="flex flex-col items-center gap-3">
          <WheelVasePreview
            h={thrown2H}
            widths={thrown2Widths}
            glaze={glaze}
            pattern={pattern}
            face={face}
            edges={edges}
            onHeightChange={handleHeightChange}
            onWidthsChange={handleWidthsChange}
            onEdgesChange={handleEdgesChange}
          />

          {/* Global edge quick-set */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-hand)", fontSize: "0.78rem", color: "var(--color-clay-ink-muted)" }}>
              all sections:
            </span>
            <button
              type="button"
              onClick={() => setAllEdges(0)}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.8rem",
                color: "#5C3D2E",
                background: "rgba(168,197,160,0.35)",
                border: "1.5px solid rgba(122,140,110,0.5)",
                borderRadius: 8,
                padding: "3px 12px",
                cursor: "pointer",
              }}
            >
              ◠ all round
            </button>
            <button
              type="button"
              onClick={() => setAllEdges(1)}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.8rem",
                color: "#5C3D2E",
                background: "rgba(74,123,175,0.2)",
                border: "1.5px solid rgba(74,123,175,0.4)",
                borderRadius: 8,
                padding: "3px 12px",
                cursor: "pointer",
              }}
            >
              ◇ all straight
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleSurprise}
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.88rem",
                color: "#2C1810",
                background: "rgba(212,168,64,0.18)",
                border: "1.5px solid rgba(44,24,16,0.3)",
                borderRadius: 8,
                padding: "5px 14px",
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
                fontSize: "0.88rem",
                color: "#5C3D2E",
                background: "rgba(232,213,176,0.4)",
                border: "1.5px solid rgba(44,24,16,0.2)",
                borderRadius: 8,
                padding: "5px 14px",
                cursor: "pointer",
              }}
            >
              ↺ start over
            </button>
          </div>
        </div>
      )}

      {/* ── Classic picker ────────────────────────────────────────────────── */}
      {mode === "classic" && (
        <div className="flex flex-col items-center gap-3">
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
            <VaseAvatar shape={classicShape} glaze={glaze} pattern={pattern} size={110} />
            <span
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.88rem",
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

      {/* ── Face picker ────────────────────────────────────────────────────── */}
      {mode === "throw" && (
        <section>
          <h4
            className="text-sm mb-2"
            style={{ fontFamily: "var(--font-hand)", color: "#2C1810" }}
          >
            Face
          </h4>
          <FacePicker
            face={face}
            glaze={glaze}
            pattern={pattern}
            thrown2H={thrown2H}
            thrown2Widths={thrown2Widths}
            edges={edges}
            onFaceChange={setFace}
          />
        </section>
      )}

      {/* ── Glaze picker ──────────────────────────────────────────────────── */}
      <section>
        <h4
          className="text-sm mb-2 tracking-wide"
          style={{ fontFamily: "var(--font-hand)", color: "#2C1810" }}
        >
          Glaze
        </h4>
        <GlazePicker glaze={glaze} onGlazeChange={setGlaze} />
      </section>

      {/* ── Pattern picker ────────────────────────────────────────────────── */}
      <section>
        <h4
          className="text-sm mb-2 tracking-wide"
          style={{ fontFamily: "var(--font-hand)", color: "#2C1810" }}
        >
          Pattern
        </h4>
        <PatternPicker
          pattern={pattern}
          glaze={glaze}
          shapeStr={shapeValue}
          onPatternChange={setPattern}
        />
      </section>

      {/* ── Classic shapes disclosure ──────────────────────────────────────── */}
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
                className="flex flex-col items-center gap-1 p-2 rounded-lg"
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
                <VaseAvatar shape={s.id} glaze={glaze} pattern={pattern} size={44} />
                <span
                  className="text-xs leading-none"
                  style={{ fontFamily: "var(--font-hand)", color: "var(--color-clay-ink-muted)" }}
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
