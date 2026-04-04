import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAllBlogSlugs, getPostBySlug } from "@/lib/blog/registry";
import { getPublicAppUrl } from "@/lib/public-app-url";
import { BlogPostingJsonLd } from "@/components/blog/blog-posting-json-ld";
import { BlogArticleCta } from "@/components/blog/blog-article-cta";

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Artículo no encontrado" };
  }
  const base = getPublicAppUrl().replace(/\/$/, "");
  const url = `${base}/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      locale: "es_ES",
      siteName: "LuxOps",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatPublishedDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { Component } = post;

  return (
    <>
      <BlogPostingJsonLd slug={slug} post={post} />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl px-4 py-4 md:px-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-amber-800"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Volver al blog
            </Link>
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
          <time
            dateTime={post.publishedAt}
            className="text-sm font-medium text-slate-500"
          >
            {formatPublishedDate(post.publishedAt)}
          </time>
          <Component />
          <BlogArticleCta />
        </article>
      </div>
    </>
  );
}
