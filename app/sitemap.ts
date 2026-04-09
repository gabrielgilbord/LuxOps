import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/blog/registry";
import { getCanonicalSiteUrlForIndexing } from "@/lib/public-app-url";

/**
 * Sitemap XML en la raíz del sitio (`/sitemap.xml`), con URLs absolutas al origen canónico.
 * Configura `NEXT_PUBLIC_APP_URL` o `NEXT_PUBLIC_CANONICAL_URL` igual que la URL de la propiedad en Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getCanonicalSiteUrlForIndexing().replace(/\/$/, "");
  const now = new Date();
  const posts = getAllBlogPosts();

  const blogEntries: MetadataRoute.Sitemap = [
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt ?? p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];

  const staticPublic: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    {
      url: `${base}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${base}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${base}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/aviso-legal`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  return [...staticPublic, ...blogEntries];
}
