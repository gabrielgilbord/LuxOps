import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function BlogArticleCta() {
  return (
    <aside
      className="mt-14 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/90 p-6 text-center shadow-xl shadow-amber-900/20 md:p-10"
      aria-labelledby="blog-cta-heading"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          LuxOps
        </span>
        <h2
          id="blog-cta-heading"
          className="text-balance text-xl font-bold text-white md:text-2xl"
        >
          ¿Quieres profesionalizar tu empresa solar? Empieza con LuxOps hoy
        </h2>
        <p className="text-sm leading-relaxed text-slate-300 md:text-base">
          CRM pensado para instaladores: obras, documentación y equipo en un solo flujo.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/25 transition hover:bg-yellow-300"
        >
          Activar LuxOps
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
