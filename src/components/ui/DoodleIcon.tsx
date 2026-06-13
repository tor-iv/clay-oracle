import type { ReactNode } from "react";

export type DoodleName = "pot" | "star" | "squiggle" | "flame" | "leaf" | "sparkle";

interface DoodleIconProps {
  name: DoodleName;
  size?: number;
  className?: string;
  color?: string;
}

/** Hand-drawn SVG doodles, sketchy and charming */
export default function DoodleIcon({
  name,
  size = 20,
  className = "",
  color = "#2C1810",
}: DoodleIconProps) {
  const paths: Record<DoodleName, ReactNode> = {
    pot: (
      // Cute little pottery pot
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Rim */}
        <path d="M 6 7 Q 10 5 14 7" />
        {/* Body */}
        <path d="M 6 7 Q 4 10 5 14 Q 6 18 10 18 Q 14 18 15 14 Q 16 10 14 7" />
        {/* Handle */}
        <path d="M 14 9 Q 18 9 18 12 Q 18 15 14 14" />
        {/* Base */}
        <path d="M 7 18 Q 10 20 13 18" />
      </g>
    ),

    star: (
      // Wobbly hand-drawn star
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 10 3 C 10.5 6 11 7.5 13 8.5 C 16 10 17.5 9.5 17 10 C 16.5 10.5 14 12 13.5 14 C 13 16 13.5 17.5 12 19 C 10.5 17.5 9 17 9 14.5 C 8.5 12 6 11 4.5 10.5 C 4 10 5 9.5 7 8.5 C 9 7.5 9.5 6 10 3 Z" />
      </g>
    ),

    squiggle: (
      // Playful squiggle line
      <g fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
        <path d="M 2 10 C 4 7 6 7 8 10 C 10 13 12 13 14 10 C 16 7 18 7 20 10" />
      </g>
    ),

    flame: (
      // Cute flame shape
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 10 18 Q 5 15 6 10 Q 7 7 9 6 Q 8 9 10 10 Q 9 7 11 4 Q 14 7 14 10 Q 16 8 15 6 Q 17 9 16 13 Q 15 17 10 18 Z" />
      </g>
    ),

    leaf: (
      // Simple organic leaf
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 10 18 Q 3 14 4 8 Q 5 4 10 3 Q 15 4 16 8 Q 17 14 10 18 Z" />
        {/* Midrib */}
        <path d="M 10 18 Q 10 12 10 3" strokeWidth="1" />
        {/* Side veins */}
        <path d="M 10 14 Q 7 12 5 11" strokeWidth="0.8" />
        <path d="M 10 14 Q 13 12 15 11" strokeWidth="0.8" />
        <path d="M 10 9 Q 8 7 6 7" strokeWidth="0.8" />
        <path d="M 10 9 Q 12 7 14 7" strokeWidth="0.8" />
      </g>
    ),

    sparkle: (
      // Four-pointed sparkle / glint
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
        {/* Big cross */}
        <path d="M 10 2 Q 10.5 7 10 11 Q 9.5 16 10 19" />
        <path d="M 2 10 Q 7 10.5 11 10 Q 16 9.5 19 10" />
        {/* Diagonal cross (smaller) */}
        <path d="M 4 4 Q 7.5 7.5 10 10 Q 12.5 12.5 16 16" strokeOpacity="0.55" />
        <path d="M 16 4 Q 12.5 7.5 10 10 Q 7.5 12.5 4 16" strokeOpacity="0.55" />
      </g>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
