"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "luxops_cookie_consent_v1";

type BannerState = "pending" | "show" | "hide";

export function CookieBanner() {
  const [state, setState] = useState<BannerState>("pending");

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      try {
        const v = window.localStorage.getItem(STORAGE_KEY);
        setState(v === "accepted" ? "hide" : "show");
      } catch {
        setState("show");
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      /* ignore */
    }
    setState("hide");
  }

  if (state !== "show") return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 text-sm text-slate-700">
          <p id="cookie-banner-title" className="font-semibold text-slate-900">
            Uso de cookies y tecnologías similares
          </p>
          <p className="mt-1 leading-relaxed">
            Utilizamos cookies técnicas necesarias para el funcionamiento de la sesión y la
            seguridad. En pagos,{" "}
            <strong>Stripe</strong> puede usar cookies propias para procesar la transacción. Más
            detalle en{" "}
            <Link href="/cookies" className="font-medium text-amber-800 underline underline-offset-2">
              Política de cookies
            </Link>{" "}
            y{" "}
            <Link href="/privacidad" className="font-medium text-amber-800 underline underline-offset-2">
              Privacidad
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={accept}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
