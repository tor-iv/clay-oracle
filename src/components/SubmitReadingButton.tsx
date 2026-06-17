"use client";

// Submit button for the sculpt form. While the server action runs (LLM reading
// + playlist, a few seconds), it shows a pending state on the button AND a
// full-screen "reading your pot…" overlay so the wait never feels broken.
import { useFormStatus } from "react-dom";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";

export default function SubmitReadingButton() {
  const { pending } = useFormStatus();

  return (
    <>
      <style>{`@keyframes oracleSpin{to{transform:rotate(360deg)}}`}</style>

      <InkButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <>
            <span style={{ display: "inline-flex", animation: "oracleSpin 1s linear infinite" }}>
              <DoodleIcon name="crystal" size={18} color="#F5F0E8" />
            </span>
            reading your pot…
          </>
        ) : (
          <>
            <DoodleIcon name="sparkle" size={18} color="#F5F0E8" />
            read my pot
          </>
        )}
      </InkButton>

      {pending && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            background: "rgba(245,240,232,0.85)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <span style={{ display: "inline-flex", animation: "oracleSpin 1.4s linear infinite" }}>
            <DoodleIcon name="crystal" size={56} color="#B85C2A" />
          </span>
          <p style={{ fontFamily: "var(--font-hand)", fontSize: "1.5rem", color: "#B85C2A", margin: 0 }}>
            the oracle is reading your pot…
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.95rem",
              color: "var(--color-clay-ink-muted)",
              margin: 0,
            }}
          >
            divining your reading &amp; playlist
          </p>
        </div>
      )}
    </>
  );
}
