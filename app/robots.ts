import type { MetadataRoute } from "next";
import { getCanonicalSiteUrlForIndexing } from "@/lib/public-app-url";

/**
 * robots.txt en la raíz. La URL del sitemap debe ser absoluta y coincidir con Search Console.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getCanonicalSiteUrlForIndexing().replace(/\/$/, "");
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
