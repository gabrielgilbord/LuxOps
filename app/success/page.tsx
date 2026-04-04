"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { syncOrganizationFromCheckoutSession } from "@/app/actions/checkout";

export default function SuccessPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    setSessionId(sid);
    if (sid) {
      void syncOrganizationFromCheckoutSession(sid);
    }
  }, []);

  const onboardingHref = sessionId
    ? `/onboarding?session_id=${encodeURIComponent(sessionId)}`
    : "/onboarding";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-md">
        <h1 className="text-3xl font-bold text-yellow-300">
          ¡Pago completado con éxito!
        </h1>
        <p className="text-sm leading-relaxed text-slate-200">
          Estamos activando tu cuenta Pro… Si acabas de contratar, completa el alta de organización
          para entrar al panel. Si ya tenías cuenta, el estado de suscripción se actualizará en
          segundos.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-yellow-400 px-6 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
          >
            Ir al Panel de Control
          </Link>
          <Link
            href={onboardingHref}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Continuar activación (nuevo alta)
          </Link>
        </div>
      </div>
    </main>
  );
}
