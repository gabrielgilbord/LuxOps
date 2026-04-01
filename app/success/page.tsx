"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const timer = setTimeout(() => {
      if (sessionId) {
        router.push(`/onboarding?session_id=${encodeURIComponent(sessionId)}`);
      } else {
        router.push("/dashboard");
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-md">
        <h1 className="text-3xl font-bold text-yellow-300">¡Pago completado!</h1>
        <p className="mt-3 text-sm text-slate-200">
          Configurando tu organización...
        </p>
      </div>
    </main>
  );
}
