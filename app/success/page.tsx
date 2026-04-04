"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncOrganizationFromCheckoutSession } from "@/app/actions/checkout";

type Status = "pending" | "redirecting" | "no-session";

export default function SuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("pending");
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("session_id");
    if (!sid) {
      setStatus("no-session");
      return;
    }
    setCheckoutSessionId(sid);
    setStatus("redirecting");
    void syncOrganizationFromCheckoutSession(sid);
    router.replace(`/onboarding?session_id=${encodeURIComponent(sid)}`);
  }, [router]);

  if (status === "no-session") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
        <div className="w-full max-w-lg space-y-6 rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-yellow-300">No encontramos la sesión de pago</h1>
          <p className="text-sm text-slate-200">
            Vuelve a completar el checkout desde precios para activar LuxOps.
          </p>
          <Link
            href="/#precios"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-yellow-400 px-6 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
          >
            Ir a precios
          </Link>
        </div>
      </main>
    );
  }

  const manualOnboardingHref = checkoutSessionId
    ? `/onboarding?session_id=${encodeURIComponent(checkoutSessionId)}`
    : "/onboarding";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-md">
        <h1 className="text-3xl font-bold text-yellow-300">¡Pago completado con éxito!</h1>
        <p className="text-sm leading-relaxed text-slate-200">
          {status === "pending"
            ? "Preparando tu registro…"
            : "Redirigiendo al alta de tu organización…"}
        </p>
        <p className="text-xs text-slate-400">
          <Link
            href={manualOnboardingHref}
            className="font-medium text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
          >
            Ir manualmente al registro
          </Link>
        </p>
      </div>
    </main>
  );
}
