"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, Camera, FileText, Mail, ScrollText } from "lucide-react";
import type { EstadoProyecto, Photo } from "@prisma/client";
import {
  reassignUnassignedProjectAction,
  resendProjectDossierEmailAction,
} from "@/app/actions/projects";
import { CieExportModal } from "@/components/dashboard/cie-export-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DashboardProjectCard = {
  id: string;
  cliente: string;
  direccion: string;
  estado: EstadoProyecto;
  progreso: number;
  operarioNombre: string;
  operarioInitials: string;
  assignedUserId: string | null;
  photos: Pick<Photo, "id">[];
  updatedAt: string;
  /** Datos mínimos para tramitar CIE (Industria) */
  cieReady?: boolean;
};

const statusUi: Record<EstadoProyecto, { label: string; className: string }> = {
  EN_INSTALACION: {
    label: "En obra",
    className:
      "border-0 bg-sky-500 text-white shadow-md shadow-sky-500/30 ring-1 ring-sky-300/80",
  },
  FINALIZADO: {
    label: "Finalizado",
    className:
      "border-0 bg-emerald-500 text-white shadow-md shadow-emerald-500/35 ring-1 ring-emerald-300/90",
  },
  PENDIENTE_MATERIAL: {
    label: "Espera material",
    className:
      "border-0 bg-amber-500 text-amber-950 shadow-md shadow-amber-500/40 ring-1 ring-amber-200",
  },
  SUBVENCION_TRAMITADA: {
    label: "Subvención ok",
    className:
      "border-0 bg-violet-500 text-white shadow-md shadow-violet-500/35 ring-1 ring-violet-300/80",
  },
  PRESUPUESTO: {
    label: "Presupuesto",
    className:
      "border-0 bg-orange-500 text-white shadow-md shadow-orange-500/40 ring-1 ring-orange-300/80",
  },
};

type FilterBucket = "ALL" | "PENDIENTE" | "EN_PROGRESO" | "FINALIZADO";

const filterBuckets: Record<
  FilterBucket,
  { label: string; match: (e: EstadoProyecto) => boolean }
> = {
  ALL: { label: "Todos", match: () => true },
  PENDIENTE: {
    label: "Pendiente",
    match: (e) => e === "PRESUPUESTO" || e === "PENDIENTE_MATERIAL",
  },
  EN_PROGRESO: {
    label: "En Progreso",
    match: (e) => e === "EN_INSTALACION",
  },
  FINALIZADO: {
    label: "Finalizado",
    match: (e) => e === "FINALIZADO" || e === "SUBVENCION_TRAMITADA",
  },
};

function formatUpdatedAt(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function DashboardProjectsPanel({
  projects,
  unassignedProjects,
  closedWithoutZipCount = 0,
}: {
  projects: DashboardProjectCard[];
  unassignedProjects: number;
  closedWithoutZipCount?: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterBucket>("ALL");
  const [cieModal, setCieModal] = useState<{ id: string; cliente: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const { match } = filterBuckets[filter];
    return projects.filter((p) => {
      if (!match(p.estado)) return false;
      if (!q) return true;
      return (
        p.cliente.toLowerCase().includes(q) ||
        p.direccion.toLowerCase().includes(q)
      );
    });
  }, [projects, query, filter]);

  const showPackActions = (e: EstadoProyecto) =>
    e === "FINALIZADO" || e === "SUBVENCION_TRAMITADA";

  return (
    <>
      <CieExportModal
        projectId={cieModal?.id ?? null}
        clienteLabel={cieModal?.cliente ?? ""}
        open={cieModal != null}
        onClose={() => setCieModal(null)}
      />
      <div className="mb-3 rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600/25 via-slate-900/90 to-amber-500/15 p-4 ring-1 ring-emerald-500/20">
        <p className="text-sm font-semibold text-emerald-100">
          Pack subvención: PDF certificado + todas las fotos en carpetas Antes / Durante / Despues
          (ZIP listo para la Junta).
        </p>
        <p className="mt-1 text-xs text-slate-300">
          En obras finalizadas: PDF, ZIP y reenvío del dossier por correo con el icono de sobre.
          {closedWithoutZipCount > 0 ? (
            <span className="ml-1 font-semibold text-amber-200">
              ({closedWithoutZipCount} sin pack descargado)
            </span>
          ) : null}
        </p>
      </div>

      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-bold text-white">Torre de control · Proyectos</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-yellow-300/70 bg-yellow-300/15 text-yellow-200">
            {projects.length} proyectos
          </Badge>
          {unassignedProjects > 0 ? (
            <Badge className="border border-red-400/80 bg-red-500/25 text-red-100">
              {unassignedProjects} sin operario
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Buscar por cliente o dirección…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500"
        />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterBuckets) as FilterBucket[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                filter === key
                  ? "border-yellow-400/80 bg-yellow-400/20 text-yellow-100"
                  : "border-slate-600 bg-slate-800/80 text-slate-300 hover:border-slate-500",
              )}
            >
              {filterBuckets[key].label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          Mostrando {filtered.length} de {projects.length}
        </span>
      </div>

      {projects.length === 0 ? null : filtered.length === 0 ? (
        <Card className="border-slate-700 bg-slate-900/60">
          <CardContent className="py-10 text-center text-slate-300">
            Ningún proyecto coincide con la búsqueda o el filtro.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filtered.map((project) => {
              const pack = showPackActions(project.estado);
              return (
                <Card
                  key={project.id}
                  className="border-slate-700/90 bg-slate-900/95 shadow-lg ring-1 ring-slate-800/60"
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white">{project.cliente}</p>
                        <p className="mt-1 text-xs leading-snug text-slate-300">
                          {project.direccion}
                        </p>
                      </div>
                      <Badge
                        className={cn("shrink-0 font-bold", statusUi[project.estado].className)}
                      >
                        {statusUi[project.estado].label}
                      </Badge>
                    </div>
                    {pack && project.cieReady ? (
                      <span className="animate-cie-ready inline-flex w-fit items-center rounded-md border border-emerald-300/90 bg-emerald-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-950 ring-1 ring-emerald-200/80">
                        CIE Ready
                      </span>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="tabular-nums text-slate-300">
                        {formatUpdatedAt(project.updatedAt)}
                      </span>
                      <span className="text-slate-600">·</span>
                      {project.assignedUserId ? (
                        <span className="inline-flex items-center gap-2 text-slate-200">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-yellow-950">
                            {project.operarioInitials || "—"}
                          </span>
                          <span className="max-w-[10rem] truncate">{project.operarioNombre}</span>
                        </span>
                      ) : (
                        <form action={reassignUnassignedProjectAction} className="inline">
                          <input type="hidden" name="projectId" value={project.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-amber-300 underline-offset-2 hover:underline"
                          >
                            Reasignar operario
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 border-t border-slate-700/80 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-500/50 bg-slate-800 px-2 text-xs font-semibold text-slate-100"
                        >
                          Detalle
                        </Link>
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 px-2 text-xs font-bold text-amber-950"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5 shrink-0" />
                          Fotos
                        </Link>
                      </div>
                      {pack ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/api/projects/${project.id}/report`}
                              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-500/50 bg-slate-800 px-2 text-[11px] font-semibold text-slate-100"
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              PDF
                            </a>
                            <a
                              href={`/api/projects/${project.id}/subsidy-pack`}
                              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-emerald-400/70 bg-emerald-600/40 px-2 text-[11px] font-bold text-emerald-50"
                            >
                              <Archive className="mr-1 h-3.5 w-3.5" />
                              ZIP
                            </a>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <form action={resendProjectDossierEmailAction} className="flex-1 min-w-[44px]">
                              <input type="hidden" name="projectId" value={project.id} />
                              <button
                                type="submit"
                                title="Reenviar dossier PDF"
                                className="flex h-9 w-full items-center justify-center rounded-lg border border-sky-500/50 bg-sky-600/30 text-sky-100"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            </form>
                            <button
                              type="button"
                              onClick={() =>
                                setCieModal({ id: project.id, cliente: project.cliente })
                              }
                              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-yellow-400/40 bg-slate-800 px-2 text-[11px] font-semibold text-yellow-100"
                            >
                              <ScrollText className="mr-1 h-3.5 w-3.5 shrink-0" />
                              CIE
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/50 shadow-xl ring-1 ring-slate-800/80 lg:block">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/95">
                <th className="px-4 py-3 font-bold text-slate-200">Cliente</th>
                <th className="px-4 py-3 font-bold text-slate-200">Ubicación</th>
                <th className="px-4 py-3 font-bold text-slate-200">Estado</th>
                <th className="px-4 py-3 font-bold text-slate-200">Última actividad</th>
                <th className="px-4 py-3 font-bold text-slate-200">Operario</th>
                <th className="px-4 py-3 font-bold text-slate-200 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const pack = showPackActions(project.estado);
                return (
                  <tr
                    key={project.id}
                    className="border-b border-slate-800/90 transition hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {project.cliente}
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-slate-300">
                      <span className="line-clamp-2">{project.direccion}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          className={cn("font-bold", statusUi[project.estado].className)}
                        >
                          {statusUi[project.estado].label}
                        </Badge>
                        {pack && project.cieReady ? (
                          <span className="animate-cie-ready inline-flex items-center rounded-md border border-emerald-300/90 bg-emerald-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-950 ring-1 ring-emerald-200/80">
                            CIE Ready
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      <span className="tabular-nums">
                        {formatUpdatedAt(project.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {project.assignedUserId ? (
                        <span className="inline-flex items-center gap-2 text-slate-200">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-yellow-950">
                            {project.operarioInitials || "—"}
                          </span>
                          <span className="max-w-[120px] truncate text-xs">
                            {project.operarioNombre}
                          </span>
                        </span>
                      ) : (
                        <form action={reassignUnassignedProjectAction} className="inline">
                          <input type="hidden" name="projectId" value={project.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-amber-300 underline-offset-2 hover:underline"
                          >
                            Reasignar
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex h-8 items-center rounded-lg border border-slate-500/50 bg-gradient-to-br from-slate-700 to-slate-900 px-2.5 text-xs font-medium text-slate-100 shadow-sm hover:from-slate-600 hover:to-slate-800"
                        >
                          Detalle
                        </Link>
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex h-8 items-center rounded-lg bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 px-2.5 text-xs font-bold text-amber-950 shadow-md shadow-amber-900/20 ring-1 ring-amber-200/70 hover:from-amber-200 hover:via-yellow-300 hover:to-amber-300"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5" />
                          Fotos
                        </Link>
                        {pack ? (
                          <>
                            <form action={resendProjectDossierEmailAction}>
                              <input type="hidden" name="projectId" value={project.id} />
                              <button
                                type="submit"
                                title="Reenviar dossier PDF por correo (admin y cliente si hay email)"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/50 bg-gradient-to-br from-sky-500/40 to-blue-600/30 text-sky-100 shadow-md hover:from-sky-500/55 hover:to-blue-600/45"
                              >
                                <Mail className="h-4 w-4" />
                                <span className="sr-only">Reenviar email dossier</span>
                              </button>
                            </form>
                            <a
                              href={`/api/projects/${project.id}/report`}
                              className="inline-flex h-8 items-center rounded-lg border border-slate-500/50 bg-gradient-to-br from-slate-700 to-slate-900 px-2.5 text-xs font-semibold text-slate-100 shadow-sm ring-slate-500/30 hover:from-slate-600 hover:to-slate-800"
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              PDF
                            </a>
                            <a
                              href={`/api/projects/${project.id}/subsidy-pack`}
                              className="inline-flex h-8 items-center rounded-lg border border-emerald-400/70 bg-gradient-to-r from-emerald-600/50 via-teal-600/40 to-emerald-700/45 px-2.5 text-xs font-bold text-emerald-50 shadow-md shadow-emerald-900/25 ring-1 ring-emerald-300/40 hover:from-emerald-500/60 hover:via-teal-500/50"
                            >
                              <Archive className="mr-1 h-3.5 w-3.5" />
                              ZIP subvención
                            </a>
                            <button
                              type="button"
                              title="Generar Datos para CIE (Boletín)"
                              onClick={() =>
                                setCieModal({ id: project.id, cliente: project.cliente })
                              }
                              className="inline-flex min-h-8 max-w-[200px] items-center rounded-lg border border-slate-500/60 bg-slate-800/90 px-2 py-1 text-left text-[11px] font-semibold leading-tight text-slate-100 shadow-sm ring-1 ring-yellow-400/20 hover:border-yellow-400/40 hover:text-yellow-100 sm:max-w-none sm:px-2.5 sm:py-0 sm:text-xs"
                            >
                              <ScrollText className="mr-1 h-3.5 w-3.5 shrink-0 text-yellow-300/90" />
                              <span className="sm:whitespace-nowrap">
                                Generar Datos para CIE (Boletín)
                              </span>
                            </button>
                            <span className="text-[11px] font-semibold text-emerald-200">
                              Desbloquear archivos de cobro
                            </span>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </>
  );
}
