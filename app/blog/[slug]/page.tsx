import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAllBlogSlugs, getPostBySlug } from "@/lib/blog/registry";
import { getPublicAppUrl } from "@/lib/public-app-url";
import { BlogPostingJsonLd } from "@/components/blog/blog-posting-json-ld";
import { BlogArticleCta } from "@/components/blog/blog-article-cta";
import { BlogCommentsGiscus } from "@/components/blog/blog-comments-giscus";

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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-5 py-4 sm:px-6 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-300/90 transition hover:text-yellow-200"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Volver al blog
            </Link>
          </div>
        </div>

        <article className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 text-slate-100 sm:px-6 sm:py-12 md:py-14 lg:px-8">
          <time
            dateTime={post.publishedAt}
            className="text-xs font-bold uppercase tracking-[0.15em] text-yellow-300/85"
          >
            {formatPublishedDate(post.publishedAt)}
          </time>
          <Component />
          <BlogArticleCta promoCode={post.promoCode} />
          <BlogCommentsGiscus slug={slug} title={post.title} />
        </article>
      </div>
    </>
  );
}
