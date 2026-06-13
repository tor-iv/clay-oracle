import { type ReactNode } from "react";

interface WobblyCardProps {
  children: ReactNode;
  className?: string;
  /** cream = #F5F0E8 bg, warm = #E8D5B0 bg */
  tone?: "cream" | "warm";
}

export default function WobblyCard({
  children,
  className = "",
  tone = "cream",
}: WobblyCardProps) {
  const bg   = tone === "warm" ? "#E8D5B0" : "#F5F0E8";
  const border = "#2C1810";

  return (
    <div
      className={`relative rounded-xl p-5 ${className}`}
      style={{
        background: bg,
        border: `2px solid ${border}`,
        boxShadow: `3px 4px 0px rgba(44, 24, 16, 0.18), 1px 2px 8px rgba(44, 24, 16, 0.08)`,
        // Slight rotation on border wrapper only – kept very small for legibility
      }}
    >
      {/* Inner slight-texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(232,213,176,0.4) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
