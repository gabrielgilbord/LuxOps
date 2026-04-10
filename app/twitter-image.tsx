import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "LuxOps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0E14",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 32,
            border: "4px solid #FBBF24",
            background: "#161B22",
            marginBottom: 28,
            fontSize: 72,
            fontWeight: 800,
            color: "#FBBF24",
          }}
        >
          L
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-0.02em",
          }}
        >
          LuxOps
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 26,
            color: "#94A3B8",
            maxWidth: 900,
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          CRM para instaladoras solares · Certificación y trazabilidad
        </div>
      </div>
    ),
    { ...size },
  );
}
