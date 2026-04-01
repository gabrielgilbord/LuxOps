"use client";

type Props = {
  darkBackground?: boolean;
  /** Solo dashboard: invierte colores del PNG para fondo oscuro (resto de la app sin tocar). */
  invertColors?: boolean;
  className?: string;
};

export function LuxOpsLogo({ darkBackground = false, invertColors = false, className }: Props) {
  const src = darkBackground ? "/luxops-logo-dark.png" : "/luxops-logo.png";
  const base = className ?? "h-8 w-auto";
  return (
    <img
      src={src}
      alt="LuxOps"
      className={[base, invertColors ? "invert" : ""].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}

