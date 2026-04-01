import {
  BadgeCheck,
  Building2,
  Cpu,
  Euro,
  FileStack,
  FileText,
  Hash,
  Shield,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { saveProjectAdminMemoryAction } from "@/app/actions/projects";
import type { ProjectDetail } from "@/lib/data";

const inputCls =
  "mt-1 h-10 w-full rounded-lg border border-slate-600/80 bg-slate-900/90 px-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none ring-0 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25";
const smallInputCls =
  "h-9 w-full rounded-lg border border-slate-600/80 bg-slate-900/90 px-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25";
const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-400";
const sectionShell =
  "rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-4 shadow-lg shadow-black/30 ring-1 ring-slate-800/80";

type PanelProps = {
  project: ProjectDetail;
};

export function ProjectAdminOfficePanel({ project }: PanelProps) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-500/35 bg-slate-950 ring-1 ring-emerald-400/15">
      <div className="border-b border-emerald-500/25 bg-gradient-to-r from-emerald-950/80 via-slate-950 to-slate-950 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-400" aria-hidden />
          <h2 className="text-base font-bold tracking-tight text-white">
            Oficina técnica y comercial
          </h2>
          <span className="ml-auto rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            Solo admin
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Memoria para el dossier, datos de expediente, equipamiento de respaldo y precio de la obra.
          Lo que guardes aquí alimenta informes y el resumen de cobros en el dashboard.
        </p>
      </div>

      <form action={saveProjectAdminMemoryAction} className="grid gap-5 p-4 sm:p-5">
        <input type="hidden" name="projectId" value={project.id} />

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Euro className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Comercial</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Importe venta / ingreso estimado (€)</label>
              <input
                name="estimatedRevenue"
                defaultValue={project.estimatedRevenue ?? ""}
                inputMode="decimal"
                className={inputCls}
                placeholder="Ej. 18500.50"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Mismo concepto que al crear el proyecto: suma en métricas de caja del dashboard.
              </p>
            </div>
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Ref. presupuesto u oferta
                </span>
              </label>
              <input
                name="quoteReference"
                defaultValue={project.quoteReference ?? ""}
                className={inputCls}
                placeholder="Ej. PRE-2025-0142"
                maxLength={200}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 sm:grid-cols-3">
            <div>
              <span className={labelCls}>CUPS</span>
              <p className="mt-1 font-mono text-xs text-slate-300">
                {(project.cups ?? "").trim() || "—"}
              </p>
            </div>
            <div>
              <span className={labelCls}>Catastral</span>
              <p className="mt-1 font-mono text-xs text-slate-300">
                {(project.catastralReference ?? "").trim() || "—"}
              </p>
            </div>
            <div>
              <span className={labelCls}>Titular (NIF)</span>
              <p className="mt-1 font-mono text-xs text-slate-300">
                {(project.ownerTaxId ?? "").trim() || "—"}
              </p>
            </div>
            <p className="sm:col-span-3 text-[11px] text-slate-500">
              CUPS, catastral y titular se editan en el alta del proyecto (dashboard → nuevo proyecto).
            </p>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Memoria técnica</h3>
          </div>
          <label className="block">
            <span className={labelCls}>Texto para dossier y legalización</span>
            <Textarea
              name="technicalMemory"
              defaultValue={project.technicalMemory ?? ""}
              className="mt-2 min-h-[8.5rem] resize-y rounded-xl border border-slate-600/80 bg-slate-900/90 px-3 py-2 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
              placeholder="Cálculos, normativa, condicionantes, decisiones de diseño ejecutado en obra…"
            />
          </label>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-bold text-slate-100">Expediente y revisión</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Nº empresa REBT</span>
              <input
                name="rebtCompanyNumber"
                defaultValue={project.rebtCompanyNumber ?? ""}
                className={inputCls}
                placeholder="REBT-XXXXXX"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Referencia de expediente</span>
              <input
                name="dossierReference"
                defaultValue={project.dossierReference ?? ""}
                className={inputCls}
                placeholder={`EXP-${project.id.slice(-8).toUpperCase()}`}
              />
            </label>
          </div>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5">
            <input
              type="checkbox"
              name="reviewedByOfficeTech"
              defaultChecked={Boolean(project.reviewedByOfficeTech)}
              className="h-4 w-4 rounded border-slate-500 accent-emerald-500"
            />
            <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <BadgeCheck className="h-4 w-4 text-emerald-400" />
              Revisado por oficina técnica
            </span>
          </label>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileStack className="h-4 w-4 text-orange-300" />
            <h3 className="text-sm font-bold text-slate-100">Serie y activos (respaldo oficina)</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>S/N inversor</span>
              <input
                name="equipmentInverterSerial"
                defaultValue={project.equipmentInverterSerial ?? ""}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>S/N batería</span>
              <input
                name="equipmentBatterySerial"
                defaultValue={project.equipmentBatterySerial ?? ""}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>S/N vatímetro</span>
              <input
                name="equipmentVatimetroSerial"
                defaultValue={project.equipmentVatimetroSerial ?? ""}
                className={inputCls}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <fieldset className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <legend className={labelCls + " px-1"}>Panel</legend>
              <input
                name="assetPanelBrand"
                defaultValue={project.assetPanelBrand ?? ""}
                className={smallInputCls}
                placeholder="Marca"
              />
              <input
                name="assetPanelModel"
                defaultValue={project.assetPanelModel ?? ""}
                className={smallInputCls}
                placeholder="Modelo"
              />
              <input
                name="assetPanelSerial"
                defaultValue={project.assetPanelSerial ?? ""}
                className={smallInputCls}
                placeholder="Nº serie"
              />
            </fieldset>
            <fieldset className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <legend className={labelCls + " px-1"}>Inversor</legend>
              <input
                name="assetInverterBrand"
                defaultValue={project.assetInverterBrand ?? ""}
                className={smallInputCls}
                placeholder="Marca"
              />
              <input
                name="assetInverterModel"
                defaultValue={project.assetInverterModel ?? ""}
                className={smallInputCls}
                placeholder="Modelo"
              />
            </fieldset>
            <fieldset className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <legend className={labelCls + " px-1"}>Batería</legend>
              <input
                name="assetBatteryBrand"
                defaultValue={project.assetBatteryBrand ?? ""}
                className={smallInputCls}
                placeholder="Marca"
              />
              <input
                name="assetBatteryModel"
                defaultValue={project.assetBatteryModel ?? ""}
                className={smallInputCls}
                placeholder="Modelo"
              />
            </fieldset>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Cpu className="h-4 w-4 text-yellow-300" />
            <h3 className="text-sm font-bold text-slate-100">Potencias declaradas (kWp / kWn / kWh)</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Pico (kWp)</span>
              <input
                name="peakPowerKwp"
                defaultValue={project.peakPowerKwp ?? ""}
                inputMode="decimal"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Nominal inversor (kWn)</span>
              <input
                name="inverterPowerKwn"
                defaultValue={project.inverterPowerKwn ?? ""}
                inputMode="decimal"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Almacenamiento (kWh)</span>
              <input
                name="storageCapacityKwh"
                defaultValue={project.storageCapacityKwh ?? ""}
                inputMode="decimal"
                className={inputCls}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-500 sm:w-auto sm:min-w-[200px] sm:justify-self-start"
        >
          Guardar cambios de oficina
        </button>
      </form>
    </div>
  );
}
