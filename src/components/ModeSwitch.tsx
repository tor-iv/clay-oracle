"use client";

import { useState } from "react";
import AvatarBuilder from "@/components/avatar/AvatarBuilder";
import HardModeWheel from "@/components/avatar/HardModeWheel";
import DoodleIcon from "@/components/ui/DoodleIcon";

export default function ModeSwitch() {
  const [mode, setMode] = useState<"easy" | "hard">("easy");

  return (
    <div className="flex flex-col gap-5">
      {/* Mode toggle pills */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: "rgba(44,24,16,0.08)",
          borderRadius: 12,
          padding: 3,
          border: "1.5px solid rgba(44,24,16,0.14)",
          alignSelf: "center",
        }}
        role="group"
        aria-label="Builder mode"
      >
        <button
          type="button"
          onClick={() => setMode("easy")}
          aria-pressed={mode === "easy"}
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "0.9rem",
            padding: "5px 20px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            transition: "all 0.18s ease",
            background: mode === "easy" ? "#B85C2A" : "transparent",
            color: mode === "easy" ? "#F5F0E8" : "var(--color-clay-ink-muted)",
            boxShadow: mode === "easy" ? "0 1px 6px rgba(184,92,42,0.35)" : "none",
            fontWeight: mode === "easy" ? 600 : 400,
          }}
        >
          easy
        </button>
        <button
          type="button"
          onClick={() => setMode("hard")}
          aria-pressed={mode === "hard"}
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "0.9rem",
            padding: "5px 20px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            transition: "all 0.18s ease",
            background: mode === "hard" ? "#2C1810" : "transparent",
            color: mode === "hard" ? "#E8D5B0" : "var(--color-clay-ink-muted)",
            boxShadow: mode === "hard" ? "0 1px 6px rgba(0,0,0,0.4)" : "none",
            fontWeight: mode === "hard" ? 600 : 400,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3em" }}>
            hard mode
            <DoodleIcon name="flame" size={16} color={mode === "hard" ? "#E8D5B0" : "var(--color-clay-ink-muted)"} />
          </span>
        </button>
      </div>

      {/* Builder */}
      {mode === "easy" ? <AvatarBuilder /> : <HardModeWheel />}
    </div>
  );
}
