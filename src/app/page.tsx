import VaseAvatar from "@/components/avatar/VaseAvatar";

// Placeholder landing — replaced by the sculpt experience in a later phase.
export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 gap-4 px-6 py-16 text-center">
      <VaseAvatar
        shape="thrown2:h=0.6;w=0.4,0.72,0.5;edge=0.00;face=happy"
        glaze="terracotta"
        pattern="plain"
        size={140}
      />
      <h1
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
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-clay-ink-muted)",
        }}
      >
        throw a pot and discover what it says about you
      </p>
    </main>
  );
}
