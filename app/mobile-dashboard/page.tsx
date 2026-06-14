import Link from "next/link";
import { Cable, ClipboardList, WifiOff } from "lucide-react";
import { getProjects } from "@/app/actions/projects";
import { requireOperarioUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OfflineWarmup } from "@/app/mobile-dashboard/offline-warmup";
import { ProductLogo } from "@/components/brand/product-logo";
import { OperarioLogoutButton } from "@/components/operario/operario-logout-button";
import { isFiberVertical } from "@/lib/organization-vertical";
import { getProductBrand } from "@/lib/product-brand";

export default async function MobileDashboardPage() {
  const dbUser = await requireOperarioUser();
  const org = await prisma.organization.findUnique({
    where: { id: dbUser.organizationId },
    select: { name: true, vertical: true },
  });
  const isFiber = isFiberVertical(org?.vertical);
  const brand = getProductBrand(org?.vertical);
  const projects = await getProjects();

  return (
    <main className="min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden bg-slate-950 px-3 py-4 text-white sm:px-4 sm:py-5">
      <OfflineWarmup />
      <header className="mb-4 flex w-full min-w-0 items-start justify-between gap-3 rounded-xl border border-white/15 bg-slate-900 px-3 py-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2">
            <ProductLogo vertical={org?.vertical} darkBackground className="text-lg" />
          </div>
          <div className="mt-1 inline-flex items-center gap-2">
            <Cable className={`h-4 w-4 ${isFiber ? "text-cyan-300" : "text-yellow-300"}`} />
            <h1 className="text-base font-bold">
              {isFiber ? "Mis instalaciones FTTH" : "Mis obras asignadas"}
            </h1>
          </div>
          <p className="text-[11px] text-slate-300">{org?.name ?? "Organización"}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400">
            <WifiOff className="h-4 w-4" />
            {brand.fieldLabel}
          </p>
        </div>
        <OperarioLogoutButton />
      </header>

      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-600/80 bg-slate-900/70 px-5 py-12 text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${
                isFiber
                  ? "border-cyan-400/35 bg-cyan-400/10"
                  : "border-yellow-300/35 bg-yellow-300/10"
              }`}
            >
              <ClipboardList
                className={`h-8 w-8 ${isFiber ? "text-cyan-200/90" : "text-yellow-200/90"}`}
              />
            </div>
            <p className="text-base font-semibold text-white">Aún no tienes obras asignadas</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {isFiber
                ? "Cuando la oficina te asigne una instalación de fibra, aparecerá aquí para el checklist FibOps."
                : "Cuando la oficina te asigne una instalación, aparecerá aquí listo para el checklist en tejado."}
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/mobile-dashboard/obra/${project.id}`}
              className={`flex min-h-20 min-w-0 items-center justify-between gap-3 rounded-xl border border-white/15 bg-slate-900 px-4 transition ${
                isFiber ? "hover:border-cyan-400/40" : "hover:border-yellow-300/40"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-white">{project.cliente}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">{project.direccion}</p>
              </div>
              <span
                className={`rounded-lg px-3 py-1 text-sm font-bold ${
                  isFiber ? "bg-cyan-400 text-cyan-950" : "bg-yellow-400 text-yellow-950"
                }`}
              >
                Abrir
              </span>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
