"use client";

import { useState } from "react";
import Link from "next/link";
import { RegisterCheckoutButton } from "@/app/register/register-checkout-button";

export function RegisterCheckoutSection() {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="mt-5 space-y-3">
      <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
        />
        <span>
          He leído y acepto los{" "}
          <Link
            href="/terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 underline underline-offset-2"
          >
            Términos de Servicio
          </Link>{" "}
          y la{" "}
          <Link
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 underline underline-offset-2"
          >
            Política de Privacidad
          </Link>
          .
        </span>
      </label>
      <RegisterCheckoutButton disabled={!accepted} />
    </div>
  );
}
