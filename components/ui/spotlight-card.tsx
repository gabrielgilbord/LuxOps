"use client";

import { type CSSProperties, type MouseEvent, useState } from "react";

type SpotlightCardProps = {
  className?: string;
  children: React.ReactNode;
};

export function SpotlightCard({ className = "", children }: SpotlightCardProps) {
  const [spotlight, setSpotlight] = useState<CSSProperties>({
    "--spot-x": "50%",
    "--spot-y": "50%",
    "--spot-opacity": 0,
  } as CSSProperties);

  function onMove(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = `${event.clientX - rect.left}px`;
    const y = `${event.clientY - rect.top}px`;
    setSpotlight({
      "--spot-x": x,
      "--spot-y": y,
      "--spot-opacity": 1,
    } as CSSProperties);
  }

  function onLeave() {
    setSpotlight((prev) => ({ ...prev, "--spot-opacity": 0 } as CSSProperties));
  }

  return (
    <div
      style={spotlight}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`spotlight-card ${className}`}
    >
      {children}
    </div>
  );
}
