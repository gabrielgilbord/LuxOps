"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCheckoutWelcomeInfo, syncOrganizationFromCheckoutSession } from "@/app/actions/checkout";
import { fireEliteConfetti } from "@/components/celebration/elite-confetti";

type Status = "celebrating" | "no-session";

const REDIRECT_MS = 4500;

export default function SuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("celebrating");
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("Instalador");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const celebrateRescue = params.get("celebrate") === "1";
    const eliteParam = params.get("elite");

    if (celebrateRescue && eliteParam?.trim()) {
      let decoded = eliteParam.trim();
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        /* usar raw */
      }
      setFirstName(decoded || "Instalador");
      setStatus("celebrating");
      fireEliteConfetti();
      const t = window.setTimeout(() => {
        router.replace("/onboarding?continue=1");
      }, REDIRECT_MS);
      return () => window.clearTimeout(t);
    }

    if (!sid) {
      setStatus("no-session");
      return;
    }

    setCheckoutSessionId(sid);
    setStatus("celebrating");
    fireEliteConfetti();
    void getCheckoutWelcomeInfo(sid).then((r) => setFirstName(r.firstName));
    void syncOrganizationFromCheckoutSession(sid);

    const t = window.setTimeout(() => {
      router.replace(`/onboarding?session_id=${encodeURIComponent(sid)}`);
    }, REDIRECT_MS);
    return () => window.clearTimeout(t);
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-yellow-400/30 bg-[#161B22] p-8 text-center shadow-2xl shadow-yellow-900/20 backdrop-blur-md">
        <div className="flex justify-center">
          <img src="/icon.svg" alt="LuxOps" width={72} height={72} className="h-[72px] w-[72px]" />
        </div>
        <h1 className="text-balance text-2xl font-extrabold leading-tight text-yellow-300 sm:text-3xl">
          ¡Bienvenido a la élite solar, {firstName}! Tu cuenta ya está activa
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          En unos segundos te llevamos a completar el registro de tu organización en LuxOps.
        </p>
        <p className="text-xs text-slate-500">
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
