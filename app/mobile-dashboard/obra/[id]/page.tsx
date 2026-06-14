import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/data";
import { EjecucionObra } from "@/app/operario/obra/[id]/stepper-flow";
import { FiberEjecucionObra } from "@/app/operario/obra/[id]/fiber-stepper-flow";
import { requireOperarioUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OperarioLogoutButton } from "@/components/operario/operario-logout-button";
import { isFiberVertical } from "@/lib/organization-vertical";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MobileObraPage({ params }: Props) {
  const dbUser = await requireOperarioUser();
  const { id } = await params;
  const [project, org] = await Promise.all([
    getProjectById(id),
    prisma.organization.findUnique({
      where: { id: dbUser.organizationId },
      select: { vertical: true },
    }),
  ]);

  if (!project || project.assignedUserId !== dbUser.id) notFound();

  const isFiber = isFiberVertical(org?.vertical);
  const modeLabel = isFiber ? "FibOps · Modo Campo" : "Modo Tejado";

  return (
    <main className="min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden bg-slate-950 px-3 py-4 text-white sm:px-4 sm:py-5">
      <header className="mb-4 flex w-full min-w-0 items-start justify-between gap-3 rounded-xl border border-white/15 bg-slate-900 px-3 py-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-300">{modeLabel}</p>
          <h1 className="text-lg font-bold">{project.cliente}</h1>
          <p className="text-xs text-slate-300">{project.direccion}</p>
        </div>
        <OperarioLogoutButton />
      </header>
      {isFiber ? (
        <FiberEjecucionObra
          projectId={project.id}
          initialContractId={project.serviceContractId}
          initialFiberType={project.fiberInstallationType}
          initialOperator={project.fiberOperator}
          initialOrderRef={project.fiberOrderReference}
          initialCtoRef={project.fiberCtoReference}
          initialFloorDoor={project.installFloorDoor}
        />
      ) : (
        <EjecucionObra
          projectId={project.id}
          serverLegalElectricHints={{
            selfConsumptionModality: project.selfConsumptionModality,
            cableDcSectionMm2: project.cableDcSectionMm2,
            cableAcSectionMm2: project.cableAcSectionMm2,
          }}
          serverRebtContext={{
            projectRebtCompanyNumber: project.rebtCompanyNumber,
            organizationRebtCompanyNumber: project.organizationRebtCompanyNumber,
          }}
        />
      )}
    </main>
  );
}
