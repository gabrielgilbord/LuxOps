import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

/** Cierre de sesión Supabase: área táctil amplia para campo / guantes. */
export function OperarioLogoutButton() {
  return (
    <form action={logoutAction} className="shrink-0">
      <button
        type="submit"
        className="inline-flex min-h-14 min-w-[3.5rem] items-center justify-center gap-2 rounded-xl border-2 border-amber-400/70 bg-neutral-950 px-4 py-3 text-sm font-extrabold tracking-tight text-amber-300 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30 transition hover:border-amber-300 hover:bg-amber-400/10 hover:text-amber-200 active:scale-[0.98] sm:px-5"
        aria-label="Cerrar sesión"
      >
        <LogOut className="h-6 w-6 shrink-0 stroke-[2.5]" aria-hidden />
        <span>Cerrar sesión</span>
      </button>
    </form>
  );
}
