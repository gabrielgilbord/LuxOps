"use client";

type Props = {
  darkBackground?: boolean;
  /** Header dashboard: invierte el PNG estándar sobre fondo oscuro. */
  invertColors?: boolean;
  className?: string;
};

/**
 * Un solo asset `/luxops-logo.png`: en fondo oscuro forzamos “Lux Light” vía CSS
 * (`brightness(0) invert(1)`), evitando PNG oscuros ilegibles.
 */
export function LuxOpsLogo({ darkBackground = false, invertColors = false, className }: Props) {
  const base = className ?? "h-8 w-auto";
  const onDark = darkBackground ? "brightness-0 invert" : "";
  const dashInvert = !darkBackground && invertColors ? "invert" : "";
  return (
    <img
      src="/luxops-logo.png"
      alt="LuxOps"
      className={[base, onDark, dashInvert].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}

