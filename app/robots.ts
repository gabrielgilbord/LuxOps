import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/public-app-url";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl().replace(/\/$/, "");
  let host: string | undefined;
  try {
    host = new URL(base).host;
  } catch {
    host = undefined;
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
    ...(host ? { host } : {}),
  };
}
