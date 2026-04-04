"use client";

import { useActionState, useEffect } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/checkout";

export function RegisterCheckoutButton({ disabled = false }: { disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState(createCheckoutSessionAction, undefined);
  const isDisabled = disabled || isPending;

  useEffect(() => {
    const url = state?.checkoutUrl;
    if (url?.startsWith("https://")) {
      window.location.assign(url);
    }
  }, [state?.checkoutUrl]);

  return (
    <div className="space-y-2">
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => formAction(new FormData())}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-3 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/30 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300 disabled:pointer-events-none disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" />}
        {isPending ? "Procesando..." : "Continuar al pago"}
      </button>
    </div>
  );
}
