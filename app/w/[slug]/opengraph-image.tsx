import { ImageResponse } from "next/og";
import { getPublicWrapped } from "@/lib/public-wrapped";

export const alt = "A Travel Wrapped story";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getPublicWrapped(slug);
  const s = w?.stats;
  const stats: [number, string][] = s
    ? [
        [s.totalTrips, "trips"],
        [s.cities.length, "places"],
        [s.states.length, "states"],
        [s.totalDays, "days"],
      ]
    : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, color: "#faf7f3", background: "linear-gradient(135deg,#1c0f38 0%,#341864 45%,#6d28d9 80%,#ff3366 100%)" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: "#ff9ab3", fontWeight: 700 }}>
          Travel Wrapped {s ? `· ${w!.year}` : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, color: "#f2ebfd" }}>{s ? `${s.ownerName}'s year in journeys` : "Your year in journeys"}</div>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, marginTop: 12 }}>{s ? s.personality.title : "Turn your trips into a story"}</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {stats.map(([v, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.12)", borderRadius: 24, padding: "18px 30px" }}>
              <div style={{ fontSize: 60, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 22, color: "#f2ebfd", textTransform: "uppercase", letterSpacing: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
