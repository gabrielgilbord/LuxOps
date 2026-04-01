import Link from "next/link";
import { HardHat, WifiOff } from "lucide-react";
import { getProjects } from "@/app/actions/projects";
import { requireOperarioUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OfflineWarmup } from "@/app/mobile-dashboard/offline-warmup";
import { LuxOpsLogo } from "@/components/brand/luxops-logo";

export default async function MobileDashboardPage() {
  const dbUser = await requireOperarioUser();
  const org = await prisma.organization.findUnique({
    where: { id: dbUser.organizationId },
    select: { name: true },
  });
  const projects = await getProjects();

  return (
    <main className="min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden bg-slate-950 px-3 py-4 text-white sm:px-4 sm:py-5">
      <OfflineWarmup />
      <header className="mb-4 flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-white/15 bg-slate-900 px-3 py-3 sm:px-4">
        <div>
          <div className="inline-flex items-center gap-2">
            <LuxOpsLogo darkBackground className="h-6 w-auto" />
          </div>
          <div className="mt-1 inline-flex items-center gap-2">
            <HardHat className="h-4 w-4 text-yellow-300" />
            <h1 className="text-base font-bold">Mis obras asignadas</h1>
          </div>
          <p className="text-[11px] text-slate-300">{org?.name ?? "Organización"}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-slate-300">
          <WifiOff className="h-4 w-4" />
          Modo campo
        </span>
      </header>

      <div className="space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/mobile-dashboard/obra/${project.id}`}
            className="flex min-h-20 min-w-0 items-center justify-between gap-3 rounded-xl border border-white/15 bg-slate-900 px-4 transition hover:border-yellow-300/40"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">{project.cliente}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">{project.direccion}</p>
            </div>
            <span className="rounded-lg bg-yellow-400 px-3 py-1 text-sm font-bold text-yellow-950">
              Abrir
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
