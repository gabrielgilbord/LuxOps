"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { useFormStatus } from "react-dom";
import {
  BadgeCheck,
  Building2,
  Cpu,
  Euro,
  FileStack,
  FileText,
  HardHat,
  Hash,
  ImagePlus,
  Loader2,
  MapPin,
  Shield,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  saveProjectAdminMemoryAction,
  uploadAdminUnifilarPhotoAction,
  type SaveProjectAdminMemoryState,
} from "@/app/actions/projects";
import type { ProjectDetail } from "@/lib/data";
import {
  SELF_CONSUMPTION_MODALITY_LABEL,
  SELF_CONSUMPTION_MODALITY_VALUES,
} from "@/lib/self-consumption-modality";

const inputCls =
  "mt-1 h-10 w-full rounded-lg border border-slate-600/80 bg-slate-900/90 px-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none ring-0 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25";
const smallInputCls =
  "h-9 w-full rounded-lg border border-slate-600/80 bg-slate-900/90 px-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25";
const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-400";
const sectionShell =
  "rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-4 shadow-lg shadow-black/30 ring-1 ring-slate-800/80";

const STRUCTURE_OPTIONS = [
  { value: "", label: "— Sin especificar —" },
  { value: "COPLANAR", label: "Coplanar" },
  { value: "INCLINACION", label: "Inclinación" },
  { value: "LASTRADA", label: "Lastrada" },
] as const;

function formatPrlAcknowledged(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

type PanelProps = {
  project: ProjectDetail;
};

function OfficeSaveButton() {
  const { pending } = useFormStatus();
  const [slowHint, setSlowHint] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => setSlowHint(true), 10_000);
    return () => {
      window.clearTimeout(id);
      setSlowHint(false);
    };
  }, [pending]);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-start">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-500 disabled:pointer-events-none disabled:opacity-60 sm:w-auto sm:min-w-[200px] sm:justify-self-start"
      >
        {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
        {pending ? "Guardando..." : "Guardar cambios de oficina"}
      </button>
      {pending && slowHint ? (
        <p className="text-xs text-slate-400" role="status">
          La conexión parece lenta, espera un momento...
        </p>
      ) : null}
    </div>
  );
}

function UnifilarUploadButton({
  projectId,
  fileInputRef,
}: {
  projectId: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const [pending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const file = fileInputRef.current?.files?.[0];
          if (!file) {
            setUploadError("Selecciona una imagen.");
            return;
          }
          setUploadError(null);
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("unifilarFile", file);
          startTransition(async () => {
            try {
              await uploadAdminUnifilarPhotoAction(fd);
            } catch (e) {
              setUploadError(e instanceof Error ? e.message : "No se pudo subir el unifilar.");
            }
          });
        }}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-xs font-bold text-white shadow hover:bg-cyan-500 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {pending ? "Subiendo..." : "Subir unifilar"}
      </button>
      {uploadError ? (
        <p className="max-w-xs text-right text-[11px] text-red-300 sm:text-left" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

export function ProjectAdminOfficePanel({ project }: PanelProps) {
  const [saveState, saveFormAction] = useActionState(
    saveProjectAdminMemoryAction,
    undefined as SaveProjectAdminMemoryState | undefined,
  );
  const unifilarFileRef = useRef<HTMLInputElement>(null);

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
          Vista de pájaro del expediente: mismos datos que el operario envía al PDF (más memoria de oficina).
          Los valores de marca/modelo y potencias se rellenan también desde el inventario JSON de campo si hace
          falta. Usa <span className="font-semibold text-slate-300">Guardar cambios de oficina</span> al final.
        </p>
      </div>

      <form action={saveFormAction} className="grid gap-5 p-4 sm:p-5">
        <input type="hidden" name="projectId" value={project.id} />

        {saveState?.ok ? (
          <p
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200"
            role="status"
          >
            Cambios guardados correctamente en el expediente
          </p>
        ) : null}
        {saveState?.ok === false && saveState.error ? (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
            {saveState.error}
          </p>
        ) : null}

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
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Nº Boletín (CIE)</span>
              <input
                name="nBoletin"
                defaultValue={(project.nBoletin ?? "").toString()}
                className={inputCls}
                placeholder="BT-123456"
                maxLength={64}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Fecha emisión CIE</span>
              <input
                type="date"
                name="fechaCIE"
                defaultValue={
                  project.fechaCIE
                    ? new Date(project.fechaCIE).toISOString().slice(0, 10)
                    : ""
                }
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Presupuesto final (€)</span>
              <input
                name="presupuestoFinal"
                defaultValue={project.presupuestoFinal ?? ""}
                className={inputCls}
                placeholder="12450.00"
                inputMode="decimal"
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
          <div className="mt-5 grid gap-4 border-t border-slate-800 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Legalización · RD 244/2019 (autoconsumo y cables)
            </p>
            <label className="block">
              <span className={labelCls}>Modalidad de autoconsumo (RD 244/2019)</span>
              <select
                name="selfConsumptionModality"
                defaultValue={project.selfConsumptionModality ?? ""}
                className={inputCls}
              >
                <option value="">— Seleccionar —</option>
                {SELF_CONSUMPTION_MODALITY_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {SELF_CONSUMPTION_MODALITY_LABEL[v]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Sección de cable DC (mm²)</span>
                <input
                  name="cableDcSectionMm2"
                  defaultValue={project.cableDcSectionMm2 ?? ""}
                  className={inputCls}
                  placeholder="Ej.: 6"
                  maxLength={32}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Sección de cable AC (mm²)</span>
                <input
                  name="cableAcSectionMm2"
                  defaultValue={project.cableAcSectionMm2 ?? ""}
                  className={inputCls}
                  placeholder="Ej.: 10"
                  maxLength={32}
                />
              </label>
            </div>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <HardHat className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">P.R.L. y seguridad en cubierta</h3>
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Estado registrado en base de datos (mismo origen que el dossier). Puedes corregir antes del
            PDF definitivo; el registro horario con GPS corresponde al momento en que el operario envió la
            aceptación P.R.L.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["prlLineLifeHarness", "Línea de vida / anclajes", project.prlLineLifeHarness],
                ["prlCollectiveProtection", "Protección colectiva / prensaestopas", project.prlCollectiveProtection],
                ["prlRoofTransitOk", "Tránsito seguro en cubierta", project.prlRoofTransitOk],
                ["prlPpeInUse", "EPIs y calzado de seguridad", project.prlPpeInUse],
              ] as const
            ).map(([name, label, checked]) => (
              <label
                key={name}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/40 px-3 py-2"
              >
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={Boolean(checked)}
                  className="h-4 w-4 rounded border-slate-500 accent-amber-500"
                />
                <span className="text-sm text-slate-200">{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-[#FBBF24]/45 bg-[#161B22] p-4 ring-1 ring-[#FBBF24]/15">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FBBF24]">
              Registro de seguridad (metadatos legales)
            </p>
            {(() => {
              const ack = formatPrlAcknowledged(project.prlAcknowledgedAt);
              if (!ack) {
                return (
                  <p className="mt-2 text-sm text-slate-400">
                    Sin constancia horaria con GPS: el operario aún no ha enviado la aceptación P.R.L. o la
                    sincronización está pendiente.
                  </p>
                );
              }
              return (
                <ul className="mt-3 space-y-2 text-sm text-slate-100">
                  <li>
                    <span className="text-slate-400">Fecha: </span>
                    <span className="font-medium capitalize">{ack.date}</span>
                  </li>
                  <li>
                    <span className="text-slate-400">Hora (servidor / dispositivo): </span>
                    <span className="font-mono font-medium">{ack.time}</span>
                  </li>
                  <li className="flex flex-wrap items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-[#FBBF24]" aria-hidden />
                    <span className="text-slate-400">GPS en aceptación: </span>
                    <span className="font-mono text-xs sm:text-sm">
                      {typeof project.prlAckLatitude === "number" &&
                      typeof project.prlAckLongitude === "number"
                        ? `${project.prlAckLatitude.toFixed(6)}, ${project.prlAckLongitude.toFixed(6)}`
                        : "—"}
                    </span>
                  </li>
                </ul>
              );
            })()}
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Cpu className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Mediciones eléctricas (campo)</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Voc (V)</span>
              <input
                name="electricVocVolts"
                defaultValue={project.electricVocVolts ?? ""}
                className={inputCls}
                inputMode="decimal"
                placeholder="Ej. 48.5"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Isc (A)</span>
              <input
                name="electricIscAmps"
                defaultValue={project.electricIscAmps ?? ""}
                className={inputCls}
                inputMode="decimal"
                placeholder="Ej. 12.3"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Tierra (Ω)</span>
              <input
                name="earthResistanceOhms"
                defaultValue={project.earthResistanceOhms ?? ""}
                className={inputCls}
                inputMode="decimal"
                placeholder="Ej. 0.85"
              />
            </label>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building2 className="h-4 w-4 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-100">Estructura y configuración de strings</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelCls}>Marca estructura</span>
              <input
                name="structureBrand"
                defaultValue={project.structureBrand ?? ""}
                className={inputCls}
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Tipo de montaje</span>
              <select
                name="structureMounting"
                defaultValue={project.structureMounting ?? ""}
                className={inputCls}
              >
                {STRUCTURE_OPTIONS.map((o) => (
                  <option key={o.value === "" ? "__mount-none" : o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Azimut (°)</span>
              <input
                name="panelAzimuthDegrees"
                defaultValue={project.panelAzimuthDegrees ?? ""}
                className={inputCls}
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Inclinación módulos (°)</span>
              <input
                name="panelTiltDegrees"
                defaultValue={project.panelTiltDegrees ?? ""}
                className={inputCls}
                inputMode="decimal"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelCls}>Configuración de strings</span>
              <Textarea
                name="stringConfiguration"
                defaultValue={project.stringConfiguration ?? ""}
                className="mt-2 min-h-[5rem] resize-y rounded-xl border border-slate-600/80 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                placeholder="Ej. 2 strings x 10 módulos…"
              />
            </label>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <ImagePlus className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Protocolo fotográfico y cierre</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["photoProtocolNameplates", "Placas de características", project.photoProtocolNameplates],
                [
                  "photoProtocolDistributionBoard",
                  "Cuadro / distribución",
                  project.photoProtocolDistributionBoard,
                ],
                ["photoProtocolFixings", "Fijaciones", project.photoProtocolFixings],
                [
                  "photoProtocolStructureEarthing",
                  "Puesta a tierra estructura",
                  project.photoProtocolStructureEarthing,
                ],
              ] as const
            ).map(([name, label, checked]) => (
              <label
                key={name}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/40 px-3 py-2"
              >
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={Boolean(checked)}
                  className="h-4 w-4 rounded border-slate-500 accent-emerald-500"
                />
                <span className="text-sm text-slate-200">{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelCls}>Carné profesional del instalador (texto)</span>
              <input
                name="installerProfessionalCard"
                defaultValue={project.installerProfessionalCard ?? ""}
                className={inputCls}
                maxLength={200}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 sm:col-span-2">
              <input
                type="checkbox"
                name="clientTrainingAcknowledged"
                defaultChecked={Boolean(project.clientTrainingAcknowledged)}
                className="h-4 w-4 rounded border-slate-500 accent-emerald-500"
              />
              <span className="text-sm font-medium text-slate-200">
                Formación / entrega al cliente reconocida
              </span>
            </label>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText className="h-4 w-4 text-orange-200" />
            <h3 className="text-sm font-bold text-slate-100">Notas de obra</h3>
          </div>
          <div className="grid gap-4">
            <label className="block">
              <span className={labelCls}>Garantías y observaciones</span>
              <Textarea
                name="warrantyNotes"
                defaultValue={project.warrantyNotes ?? ""}
                className="mt-2 min-h-[5rem] resize-y rounded-xl border border-slate-600/80 bg-slate-900/90 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Incidencias en instalación</span>
              <Textarea
                name="installationIncidentNotes"
                defaultValue={project.installationIncidentNotes ?? ""}
                className="mt-2 min-h-[5rem] resize-y rounded-xl border border-slate-600/80 bg-slate-900/90 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <ImagePlus className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">Anexo unifilar</h3>
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Sube aquí el esquema unifilar si el operario no lo ha aportado en campo. Se añadirá como
            evidencia <span className="font-mono text-slate-300">ESQUEMA_UNIFILAR</span> en el PDF.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1">
              <span className={labelCls}>Imagen (JPEG, PNG o WebP, máx. 5 MB)</span>
              <input
                ref={unifilarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-2 block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-500"
              />
            </label>
            <UnifilarUploadButton projectId={project.id} fileInputRef={unifilarFileRef} />
          </div>
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
          {(project.equipmentPanelItemsSummary ||
            project.equipmentInverterItemsSummary ||
            project.equipmentBatteryItemsSummary) && (
            <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-3">
              <p className={labelCls}>Inventario múltiple capturado en campo (JSON)</p>
              <p className="mt-2 text-[11px] text-slate-500">
                Referencia cruzada con el PDF; los campos editables arriba son la fila principal o valores
                derivados.
              </p>
              {project.equipmentPanelItemsSummary ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  <span className="font-semibold text-slate-400">Paneles: </span>
                  {project.equipmentPanelItemsSummary}
                </p>
              ) : null}
              {project.equipmentInverterItemsSummary ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  <span className="font-semibold text-slate-400">Inversores: </span>
                  {project.equipmentInverterItemsSummary}
                </p>
              ) : null}
              {project.equipmentBatteryItemsSummary ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  <span className="font-semibold text-slate-400">Baterías: </span>
                  {project.equipmentBatteryItemsSummary}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield className="h-4 w-4 text-violet-300" />
            <h3 className="text-sm font-bold text-slate-100">Protecciones (dossier / mediciones)</h3>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Corrige aquí si en PDF no coincidían con el inventario de batería: son campos distintos en base de
            datos.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Protección térmica — marca</span>
              <input
                name="thermalProtectionBrand"
                defaultValue={project.thermalProtectionBrand ?? ""}
                className={inputCls}
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Protección térmica — modelo</span>
              <input
                name="thermalProtectionModel"
                defaultValue={project.thermalProtectionModel ?? ""}
                className={inputCls}
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className={labelCls}>SPD — marca</span>
              <input name="spdBrand" defaultValue={project.spdBrand ?? ""} className={inputCls} maxLength={120} />
            </label>
            <label className="block">
              <span className={labelCls}>SPD — modelo</span>
              <input name="spdModel" defaultValue={project.spdModel ?? ""} className={inputCls} maxLength={120} />
            </label>
          </div>
        </div>

        <div className={sectionShell}>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Cpu className="h-4 w-4 text-yellow-300" />
            <h3 className="text-sm font-bold text-slate-100">Potencias declaradas (kWp / kWn / kWh)</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
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
            <label className="block">
              <span className={labelCls}>Eficiencia módulo (%)</span>
              <input
                name="moduleEfficiencyPercent"
                defaultValue={project.moduleEfficiencyPercent ?? ""}
                inputMode="decimal"
                className={inputCls}
              />
            </label>
          </div>
        </div>

        <OfficeSaveButton />
      </form>
    </div>
  );
}
