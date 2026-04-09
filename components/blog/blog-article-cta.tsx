"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function BlogArticleCta({ promoCode }: { promoCode?: string }) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard API can be blocked by browser permissions; fail silently.
    }
  }

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
          <div className="w-full rounded-2xl border border-[#FBBF24]/60 bg-[#161B22] p-5 text-left shadow-[0_18px_60px_-24px_rgba(251,191,36,0.25)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-200/90">
              Oferta de lanzamiento
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              🎁 <strong className="text-white">¡OFERTA DE LANZAMIENTO!</strong> Sé uno de los{" "}
              <strong className="text-white">5 primeros</strong> y obtén un{" "}
              <strong className="text-white">50% de descuento DE POR VIDA</strong>. Usa el código:{" "}
              <button
                type="button"
                onClick={() => copyCode(promoCode)}
                className="ml-1 inline-flex items-center rounded-lg border border-[#FBBF24]/60 bg-black/25 px-2.5 py-1 font-extrabold text-[#FBBF24] transition hover:bg-black/35 hover:border-[#FBBF24] active:scale-[0.98] active:bg-black/45 cursor-pointer"
                aria-label={`Copiar código ${promoCode}`}
                title="Haz clic para copiar"
              >
                {promoCode}
              </button>{" "}
              al suscribirte.
            </p>
            <p
              className={
                copied
                  ? "mt-3 text-xs font-semibold text-yellow-200"
                  : "mt-3 text-xs text-slate-400"
              }
              aria-live="polite"
            >
              {copied ? "¡Copiado!" : "Haz clic en el código para copiarlo."}
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
