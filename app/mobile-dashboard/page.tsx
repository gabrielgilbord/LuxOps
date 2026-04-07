import Link from "next/link";
import { ClipboardList, HardHat, WifiOff } from "lucide-react";
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
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-600/80 bg-slate-900/70 px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-300/35 bg-yellow-300/10">
              <ClipboardList className="h-8 w-8 text-yellow-200/90" />
            </div>
            <p className="text-base font-semibold text-white">Aún no tienes obras asignadas</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Cuando la oficina te asigne una instalación, aparecerá aquí listo para el checklist en
              tejado.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Si deberías ver obras, comprueba la conexión o avisa a tu responsable.
            </p>
          </div>
        ) : (
          projects.map((project) => (
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
          ))
        )}
      </div>
    </main>
  );
}
