"use client";

import { useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/checkout";

export function RegisterCheckoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => void createCheckoutSessionAction())}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-3 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/30 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300 disabled:pointer-events-none disabled:opacity-60"
    >
      {isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" />}
      {isPending ? "Procesando..." : "Continuar al pago"}
    </button>
  );
}
