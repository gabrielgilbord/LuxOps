"use client";

import { useEffect, useRef } from "react";
import { fireEliteConfetti } from "@/components/celebration/elite-confetti";

type Props = {
  celebrate: boolean;
  firstName: string;
};

export function OnboardingEliteCelebration({ celebrate, firstName }: Props) {
  const fired = useRef(false);
  useEffect(() => {
    if (!celebrate || fired.current) return;
    fired.current = true;
    fireEliteConfetti();
  }, [celebrate]);

  if (!celebrate || !firstName.trim()) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[200] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <p className="max-w-md rounded-xl border border-yellow-400/40 bg-slate-950/95 px-4 py-3 text-center text-sm font-bold leading-snug text-yellow-100 shadow-xl shadow-yellow-900/30">
        ¡Bienvenido a la élite solar, {firstName}! Tu cuenta ya está activa.
      </p>
    </div>
  );
}
