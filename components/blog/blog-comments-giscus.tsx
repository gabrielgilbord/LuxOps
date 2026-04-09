"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Identificador único del post (usamos slug). */
  slug: string;
  title: string;
};

function env(name: string) {
  const v = (process.env[name] ?? "").trim();
  return v || "";
}

export function BlogCommentsGiscus({ slug, title }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  const repo = env("NEXT_PUBLIC_GISCUS_REPO");
  const repoId = env("NEXT_PUBLIC_GISCUS_REPO_ID");
  const category = env("NEXT_PUBLIC_GISCUS_CATEGORY");
  const categoryId = env("NEXT_PUBLIC_GISCUS_CATEGORY_ID");

  const enabled = Boolean(repo && repoId && category && categoryId);

  useEffect(() => {
    if (!enabled) return;
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";

    s.setAttribute("data-repo", repo);
    s.setAttribute("data-repo-id", repoId);
    s.setAttribute("data-category", category);
    s.setAttribute("data-category-id", categoryId);
    s.setAttribute("data-mapping", "specific");
    s.setAttribute("data-term", slug);
    s.setAttribute("data-strict", "1");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-emit-metadata", "0");
    s.setAttribute("data-input-position", "top");
    s.setAttribute("data-theme", "dark");
    s.setAttribute("data-lang", "es");

    ref.current.appendChild(s);
  }, [enabled, slug, repo, repoId, category, categoryId]);

  if (!enabled) {
    return (
      <aside className="mt-14 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-lg font-bold text-white">Comentarios</h2>
        <p className="mt-2 text-sm text-slate-400">
          Comentarios desactivados (falta configurar Giscus).
        </p>
      </aside>
    );
  }

  return (
    <aside className="mt-14 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-lg font-bold text-white">Comentarios</h2>
      <p className="mt-2 text-sm text-slate-400">
        Debate sobre: <span className="text-slate-200">{title}</span>
      </p>
      <div ref={ref} className="mt-5" />
    </aside>
  );
}

