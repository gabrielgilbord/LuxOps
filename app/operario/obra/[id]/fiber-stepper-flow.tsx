"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Camera, CheckCircle, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  fileToEvidenceDataUrl,
  useOfflineSync,
} from "@/hooks/use-offline-sync";
import { queueOperation } from "@/lib/offline-db";

const TOTAL_STEPS = 5;

type PhotoPhase = "ANTES" | "DURANTE" | "DESPUES";

type Props = {
  projectId: string;
  initialContractId?: string | null;
  initialFiberType?: string | null;
};

function makeId() {
  return crypto.randomUUID();
}

export function FiberEjecucionObra({
  projectId,
  initialContractId,
  initialFiberType,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [accessOk, setAccessOk] = useState(false);
  const [photos, setPhotos] = useState<Record<PhotoPhase, string[]>>({
    ANTES: [],
    DURANTE: [],
    DESPUES: [],
  });
  const [ontSerial, setOntSerial] = useState("");
  const [routerSerial, setRouterSerial] = useState("");
  const [dropLength, setDropLength] = useState("");
  const [contractId, setContractId] = useState(initialContractId ?? "");
  const [fiberType, setFiberType] = useState(initialFiberType ?? "FTTH");
  const [notes, setNotes] = useState("");
  const [installSaved, setInstallSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const clientSigRef = useRef<SignatureCanvas | null>(null);
  const installerSigRef = useRef<SignatureCanvas | null>(null);
  const { isOnline, isSyncing, pendingCount, syncPending, enqueue } =
    useOfflineSync(projectId);

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  const updateProgress = useCallback(
    async (progreso: number) => {
      await enqueue({
        kind: "checklist",
        progreso,
      });
    },
    [enqueue],
  );

  useEffect(() => {
    void updateProgress(progress);
  }, [progress, updateProgress]);

  async function capturePhoto(phase: PhotoPhase, file: File) {
    const dataUrl = await fileToEvidenceDataUrl(file);
    const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
      });
    }).catch(() => null);

    await enqueue({
      kind: "photo",
      tipo: phase,
      imageDataUrl: dataUrl,
      latitude: coords?.coords.latitude,
      longitude: coords?.coords.longitude,
    });
    setPhotos((prev) => ({ ...prev, [phase]: [...prev[phase], dataUrl] }));
  }

  async function saveInstallData() {
    if (!ontSerial.trim()) {
      setNotice("El serial de la ONT es obligatorio.");
      return;
    }
    await enqueue({
      kind: "fiberInstall",
      serviceContractId: contractId.trim() || undefined,
      fiberInstallationType: fiberType as "FTTH" | "FTTB" | "FTTO",
      ontSerial: ontSerial.trim(),
      routerSerial: routerSerial.trim(),
      fiberDropLengthMeters: dropLength.trim() || undefined,
      fiberInstallationNotes: notes.trim() || undefined,
    });
    setInstallSaved(true);
    setNotice(null);
    setStep(4);
  }

  async function finalizeObra() {
    const clientData = clientSigRef.current?.toDataURL("image/png");
    const installerData = installerSigRef.current?.toDataURL("image/png");
    if (!clientData || clientSigRef.current?.isEmpty()) {
      setNotice("Firma del cliente obligatoria.");
      return;
    }
    if (!installerData || installerSigRef.current?.isEmpty()) {
      setNotice("Firma del técnico obligatoria.");
      return;
    }
    const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
      });
    }).catch(() => null);
    if (!coords) {
      setNotice("Activa el GPS para cerrar la obra.");
      return;
    }

    await queueOperation({
      id: makeId(),
      kind: "fiberSignature",
      projectId,
      clientSignatureDataUrl: clientData,
      installerSignatureDataUrl: installerData,
      latitude: coords.coords.latitude,
      longitude: coords.coords.longitude,
      sync_pending: true,
      createdAt: new Date().toISOString(),
    });
    const result = await syncPending();
    if (!result.ok) {
      setNotice("Obra guardada localmente. Se sincronizará al recuperar conexión.");
      return;
    }
    router.push("/mobile-dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs">
        <span>
          Paso {step}/{TOTAL_STEPS} · {progress}%
        </span>
        <span className="inline-flex items-center gap-1 text-slate-400">
          {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
          {isSyncing ? "Sincronizando…" : pendingCount > 0 ? `${pendingCount} pendiente(s)` : "Al día"}
        </span>
      </div>

      {notice ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          {notice}
        </p>
      ) : null}

      {step === 1 ? (
        <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-4">
          <h2 className="font-bold text-cyan-200">1. Acceso y seguridad</h2>
          <p className="mt-2 text-sm text-slate-300">
            Confirma que tienes autorización de acceso al domicilio y EPI básicos.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accessOk}
              onChange={(e) => setAccessOk(e.target.checked)}
              className="mt-1 accent-cyan-400"
            />
            Acceso autorizado y condiciones de seguridad verificadas
          </label>
          <button
            type="button"
            disabled={!accessOk}
            onClick={() => setStep(2)}
            className="mt-4 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-cyan-950 disabled:opacity-40"
          >
            Continuar
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h2 className="font-bold">2. Fotos ANTES</h2>
          <p className="mt-1 text-sm text-slate-400">Punto de terminación, roseta o ubicación previa.</p>
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-8">
            <Camera className="h-8 w-8 text-cyan-300" />
            <span className="text-sm">Añadir foto ANTES</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void capturePhoto("ANTES", f);
              }}
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.ANTES.map((src, i) => (
              <Image key={i} src={src} alt="" width={120} height={90} className="rounded-lg object-cover" unoptimized />
            ))}
          </div>
          <button
            type="button"
            disabled={photos.ANTES.length === 0}
            onClick={() => setStep(3)}
            className="mt-4 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-cyan-950 disabled:opacity-40"
          >
            Continuar
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h2 className="font-bold">3. Equipos y trazabilidad</h2>
          <div className="mt-3 grid gap-2">
            <input
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Nº contrato"
              className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
            />
            <select
              value={fiberType}
              onChange={(e) => setFiberType(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              <option value="FTTH">FTTH</option>
              <option value="FTTB">FTTB</option>
              <option value="FTTO">FTTO</option>
            </select>
            <input
              value={ontSerial}
              onChange={(e) => setOntSerial(e.target.value)}
              placeholder="Serial ONT *"
              className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
            />
            <input
              value={routerSerial}
              onChange={(e) => setRouterSerial(e.target.value)}
              placeholder="Serial router (opcional)"
              className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
            />
            <input
              value={dropLength}
              onChange={(e) => setDropLength(e.target.value)}
              inputMode="decimal"
              placeholder="Metros de drop (opcional)"
              className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas de instalación"
              rows={3}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void saveInstallData()}
            className="mt-4 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-cyan-950"
          >
            {installSaved ? "Actualizar datos" : "Guardar y continuar"}
          </button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h2 className="font-bold">4. Fotos DESPUÉS</h2>
          <p className="mt-1 text-sm text-slate-400">ONT instalada, prueba de luz y acabado.</p>
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-8">
            <Camera className="h-8 w-8 text-cyan-300" />
            <span className="text-sm">Añadir foto DESPUÉS</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void capturePhoto("DESPUES", f);
              }}
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.DESPUES.map((src, i) => (
              <Image key={i} src={src} alt="" width={120} height={90} className="rounded-lg object-cover" unoptimized />
            ))}
          </div>
          <button
            type="button"
            disabled={photos.DESPUES.length === 0}
            onClick={() => setStep(5)}
            className="mt-4 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-cyan-950 disabled:opacity-40"
          >
            Continuar a firma
          </button>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h2 className="font-bold">5. Firma y cierre</h2>
          <p className="mt-1 text-sm text-slate-400">Doble firma para certificar la instalación.</p>
          <p className="mt-3 text-xs font-semibold text-slate-400">Cliente</p>
          <div className="mt-1 rounded-lg border border-slate-700 bg-white">
            <SignatureCanvas
              ref={clientSigRef}
              canvasProps={{ className: "h-28 w-full" }}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400">Técnico instalador</p>
          <div className="mt-1 rounded-lg border border-slate-700 bg-white">
            <SignatureCanvas
              ref={installerSigRef}
              canvasProps={{ className: "h-28 w-full" }}
            />
          </div>
          <button
            type="button"
            onClick={() => void finalizeObra()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-emerald-950"
          >
            <CheckCircle className="h-4 w-4" />
            Finalizar instalación
          </button>
        </section>
      ) : null}
    </div>
  );
}
