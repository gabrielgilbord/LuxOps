import type { MetadataRoute } from "next";

/** PWA / Chrome “Add to Home Screen”: debe usar iconos LuxOps, nunca plantillas de Vercel. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LuxOps",
    short_name: "LuxOps",
    description: "LuxOps — CRM operativo para instaladoras solares.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0E14",
    theme_color: "#0B0E14",
    orientation: "portrait",
    icons: [
      {
        src: "/android-chrome-192x192.png?v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png?v=2",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
