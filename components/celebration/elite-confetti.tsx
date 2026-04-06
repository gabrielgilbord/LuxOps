"use client";

import { useEffect, useRef } from "react";

const GOLD = ["#FBBF24", "#FDE68A", "#F59E0B", "#D97706", "#FFFFFF"];

export function fireEliteConfetti() {
  void import("canvas-confetti").then((confetti) => {
    const c = confetti.default;
    const burst = (particleCount: number, spread: number, startVelocity: number, angle?: number) => {
      c({
        particleCount,
        spread,
        startVelocity,
        angle: angle ?? 90,
        origin: { y: 0.65, x: 0.5 },
        colors: GOLD,
        ticks: 220,
        gravity: 1.05,
        scalar: 1.05,
      });
    };
    burst(160, 70, 50);
    burst(90, 100, 38, 120);
    burst(90, 100, 38, 60);
    window.setTimeout(() => burst(80, 60, 35), 280);
  });
}

type EliteConfettiProps = {
  /** Dispara una sola vez al montar cuando es true */
  active: boolean;
};

export function EliteConfetti({ active }: EliteConfettiProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    fireEliteConfetti();
  }, [active]);
  return null;
}
