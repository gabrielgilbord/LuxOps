import type { BlogPostEntry } from "@/lib/blog/types";
import { ArticleDigitalizar2026 } from "@/components/blog/articles/article-digitalizar-2026";
import { ArticleLuxOpsLive } from "@/components/blog/articles/article-luxops-live";

const posts: BlogPostEntry[] = [
  {
    slug: "luxops-live-nueva-era-certificacion-fotografica",
    title: "LuxOps Live: La nueva era de la certificación fotográfica",
    description:
      "LuxOps ya está LIVE: trazabilidad Blockchain-Ready, dossier institucional con eIDAS y cumplimiento REBT para instaladoras solares.",
    publishedAt: "2026-04-09T11:30:00+02:00",
    updatedAt: "2026-04-09T11:30:00+02:00",
    keywords: [
      "LuxOps Live",
      "certificación fotográfica",
      "eIDAS",
      "REBT",
      "ITC-BT-19",
      "ITC-BT-07",
      "trazabilidad",
      "blockchain-ready",
      "instaladoras solares",
    ],
    promoCode: "FOUNDERS50",
    Component: ArticleLuxOpsLive,
  },
  {
    slug: "digitalizar-empresa-instalaciones-solares-2026-guia",
    title:
      "Cómo digitalizar tu empresa de instalaciones solares en 2026: Guía para instaladores",
    description:
      "Ahorra tiempo, ordena presupuestos y documentación REBT, y descubre por qué un CRM solar como LuxOps mejora la rentabilidad de tu instaladora fotovoltaica.",
    publishedAt: "2026-04-01T09:00:00+02:00",
    updatedAt: "2026-04-02T10:00:00+02:00",
    keywords: [
      "CRM placas solares",
      "gestión instalaciones fotovoltaicas",
      "ahorro costes energía solar",
      "digitalización instaladora solar",
      "software fotovoltaica España",
      "LuxOps",
    ],
    Component: ArticleDigitalizar2026,
  },
];

export function getAllBlogPosts(): BlogPostEntry[] {
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPostEntry | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return posts.map((p) => p.slug);
}
