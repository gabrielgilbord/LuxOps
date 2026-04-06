import { Navbar } from "@/components/landing/navbar";

/**
 * Capa visual compartida con la landing: fondo slate-950, degradados y barra superior.
 * El pie global es `<Footer />` (`SiteFooter`) en `app/layout.tsx` — no duplicar aquí.
 */
export function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,0.16),transparent_30%)]" />
      <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rotate-12 rounded-3xl border border-white/10 bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute right-0 top-72 h-56 w-56 -rotate-12 rounded-full border border-yellow-300/20 bg-yellow-300/10 blur-2xl" />
      <Navbar />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
