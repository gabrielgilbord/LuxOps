type Props = {
  darkBackground?: boolean;
  className?: string;
};

/** Marca textual FibOps (vertical fibra). */
export function FibOpsLogo({ darkBackground = false, className }: Props) {
  const base = className ?? "h-8";
  return (
    <span
      className={[
        "inline-flex items-baseline gap-0.5 font-black tracking-tight",
        base,
        darkBackground ? "text-white" : "text-slate-950",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="FibOps"
    >
      <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
        Fib
      </span>
      <span className={darkBackground ? "text-cyan-100" : "text-slate-800"}>Ops</span>
    </span>
  );
}
