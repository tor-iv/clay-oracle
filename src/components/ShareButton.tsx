"use client";

import { useState } from "react";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
}

export default function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // User cancelled — fall through to clipboard fallback
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore
    }
  }

  return (
    <InkButton
      type="button"
      variant="soft"
      onClick={handleShare}
      aria-label="Share this reading"
    >
      <DoodleIcon name="sparkle" size={16} color="var(--color-clay-ink)" />
      {copied ? "link copied!" : "share"}
    </InkButton>
  );
}
