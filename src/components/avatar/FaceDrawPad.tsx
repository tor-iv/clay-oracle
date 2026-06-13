"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { encodeFaceDrawing } from "@/lib/avatars";
import type { DrawStroke } from "@/lib/avatars";

interface FaceDrawPadProps {
  /** Called with the new "draw:..." encoding whenever strokes change */
  onChange: (faceEncoding: string) => void;
  /** Initial strokes to populate (decoded from face string) */
  initialStrokes?: DrawStroke[];
}

const PAD_SIZE = 120; // px square canvas
const INK_COLOR = "#2C1810";

// ── Stroke simplification (Ramer-Douglas-Peucker) ──────────────────────────
function vecDist(
  ax: number, ay: number,
  bx: number, by: number
): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

function perpendicularDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return vecDist(px, py, ax, ay);
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

function rdp(pts: number[], epsilon: number): number[] {
  if (pts.length < 4) return pts;
  const n = pts.length / 2;
  // Find the point with the maximum distance
  let maxDist = 0;
  let maxIdx = 0;
  const ax = pts[0], ay = pts[1];
  const bx = pts[n * 2 - 2], by = pts[n * 2 - 1];
  for (let i = 1; i < n - 1; i++) {
    const d = perpendicularDist(pts[i * 2], pts[i * 2 + 1], ax, ay, bx, by);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left  = rdp(pts.slice(0, (maxIdx + 1) * 2), epsilon);
    const right = rdp(pts.slice(maxIdx * 2), epsilon);
    return [...left.slice(0, -2), ...right];
  }
  return [ax, ay, bx, by];
}

export default function FaceDrawPad({ onChange, initialStrokes = [] }: FaceDrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<DrawStroke[]>(initialStrokes);
  const [brushSize, setBrushSize] = useState<"thin" | "thick">("thin");
  const currentStrokeRef = useRef<number[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Draw all strokes onto canvas
  const redrawCanvas = useCallback((strokeList: DrawStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, PAD_SIZE, PAD_SIZE);

    // Background — faint parchment
    ctx.fillStyle = "rgba(245,240,232,0.85)";
    ctx.fillRect(0, 0, PAD_SIZE, PAD_SIZE);

    ctx.strokeStyle = INK_COLOR;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokeList) {
      const pts = stroke.points;
      if (pts.length < 4) continue;
      ctx.lineWidth = (stroke as DrawStroke & { thick?: boolean }).thick ? 3.5 : 1.6;
      ctx.beginPath();
      // Dequantize from [0..100] face-zone space → canvas pixels
      ctx.moveTo(
        (pts[0] / 100) * PAD_SIZE,
        (pts[1] / 100) * PAD_SIZE
      );
      for (let i = 2; i + 1 < pts.length; i += 2) {
        ctx.lineTo(
          (pts[i]     / 100) * PAD_SIZE,
          (pts[i + 1] / 100) * PAD_SIZE
        );
      }
      ctx.stroke();
    }
  }, []);

  // Initial draw
  useEffect(() => {
    redrawCanvas(strokes);
  }, [redrawCanvas]); // eslint-disable-line react-hooks/exhaustive-deps

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width)  * PAD_SIZE,
      y: ((e.clientY - rect.top)  / rect.height) * PAD_SIZE,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const { x, y } = getCanvasPos(e);
    currentStrokeRef.current = [x, y];
    lastPointRef.current = { x, y };

    // Draw a dot
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = INK_COLOR;
      ctx.lineCap = "round";
      ctx.lineWidth = brushSize === "thick" ? 3.5 : 1.6;
      ctx.beginPath();
      ctx.arc(x, y, (brushSize === "thick" ? 1.75 : 0.8), 0, Math.PI * 2);
      ctx.fillStyle = INK_COLOR;
      ctx.fill();
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    const last = lastPointRef.current;
    if (!last) return;

    // Live draw onto canvas
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = INK_COLOR;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize === "thick" ? 3.5 : 1.6;
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

    const rawPts = currentStrokeRef.current;
    currentStrokeRef.current = [];

    if (rawPts.length < 4) return;

    // Simplify stroke (RDP epsilon = 2px)
    const simplified = rdp(rawPts, 2.0);

    // Quantize to [0..100] face-zone space (round to int)
    const quantized = simplified.map((v, i) => {
      // Even = x, odd = y
      return Math.round((v / PAD_SIZE) * 100);
    });

    const newStroke: DrawStroke & { thick?: boolean } = {
      points: quantized,
      thick: brushSize === "thick",
    };

    // Cap total strokes at 12 and total points at 200
    const updatedStrokes = [...strokes, newStroke];
    // If too many points, remove oldest strokes
    let totalPts = updatedStrokes.reduce((sum, s) => sum + s.points.length, 0);
    while (totalPts > 200 && updatedStrokes.length > 1) {
      const removed = updatedStrokes.shift()!;
      totalPts -= removed.points.length;
    }
    if (updatedStrokes.length > 12) updatedStrokes.shift();

    setStrokes(updatedStrokes);
    onChange(encodeFaceDrawing(updatedStrokes));
  }

  function handleUndo() {
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    redrawCanvas(updated);
    onChange(updated.length > 0 ? encodeFaceDrawing(updated) : "none");
  }

  function handleClear() {
    setStrokes([]);
    redrawCanvas([]);
    onChange("none");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Canvas */}
      <div
        style={{
          position: "relative",
          borderRadius: 10,
          overflow: "hidden",
          border: "2px dashed rgba(44,24,16,0.35)",
          boxShadow: "inset 0 2px 8px rgba(44,24,16,0.08)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={PAD_SIZE}
          height={PAD_SIZE}
          style={{
            display: "block",
            touchAction: "none",
            cursor: "crosshair",
            borderRadius: 8,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Draw your face"
        />
        {/* Crosshair guide (faint center mark) */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.12,
          }}
          width={PAD_SIZE}
          height={PAD_SIZE}
        >
          <line x1={PAD_SIZE / 2} y1="10" x2={PAD_SIZE / 2} y2={PAD_SIZE - 10}
            stroke="#2C1810" strokeWidth="0.8" strokeDasharray="2 4" />
          <line x1="10" y1={PAD_SIZE / 2} x2={PAD_SIZE - 10} y2={PAD_SIZE / 2}
            stroke="#2C1810" strokeWidth="0.8" strokeDasharray="2 4" />
        </svg>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {/* Brush size */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setBrushSize("thin")}
            aria-label="Thin brush"
            aria-pressed={brushSize === "thin"}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: brushSize === "thin" ? "2px solid #2C1810" : "1.5px solid rgba(44,24,16,0.25)",
              background: brushSize === "thin" ? "rgba(184,92,42,0.12)" : "rgba(232,213,176,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="1.5" fill="#2C1810" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setBrushSize("thick")}
            aria-label="Thick brush"
            aria-pressed={brushSize === "thick"}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: brushSize === "thick" ? "2px solid #2C1810" : "1.5px solid rgba(44,24,16,0.25)",
              background: brushSize === "thick" ? "rgba(184,92,42,0.12)" : "rgba(232,213,176,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="3.5" fill="#2C1810" />
            </svg>
          </button>
        </div>

        {/* Undo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={strokes.length === 0}
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "0.78rem",
            color: strokes.length === 0 ? "rgba(44,24,16,0.3)" : "#5C3D2E",
            background: "rgba(232,213,176,0.4)",
            border: "1.5px solid rgba(44,24,16,0.2)",
            borderRadius: 7,
            padding: "3px 10px",
            cursor: strokes.length === 0 ? "default" : "pointer",
          }}
        >
          ↩ undo
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={handleClear}
          disabled={strokes.length === 0}
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "0.78rem",
            color: strokes.length === 0 ? "rgba(44,24,16,0.3)" : "#B85C2A",
            background: "rgba(232,213,176,0.4)",
            border: "1.5px solid rgba(44,24,16,0.2)",
            borderRadius: 7,
            padding: "3px 10px",
            cursor: strokes.length === 0 ? "default" : "pointer",
          }}
        >
          ✕ clear
        </button>
      </div>

      <p
        style={{
          fontFamily: "var(--font-hand)",
          fontSize: "0.7rem",
          color: "rgba(92,61,46,0.6)",
          textAlign: "center",
          margin: 0,
        }}
      >
        draw in the box — your strokes go on the pot
      </p>
    </div>
  );
}
