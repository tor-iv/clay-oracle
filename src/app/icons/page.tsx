import DoodleIcon, { type DoodleName } from "@/components/ui/DoodleIcon";

const ALL_ICONS: DoodleName[] = [
  // Original six
  "pot", "star", "squiggle", "flame", "leaf", "sparkle",
  // UI icons
  "crystal", "amphora", "secret", "calendar", "camera", "pin",
  "teacup", "chat", "wave", "cloud", "apple", "party",
  "eyes", "music", "pen", "palette",
  // Archetype nature glyphs
  "sprout", "moon", "swirl", "sun", "ocean", "blossom",
  "stone", "kite",
];

export default function IconsPage() {
  return (
    <main
      style={{
        fontFamily: "Georgia, serif",
        padding: "40px",
        background: "#FBF5EC",
        minHeight: "100vh",
        color: "#2C1810",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>DoodleIcon set</h1>
      <p style={{ marginBottom: "32px", opacity: 0.6, fontSize: "0.875rem" }}>
        {ALL_ICONS.length} icons · size 40 · color #2C1810
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: "24px",
        }}
      >
        {ALL_ICONS.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              padding: "16px 8px",
              background: "#FFFFFF",
              borderRadius: "8px",
              border: "1px solid #E8DDD0",
            }}
          >
            <DoodleIcon name={name} size={40} color="#2C1810" />
            <span style={{ fontSize: "0.7rem", opacity: 0.6, textAlign: "center" }}>{name}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
