import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { getAllBlogPosts } from "@/lib/blog/registry";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guías y artículos sobre CRM para placas solares, gestión de instalaciones fotovoltaicas y digitalización de instaladoras en España.",
  keywords: [
    "blog energía solar",
    "CRM placas solares",
    "gestión instalaciones fotovoltaicas",
    "LuxOps",
  ],
};

function formatPublishedDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            ← LuxOps
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-800">
            <BookOpen className="h-4 w-4" aria-hidden />
            Blog
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Blog LuxOps
          </h1>
          <p className="mt-3 text-pretty text-slate-600 md:text-lg">
            Estrategia operativa, normativa y software para instaladoras solares que quieren crecer
            con margen.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block h-full">
                <Card className="h-full border-slate-200/90 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/60 hover:shadow-md">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <time
                      dateTime={post.publishedAt}
                      className="text-xs font-medium uppercase tracking-wide text-amber-700"
                    >
                      {formatPublishedDate(post.publishedAt)}
                    </time>
                    <CardTitle className="text-lg leading-snug text-slate-900 group-hover:text-amber-900 md:text-xl">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 text-slate-600">
                      {post.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <span className="text-sm font-semibold text-amber-700 group-hover:underline">
                      Leer artículo →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
