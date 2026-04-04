import type { NextConfig } from "next";
import withPWA from "next-pwa";
import runtimeCaching from "next-pwa/cache";

const nextConfig: NextConfig = {
  turbopack: {},
  /** Incluye fuentes locales usadas por pdf-lib en serverless (dossier PDF). */
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/fonts/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "hwueuvmfmvxzkrsuprel.supabase.co",
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    ...runtimeCaching,
    {
      urlPattern: /^https?.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "http-cache",
        expiration: {
          maxEntries: 120,
          maxAgeSeconds: 60 * 60 * 24,
        },
      },
    },
  ],
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
