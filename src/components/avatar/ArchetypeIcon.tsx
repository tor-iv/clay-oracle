import DoodleIcon from "@/components/ui/DoodleIcon";
import { ARCHETYPES } from "@/lib/personality";

interface ArchetypeIconProps {
  /** Archetype id, e.g. "slow-bloomer", "bold-vessel", etc. */
  id: string;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Renders the hand-drawn DoodleIcon for a given archetype id.
 * Falls back to "sparkle" if the id is not found.
 * Server-component-safe — no hooks, no client boundary needed.
 */
export default function ArchetypeIcon({
  id,
  size = 20,
  color = "#2C1810",
  className,
}: ArchetypeIconProps) {
  const archetype = ARCHETYPES.find((a) => a.id === id);
  const iconName = archetype?.iconName ?? "sparkle";

  return (
    <DoodleIcon
      name={iconName}
      size={size}
      color={color}
      className={className}
      aria-hidden={true}
    />
  );
}
