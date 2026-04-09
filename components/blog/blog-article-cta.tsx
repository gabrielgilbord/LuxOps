import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function BlogArticleCta({ promoCode }: { promoCode?: string }) {
  return (
    <aside
      className="mt-14 overflow-hidden rounded-2xl border border-yellow-400/25 bg-gradient-to-br from-[#161B22] via-[#12161c] to-[#0B0E14] p-6 text-center shadow-[0_12px_48px_-12px_rgba(250,204,21,0.15)] md:p-10"
      aria-labelledby="blog-cta-heading"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/35 bg-yellow-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          LuxOps
        </span>
        <h2
          id="blog-cta-heading"
          className="text-balance text-xl font-bold text-white md:text-2xl"
        >
          ¿Quieres profesionalizar tu empresa solar? Empieza con LuxOps hoy
        </h2>
        <p className="text-sm leading-relaxed text-slate-400 md:text-base">
          CRM pensado para instaladores: obras, documentación y equipo en un solo flujo.
        </p>
        {promoCode ? (
          <div className="w-full rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-200/90">
              Código promocional de lanzamiento
            </p>
            <p className="mt-1 text-sm text-slate-200">
              Usa <span className="rounded-md bg-black/30 px-2 py-1 font-extrabold text-yellow-200">{promoCode}</span>{" "}
              en el checkout.
            </p>
          </div>
        ) : null}
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300/50 bg-yellow-400 px-6 py-3 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/20 transition hover:-translate-y-0.5 hover:bg-yellow-300"
        >
          Activar LuxOps
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
