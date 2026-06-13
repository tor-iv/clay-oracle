"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { encodeDecorationDrawing } from "@/lib/avatars";
import type { DrawStroke } from "@/lib/avatars";
import VaseAvatar from "./VaseAvatar";

interface DecoratePadProps {
  /** Called with the "draw:..." pattern string whenever strokes change */
  onChange: (patternEncoding: string) => void;
  /** Current shape string (for the pot preview) */
  shapeStr: string;
  /** Current glaze for the preview */
  glaze: string;
  /** Initial decoration strokes */
  initialStrokes?: DrawStroke[];
  /** Current glaze hex color for the palette */
  glazeColor?: string;
}

const PAD_SIZE = 180;
const DEFAULT_INK = "#2C1810";

// Palette for decoration pad
const DEC_PALETTE = [
  { id: "ink",   hex: "#2C1810", label: "Ink" },
  { id: "rust",  hex: "#B84C2A", label: "Rust" },
  { id: "sky",   hex: "#5B8EC4", label: "Sky" },
  { id: "sage",  hex: "#6B8F6A", label: "Sage" },
  { id: "honey", hex: "#C9901A", label: "Honey" },
  { id: "blush", hex: "#D4847A", label: "Blush" },
  { id: "white", hex: "#F5F0E8", label: "White" },
];

function rdp(pts: number[], epsilon: number): number[] {
  if (pts.length < 4) return pts;
  const n = pts.length / 2;
  let maxDist = 0, maxIdx = 0;
  const ax = pts[0], ay = pts[1], bx = pts[n * 2 - 2], by = pts[n * 2 - 1];
  const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  for (let i = 1; i < n - 1; i++) {
    const d = len === 0
      ? Math.sqrt((pts[i * 2] - ax) ** 2 + (pts[i * 2 + 1] - ay) ** 2)
      : Math.abs((by - ay) * pts[i * 2] - (bx - ax) * pts[i * 2 + 1] + bx * ay - by * ax) / len;
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left  = rdp(pts.slice(0, (maxIdx + 1) * 2), epsilon);
    const right = rdp(pts.slice(maxIdx * 2), epsilon);
    return [...left.slice(0, -2), ...right];
  }
  return [ax, ay, bx, by];
}

type BrushMode = "thin" | "medium" | "thick" | "eraser";
const BRUSH_WIDTHS: Record<BrushMode, number> = { thin: 2, medium: 4, thick: 7, eraser: 18 };
const BRUSH_STORED: Record<Exclude<BrushMode, "eraser">, number> = { thin: 1, medium: 4, thick: 8 };

export default function DecoratePad({
  onChange,
  shapeStr,
  glaze,
  initialStrokes = [],
  glazeColor,
}: DecoratePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<DrawStroke[]>(initialStrokes);
  const [brushMode, setBrushMode] = useState<BrushMode>("thin");
  const [activeColor, setActiveColor] = useState<string>(DEFAULT_INK);
  const [customColor, setCustomColor] = useState<string>(DEFAULT_INK);
  const currentStrokeRef = useRef<number[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const palette = glazeColor
    ? [...DEC_PALETTE, { id: "glaze", hex: glazeColor, label: "Glaze" }]
    : DEC_PALETTE;

  const redrawCanvas = useCallback((strokeList: DrawStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PAD_SIZE, PAD_SIZE);
    ctx.fillStyle = "rgba(245,240,232,0.0)"; // transparent — pot preview shows through
    ctx.fillRect(0, 0, PAD_SIZE, PAD_SIZE);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokeList) {
      const pts = stroke.points;
      if (pts.length < 4) continue;
      const c = stroke.color ?? DEFAULT_INK;
      const sw = stroke.width ?? 1;
      const canvasPx = sw <= 1 ? 2 : sw <= 4 ? 4 : 7;
      ctx.strokeStyle = c;
      ctx.lineWidth = canvasPx;
      ctx.beginPath();
      ctx.moveTo((pts[0] / 100) * PAD_SIZE, (pts[1] / 100) * PAD_SIZE);
      for (let i = 2; i + 1 < pts.length; i += 2) {
        ctx.lineTo((pts[i] / 100) * PAD_SIZE, (pts[i + 1] / 100) * PAD_SIZE);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redrawCanvas(strokes);
  }, [redrawCanvas, strokes]);

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width)  * PAD_SIZE,
      y: ((e.clientY - rect.top)  / rect.height) * PAD_SIZE,
    };
  }

  function handleErase(x: number, y: number, strokeList: DrawStroke[]): DrawStroke[] {
    const ERASE_R = (BRUSH_WIDTHS.eraser / 2 / PAD_SIZE) * 100;
    const qx = (x / PAD_SIZE) * 100;
    const qy = (y / PAD_SIZE) * 100;
    let closestIdx = -1, closestDist = Infinity;
    for (let si = 0; si < strokeList.length; si++) {
      const pts = strokeList[si].points;
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const d = Math.sqrt((pts[i] - qx) ** 2 + (pts[i + 1] - qy) ** 2);
        if (d < ERASE_R && d < closestDist) { closestDist = d; closestIdx = si; }
      }
    }
    if (closestIdx >= 0) return strokeList.filter((_, i) => i !== closestIdx);
    return strokeList;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPos(e);
    if (brushMode === "eraser") {
      const updated = handleErase(x, y, strokes);
      if (updated.length !== strokes.length) {
        setStrokes(updated);
        redrawCanvas(updated);
        onChange(updated.length > 0 ? encodeDecorationDrawing(updated) : "plain");
      }
      isDrawingRef.current = true;
      lastPointRef.current = { x, y };
      return;
    }
    isDrawingRef.current = true;
    currentStrokeRef.current = [x, y];
    lastPointRef.current = { x, y };
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      const lw = BRUSH_WIDTHS[brushMode];
      ctx.fillStyle = activeColor;
      ctx.beginPath();
      ctx.arc(x, y, lw / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    const last = lastPointRef.current;
    if (!last) return;
    if (brushMode === "eraser") {
      const updated = handleErase(x, y, strokes);
      if (updated.length !== strokes.length) {
        setStrokes(updated);
        redrawCanvas(updated);
        onChange(updated.length > 0 ? encodeDecorationDrawing(updated) : "plain");
      }
      lastPointRef.current = { x, y };
      return;
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = activeColor;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = BRUSH_WIDTHS[brushMode];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    currentStrokeRef.current.push(x, y);
    lastPointRef.current = { x, y };
  }

  function handlePointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    if (brushMode === "eraser") return;
    const rawPts = currentStrokeRef.current;
    currentStrokeRef.current = [];
    if (rawPts.length < 4) return;
    const simplified = rdp(rawPts, 1.8);
    const quantized = simplified.map((v) => Math.round((v / PAD_SIZE) * 100));
    const newStroke: DrawStroke = {
      points: quantized,
      color: activeColor,
      width: BRUSH_STORED[brushMode as Exclude<BrushMode, "eraser">] ?? 1,
    };
    const updated = [...strokes, newStroke];
    let totalPts = updated.reduce((s, st) => s + st.points.length, 0);
    while (totalPts > 400 && updated.length > 1) {
      const r = updated.shift()!;
      totalPts -= r.points.length;
    }
    if (updated.length > 24) updated.shift();
    setStrokes(updated);
    onChange(encodeDecorationDrawing(updated));
  }

  function handlePointerCancel() {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    currentStrokeRef.current = [];
    redrawCanvas(strokes);
  }

  const isEraser = brushMode === "eraser";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {/* Palette */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
        {palette.map((c) => {
          const isActive = !isEraser && activeColor === c.hex;
          return (
            <button
              key={c.id}
              type="button"
              title={c.label}
              aria-label={c.label}
              aria-pressed={isActive}
              onClick={() => { setActiveColor(c.hex); if (isEraser) setBrushMode("thin"); }}
              style={{
                width: 22, height: 22, borderRadius: "50%", background: c.hex,
                border: isActive ? "2.5px solid #2C1810" : "1.5px solid rgba(44,24,16,0.2)",
                transform: isActive ? "scale(1.2)" : "scale(1)", cursor: "pointer", flexShrink: 0,
                transition: "transform 0.1s",
                outline: c.hex === "#F5F0E8" ? "1px solid rgba(44,24,16,0.2)" : undefined,
                outlineOffset: c.hex === "#F5F0E8" ? "-1px" : undefined,
              }}
            />
          );
        })}
        <label title="Custom color" style={{
          position: "relative", width: 22, height: 22, borderRadius: "50%",
          background: "conic-gradient(#C1622E, #C9901A, #6B8F6A, #5B8EC4, #D4847A, #C1622E)",
          border: "1.5px solid rgba(44,24,16,0.3)", cursor: "pointer", overflow: "hidden", flexShrink: 0,
        }}>
          <input
            type="color" value={customColor}
            onChange={(e) => { setCustomColor(e.target.value); setActiveColor(e.target.value); if (isEraser) setBrushMode("thin"); }}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", padding: 0, border: "none" }}
            aria-label="Custom color"
          />
        </label>
      </div>

      {/* Canvas over pot preview */}
      <div style={{ position: "relative", width: PAD_SIZE, height: PAD_SIZE }}>
        {/* Pot preview underneath */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <VaseAvatar shape={shapeStr} glaze={glaze} pattern="plain" size={PAD_SIZE - 10} />
        </div>
        {/* Drawing canvas on top */}
        <canvas
          ref={canvasRef}
          width={PAD_SIZE}
          height={PAD_SIZE}
          style={{
            position: "absolute", inset: 0, display: "block",
            touchAction: "none",
            cursor: isEraser ? "cell" : "crosshair",
            borderRadius: 10,
            border: "2px dashed rgba(44,24,16,0.28)",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          aria-label="Decorate the pot"
        />
      </div>

      {/* Tools */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {(["thin", "medium", "thick"] as const).map((mode) => {
          const isActive = brushMode === mode;
          const dotR = mode === "thin" ? 2 : mode === "medium" ? 3.5 : 5.5;
          return (
            <button key={mode} type="button" onClick={() => setBrushMode(mode)}
              aria-label={`${mode} brush`} aria-pressed={isActive}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                border: isActive ? "2px solid #2C1810" : "1.5px solid rgba(44,24,16,0.25)",
                background: isActive ? "rgba(184,92,42,0.14)" : "rgba(232,213,176,0.4)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0, transition: "transform 0.1s", transform: isActive ? "scale(1.12)" : "scale(1)",
              }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r={dotR} fill={isActive ? "#2C1810" : "rgba(44,24,16,0.5)"} />
              </svg>
            </button>
          );
        })}
        <button type="button" onClick={() => setBrushMode("eraser")} aria-label="Eraser" aria-pressed={isEraser}
          title="Eraser"
          style={{
            width: 30, height: 30, borderRadius: 8,
            border: isEraser ? "2px solid #B85C2A" : "1.5px solid rgba(44,24,16,0.25)",
            background: isEraser ? "rgba(184,92,42,0.18)" : "rgba(232,213,176,0.4)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, fontSize: "0.85rem", transition: "transform 0.1s", transform: isEraser ? "scale(1.12)" : "scale(1)",
          }}>◻</button>
        <button type="button" onClick={() => {
          const updated = strokes.slice(0, -1);
          setStrokes(updated); redrawCanvas(updated);
          onChange(updated.length > 0 ? encodeDecorationDrawing(updated) : "plain");
        }} disabled={strokes.length === 0}
          style={{
            fontFamily: "var(--font-hand)", fontSize: "0.76rem",
            color: strokes.length === 0 ? "rgba(44,24,16,0.3)" : "#5C3D2E",
            background: "rgba(232,213,176,0.4)", border: "1.5px solid rgba(44,24,16,0.2)",
            borderRadius: 7, padding: "3px 9px", cursor: strokes.length === 0 ? "default" : "pointer",
          }}>↩</button>
        <button type="button" onClick={() => {
          setStrokes([]); redrawCanvas([]); onChange("plain");
        }} disabled={strokes.length === 0}
          style={{
            fontFamily: "var(--font-hand)", fontSize: "0.76rem",
            color: strokes.length === 0 ? "rgba(44,24,16,0.3)" : "#B85C2A",
            background: "rgba(232,213,176,0.4)", border: "1.5px solid rgba(44,24,16,0.2)",
            borderRadius: 7, padding: "3px 9px", cursor: strokes.length === 0 ? "default" : "pointer",
          }}>✕</button>
      </div>

      <p style={{
        fontFamily: "var(--font-hand)", fontSize: "0.68rem",
        color: "rgba(92,61,46,0.55)", textAlign: "center", margin: 0,
      }}>
        draw a decoration — it wraps the whole pot
      </p>
    </div>
  );
}
