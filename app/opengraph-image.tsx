import { ImageResponse } from "next/og";

export const alt = "Travel Wrapped — your year in journeys";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, color: "#fff5e6", background: "linear-gradient(135deg,#060a1c 0%,#212a57 50%,#6232f0 85%,#ff6a3d 100%)" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: "#ffb38a", fontWeight: 700 }}>Travel Wrapped</div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.02, marginTop: 20, maxWidth: 980 }}>2026 was more than a year. It was a journey.</div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 28, color: "#f6e7cf" }}>Your journeys. Your memories. Your year.</div>
      </div>
    ),
    size,
  );
}
