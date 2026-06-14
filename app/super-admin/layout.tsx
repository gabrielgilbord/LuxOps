import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireSuperAdminUser } from "@/lib/authz";
import { LuxOpsLogo } from "@/components/brand/luxops-logo";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/super-admin", label: "Resumen" },
  { href: "/super-admin/organizations", label: "Clientes" },
  { href: "/super-admin/organizations/new", label: "Alta manual" },
] as const;

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireSuperAdminUser();

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-violet-500/30 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/super-admin" className="inline-flex items-center gap-2">
            <LuxOpsLogo darkBackground className="h-7 w-auto" />
            <span className="hidden rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200 sm:inline">
              Super Admin
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-violet-500/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:inline">{admin.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-900"
              >
                <LogOut className="h-3.5 w-3.5" />
                Salir
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-800 px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </main>
  );
}
