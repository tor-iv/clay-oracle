import { type ReactNode } from "react";

interface PaperTextureProps {
  children: ReactNode;
  className?: string;
}

/** Applies the paper background + grain texture to the whole page */
export default function PaperTexture({ children, className = "" }: PaperTextureProps) {
  return (
    <div className={`paper-texture min-h-full ${className}`}>
      {children}
    </div>
  );
}
