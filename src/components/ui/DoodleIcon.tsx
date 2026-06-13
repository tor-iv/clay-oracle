import type { ReactNode } from "react";

export type DoodleName =
  // ── Original six ──────────────────────────────────────────────────────────
  | "pot"
  | "star"
  | "squiggle"
  | "flame"
  | "leaf"
  | "sparkle"
  // ── General-purpose UI ────────────────────────────────────────────────────
  | "crystal"
  | "amphora"
  | "secret"
  | "calendar"
  | "camera"
  | "pin"
  | "teacup"
  | "chat"
  | "wave"
  | "cloud"
  | "apple"
  | "party"
  | "eyes"
  | "music"
  | "pen"
  | "palette"
  // ── Archetype nature glyphs ───────────────────────────────────────────────
  | "sprout"
  | "moon"
  | "swirl"
  | "sun"
  | "ocean"
  | "blossom"
  | "stone"
  | "kite";

interface DoodleIconProps {
  name: DoodleName;
  size?: number;
  color?: string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/** Hand-drawn SVG doodles, sketchy and charming */
export default function DoodleIcon({
  name,
  size = 20,
  color = "#2C1810",
  className = "",
  "aria-hidden": ariaHidden = true,
}: DoodleIconProps) {
  const sw = "1.6"; // default strokeWidth
  const common = {
    fill: "none" as const,
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<DoodleName, ReactNode> = {
    // ── Original six (unchanged) ────────────────────────────────────────────
    pot: (
      <g {...common}>
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
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 10 3 C 10.5 6 11 7.5 13 8.5 C 16 10 17.5 9.5 17 10 C 16.5 10.5 14 12 13.5 14 C 13 16 13.5 17.5 12 19 C 10.5 17.5 9 17 9 14.5 C 8.5 12 6 11 4.5 10.5 C 4 10 5 9.5 7 8.5 C 9 7.5 9.5 6 10 3 Z" />
      </g>
    ),

    squiggle: (
      <g fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
        <path d="M 2 10 C 4 7 6 7 8 10 C 10 13 12 13 14 10 C 16 7 18 7 20 10" />
      </g>
    ),

    flame: (
      <g {...common}>
        <path d="M 10 18 Q 5 15 6 10 Q 7 7 9 6 Q 8 9 10 10 Q 9 7 11 4 Q 14 7 14 10 Q 16 8 15 6 Q 17 9 16 13 Q 15 17 10 18 Z" />
      </g>
    ),

    leaf: (
      <g {...common}>
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
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <path d="M 10 2 Q 10.5 7 10 11 Q 9.5 16 10 19" />
        <path d="M 2 10 Q 7 10.5 11 10 Q 16 9.5 19 10" />
        <path d="M 4 4 Q 7.5 7.5 10 10 Q 12.5 12.5 16 16" strokeOpacity="0.55" />
        <path d="M 16 4 Q 12.5 7.5 10 10 Q 7.5 12.5 4 16" strokeOpacity="0.55" />
      </g>
    ),

    // ── General-purpose UI icons ────────────────────────────────────────────

    crystal: (
      // Oracle crystal ball on a little stand — sphere + stand + inner gleam
      <g {...common}>
        {/* Stand base */}
        <path d="M 5.5 18 Q 10 19 14.5 18" />
        {/* Stand stem */}
        <path d="M 7.5 17 Q 8 15.5 9 15" />
        <path d="M 12.5 17 Q 12 15.5 11 15" />
        {/* Globe */}
        <path d="M 10 4 Q 15.5 4 16 9.5 Q 16.5 15 10 15 Q 3.5 15 4 9.5 Q 4.5 4 10 4 Z" />
        {/* Inner gleam top-left */}
        <path d="M 7 7 Q 8 6 9.5 6.5" strokeWidth="1" strokeOpacity="0.6" />
        {/* Sparkle dot */}
        <path d="M 13 8 Q 13.2 7.8 13.4 8" strokeWidth="1.2" />
      </g>
    ),

    amphora: (
      // Refined amphora — tall neck, two handles, wide body, foot ring
      <g {...common}>
        {/* Neck */}
        <path d="M 8 4 Q 7.5 6 7 8" />
        <path d="M 12 4 Q 12.5 6 13 8" />
        {/* Lip rim */}
        <path d="M 7.5 3.5 Q 10 3 12.5 3.5" />
        {/* Body */}
        <path d="M 7 8 Q 4 11 5 15 Q 6 17.5 10 17.5 Q 14 17.5 15 15 Q 16 11 13 8" />
        {/* Left handle */}
        <path d="M 7 9 Q 4.5 9 4 11.5 Q 4 13 6.5 13.5" />
        {/* Right handle */}
        <path d="M 13 9 Q 15.5 9 16 11.5 Q 16 13 13.5 13.5" />
        {/* Foot ring */}
        <path d="M 7 17.5 Q 10 19 13 17.5" />
      </g>
    ),

    secret: (
      // Shushing face — two eyes, finger-to-lips gesture
      <g {...common}>
        {/* Head circle */}
        <path d="M 10 3 Q 16 3 16.5 9 Q 17 16 10 17 Q 3 16 3.5 9 Q 4 3 10 3 Z" />
        {/* Left eye */}
        <path d="M 7 8.5 Q 7.5 8 8 8.5" />
        {/* Right eye */}
        <path d="M 12 8.5 Q 12.5 8 13 8.5" />
        {/* Lips (closed, slight curve) */}
        <path d="M 7.5 12 Q 10 13 12.5 12" />
        {/* Finger over lips */}
        <path d="M 9 12.5 Q 9 11 9.5 10 Q 10 9 10.5 10" strokeWidth="1.4" />
        {/* Shhh! eyebrow raise */}
        <path d="M 12.5 7 Q 13.5 6.5 14 7" strokeWidth="1" />
      </g>
    ),

    calendar: (
      // Page calendar with two binding tabs and grid lines
      <g {...common}>
        {/* Page body */}
        <path d="M 3 6.5 Q 3 4 5 4 L 15 4 Q 17 4 17 6.5 L 17 16.5 Q 17 18 15 18 L 5 18 Q 3 18 3 16.5 Z" />
        {/* Header band */}
        <path d="M 3 8.5 Q 10 8 17 8.5" strokeWidth="1.2" />
        {/* Binding tab left */}
        <path d="M 7 3 Q 7 2 7 1.5 Q 7.2 3 7.5 4" strokeWidth="1.5" />
        {/* Binding tab right */}
        <path d="M 13 3 Q 13 2 13 1.5 Q 13.2 3 13.5 4" strokeWidth="1.5" />
        {/* Grid row 1 */}
        <path d="M 6 11 L 8 11" strokeWidth="1" />
        <path d="M 10 11 L 12 11" strokeWidth="1" />
        <path d="M 14 11 L 15.5 11" strokeWidth="1" />
        {/* Grid row 2 */}
        <path d="M 4.5 14 L 6.5 14" strokeWidth="1" />
        <path d="M 10 14 L 12 14" strokeWidth="1" />
        <path d="M 14 14 L 15.5 14" strokeWidth="1" />
      </g>
    ),

    camera: (
      // Chunky camera body, round lens, shutter bump
      <g {...common}>
        {/* Body */}
        <path d="M 2.5 8 Q 2 7 3.5 6.5 L 7 6.5 Q 7.5 5 8.5 4.5 L 11.5 4.5 Q 12.5 5 13 6.5 L 16.5 6.5 Q 18 7 17.5 8 L 17.5 15.5 Q 17.5 17 16 17 L 4 17 Q 2.5 17 2.5 15.5 Z" />
        {/* Lens outer */}
        <path d="M 10 8 Q 13.5 8 13.5 11.5 Q 13.5 15 10 15 Q 6.5 15 6.5 11.5 Q 6.5 8 10 8 Z" />
        {/* Lens inner */}
        <path d="M 10 9.5 Q 12 9.5 12 11.5 Q 12 13.5 10 13.5 Q 8 13.5 8 11.5 Q 8 9.5 10 9.5 Z" strokeWidth="1.1" />
        {/* Flash / viewfinder bump */}
        <path d="M 14.5 7.5 Q 15.5 7 16 7.5" strokeWidth="1" />
      </g>
    ),

    pin: (
      // Teardrop map pin with dot in centre
      <g {...common}>
        {/* Teardrop body */}
        <path d="M 10 17.5 Q 4 12.5 4 8.5 Q 4 4 10 3.5 Q 16 4 16 8.5 Q 16 12.5 10 17.5 Z" />
        {/* Centre dot */}
        <path d="M 10 8.5 Q 10.1 8.2 10.3 8.5 Q 10.5 8.8 10 9 Q 9.5 8.8 9.7 8.5 Q 9.9 8.2 10 8.5 Z" fill={color} strokeWidth="0" />
      </g>
    ),

    teacup: (
      // Little teacup with saucer + curly steam
      <g {...common}>
        {/* Cup body */}
        <path d="M 5 9 Q 4.5 15 7 16 Q 10 17 13 16 Q 15.5 15 15 9" />
        {/* Rim */}
        <path d="M 5 9 Q 10 7.5 15 9" />
        {/* Handle */}
        <path d="M 15 10.5 Q 17.5 10.5 17.5 12.5 Q 17.5 14.5 15 14.5" />
        {/* Saucer */}
        <path d="M 3 17.5 Q 10 19.5 17 17.5" />
        {/* Steam left */}
        <path d="M 7.5 6.5 Q 6.5 5 7.5 4 Q 8.5 3 7.5 2" strokeWidth="1.2" strokeOpacity="0.7" />
        {/* Steam right */}
        <path d="M 12 6.5 Q 11 5 12 4 Q 13 3 12 2" strokeWidth="1.2" strokeOpacity="0.7" />
      </g>
    ),

    chat: (
      // Rounded speech bubble with tail
      <g {...common}>
        {/* Bubble */}
        <path d="M 10 3 Q 17 3 17 9 Q 17 15 10 15 Q 7 15 5.5 13.5 L 3 17 L 5 13 Q 3 11.5 3 9 Q 3 3 10 3 Z" />
        {/* Three dots inside */}
        <path d="M 7.5 9 Q 7.6 8.7 7.8 9 Q 7.9 9.2 7.7 9.3" strokeWidth="1.5" />
        <path d="M 10 9 Q 10.1 8.7 10.3 9 Q 10.4 9.2 10.2 9.3" strokeWidth="1.5" />
        <path d="M 12.5 9 Q 12.6 8.7 12.8 9 Q 12.9 9.2 12.7 9.3" strokeWidth="1.5" />
      </g>
    ),

    wave: (
      // Friendly waving hand — palm + four fingers + thumb, slight tilt
      <g {...common}>
        {/* Wrist & palm */}
        <path d="M 8 16.5 Q 7 16 6.5 14.5 Q 6 13 7 12 Q 7.5 11 8.5 11.5" />
        {/* Index finger */}
        <path d="M 8.5 11.5 Q 8 7 9 5.5 Q 9.7 4.5 10.5 5 Q 11.3 5.5 11 7" />
        {/* Middle finger */}
        <path d="M 11 7 Q 10.5 4 11.5 3 Q 12.5 2.5 13 3.5 Q 13.5 4.5 13 7" />
        {/* Ring finger */}
        <path d="M 13 7 Q 13 4.5 14 4 Q 15 3.8 15.5 5 Q 16 6 15.5 8" />
        {/* Pinky */}
        <path d="M 15.5 8 Q 15.5 6.5 16 6.5 Q 17 6.5 17 8 Q 17 9.5 16.5 10.5" />
        {/* Thumb */}
        <path d="M 8.5 11.5 Q 7.5 12 7 13" />
        {/* Palm close + fingers base */}
        <path d="M 8.5 11.5 Q 11 10.5 13 10.5 Q 15.5 10.5 16.5 10.5 Q 16 12 14 13.5 Q 12 15 10 15.5 Q 9 16 8 16.5" />
      </g>
    ),

    cloud: (
      // Fluffy cloud — bumpy top, flat-ish bottom
      <g {...common}>
        <path d="M 4.5 14.5 Q 2.5 14.5 2.5 12 Q 2.5 10 4.5 9.5 Q 4.5 7 7 6.5 Q 8 4.5 10 4.5 Q 12.5 4.5 13.5 6.5 Q 15.5 6.5 16.5 8.5 Q 18 9 17.5 11 Q 17.5 14.5 15 14.5 Z" />
      </g>
    ),

    apple: (
      // Round apple with leaf and stem
      <g {...common}>
        {/* Stem */}
        <path d="M 10 4 Q 10.5 2.5 11.5 2" />
        {/* Leaf */}
        <path d="M 10.5 3.5 Q 13 2.5 13.5 4.5 Q 12 4.5 10.5 3.5 Z" strokeWidth="1.2" />
        {/* Apple body */}
        <path d="M 10 5 Q 14 4.5 15.5 7 Q 17.5 10 16.5 13.5 Q 15.5 17 12.5 17.5 Q 11 17.5 10 17 Q 9 17.5 7.5 17.5 Q 4.5 17 3.5 13.5 Q 2.5 10 4.5 7 Q 6 4.5 10 5 Z" />
        {/* Dimple top */}
        <path d="M 8.5 5.5 Q 9.5 5 10 5" strokeWidth="1" />
      </g>
    ),

    party: (
      // Confetti burst — streamer arcs + little shapes
      <g {...common}>
        {/* Central pop */}
        <path d="M 10 10 Q 10.3 9.5 10 9 Q 9.7 9.5 10 10" strokeWidth="1.8" />
        {/* Top streamer */}
        <path d="M 10 9 Q 9.5 6.5 8.5 5" strokeWidth="1.3" />
        {/* Upper-right arc */}
        <path d="M 10 9 Q 12.5 7 14 5.5" strokeWidth="1.3" />
        {/* Right arc */}
        <path d="M 10 10 Q 14 10 15.5 9.5" strokeWidth="1.3" />
        {/* Lower-right */}
        <path d="M 10 10 Q 13 13 14 15" strokeWidth="1.3" />
        {/* Bottom */}
        <path d="M 10 10 Q 10 13.5 9.5 15.5" strokeWidth="1.3" />
        {/* Left arc */}
        <path d="M 10 10 Q 6 10.5 4.5 10" strokeWidth="1.3" />
        {/* Upper-left */}
        <path d="M 10 9 Q 7 7 5.5 5.5" strokeWidth="1.3" />
        {/* Confetti dots */}
        <path d="M 8 4 Q 8.2 3.6 8.5 4" strokeWidth="1.4" />
        <path d="M 14.5 7 Q 14.7 6.6 15 7" strokeWidth="1.4" />
        <path d="M 15.5 12 Q 15.7 11.6 16 12" strokeWidth="1.4" />
        <path d="M 5 14 Q 5.2 13.6 5.5 14" strokeWidth="1.4" />
        <path d="M 4 8 Q 4.2 7.6 4.5 8" strokeWidth="1.4" />
        {/* Tiny squiggle left */}
        <path d="M 4 12 Q 4.5 11.5 5 12 Q 5.5 12.5 6 12" strokeWidth="1.1" />
      </g>
    ),

    eyes: (
      // Two simple peering eyes with pupils
      <g {...common}>
        {/* Left eye socket */}
        <path d="M 3 10 Q 3 7 6.5 7 Q 10 7 10 10 Q 10 13 6.5 13 Q 3 13 3 10 Z" />
        {/* Left pupil */}
        <path d="M 6.5 9.5 Q 7.5 9.5 7.5 10 Q 7.5 11 6.5 11 Q 5.5 11 5.5 10 Q 5.5 9.5 6.5 9.5 Z" fill={color} strokeWidth="0" />
        {/* Right eye socket */}
        <path d="M 10 10 Q 10 7 13.5 7 Q 17 7 17 10 Q 17 13 13.5 13 Q 10 13 10 10 Z" />
        {/* Right pupil */}
        <path d="M 13.5 9.5 Q 14.5 9.5 14.5 10 Q 14.5 11 13.5 11 Q 12.5 11 12.5 10 Q 12.5 9.5 13.5 9.5 Z" fill={color} strokeWidth="0" />
        {/* Left brow */}
        <path d="M 4.5 6 Q 6.5 5 8.5 6" strokeWidth="1.2" />
        {/* Right brow */}
        <path d="M 11.5 6 Q 13.5 5 15.5 6" strokeWidth="1.2" />
      </g>
    ),

    music: (
      // Music note — filled notehead + stem + flag
      <g {...common}>
        {/* Notehead (filled oval) */}
        <path d="M 6 15 Q 6 12.5 9 12.5 Q 12 12.5 12 15 Q 12 17.5 9 17.5 Q 6 17.5 6 15 Z" fill={color} strokeWidth="0" />
        {/* Stem */}
        <path d="M 12 15 L 12 4.5" />
        {/* Flag */}
        <path d="M 12 4.5 Q 16 6 15.5 9 Q 14 10 12 9.5" strokeWidth="1.4" />
      </g>
    ),

    pen: (
      // Pencil / pen — angled body with tip + eraser
      <g {...common}>
        {/* Pencil body */}
        <path d="M 4.5 16.5 L 13.5 4.5 Q 14.5 3.5 15.5 4.5 Q 16.5 5.5 15.5 6.5 L 6.5 17.5 Z" />
        {/* Tip triangle */}
        <path d="M 4.5 16.5 L 3 18.5 L 5.5 18 Z" fill={color} strokeWidth="0" />
        {/* Ferrule band */}
        <path d="M 13.5 4.5 Q 14 5 14.5 5.5" strokeWidth="1.8" />
        {/* Centre line along body */}
        <path d="M 5.5 17 L 14.5 5" strokeWidth="0.9" strokeOpacity="0.45" />
      </g>
    ),

    palette: (
      // Artist's palette — kidney-shaped with paint dabs + thumb hole
      <g {...common}>
        {/* Palette shape */}
        <path d="M 7 3.5 Q 14 2.5 16.5 6.5 Q 18.5 10 16 14 Q 14 17.5 10 17.5 Q 7 17.5 5.5 15.5 Q 3 13 4 9.5 Q 4.5 6 7 3.5 Z" />
        {/* Thumb hole */}
        <path d="M 7.5 7 Q 9 6.5 10 7.5 Q 11 8.5 9.5 9 Q 8 9.5 7.5 8.5 Q 7 8 7.5 7 Z" strokeWidth="1.2" />
        {/* Paint dabs */}
        <path d="M 13 5 Q 13.5 4.5 14 5 Q 14 5.5 13.5 5.5 Z" fill={color} strokeWidth="0" />
        <path d="M 15.5 8 Q 16 7.5 16.5 8 Q 16.5 8.5 16 8.5 Z" fill={color} strokeWidth="0" />
        <path d="M 15 12 Q 15.5 11.5 16 12 Q 16 12.5 15.5 12.5 Z" fill={color} strokeWidth="0" />
        <path d="M 11.5 16 Q 12 15.5 12.5 16 Q 12.5 16.5 12 16.5 Z" fill={color} strokeWidth="0" />
        <path d="M 7.5 15.5 Q 8 15 8.5 15.5 Q 8.5 16 8 16 Z" fill={color} strokeWidth="0" />
      </g>
    ),

    // ── Archetype nature glyphs ─────────────────────────────────────────────

    sprout: (
      // Small seedling — two cotyledon leaves on a little stem
      <g {...common}>
        {/* Main stem */}
        <path d="M 10 18 Q 10 13 10 10" />
        {/* Left leaf */}
        <path d="M 10 13 Q 7 11 5 9 Q 6 7 8.5 8 Q 10 9 10 10" />
        {/* Right leaf */}
        <path d="M 10 13 Q 13 11 15 9 Q 14 7 11.5 8 Q 10 9 10 10" />
        {/* Tip bud */}
        <path d="M 10 10 Q 10 8.5 10 7" />
        <path d="M 10 7 Q 8.5 6 9 4.5 Q 10 3.5 11 4.5 Q 11.5 6 10 7 Z" strokeWidth="1.3" />
      </g>
    ),

    moon: (
      // Crescent moon — outer arc with star companion
      <g {...common}>
        {/* Crescent via two arcs (outer circle minus inner offset) */}
        <path d="M 14.5 4 Q 19 8 17.5 13.5 Q 16 18.5 10.5 18.5 Q 5.5 18.5 3.5 15 Q 6.5 16 9.5 14 Q 14 11 14 6.5 Q 14 5 14.5 4 Z" />
        {/* Tiny star companion */}
        <path d="M 4.5 6.5 Q 5 5 5.5 6.5 Q 6 5 6 6.5 Q 7 7 5.5 7 Q 6 8 5.5 7 Q 5 8 5 7 Q 4 7 4.5 6.5 Z" strokeWidth="1.1" />
      </g>
    ),

    swirl: (
      // Tight spiral that unwinds outward — playful and kinetic
      <g {...common}>
        <path d="M 10 10 Q 10 8.5 11.5 8 Q 13.5 7.5 14.5 9.5 Q 15.5 11.5 14 13.5 Q 12.5 15.5 10 15.5 Q 6.5 15.5 5 13 Q 3.5 10 5 7.5 Q 7 5 10 4.5 Q 14 4 16.5 6.5 Q 19 9 18 13" />
      </g>
    ),

    sun: (
      // Circle with wobbly rays radiating out
      <g {...common}>
        {/* Core */}
        <path d="M 10 7 Q 13 7 13 10 Q 13 13 10 13 Q 7 13 7 10 Q 7 7 10 7 Z" />
        {/* Rays — 8, slightly offset for hand-drawn charm */}
        <path d="M 10 2 Q 10 5 10 6.5" />
        <path d="M 17.5 4.5 Q 15.5 6.5 14.5 7.5" />
        <path d="M 18 10 Q 15.5 10 13.5 10" />
        <path d="M 17.5 15.5 Q 15.5 13.5 14.5 12.5" />
        <path d="M 10 18 Q 10 15 10 13.5" />
        <path d="M 2.5 15.5 Q 4.5 13.5 5.5 12.5" />
        <path d="M 2 10 Q 4.5 10 6.5 10" />
        <path d="M 2.5 4.5 Q 4.5 6.5 5.5 7.5" />
      </g>
    ),

    ocean: (
      // Two rolling waves, slightly out of phase
      <g {...common}>
        {/* Top wave */}
        <path d="M 1.5 9 Q 3 7 5 9 Q 7 11 9 9 Q 11 7 13 9 Q 15 11 17 9 Q 18.5 7.5 19 8.5" />
        {/* Bottom wave (offset, slightly simpler) */}
        <path d="M 1.5 13 Q 3.5 11 5.5 13 Q 7.5 15 9.5 13 Q 11.5 11 13.5 13 Q 15.5 15 17.5 13 Q 18.5 12 19 12.5" />
        {/* Sea floor hint */}
        <path d="M 2 17.5 Q 10 18.5 18 17.5" strokeWidth="1" strokeOpacity="0.5" />
      </g>
    ),

    blossom: (
      // Five-petal flower with button centre
      <g {...common}>
        {/* Petals — five, each a rounded lozenge from centre */}
        <path d="M 10 10 Q 9 7.5 10 5 Q 11 7.5 10 10 Z" />
        <path d="M 10 10 Q 12.5 9 14.5 10 Q 12.5 11 10 10 Z" />
        <path d="M 10 10 Q 11 12.5 10 15 Q 9 12.5 10 10 Z" />
        <path d="M 10 10 Q 7.5 11 5.5 10 Q 7.5 9 10 10 Z" />
        {/* Diagonal petals — smaller */}
        <path d="M 10 10 Q 12 8 13.5 6.5 Q 12.5 9 10 10 Z" strokeWidth="1.2" />
        <path d="M 10 10 Q 8 8 6.5 6.5 Q 8 9.5 10 10 Z" strokeWidth="1.2" />
        <path d="M 10 10 Q 12 12 13.5 13.5 Q 11.5 11 10 10 Z" strokeWidth="1.2" />
        <path d="M 10 10 Q 8 12 6.5 13.5 Q 8.5 11 10 10 Z" strokeWidth="1.2" />
        {/* Centre button */}
        <path d="M 10 9 Q 11.5 9 11.5 10 Q 11.5 11.5 10 11.5 Q 8.5 11.5 8.5 10 Q 8.5 9 10 9 Z" fill={color} strokeWidth="0" />
      </g>
    ),

    stone: (
      // Smooth pebble / rock with a subtle highlight
      <g {...common}>
        {/* Rock body — slightly lumpy irregular oval */}
        <path d="M 5 15 Q 3 13 3.5 10 Q 4 6.5 7 5 Q 10 4 13.5 5.5 Q 17 7 17 10.5 Q 17 14 14.5 16 Q 12 17.5 8.5 17 Q 6 16.5 5 15 Z" />
        {/* Highlight shimmer top-left */}
        <path d="M 6.5 7.5 Q 8 6.5 10 7" strokeWidth="1" strokeOpacity="0.55" />
        {/* Small secondary pebble */}
        <path d="M 14.5 14 Q 13.5 13 14 12 Q 15 11.5 15.5 12.5 Q 16 13.5 15 14.5 Q 14.5 14.5 14.5 14 Z" strokeWidth="1.2" />
      </g>
    ),

    kite: (
      // Diamond kite with cross spars, tail + wind bow-ties
      <g {...common}>
        {/* Kite diamond */}
        <path d="M 10 2 Q 16.5 8 10 14 Q 3.5 8 10 2 Z" />
        {/* Horizontal spar */}
        <path d="M 3.5 8 Q 10 7.5 16.5 8" strokeWidth="1" />
        {/* Vertical spar */}
        <path d="M 10 2 Q 10 8 10 14" strokeWidth="1" />
        {/* Tail string */}
        <path d="M 10 14 Q 11 16 10 17.5 Q 9 19 10 20" strokeWidth="1.3" />
        {/* Tail bow 1 */}
        <path d="M 9 16.5 Q 7.5 16 8 17 Q 9 18 9.5 17 Q 9.5 16.5 9 16.5 Z" strokeWidth="1.1" />
        {/* Tail bow 2 */}
        <path d="M 10.5 18.5 Q 12 18 11.5 19 Q 10.5 20 10 19 Q 10 18.5 10.5 18.5 Z" strokeWidth="1.1" />
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
      aria-hidden={ariaHidden}
    >
      {paths[name]}
    </svg>
  );
}
