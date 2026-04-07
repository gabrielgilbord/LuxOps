"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "luxops_cookie_consent_v2";

type CookieConsent = {
  version: 2;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

type BannerState = "pending" | "show" | "hide";

export function CookieBanner() {
  const [state, setState] = useState<BannerState>("pending");
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState({
    preferences: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(CONSENT_KEY);
        if (!raw) {
          setState("show");
          return;
        }
        const parsed = JSON.parse(raw) as Partial<CookieConsent>;
        if (parsed && parsed.version === 2) {
          setState("hide");
          setPrefs({
            preferences: Boolean(parsed.preferences),
            analytics: Boolean(parsed.analytics),
            marketing: Boolean(parsed.marketing),
          });
          return;
        }
        // Si hay formato antiguo, volvemos a pedir consentimiento con el nuevo esquema.
        setState("show");
      } catch {
        setState("show");
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  function persist(next: CookieConsent) {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setState("hide");
    setShowSettings(false);
  }

  if (state !== "show") return null;

  function acceptAll() {
    persist({
      version: 2,
      necessary: true,
      preferences: true,
      analytics: true,
      marketing: true,
      updatedAt: new Date().toISOString(),
    });
  }

  function rejectAll() {
    persist({
      version: 2,
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: new Date().toISOString(),
    });
  }

  function saveSettings() {
    persist({
      version: 2,
      necessary: true,
      preferences: prefs.preferences,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-[#0B0E14]/95 p-4 shadow-[0_-14px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 text-sm text-slate-200">
          <p id="cookie-banner-title" className="font-semibold text-yellow-200">
            Cookies y privacidad
          </p>
          <p className="mt-1 leading-relaxed text-slate-300">
            Usamos cookies/almacenamiento <strong className="text-slate-100">necesarios</strong> para
            sesión y seguridad. Puedes aceptar, rechazar o configurar. En pagos,{" "}
            <strong className="text-slate-100">Stripe</strong> puede usar cookies propias para
            procesar la transacción. Detalles en{" "}
            <Link href="/cookies" className="font-semibold text-yellow-200/90 underline underline-offset-2">
              Cookies
            </Link>{" "}
            y{" "}
            <Link href="/privacidad" className="font-semibold text-yellow-200/90 underline underline-offset-2">
              Privacidad
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-yellow-300/30 hover:bg-white/10"
          >
            Configurar
          </button>
          <button
            type="button"
            onClick={rejectAll}
            className="rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-2.5 text-sm font-extrabold text-yellow-950 shadow-lg shadow-yellow-300/25 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300"
          >
            Aceptar
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="mx-auto mt-3 max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Preferencias de cookies</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                LuxOps funciona con cookies necesarias. El resto solo se activará si lo autorizas.
                Actualmente no usamos analítica/marketing por defecto, pero dejamos la configuración
                preparada.
              </p>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveSettings}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-white"
              >
                Guardar
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm font-semibold text-slate-100">
                Necesarias
                <span className="ml-2 text-xs font-medium text-slate-400">(siempre activas)</span>
              </span>
              <input type="checkbox" checked readOnly className="h-4 w-4" />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm font-semibold text-slate-100">Preferencias</span>
              <input
                type="checkbox"
                checked={prefs.preferences}
                onChange={(e) => setPrefs((p) => ({ ...p, preferences: e.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-yellow-300 focus:ring-yellow-300"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm font-semibold text-slate-100">Analítica</span>
              <input
                type="checkbox"
                checked={prefs.analytics}
                onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-yellow-300 focus:ring-yellow-300"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm font-semibold text-slate-100">Marketing</span>
              <input
                type="checkbox"
                checked={prefs.marketing}
                onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-yellow-300 focus:ring-yellow-300"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
