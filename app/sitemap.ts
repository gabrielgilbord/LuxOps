import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/blog/registry";
import { getPublicAppUrl } from "@/lib/public-app-url";

/** Rutas públicas prioritarias para indexación. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicAppUrl().replace(/\/$/, "");
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

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...blogEntries,
  ];
}
