"use client";

import { useEffect } from "react";

export function OfflineWarmup() {
  useEffect(() => {
    const warmup = async () => {
      try {
        await fetch("/mobile-dashboard", { cache: "force-cache" });
        await fetch("/api/offline/sync", { method: "OPTIONS" });
      } catch {
        // Warmup best-effort
      }
    };
    void warmup();
  }, []);

  return null;
}
