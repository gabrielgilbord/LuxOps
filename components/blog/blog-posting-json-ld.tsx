import { getPublicAppUrl } from "@/lib/public-app-url";
import type { BlogPostEntry } from "@/lib/blog/types";

type Props = {
  slug: string;
  post: BlogPostEntry;
};

export function BlogPostingJsonLd({ slug, post }: Props) {
  const base = getPublicAppUrl().replace(/\/$/, "");
  const url = `${base}/blog/${slug}`;
  const logoUrl = `${base}/luxops-logo.svg`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: "es-ES",
    keywords: post.keywords.join(", "),
    author: {
      "@type": "Organization",
      name: "LuxOps",
      url: `${base}/`,
    },
    publisher: {
      "@type": "Organization",
      name: "LuxOps",
      url: `${base}/`,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    isAccessibleForFree: true,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
