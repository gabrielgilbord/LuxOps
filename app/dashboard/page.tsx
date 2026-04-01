import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  FolderPlus,
  Plus,
  Signature,
  Sun,
  Users,
} from "lucide-react";
import { getProjects } from "@/app/actions/projects";
import { isCieReady } from "@/lib/cie-export";
import { requireAdminUserForDashboard } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AnimatedCount } from "@/components/dashboard/animated-count";
import { DashboardProjectsPanel } from "@/components/dashboard/dashboard-projects-panel";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const admin = await requireAdminUserForDashboard();
  const [
    operariosCount,
    org,
    reportsGeneratedCount,
    totalEvidencePhotos,
    projects,
    closedWithoutZipCount,
    cashflowAgg,
    finalizedProjectsCount,
  ] = await Promise.all([
    prisma.user.count({
      where: { organizationId: admin.organizationId, role: "OPERARIO" },
    }),
    prisma.organization.findUnique({
      where: { id: admin.organizationId },
      select: { logoPath: true },
    }),
    prisma.project.count({
      where: { organizationId: admin.organizationId, estado: "FINALIZADO" },
    }),
    prisma.photo.count({
      where: { project: { organizationId: admin.organizationId } },
    }),
    getProjects(),
    prisma.project.count({
      where: {
        organizationId: admin.organizationId,
        estado: { in: ["FINALIZADO", "SUBVENCION_TRAMITADA"] },
        subsidyPackDownloadedAt: null,
      },
    }),
    prisma.project.aggregate({
      where: {
        organizationId: admin.organizationId,
        estado: { in: ["FINALIZADO", "SUBVENCION_TRAMITADA"] },
        subsidyPackDownloadedAt: null,
      },
      _sum: { estimatedRevenue: true },
    }),
    prisma.project.count({
      where: {
        organizationId: admin.organizationId,
        estado: { in: ["FINALIZADO", "SUBVENCION_TRAMITADA"] },
      },
    }),
  ]);
  const capitalReady = Number(cashflowAgg._sum.estimatedRevenue ?? 0);
  const officeHoursSaved = finalizedProjectsCount * 2;
  const activeProjects = projects.filter((p) => p.estado === "EN_INSTALACION").length;
  const pendingSignature = projects.filter((p) => p.estado === "PRESUPUESTO").length;
  const unassignedProjects = projects.filter((p) => !p.assignedUserId).length;
  const onboardingSteps = [
    {
      id: "branding",
      title: "Sube tu identidad corporativa",
      description: "Logo y color corporativo para tus informes PDF premium.",
      href: "/dashboard/settings",
      complete: Boolean(org?.logoPath),
      icon: Sun,
    },
    {
      id: "team",
      title: "Invita a tu primer operario",
      description: "Crea tu equipo de campo y empieza a asignar obras.",
      href: "/dashboard/team",
      complete: operariosCount > 0,
      icon: Users,
    },
    {
      id: "project",
      title: "Crea tu primera instalación",
      description: "Activa tu flujo de trabajo en tejado y oficina en minutos.",
      href: "/dashboard/new-project",
      complete: projects.length > 0,
      icon: FolderPlus,
    },
  ] as const;
  const completedSteps = onboardingSteps.filter((step) => step.complete).length;
  const progressPercent = Math.round((completedSteps / onboardingSteps.length) * 100);
  const showOnboardingChecklist = completedSteps < onboardingSteps.length;

  return (
    <section className="relative mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6">
        {showOnboardingChecklist ? (
          <Card className="mb-4 overflow-hidden border border-slate-700/70 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-xl">
            <CardContent className="py-4">
              <p className="text-xl font-bold text-white">
                ¡Empecemos! Configura tu cuenta en 3 pasos rápidos.
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Progreso de activación: {completedSteps}/3 pasos completados.
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-yellow-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {onboardingSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <SpotlightCard
                      key={step.id}
                      className={`group relative rounded-xl border bg-slate-900/70 p-4 transition-all duration-500 ease-in-out hover:scale-105 ${
                        step.complete
                          ? "border-yellow-300/80 shadow-sm shadow-yellow-400/40"
                          : "border-slate-700 hover:border-yellow-300/40 hover:shadow-[0_0_20px_rgba(251,191,36,0.12)]"
                      }`}
                    >
                      <Icon
                        className={`absolute right-3 top-3 h-8 w-8 transition-colors ${
                          step.complete ? "text-yellow-300" : "text-slate-600 group-hover:text-slate-500"
                        }`}
                      />
                      <div className="mb-3">
                        {step.complete ? (
                          <CheckCircle2 className="h-5 w-5 text-yellow-300" />
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 text-xs font-bold text-slate-300">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white">{step.title}</h3>
                      <p className="mt-1 text-xs text-slate-300">{step.description}</p>
                      {!step.complete ? (
                        <Link
                          href={step.href}
                          className="mt-3 inline-flex h-8 items-center justify-center rounded-md border border-slate-600 bg-slate-800 px-3 text-xs font-semibold text-slate-100 transition-all duration-500 hover:border-yellow-300/60 hover:bg-slate-700"
                        >
                          Ir ahora
                        </Link>
                      ) : (
                        <p className="mt-3 text-xs font-semibold text-yellow-200">Completado</p>
                      )}
                    </SpotlightCard>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <SpotlightCard className="mb-6 animate-fade-in-up rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Panel de Control de Instalaciones
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-300">
                Gestiona tus obras, checklists y documentacion en un solo lugar.
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch lg:max-w-[min(100%,28rem)] lg:flex-nowrap lg:justify-end">
              <Link
                href="/dashboard/new-project"
                className="inline-flex h-12 min-w-0 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 px-4 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-200/80 transition hover:-translate-y-0.5 hover:from-amber-200 hover:via-yellow-300 hover:to-amber-300 sm:px-5"
              >
                <Plus className="mr-1 h-4 w-4 shrink-0" />
                <span className="truncate sm:whitespace-normal">Nuevo Proyecto de Instalacion</span>
              </Link>
              <Link
                href="/dashboard/team"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-slate-500/60 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 px-4 text-sm font-bold text-white shadow-md shadow-black/20 ring-1 ring-slate-400/20 transition hover:from-slate-600 hover:to-slate-900 sm:px-5"
              >
                Gestionar Equipo
              </Link>
              <Link
                href="/dashboard/reports"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-slate-500/60 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 px-4 text-sm font-bold text-white shadow-md shadow-black/20 ring-1 ring-slate-400/20 transition hover:from-slate-600 hover:to-slate-900 sm:px-5"
              >
                Generación de Informes
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="border-slate-800/90 bg-slate-900/70 backdrop-blur-md">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-slate-300">Proyectos Activos</p>
                  <Sun className="h-6 w-6 text-yellow-300" />
                </div>
                <p className="mt-2 text-4xl font-bold tracking-tight text-white">
                  {activeProjects}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-800/90 bg-slate-900/70 backdrop-blur-md">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-slate-300">Pendientes de Firma</p>
                  <Signature className="h-6 w-6 text-yellow-300" />
                </div>
                <p className="mt-2 text-4xl font-bold tracking-tight text-white">
                  {pendingSignature}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-800/90 bg-slate-900/70 backdrop-blur-md">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-slate-300">
                    Evidencias Totales
                  </p>
                  <Camera className="h-6 w-6 text-yellow-300" />
                </div>
                <p className="mt-2 text-4xl font-bold tracking-tight text-white">
                  {new Intl.NumberFormat("es-ES").format(totalEvidencePhotos)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Fotos en la nube</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-700/35 via-emerald-900/40 to-slate-900">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/90">
                  Dinero desbloqueado
                </p>
                <p className="mt-2 text-3xl font-extrabold text-white">
                  Capital listo para facturar:{" "}
                  {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(capitalReady)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-sky-500/40 bg-gradient-to-br from-sky-700/30 via-slate-900 to-slate-950">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-100/90">
                  Eficiencia administrativa
                </p>
                <p className="mt-2 text-3xl font-extrabold text-white">
                  {officeHoursSaved} horas ahorradas en oficina
                </p>
              </CardContent>
            </Card>
          </div>
          {closedWithoutZipCount > 0 ? (
            <div className="mt-4 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-yellow-500/15 px-5 py-4 shadow-lg shadow-amber-900/20 ring-1 ring-amber-300/40">
              <p className="text-sm font-bold text-amber-100">
                Listos para facturar
              </p>
              <p className="mt-1 text-lg font-extrabold tracking-tight text-white">
                {closedWithoutZipCount}{" "}
                {closedWithoutZipCount === 1
                  ? "obra terminada sin ZIP descargado"
                  : "obras terminadas sin ZIP descargado"}
              </p>
              <p className="mt-1 text-xs text-amber-100/90">
                Descarga el pack de subvención en cada fila para cerrar el circuito administrativo
                y tramitar cobros o ayudas.
              </p>
            </div>
          ) : null}
          <div className="mt-5 rounded-2xl border border-yellow-300/25 bg-slate-900/80 p-4">
            <p className="text-sm font-semibold text-slate-200">🏆 Éxito en el tejado</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-yellow-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">
              <AnimatedCount value={reportsGeneratedCount} /> informes generados
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Cada informe es una obra bien terminada y una subvención más cerca.
            </p>
          </div>
        </SpotlightCard>

        {projects.length === 0 ? (
          <>
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-slate-900/80 p-4">
              <p className="text-sm font-semibold text-emerald-100">
                ¿Necesitas certificar una subvención? Cuando tengas obras cerradas,
                el Dossier Ejecutivo se genera con un clic.
              </p>
            </div>
            <Card className="animate-fade-in-up border-dashed border-slate-700 bg-slate-900/60">
              <CardContent className="py-14 text-center">
                <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-yellow-300/40 bg-yellow-300/10">
                  <CheckCircle2 className="h-10 w-10 text-yellow-300" />
                </div>
                <p className="mx-auto max-w-2xl text-lg font-medium text-slate-100">
                  ¡Tu panel está despejado! Es el momento perfecto para añadir tu primera
                  instalación solar y empezar a facturar.
                </p>
                <Link
                  href="/dashboard/new-project"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                >
                  + Crear mi primer proyecto
                </Link>
              </CardContent>
            </Card>
          </>
        ) : (
          <DashboardProjectsPanel
            projects={projects.map((p) => ({
              id: p.id,
              cliente: p.cliente,
              direccion: p.direccion,
              estado: p.estado,
              progreso: p.progreso,
              operarioNombre: p.operarioNombre,
              operarioInitials: p.operarioInitials,
              assignedUserId: p.assignedUserId,
              photos: p.photos,
              updatedAt: p.updatedAt.toISOString(),
              cieReady: isCieReady({
                cups: p.cups,
                catastralReference: p.catastralReference,
                ownerTaxId: p.ownerTaxId,
                cliente: p.cliente,
                direccion: p.direccion,
                electricVocVolts: p.electricVocVolts,
                electricIscAmps: p.electricIscAmps,
                earthResistanceOhms: p.earthResistanceOhms,
                thermalProtectionBrand: p.thermalProtectionBrand,
                thermalProtectionModel: p.thermalProtectionModel,
                spdBrand: p.spdBrand,
                spdModel: p.spdModel,
                peakPowerKwp: p.peakPowerKwp,
                equipmentPanelItems: p.equipmentPanelItems,
                equipmentInverterItems: p.equipmentInverterItems,
              }),
            }))}
            unassignedProjects={unassignedProjects}
            closedWithoutZipCount={closedWithoutZipCount}
          />
        )}
    </section>
  );
}
