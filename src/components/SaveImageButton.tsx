"use client";

import { useState } from "react";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";

interface SaveImageButtonProps {
  id: string;
  archetypeName: string;
}

export default function SaveImageButton({ id, archetypeName }: SaveImageButtonProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSave() {
    if (state !== "idle") return;
    setState("saving");

    try {
      const res = await fetch(`/api/og/${id}?format=square`);
      if (!res.ok) {
        setState("idle");
        return;
      }

      const blob = await res.blob();
      const file = new File([blob], `clay-oracle-${id}.png`, {
        type: blob.type || "image/png",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `I'm ${archetypeName} — Clay Oracle`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clay-oracle-${id}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      // User cancelled share or other error — revert silently
      setState("idle");
    }
  }

  const label =
    state === "saving" ? "saving…" : state === "saved" ? "saved!" : "save image";

  return (
    <InkButton
      type="button"
      variant="primary"
      onClick={handleSave}
      aria-label="Save image to share"
      disabled={state === "saving"}
    >
      <DoodleIcon name="camera" size={16} color="#F5F0E8" />
      {label}
    </InkButton>
  );
}
