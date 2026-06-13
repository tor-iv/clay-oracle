import ModeSwitch from "@/components/ModeSwitch";
import InkButton from "@/components/ui/InkButton";
import DoodleIcon from "@/components/ui/DoodleIcon";
import { readPotAction } from "@/actions/pot";

// Sculpt landing — throw a pot, then "read my pot".
export default function Home() {
  return (
    <main className="flex flex-col items-center px-4 py-8 sm:py-12 min-h-screen">
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="text-center mb-6">
          <h1
            className="leading-tight"
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "clamp(2.4rem, 8vw, 3.4rem)",
              fontWeight: 700,
              color: "#B85C2A",
            }}
          >
            Clay Oracle 🔮
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1.05rem",
              color: "var(--color-clay-ink-muted)",
            }}
          >
            throw a pot &amp; discover what it says about you
          </p>
        </div>

        <form action={readPotAction} className="flex flex-col gap-6">
          <ModeSwitch />
          <div className="flex justify-center">
            <InkButton type="submit" variant="primary" className="w-full">
              <DoodleIcon name="sparkle" size={18} color="#F5F0E8" />
              read my pot
            </InkButton>
          </div>
        </form>
      </div>
    </main>
  );
}
