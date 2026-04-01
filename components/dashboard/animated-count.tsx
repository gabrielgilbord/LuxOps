"use client";

import { animate, useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";

type AnimatedCountProps = {
  value: number;
  duration?: number;
  className?: string;
};

export function AnimatedCount({ value, duration = 0.8, className = "" }: AnimatedCountProps) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [duration, motionValue, value]);

  return <span className={className}>{displayValue}</span>;
}
