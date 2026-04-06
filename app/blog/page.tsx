import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";
import { getAllBlogPosts } from "@/lib/blog/registry";

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
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-10 sm:px-6 sm:pt-14 md:pb-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/35 bg-yellow-300/15 px-3 py-1 text-xs font-bold text-yellow-200">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Blog y recursos
        </p>
        <h1 className="text-balance text-5xl font-bold tracking-tight text-transparent sm:text-6xl bg-gradient-to-r from-sky-200 via-sky-300 to-yellow-300 bg-clip-text">
          Blog LuxOps
        </h1>
        <p className="mt-5 text-pretty text-base leading-relaxed text-slate-200/90 sm:text-lg">
          Recursos para instaladoras: estrategia operativa, normativa y software para empresas solares
          que quieren crecer con margen.
        </p>
      </div>

      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col">
              <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-yellow-300/35 hover:bg-white/[0.07] hover:shadow-[0_20px_50px_-15px_rgba(250,204,21,0.1)]">
                <time
                  dateTime={post.publishedAt}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-yellow-300/90"
                >
                  {formatPublishedDate(post.publishedAt)}
                </time>
                <h2 className="mt-4 text-lg font-bold leading-snug text-yellow-200 transition group-hover:text-yellow-100 md:text-xl">
                  {post.title}
                </h2>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-200/85">
                  {post.description}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-yellow-300 transition group-hover:gap-3 group-hover:text-yellow-200">
                  Leer artículo
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </article>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
