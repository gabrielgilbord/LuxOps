"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Camera, CheckCircle, Sun, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Html5Qrcode } from "html5-qrcode";
import { compressImageFile, fileToEvidenceDataUrl, useOfflineSync } from "@/hooks/use-offline-sync";
import {
  isSelfConsumptionModality,
  SELF_CONSUMPTION_MODALITY_LABEL,
  SELF_CONSUMPTION_MODALITY_VALUES,
} from "@/lib/self-consumption-modality";
import { getPendingOperationsByProject } from "@/lib/offline-db";
import { EquipmentCatalogAutocomplete } from "@/components/operario/equipment-catalog-autocomplete";

type Props = {
  projectId: string;
  /** Valores guardados por oficina (RD 244/2019 / REBT) para pre-rellenar en campo */
  serverLegalElectricHints?: {
    selfConsumptionModality?: string | null;
    cableDcSectionMm2?: string | null;
    cableAcSectionMm2?: string | null;
  };
  /** Nº REBT efectivo = proyecto (anulación) o organización */
  serverRebtContext?: {
    projectRebtCompanyNumber?: string | null;
    organizationRebtCompanyNumber?: string | null;
  };
};

const TOTAL_STEPS = 7;

const CABLE_SECTIONS_REBT_NOTE_UI =
  "Secciones calculadas para garantizar una caída de tensión inferior a los límites establecidos en la ITC-BT-19 e ITC-BT-07 del REBT.";

type PhotoPhase = "ANTES" | "DURANTE" | "DESPUES" | "ESQUEMA_UNIFILAR" | "ANEXO_PVGIS";
type EquipmentField = "vatimetroSerial";
type StructureMounting = "" | "COPLANAR" | "INCLINACION" | "LASTRADA";
type EquipmentItem = {
  brand: string;
  model: string;
  serial: string;
  peakWp: string;
  nominalKw: string;
  capacityKwh: string;
};
type ScanTarget =
  | { kind: "field"; field: EquipmentField }
  | { kind: "panel"; index: number }
  | { kind: "battery"; index: number }
  | { kind: "inverter"; index: number };

type DraftState = {
  version: number;
  step: number;
  checklist: boolean[];
  photoLists: Record<PhotoPhase, string[]>;
  traceability: {
    inverterSerial: string;
    batterySerial: string;
    inverterItems: EquipmentItem[];
    panelSerials: string[];
    batterySerials: string[];
    panelItems: EquipmentItem[];
    batteryItems: EquipmentItem[];
    vatimetroSerial: string;
    warrantyNotes: string;
    incidentNotes: string;
    structureBrand: string;
    structureMounting: StructureMounting;
    stringConfiguration: string;
    /** Valor enum RD 244 o "" */
    selfConsumptionModality: string;
    cableDcSectionMm2: string;
    cableAcSectionMm2: string;
    electricVoc: string;
    electricIsc: string;
    earthResistance: string;
    thermalProtectionBrand: string;
    thermalProtectionModel: string;
    spdBrand: string;
    spdModel: string;
    azimuthDegrees: string;
    panelTiltDegrees: string;
    photoProtocolNameplates: boolean;
    photoProtocolDistributionBoard: boolean;
    photoProtocolFixings: boolean;
    photoProtocolStructureEarthing: boolean;
  };
  installerCard: string;
  clientTrainingAck: boolean;
  prl: {
    lineLifeHarness: boolean;
    collectiveProtection: boolean;
    roofTransitOk: boolean;
    ppeInUse: boolean;
  };
  prlSubmitted: boolean;
};

function applyScanToTraceability(
  prev: DraftState["traceability"],
  target: ScanTarget,
  text: string,
): DraftState["traceability"] {
  const decodedText = text.trim();
  if (target.kind === "field") {
    return { ...prev, [target.field]: decodedText };
  }
  if (target.kind === "panel") {
    return {
      ...prev,
      panelItems: prev.panelItems.map((item, index) =>
        index === target.index ? { ...item, serial: decodedText } : item,
      ),
    };
  }
  if (target.kind === "inverter") {
    return {
      ...prev,
      inverterItems: prev.inverterItems.map((item, index) =>
        index === target.index ? { ...item, serial: decodedText } : item,
      ),
    };
  }
  return {
    ...prev,
    batteryItems: prev.batteryItems.map((item, index) =>
      index === target.index ? { ...item, serial: decodedText } : item,
    ),
  };
}

function cameraFriendlyError(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name: string }).name);
    if (name === "NotAllowedError") {
      return "Permiso de cámara denegado. Permite el acceso en Ajustes del navegador o del sistema y vuelve a intentarlo.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No se detectó ninguna cámara. Comprueba que el dispositivo tenga cámara o conecta una cámara USB.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "La cámara está en uso por otra aplicación. Ciérrala e inténtalo de nuevo.";
    }
    if (name === "OverconstrainedError") {
      return "No se pudo usar la cámara trasera. Prueba “Foto (código o texto)” o otro navegador.";
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("permission") || msg.includes("denied")) {
      return "Permiso de cámara denegado. Permite el acceso en ajustes y vuelve a intentarlo.";
    }
    return `No se pudo usar la cámara: ${error.message}`;
  }
  return "No se pudo abrir la cámara. Revisa permisos e inténtalo de nuevo.";
}

/** Elige el fragmento más plausible de un OCR para un S/N alfanumérico. */
function normalizeOcrSerial(raw: string): string {
  const flat = raw.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const tokens = flat
    .split(/[\s|]+/)
    .map((t) => t.replace(/[^A-Za-z0-9.\-_/]/g, ""))
    .filter((t) => t.length >= 4);
  if (tokens.length === 0) return "";
  return tokens.sort((a, b) => b.length - a.length)[0] ?? "";
}

const emptyLists = (): Record<PhotoPhase, string[]> => ({
  ANTES: [],
  DURANTE: [],
  DESPUES: [],
  ESQUEMA_UNIFILAR: [],
  ANEXO_PVGIS: [],
});

function migrateLegacySelfConsumptionModality(parsedTraceability: Record<string, unknown>): string {
  const direct = String(parsedTraceability.selfConsumptionModality ?? "").trim();
  if (isSelfConsumptionModality(direct)) return direct;
  const legacy = String(parsedTraceability.selfConsumptionMode ?? "").toLowerCase();
  if (legacy.includes("sin excedente")) return "SIN_EXCEDENTES";
  if (legacy.includes("no acogido")) return "CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION";
  if (legacy.trim()) return "CON_EXCEDENTES_ACOGIDO_COMPENSACION";
  return "";
}

function emptyEquipmentItem(): EquipmentItem {
  return { brand: "", model: "", serial: "", peakWp: "", nominalKw: "", capacityKwh: "" };
}

/** Placeholders cortos en pantallas estrechas (max-width: 639px). */
function compactFieldPlaceholders(narrow: boolean) {
  if (narrow) {
    return {
      brand: "Mca.",
      model: "Mod.",
      serial: "S/N",
      nominalKw: "kWn",
      peakWp: "Wp",
      capacityKwh: "kWh",
      structureBrand: "Mca. estruct.",
      thermalBrand: "Mca. térm.",
      thermalModel: "Mod. térm.",
      spdBrand: "Mca. SPD",
      spdModel: "Mod. SPD",
      vatimetro: "S/N",
      installerCard: "Nº carné",
      stringConfig: "Strings…",
    };
  }
  return {
    brand: "Marca",
    model: "Modelo",
    serial: "Nº Serie",
    nominalKw: "Pot. nominal (kW)",
    peakWp: "Pico unit. (W)",
    capacityKwh: "Capacidad (kWh)",
    structureBrand: "Marca estructura / fijaciones",
    thermalBrand: "Marca termicos / magnetotermicos",
    thermalModel: "Modelo termicos",
    spdBrand: "Marca proteccion sobretensiones (SPD)",
    spdModel: "Modelo SPD",
    vatimetro: "Escanear o escribir",
    installerCard: "Ej. carnet o registro profesional",
    stringConfig: "Ej: String 1: 10 paneles, String 2: 8 paneles...",
  };
}

function normalizeEquipmentItem(item: unknown): EquipmentItem {
  if (typeof item === "object" && item) {
    const r = item as Record<string, unknown>;
    return {
      brand: String(r.brand ?? ""),
      model: String(r.model ?? ""),
      serial: String(r.serial ?? ""),
      peakWp: String(r.peakWp ?? ""),
      nominalKw: String(r.nominalKw ?? ""),
      capacityKwh: String(r.capacityKwh ?? ""),
    };
  }
  return emptyEquipmentItem();
}

function getDraftKey(projectId: string) {
  return `luxops_draft_${projectId}`;
}

function readDraft(projectId: string): DraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getDraftKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftState> & Record<string, unknown>;
    if (!Array.isArray(parsed.checklist) || parsed.checklist.length !== 5) return null;

    const parsedTraceability = (parsed.traceability ?? {}) as Record<string, unknown>;
    const legacyPanelSerials = Array.isArray(parsedTraceability.panelSerials)
      ? parsedTraceability.panelSerials.map((serial) => String(serial ?? ""))
      : [""];
    const legacyBatterySerials = Array.isArray(parsedTraceability.batterySerials)
      ? parsedTraceability.batterySerials.map((serial) => String(serial ?? ""))
      : parsedTraceability.batterySerial
        ? [String(parsedTraceability.batterySerial)]
        : [""];
    const panelItems = Array.isArray(parsedTraceability.panelItems)
      ? parsedTraceability.panelItems
          .map((item) => (typeof item === "object" && item ? normalizeEquipmentItem(item) : null))
          .filter((item): item is EquipmentItem => item !== null)
      : legacyPanelSerials.map((serial) => ({ ...emptyEquipmentItem(), serial }));
    const batteryItems = Array.isArray(parsedTraceability.batteryItems)
      ? parsedTraceability.batteryItems
          .map((item) => (typeof item === "object" && item ? normalizeEquipmentItem(item) : null))
          .filter((item): item is EquipmentItem => item !== null)
      : legacyBatterySerials.map((serial) => ({ ...emptyEquipmentItem(), serial }));
    const legacyInverterSerial = String(parsedTraceability.inverterSerial ?? "");
    const inverterItemsParsed = Array.isArray(parsedTraceability.inverterItems)
      ? parsedTraceability.inverterItems
          .map((item) => (typeof item === "object" && item ? normalizeEquipmentItem(item) : null))
          .filter((item): item is EquipmentItem => item !== null)
      : legacyInverterSerial
        ? [{ ...emptyEquipmentItem(), serial: legacyInverterSerial }]
        : [emptyEquipmentItem()];
    const sm = String(parsedTraceability.structureMounting ?? "");
    const structureMounting: StructureMounting =
      sm === "COPLANAR" || sm === "INCLINACION" || sm === "LASTRADA" ? sm : "";
    const rawStep = typeof parsed.step === "number" ? parsed.step : 1;
    const migratedStep =
      (parsed.version === 2 ||
        parsed.version === 3 ||
        parsed.version === 4 ||
        parsed.version === 5 ||
        parsed.version === 6) &&
      rawStep >= 2
        ? Math.min(7, rawStep + 1)
        : rawStep;
    const legacyPrlSubmitted =
      (parsed.version === 2 ||
        parsed.version === 3 ||
        parsed.version === 4 ||
        parsed.version === 5 ||
        parsed.version === 6) &&
      rawStep >= 2;
    if (
      (parsed.version === 2 ||
        parsed.version === 3 ||
        parsed.version === 4 ||
        parsed.version === 5 ||
        parsed.version === 6 ||
        parsed.version === 7 ||
        parsed.version === 8 ||
        parsed.version === 9) &&
      parsed.photoLists &&
      parsed.traceability
    ) {
      const prlBox = (parsed as Record<string, unknown>).prl as Record<string, unknown> | undefined;
      const pl = parsed.photoLists as Record<string, unknown>;
      return {
        version: 9,
        step:
          parsed.version === 7 || parsed.version === 8 || parsed.version === 9
            ? rawStep
            : migratedStep,
        checklist: parsed.checklist as boolean[],
        photoLists: {
          ANTES: Array.isArray(pl.ANTES) ? pl.ANTES : [],
          DURANTE: Array.isArray(pl.DURANTE) ? pl.DURANTE : [],
          DESPUES: Array.isArray(pl.DESPUES) ? pl.DESPUES : [],
          ESQUEMA_UNIFILAR: Array.isArray(pl.ESQUEMA_UNIFILAR) ? pl.ESQUEMA_UNIFILAR : [],
          ANEXO_PVGIS: Array.isArray(pl.ANEXO_PVGIS) ? pl.ANEXO_PVGIS : [],
        },
        traceability: {
          inverterSerial: String(parsedTraceability.inverterSerial ?? ""),
          batterySerial: String(parsedTraceability.batterySerial ?? ""),
          panelSerials: legacyPanelSerials,
          batterySerials: legacyBatterySerials,
          panelItems: panelItems.length > 0 ? panelItems : [emptyEquipmentItem()],
          batteryItems: batteryItems.length > 0 ? batteryItems : [emptyEquipmentItem()],
          inverterItems:
            inverterItemsParsed.length > 0 ? inverterItemsParsed : [emptyEquipmentItem()],
          vatimetroSerial: String(parsedTraceability.vatimetroSerial ?? ""),
          warrantyNotes: String(parsedTraceability.warrantyNotes ?? ""),
          incidentNotes: String(parsedTraceability.incidentNotes ?? ""),
          structureBrand: String(parsedTraceability.structureBrand ?? ""),
          structureMounting,
          stringConfiguration: String(parsedTraceability.stringConfiguration ?? ""),
          selfConsumptionModality: migrateLegacySelfConsumptionModality(
            parsedTraceability as Record<string, unknown>,
          ),
          cableDcSectionMm2: String(parsedTraceability.cableDcSectionMm2 ?? ""),
          cableAcSectionMm2: String(parsedTraceability.cableAcSectionMm2 ?? ""),
          electricVoc: String(parsedTraceability.electricVoc ?? ""),
          electricIsc: String(parsedTraceability.electricIsc ?? ""),
          earthResistance: String(parsedTraceability.earthResistance ?? ""),
          thermalProtectionBrand: String(parsedTraceability.thermalProtectionBrand ?? ""),
          thermalProtectionModel: String(parsedTraceability.thermalProtectionModel ?? ""),
          spdBrand: String(parsedTraceability.spdBrand ?? ""),
          spdModel: String(parsedTraceability.spdModel ?? ""),
          azimuthDegrees: String(parsedTraceability.azimuthDegrees ?? ""),
          panelTiltDegrees: String(parsedTraceability.panelTiltDegrees ?? ""),
          photoProtocolNameplates: Boolean(parsedTraceability.photoProtocolNameplates),
          photoProtocolDistributionBoard: Boolean(parsedTraceability.photoProtocolDistributionBoard),
          photoProtocolFixings: Boolean(parsedTraceability.photoProtocolFixings),
          photoProtocolStructureEarthing: Boolean(parsedTraceability.photoProtocolStructureEarthing),
        },
        installerCard: String((parsed as Record<string, unknown>).installerCard ?? ""),
        clientTrainingAck: Boolean((parsed as Record<string, unknown>).clientTrainingAck),
        prl: {
          lineLifeHarness: Boolean(prlBox?.lineLifeHarness),
          collectiveProtection: Boolean(prlBox?.collectiveProtection),
          roofTransitOk: Boolean(prlBox?.roofTransitOk),
          ppeInUse: Boolean(prlBox?.ppeInUse),
        },
        prlSubmitted:
          Boolean((parsed as Record<string, unknown>).prlSubmitted) || legacyPrlSubmitted,
      };
    }

    // Migración desde borrador antiguo (una preview por fase)
    const legacy = parsed as {
      step?: number;
      checklist: boolean[];
      photoPreview?: Partial<Record<PhotoPhase, string>>;
      photosDone?: Partial<Record<PhotoPhase, boolean>>;
    };
    const lists = emptyLists();
    if (legacy.photoPreview?.ANTES) lists.ANTES = [legacy.photoPreview.ANTES];
    if (legacy.photoPreview?.DURANTE) lists.DURANTE = [legacy.photoPreview.DURANTE];
    if (legacy.photoPreview?.DESPUES) lists.DESPUES = [legacy.photoPreview.DESPUES];

    return {
      version: 9,
      step: typeof legacy.step === "number" ? legacy.step : 1,
      checklist: legacy.checklist,
      photoLists: lists,
      traceability: {
        inverterSerial: "",
        batterySerial: "",
        inverterItems: [emptyEquipmentItem()],
        panelSerials: [""],
        batterySerials: [""],
        panelItems: [emptyEquipmentItem()],
        batteryItems: [emptyEquipmentItem()],
        vatimetroSerial: "",
        warrantyNotes: "",
        incidentNotes: "",
        structureBrand: "",
        structureMounting: "",
        stringConfiguration: "",
        selfConsumptionModality: "",
        cableDcSectionMm2: "",
        cableAcSectionMm2: "",
        electricVoc: "",
        electricIsc: "",
        earthResistance: "",
        thermalProtectionBrand: "",
        thermalProtectionModel: "",
        spdBrand: "",
        spdModel: "",
        azimuthDegrees: "",
        panelTiltDegrees: "",
        photoProtocolNameplates: false,
        photoProtocolDistributionBoard: false,
        photoProtocolFixings: false,
        photoProtocolStructureEarthing: false,
      },
      installerCard: "",
      clientTrainingAck: false,
      prl: {
        lineLifeHarness: false,
        collectiveProtection: false,
        roofTransitOk: false,
        ppeInUse: false,
      },
      prlSubmitted: false,
    };
  } catch {
    return null;
  }
}

export function EjecucionObra({ projectId, serverLegalElectricHints, serverRebtContext }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sunMode, setSunMode] = useState(false);
  const [step, setStep] = useState(1);
  const [checklist, setChecklist] = useState([false, false, false, false, false]);
  const [photoLists, setPhotoLists] = useState<Record<PhotoPhase, string[]>>(emptyLists);
  const [traceability, setTraceability] = useState({
    inverterSerial: "",
    batterySerial: "",
    inverterItems: [emptyEquipmentItem()],
    panelSerials: [""],
    batterySerials: [""],
    panelItems: [emptyEquipmentItem()],
    batteryItems: [emptyEquipmentItem()],
    vatimetroSerial: "",
    warrantyNotes: "",
    incidentNotes: "",
    structureBrand: "",
    structureMounting: "" as StructureMounting,
    stringConfiguration: "",
    selfConsumptionModality: (() => {
      const h = serverLegalElectricHints?.selfConsumptionModality?.trim() ?? "";
      return isSelfConsumptionModality(h) ? h : "";
    })(),
    cableDcSectionMm2: serverLegalElectricHints?.cableDcSectionMm2?.trim() ?? "",
    cableAcSectionMm2: serverLegalElectricHints?.cableAcSectionMm2?.trim() ?? "",
    electricVoc: "",
    electricIsc: "",
    earthResistance: "",
    thermalProtectionBrand: "",
    thermalProtectionModel: "",
    spdBrand: "",
    spdModel: "",
    azimuthDegrees: "",
    panelTiltDegrees: "",
    photoProtocolNameplates: false,
    photoProtocolDistributionBoard: false,
    photoProtocolFixings: false,
    photoProtocolStructureEarthing: false,
  });
  const [installerCard, setInstallerCard] = useState("");
  const [clientTrainingAck, setClientTrainingAck] = useState(false);
  const [prl, setPrl] = useState({
    lineLifeHarness: false,
    collectiveProtection: false,
    roofTransitOk: false,
    ppeInUse: false,
  });
  const [prlSubmitted, setPrlSubmitted] = useState(false);
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanCameraPhase, setScanCameraPhase] = useState<"idle" | "starting" | "ready" | "error">(
    "idle",
  );
  const [scanPhotoBusy, setScanPhotoBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanTargetRef = useRef<ScanTarget | null>(null);
  const scanDecodeHandledRef = useRef(false);
  const scanPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const scanIds = useId().replace(/:/g, "");
  const liveScannerElementId = `luxops-live-${scanIds}`;
  const fileScannerElementId = `luxops-file-${scanIds}`;
  scanTargetRef.current = scanTarget;
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeNotice, setFinalizeNotice] = useState<string | null>(null);
  const [operarioToast, setOperarioToast] = useState<string | null>(null);
  const operarioToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [signatureSent, setSignatureSent] = useState(false);
  const installerSignatureRef = useRef<SignatureCanvas | null>(null);
  const clientSignatureRef = useRef<SignatureCanvas | null>(null);
  const hydratedRef = useRef(false);
  const { isOnline, isSyncing, notice, pendingCount, enqueue, syncPending, clearLocalQueue } =
    useOfflineSync(projectId);

  function showOperarioToast(message: string) {
    if (operarioToastTimerRef.current) clearTimeout(operarioToastTimerRef.current);
    setOperarioToast(message);
    operarioToastTimerRef.current = setTimeout(() => {
      setOperarioToast(null);
      operarioToastTimerRef.current = null;
    }, 7000);
  }

  const [compactFields, setCompactFields] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setCompactFields(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const ph = compactFieldPlaceholders(compactFields);

  const progress = useMemo(() => {
    const done = checklist.filter(Boolean).length;
    return Math.round((done / checklist.length) * 100);
  }, [checklist]);

  const checklistComplete = checklist.every(Boolean);
  const hasAntes = photoLists.ANTES.length > 0;
  const hasDurante = photoLists.DURANTE.length > 0;
  const hasDespues = photoLists.DESPUES.length > 0;
  const hasUnifilar = photoLists.ESQUEMA_UNIFILAR.length > 0;
  const photosComplete = hasAntes && hasDurante && hasDespues && hasUnifilar;
  const photoProtocolComplete =
    traceability.photoProtocolNameplates &&
    traceability.photoProtocolDistributionBoard &&
    traceability.photoProtocolFixings &&
    traceability.photoProtocolStructureEarthing;
  const prlComplete =
    prl.lineLifeHarness &&
    prl.collectiveProtection &&
    prl.roofTransitOk &&
    prl.ppeInUse;

  const effectiveRebtCompanyNumber = useMemo(() => {
    const p = (serverRebtContext?.projectRebtCompanyNumber ?? "").trim();
    const o = (serverRebtContext?.organizationRebtCompanyNumber ?? "").trim();
    return p || o;
  }, [serverRebtContext?.projectRebtCompanyNumber, serverRebtContext?.organizationRebtCompanyNumber]);

  const traceabilityForPdfReady =
    isSelfConsumptionModality(traceability.selfConsumptionModality) &&
    traceability.cableDcSectionMm2.trim().length > 0 &&
    traceability.cableAcSectionMm2.trim().length > 0 &&
    traceability.electricVoc.trim().length > 0 &&
    traceability.electricIsc.trim().length > 0 &&
    traceability.earthResistance.trim().length > 0;

  const canFinalizeSignature =
    prlSubmitted &&
    checklistComplete &&
    photosComplete &&
    photoProtocolComplete &&
    installerCard.trim().length > 0 &&
    clientTrainingAck &&
    effectiveRebtCompanyNumber.length >= 4;

  const canGoNext =
    step === 1
      ? prlComplete
      : step === 2
        ? hasAntes
        : step === 3
          ? checklistComplete
          : step === 4
            ? hasDurante && hasDespues && hasUnifilar && photoProtocolComplete
            : step === 5
              ? true
              : step === 6
                ? traceabilityForPdfReady
                : true;

  useEffect(() => {
    setMounted(true);
    const storedMode = localStorage.getItem("luxops_sun_mode");
    if (storedMode === "1") setSunMode(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("luxops_sun_mode", sunMode ? "1" : "0");
  }, [mounted, sunMode]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    let active = true;

    async function hydrateFromPendingOps() {
      const draft = readDraft(projectId);
      if (draft) {
        setStep(Math.min(TOTAL_STEPS, Math.max(1, draft.step)));
        setChecklist(draft.checklist);
        setPhotoLists(draft.photoLists);
        const dt = draft.traceability;
        setTraceability({
          ...dt,
          selfConsumptionModality: (() => {
            const d = (dt.selfConsumptionModality ?? "").trim();
            if (isSelfConsumptionModality(d)) return d;
            const h = serverLegalElectricHints?.selfConsumptionModality?.trim() ?? "";
            return isSelfConsumptionModality(h) ? h : "";
          })(),
          cableDcSectionMm2:
            (dt.cableDcSectionMm2 ?? "").trim() ||
            serverLegalElectricHints?.cableDcSectionMm2?.trim() ||
            "",
          cableAcSectionMm2:
            (dt.cableAcSectionMm2 ?? "").trim() ||
            serverLegalElectricHints?.cableAcSectionMm2?.trim() ||
            "",
        });
        setInstallerCard(draft.installerCard);
        setClientTrainingAck(draft.clientTrainingAck);
        setPrl(draft.prl);
        setPrlSubmitted(draft.prlSubmitted);
      }

      const operations = await getPendingOperationsByProject(projectId);
      if (!active || operations.length === 0) {
        setIsHydrated(true);
        return;
      }

      const baseChecklist = draft?.checklist ?? [false, false, false, false, false];
      const nextLists: Record<PhotoPhase, string[]> = {
        ANTES: [...(draft?.photoLists?.ANTES ?? [])],
        DURANTE: [...(draft?.photoLists?.DURANTE ?? [])],
        DESPUES: [...(draft?.photoLists?.DESPUES ?? [])],
        ESQUEMA_UNIFILAR: [...(draft?.photoLists?.ESQUEMA_UNIFILAR ?? [])],
        ANEXO_PVGIS: [...(draft?.photoLists?.ANEXO_PVGIS ?? [])],
      };
      let maxProgress = baseChecklist.filter(Boolean).length;

      for (const op of operations) {
        if (op.kind === "prlAck") {
          setPrl({
            lineLifeHarness: true,
            collectiveProtection: true,
            roofTransitOk: true,
            ppeInUse: true,
          });
          setPrlSubmitted(true);
        } else if (op.kind === "photo") {
          nextLists[op.tipo] = [...nextLists[op.tipo], op.imageDataUrl];
        } else if (op.kind === "checklist") {
          maxProgress = Math.max(maxProgress, Math.round((op.progreso / 100) * 5));
        } else if (op.kind === "traceability") {
          const opPanelSerials = Array.isArray(op.panelSerials) ? op.panelSerials : [];
          const opBatterySerials = Array.isArray(op.batterySerials) ? op.batterySerials : [];
          const opPanelItems = Array.isArray(op.panelItems) ? op.panelItems : [];
          const opBatteryItems = Array.isArray(op.batteryItems) ? op.batteryItems : [];
          const opInverterItems = Array.isArray(op.inverterItems) ? op.inverterItems : [];
          const opT = op as Record<string, unknown>;
          const smOp = String(opT.structureMounting ?? "");
          const structureMountingHydrate: StructureMounting =
            smOp === "COPLANAR" || smOp === "INCLINACION" || smOp === "LASTRADA" ? smOp : "";
          setTraceability({
            inverterSerial: op.inverterSerial,
            batterySerial: op.batterySerial,
            inverterItems:
              opInverterItems.length > 0
                ? opInverterItems.map((row) => normalizeEquipmentItem(row))
                : op.inverterSerial
                  ? [{ ...emptyEquipmentItem(), serial: op.inverterSerial }]
                  : [emptyEquipmentItem()],
            panelSerials: opPanelSerials.length > 0 ? opPanelSerials : [""],
            batterySerials:
              opBatterySerials.length > 0
                ? opBatterySerials
                : [op.batterySerial].filter(Boolean).length > 0
                  ? [op.batterySerial]
                  : [""],
            panelItems:
              opPanelItems.length > 0
                ? opPanelItems.map((row) => normalizeEquipmentItem(row))
                : (opPanelSerials.length > 0 ? opPanelSerials : [""]).map((serial) => ({
                    ...emptyEquipmentItem(),
                    serial,
                  })),
            batteryItems:
              opBatteryItems.length > 0
                ? opBatteryItems.map((row) => normalizeEquipmentItem(row))
                : (opBatterySerials.length > 0
                    ? opBatterySerials
                    : [op.batterySerial].filter(Boolean).length > 0
                      ? [op.batterySerial]
                      : [""]).map((serial) => ({ ...emptyEquipmentItem(), serial })),
            vatimetroSerial: op.vatimetroSerial,
            warrantyNotes: op.warrantyNotes,
            incidentNotes: op.incidentNotes ?? "",
            structureBrand: String(opT.structureBrand ?? ""),
            structureMounting: structureMountingHydrate,
            stringConfiguration: String(opT.stringConfiguration ?? ""),
            selfConsumptionModality: (() => {
              const op = String(opT.selfConsumptionModality ?? "").trim();
              if (isSelfConsumptionModality(op)) return op;
              const h = serverLegalElectricHints?.selfConsumptionModality?.trim() ?? "";
              return isSelfConsumptionModality(h) ? h : "";
            })(),
            cableDcSectionMm2: String(
              opT.cableDcSectionMm2 ?? serverLegalElectricHints?.cableDcSectionMm2 ?? "",
            ),
            cableAcSectionMm2: String(
              opT.cableAcSectionMm2 ?? serverLegalElectricHints?.cableAcSectionMm2 ?? "",
            ),
            electricVoc: String(opT.electricVoc ?? ""),
            electricIsc: String(opT.electricIsc ?? ""),
            earthResistance: String(opT.earthResistance ?? ""),
            thermalProtectionBrand: String(opT.thermalProtectionBrand ?? ""),
            thermalProtectionModel: String(opT.thermalProtectionModel ?? ""),
            spdBrand: String(opT.spdBrand ?? ""),
            spdModel: String(opT.spdModel ?? ""),
            azimuthDegrees: String(opT.azimuthDegrees ?? ""),
            panelTiltDegrees: String(opT.panelTiltDegrees ?? ""),
            photoProtocolNameplates: Boolean(opT.photoProtocolNameplates),
            photoProtocolDistributionBoard: Boolean(opT.photoProtocolDistributionBoard),
            photoProtocolFixings: Boolean(opT.photoProtocolFixings),
            photoProtocolStructureEarthing: Boolean(opT.photoProtocolStructureEarthing),
          });
        }
      }

      const nextChecklist = [...baseChecklist];
      for (let i = 0; i < Math.min(5, maxProgress); i += 1) {
        nextChecklist[i] = true;
      }

      setPhotoLists(nextLists);
      setChecklist(nextChecklist);

      setStep((current) => {
        const hA = nextLists.ANTES.length > 0;
        const hD = nextLists.DURANTE.length > 0;
        const hDe = nextLists.DESPUES.length > 0;
        const ch = nextChecklist.every(Boolean);
        let inferred = 1;
        if (hA) inferred = 2;
        if (hA && ch) inferred = 3;
        if (hA && ch && hD && hDe) inferred = 4;
        if (draft && typeof draft.step === "number" && draft.step > inferred) {
          inferred = Math.min(draft.step, 7);
        }
        return current < TOTAL_STEPS ? Math.max(current, inferred) : current;
      });

      setIsHydrated(true);
    }

    hydrateFromPendingOps();
    return () => {
      active = false;
    };
  }, [projectId, serverLegalElectricHints, serverRebtContext]);

  useEffect(() => {
    if (!isHydrated) return;
    const draft: DraftState = {
      version: 9,
      step,
      checklist,
      photoLists,
      traceability,
      installerCard,
      clientTrainingAck,
      prl,
      prlSubmitted,
    };
    localStorage.setItem(getDraftKey(projectId), JSON.stringify(draft));
  }, [
    isHydrated,
    step,
    checklist,
    photoLists,
    traceability,
    installerCard,
    clientTrainingAck,
    prl,
    prlSubmitted,
    projectId,
  ]);

  async function getCoords() {
    return new Promise<{ latitude?: number; longitude?: number }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async function uploadPhoto(file: File, tipo: PhotoPhase) {
    const imageDataUrl =
      tipo === "ANEXO_PVGIS" ? await fileToEvidenceDataUrl(file) : await compressImageFile(file);
    const coords = await getCoords();
    const isPvgisAnnex = tipo === "ANEXO_PVGIS";
    if (
      !isPvgisAnnex &&
      (typeof coords.latitude !== "number" || typeof coords.longitude !== "number")
    ) {
      showOperarioToast(
        "No se pudo obtener GPS. Activa la ubicación del dispositivo para registrar la evidencia.",
      );
      return;
    }
    await enqueue({
      kind: "photo",
      tipo,
      imageDataUrl,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    setPhotoLists((prev) => ({
      ...prev,
      [tipo]: [...prev[tipo], imageDataUrl],
    }));
  }

  async function toggleChecklist(i: number) {
    const next = [...checklist];
    next[i] = !next[i];
    setChecklist(next);
    const done = next.filter(Boolean).length;
    await enqueue({
      kind: "checklist",
      progreso: Math.round((done / next.length) * 100),
    });
  }

  async function stopLiveScannerInstance() {
    const cur = scannerRef.current;
    scannerRef.current = null;
    if (!cur) return;
    try {
      if (cur.isScanning) await cur.stop();
    } catch {
      /* ignore */
    }
    try {
      cur.clear();
    } catch {
      /* ignore */
    }
  }

  async function handleSerialPhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = scanTargetRef.current;
    if (!file || !target) return;
    setScanPhotoBusy(true);
    setScanError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ];
      const fileScanner = new Html5Qrcode(fileScannerElementId, {
        verbose: false,
        formatsToSupport,
        useBarCodeDetectorIfSupported: true,
      });
      let barcodeText = "";
      try {
        barcodeText = (await fileScanner.scanFile(file, false)).trim();
      } catch {
        barcodeText = "";
      }
      try {
        fileScanner.clear();
      } catch {
        /* ignore */
      }
      if (barcodeText) {
        if (scanTargetRef.current !== target) return;
        await stopLiveScannerInstance();
        try {
          navigator.vibrate?.(60);
        } catch {
          /* ignore */
        }
        setTraceability((prev) => applyScanToTraceability(prev, target, barcodeText));
        setScanTarget(null);
        return;
      }
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-_/ ",
      });
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      if (scanTargetRef.current !== target) return;
      const ocrSerial = normalizeOcrSerial(text);
      if (!ocrSerial) {
        setScanError(
          "No se detectó código ni texto claro. Usa más luz, encuadra el S/N o escríbelo a mano.",
        );
        return;
      }
      await stopLiveScannerInstance();
      try {
        navigator.vibrate?.(60);
      } catch {
        /* ignore */
      }
      setTraceability((prev) => applyScanToTraceability(prev, target, ocrSerial));
      setScanTarget(null);
    } catch (err) {
      setScanError(cameraFriendlyError(err));
    } finally {
      setScanPhotoBusy(false);
    }
  }

  function closeSerialScanModal() {
    setScanError(null);
    setScanCameraPhase("idle");
    setScanTarget(null);
  }

  useLayoutEffect(() => {
    if (!scanTarget) {
      setScanCameraPhase("idle");
      scanDecodeHandledRef.current = false;
      return;
    }

    scanDecodeHandledRef.current = false;
    setScanCameraPhase("starting");
    setScanError(null);

    let cancelled = false;

    const onDecodeSuccess = async (decodedText: string) => {
      if (scanDecodeHandledRef.current) return;
      const text = decodedText.trim();
      if (!text) return;
      const target = scanTargetRef.current;
      if (!target) return;
      scanDecodeHandledRef.current = true;
      const inst = scannerRef.current;
      scannerRef.current = null;
      try {
        if (inst?.isScanning) await inst.stop();
      } catch {
        /* ignore */
      }
      try {
        inst?.clear();
      } catch {
        /* ignore */
      }
      try {
        navigator.vibrate?.(60);
      } catch {
        /* ignore */
      }
      setTraceability((prev) => applyScanToTraceability(prev, target, text));
      setScanTarget(null);
    };

    async function startLiveScanner() {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) return;

      const el = document.getElementById(liveScannerElementId);
      if (!el) {
        setScanError("No se pudo preparar el visor de cámara.");
        setScanCameraPhase("error");
        return;
      }

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ];

        const scannerInstance = new Html5Qrcode(liveScannerElementId, {
          verbose: false,
          formatsToSupport,
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scannerInstance;

        await scannerInstance.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 8,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.max(140, Math.floor(minEdge * 0.72));
              return { width: size, height: size };
            },
          },
          onDecodeSuccess,
          () => {},
        );

        if (!cancelled) setScanCameraPhase("ready");
      } catch (error) {
        if (cancelled) return;
        setScanError(cameraFriendlyError(error));
        setScanCameraPhase("error");
      }
    }

    void startLiveScanner();

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) {
        if (current.isScanning) {
          current
            .stop()
            .catch(() => null)
            .finally(() => {
              try {
                current.clear();
              } catch {
                /* ignore */
              }
            });
        } else {
          try {
            current.clear();
          } catch {
            /* ignore */
          }
        }
      }
    };
  }, [scanTarget, liveScannerElementId]);

  async function saveTraceabilityAndContinue() {
    if (!isSelfConsumptionModality(traceability.selfConsumptionModality)) {
      setFinalizeNotice("Selecciona la modalidad de autoconsumo (RD 244/2019) antes de continuar.");
      return;
    }
    if (!traceability.cableDcSectionMm2.trim() || !traceability.cableAcSectionMm2.trim()) {
      setFinalizeNotice("Indica las secciones de cable DC y AC (mm²) para el dossier PDF.");
      return;
    }
    const missingCritical =
      !traceability.electricVoc.trim() || !traceability.electricIsc.trim() || !traceability.earthResistance.trim();
    if (missingCritical) {
      setFinalizeNotice("Datos obligatorios para el Boletín Eléctrico (REBT).");
      return;
    }

    const spec = (item: EquipmentItem) => ({
      ...(item.peakWp.trim() ? { peakWp: item.peakWp.trim() } : {}),
      ...(item.nominalKw.trim() ? { nominalKw: item.nominalKw.trim() } : {}),
      ...(item.capacityKwh.trim() ? { capacityKwh: item.capacityKwh.trim() } : {}),
    });
    const cleanInverterItems = traceability.inverterItems
      .map((item) => ({
        brand: item.brand.trim(),
        model: item.model.trim(),
        serial: item.serial.trim(),
        ...spec(item),
      }))
      .filter((item) => item.brand || item.model || item.serial);
    const cleanPanelItems = traceability.panelItems
      .map((item) => ({
        brand: item.brand.trim(),
        model: item.model.trim(),
        serial: item.serial.trim(),
        ...spec(item),
      }))
      .filter((item) => item.brand || item.model || item.serial);
    const cleanBatteryItems = traceability.batteryItems
      .map((item) => ({
        brand: item.brand.trim(),
        model: item.model.trim(),
        serial: item.serial.trim(),
        ...spec(item),
      }))
      .filter((item) => item.brand || item.model || item.serial);
    const cleanPanelSerials = cleanPanelItems.map((item) => item.serial).filter(Boolean);
    const cleanBatterySerials = cleanBatteryItems
      .map((item) => item.serial)
      .filter(Boolean);
    const cleanInverterSerials = cleanInverterItems.map((item) => item.serial).filter(Boolean);
    await enqueue({
      kind: "traceability",
      inverterSerial:
        cleanInverterSerials[0] ?? traceability.inverterSerial.trim(),
      batterySerial: traceability.batterySerial.trim() || cleanBatterySerials[0] || "",
      inverterItems: cleanInverterItems,
      panelSerials: cleanPanelSerials,
      batterySerials: cleanBatterySerials,
      panelItems: cleanPanelItems,
      batteryItems: cleanBatteryItems,
      vatimetroSerial: traceability.vatimetroSerial.trim(),
      warrantyNotes: traceability.warrantyNotes.trim(),
      incidentNotes: traceability.incidentNotes.trim(),
      structureBrand: traceability.structureBrand.trim(),
      structureMounting:
        traceability.structureMounting === "COPLANAR" ||
        traceability.structureMounting === "INCLINACION" ||
        traceability.structureMounting === "LASTRADA"
          ? traceability.structureMounting
          : undefined,
      stringConfiguration: traceability.stringConfiguration.trim(),
      selfConsumptionModality: isSelfConsumptionModality(traceability.selfConsumptionModality)
        ? traceability.selfConsumptionModality
        : undefined,
      cableDcSectionMm2: traceability.cableDcSectionMm2.trim() || undefined,
      cableAcSectionMm2: traceability.cableAcSectionMm2.trim() || undefined,
      electricVoc: traceability.electricVoc.trim() || undefined,
      electricIsc: traceability.electricIsc.trim() || undefined,
      earthResistance: traceability.earthResistance.trim() || undefined,
      thermalProtectionBrand: traceability.thermalProtectionBrand.trim() || undefined,
      thermalProtectionModel: traceability.thermalProtectionModel.trim() || undefined,
      spdBrand: traceability.spdBrand.trim() || undefined,
      spdModel: traceability.spdModel.trim() || undefined,
      azimuthDegrees: traceability.azimuthDegrees.trim() || undefined,
      panelTiltDegrees: traceability.panelTiltDegrees.trim() || undefined,
      photoProtocolNameplates: traceability.photoProtocolNameplates,
      photoProtocolDistributionBoard: traceability.photoProtocolDistributionBoard,
      photoProtocolFixings: traceability.photoProtocolFixings,
      photoProtocolStructureEarthing: traceability.photoProtocolStructureEarthing,
    });
    setStep(7);
  }

  async function saveSignature() {
    if (!installerSignatureRef.current || installerSignatureRef.current.isEmpty()) {
      setFinalizeNotice("Debes dibujar la firma del instalador para finalizar.");
      return;
    }
    if (!clientSignatureRef.current || clientSignatureRef.current.isEmpty()) {
      setFinalizeNotice("Debes dibujar la firma del cliente para finalizar.");
      return;
    }
    setIsFinalizing(true);
    setFinalizeNotice(null);
    const installerSignatureDataUrl = installerSignatureRef.current.toDataURL("image/png");
    const clientSignatureDataUrl = clientSignatureRef.current.toDataURL("image/png");
    const coords = await getCoords();
    if (typeof coords.latitude !== "number" || typeof coords.longitude !== "number") {
      setFinalizeNotice(
        "No se pudo obtener GPS para la firma. Activa la ubicación e inténtalo de nuevo.",
      );
      setIsFinalizing(false);
      return;
    }
    const signatureOpId = await enqueue({
      kind: "signature",
      installerSignatureDataUrl,
      clientSignatureDataUrl,
      latitude: coords.latitude,
      longitude: coords.longitude,
      installerProfessionalCard: installerCard.trim(),
      clientTrainingAcknowledged: true,
    });
    const result = await syncPending();
    const signatureRejected = result.rejected?.find((item) => item.id === signatureOpId);
    if (result.ok && result.successIds.includes(signatureOpId)) {
      localStorage.removeItem(getDraftKey(projectId));
      setSignatureSent(true);
      setFinalizeNotice("¡Informe generado y enviado a la oficina! Ya puedes cerrar esta ventana.");
    } else if (result.ok && signatureRejected) {
      setSignatureSent(false);
      setFinalizeNotice(`No se pudo guardar la firma: ${signatureRejected.reason}`);
    } else if (result.ok) {
      setSignatureSent(false);
      setFinalizeNotice(
        "Firma guardada localmente. Se sincronizará automáticamente al detectar conexión.",
      );
    } else {
      setSignatureSent(false);
      setFinalizeNotice(
        "Firma guardada localmente. Se sincronizará automáticamente al detectar conexión.",
      );
    }
    setIsFinalizing(false);
  }

  if (!mounted) {
    return (
      <section className="space-y-3">
        <p className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
          Cargando flujo de obra...
        </p>
      </section>
    );
  }

  const shellClass = sunMode ? "bg-neutral-100 text-neutral-950 antialiased" : "";
  const cardClass = sunMode
    ? "rounded-xl border-2 border-neutral-900 bg-white p-4 shadow-sm shadow-black/10"
    : "rounded-xl border border-white/20 bg-slate-900 p-4";
  const secondaryButtonClass = sunMode
    ? "min-h-16 rounded-xl border-2 border-neutral-900 bg-neutral-200 text-sm font-extrabold text-neutral-950 shadow-sm disabled:opacity-40"
    : "min-h-16 rounded-xl border border-white/25 bg-slate-800 text-sm font-bold disabled:opacity-40";
  const primaryButtonClass = sunMode
    ? "inline-flex min-h-16 w-full items-center justify-center rounded-xl border-2 border-neutral-950 bg-neutral-950 text-sm font-extrabold text-white shadow-lg shadow-black/25 ring-2 ring-neutral-900 disabled:pointer-events-none disabled:opacity-40"
    : "min-h-16 rounded-xl bg-yellow-400 text-sm font-extrabold text-yellow-950 disabled:pointer-events-none disabled:opacity-40";

  const labelCls = sunMode ? "text-neutral-900" : "text-slate-300";
  const inputCls = sunMode
    ? "mt-1 w-full rounded-lg border-2 border-neutral-800 bg-white px-3 py-2 text-sm font-medium text-neutral-950 outline-none ring-0 placeholder:text-neutral-600"
    : "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300/70";

  function PhotoPhaseBlock({
    title,
    tipo,
    helper,
    fileInputAccept = "image/*",
    useEnvironmentCapture = true,
    addButtonLabel,
  }: {
    title: string;
    tipo: PhotoPhase;
    helper: string;
    fileInputAccept?: string;
    useEnvironmentCapture?: boolean;
    addButtonLabel?: string;
  }) {
    const list = photoLists[tipo];
    const isPdfDataUrl = (src: string) =>
      /^data:application\/pdf/i.test(src) || src.includes("application/pdf");
    return (
      <div className="mt-4 space-y-2">
        <p className={`text-sm font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>{title}</p>
        <p className={`text-xs ${labelCls}`}>{helper}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((src, idx) => (
            <div
              key={`${tipo}-${idx}`}
              className={`overflow-hidden rounded-lg border-2 ${sunMode ? "border-neutral-800" : "border-white/10"}`}
            >
              {isPdfDataUrl(src) ? (
                <div
                  className={`flex min-h-28 flex-col justify-center gap-1 px-3 py-2 text-xs ${sunMode ? "bg-neutral-100 text-neutral-900" : "bg-slate-800 text-slate-200"}`}
                >
                  <span className="font-bold">PDF anexo {idx + 1}</span>
                  <a
                    href={src}
                    download={`anexo-pvgis-${idx + 1}.pdf`}
                    className={`font-semibold underline ${sunMode ? "text-neutral-950" : "text-yellow-200"}`}
                  >
                    Abrir / descargar
                  </a>
                </div>
              ) : (
                <Image
                  src={src}
                  alt={`${tipo} ${idx + 1}`}
                  width={400}
                  height={260}
                  unoptimized
                  className="h-28 w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label
            className={`inline-flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 px-4 text-sm font-extrabold shadow-md ${sunMode ? "border-neutral-950 bg-neutral-950 text-white ring-1 ring-neutral-900" : "border-transparent bg-yellow-400 text-yellow-950"}`}
          >
            <Camera className="mr-2 h-5 w-5" />
            {addButtonLabel ??
              (list.length === 0 ? `Anadir foto ${tipo}` : "Anadir otra foto")}
            <input
              type="file"
              accept={fileInputAccept}
              {...(useEnvironmentCapture ? { capture: "environment" as const } : {})}
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = e.target.files?.[0];
                if (file) await uploadPhoto(file, tipo);
                input.value = "";
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <section className={`w-full min-w-0 max-w-full space-y-4 ${shellClass}`}>
      {!isHydrated ? (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${sunMode ? "border-2 border-neutral-800 bg-white font-semibold text-neutral-950" : "border border-slate-700 bg-slate-900 text-slate-300"}`}
        >
          Recuperando progreso guardado...
        </p>
      ) : null}
      <div
        className={`flex items-center justify-between rounded-xl px-4 py-3 ${sunMode ? "border-2 border-neutral-900 bg-white shadow-sm" : "border border-white/20 bg-slate-900"}`}
      >
        <p className="text-sm font-semibold">
          Paso {step} de {TOTAL_STEPS}
        </p>
        <p
          className={`inline-flex items-center gap-1 text-xs font-bold ${
            isOnline ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {isOnline ? "Conectado" : "Sin cobertura"}
        </p>
        <p className={`text-xs font-semibold ${sunMode ? "text-neutral-800" : "text-slate-300"}`}>
          {isSyncing || pendingCount > 0 ? "Guardando..." : "Sincronizado"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setSunMode((v) => !v)}
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold ${sunMode ? "border-2 border-neutral-950 bg-neutral-950 text-white shadow-md" : "border border-yellow-300/40 bg-yellow-400/20 text-yellow-100"}`}
      >
        <Sun className="h-4 w-4" />
        {sunMode ? "Desactivar Modo Sol" : "Activar Modo Sol"}
      </button>

      {notice ? (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${sunMode ? "border-2 border-neutral-800 bg-amber-50 font-semibold text-neutral-950" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
        >
          {notice}
        </p>
      ) : null}

      {operarioToast ? (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-xs font-semibold shadow-md ${sunMode ? "border-2 border-red-700 bg-red-50 text-red-950" : "border border-red-400/50 bg-red-950/50 text-red-100"}`}
        >
          {operarioToast}
        </p>
      ) : null}

      {step === 1 ? (
        <div className={cardClass}>
          <h2 className={`text-lg font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
            Paso 1: Seguridad y Salud (PRL)
          </h2>
          <p className={`mt-1 text-xs ${labelCls}`}>
            Antes de subir al tejado debes validar el protocolo. Al continuar se registraran marca de
            tiempo y GPS como prueba documental para el dossier.
          </p>
          <div className="mt-3 space-y-2">
            {(
              [
                ["lineLifeHarness", "Linea de vida e integridad de arneses verificada."],
                ["collectiveProtection", "Protecciones colectivas/individuales operativas."],
                ["roofTransitOk", "Estado del tejado/soporte apto para el transito."],
                ["ppeInUse", "EPIS (Casco, guantes, calzado) en uso."],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3 py-3 text-sm font-semibold ${
                  prl[key]
                    ? sunMode
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                    : sunMode
                      ? "border-neutral-300 bg-white text-neutral-900"
                      : "border-white/20 bg-slate-800 text-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0"
                  checked={prl[key]}
                  onChange={() => setPrl((p) => ({ ...p, [key]: !p[key] }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className={cardClass}>
          <h2 className={`text-lg font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
            Paso 2: Evidencias ANTES
          </h2>
          <p className={`mt-1 text-xs ${labelCls}`}>
            Documenta el estado previo. Puedes anadir todas las fotos que necesites (industrial / gran
            escala).
          </p>
          <PhotoPhaseBlock
            title="Fotos fase ANTES"
            tipo="ANTES"
            helper="Minimo 1 foto. Usa &quot;Anadir otra foto&quot; para mas evidencias."
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className={cardClass}>
          <h2 className={`text-lg font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
            Paso 3: Checklist de seguridad
          </h2>
          <div className="mt-3 space-y-2">
            {[
              "EPI revisado",
              "Anclajes verificados",
              "Zona de trabajo segura",
              "Inversor correctamente fijado",
              "Cableado y protecciones verificados",
            ].map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleChecklist(i)}
                className={`flex min-h-20 w-full items-center justify-between rounded-xl border-2 px-4 text-left text-base font-extrabold ${
                  checklist[i]
                    ? sunMode
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-md"
                      : "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                    : sunMode
                      ? "border-neutral-700 bg-neutral-100 text-neutral-950"
                      : "border-white/25 bg-slate-800 text-white"
                }`}
              >
                <span>{t}</span>
                {checklist[i] ? <CheckCircle className="h-7 w-7" /> : null}
              </button>
            ))}
          </div>
          <p className={`mt-2 text-xs ${labelCls}`}>Progreso checklist: {progress}%</p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className={cardClass}>
          <h2 className={`text-lg font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
            Paso 4: Evidencias DURANTE, DESPUES y esquema unifilar
          </h2>
          <p className={`mt-1 text-xs ${labelCls}`}>
            Minimo 1 foto en DURANTE y 1 en DESPUES. Esquema unifilar obligatorio para CIE / REBT.
          </p>
          <PhotoPhaseBlock
            title="Durante la instalacion"
            tipo="DURANTE"
            helper="Panel, cableado, estructura, etc."
          />
          <PhotoPhaseBlock
            title="Despues / acabado"
            tipo="DESPUES"
            helper="Resultado final y detalles de cierre."
          />
          <PhotoPhaseBlock
            title="Esquema unifilar"
            tipo="ESQUEMA_UNIFILAR"
            helper="Saca una foto del esquema unifilar de la instalacion (obligatorio para el CIE)."
          />
          <PhotoPhaseBlock
            title="Anexo informe PVGIS (opcional)"
            tipo="ANEXO_PVGIS"
            helper="Si dispones del PDF o captura oficial del simulador PVGIS, adjúntalo aquí. Se incorporará al dossier como anexo. No requiere GPS."
            fileInputAccept="image/*,application/pdf,.pdf"
            useEnvironmentCapture={false}
            addButtonLabel={
              photoLists.ANEXO_PVGIS.length === 0
                ? "Añadir PDF o imagen PVGIS"
                : "Añadir otro anexo"
            }
          />
          <div className={`mt-4 space-y-2 rounded-xl border border-dashed p-3 ${sunMode ? "border-neutral-800 bg-neutral-50" : "border-slate-500/50"}`}>
            <p className={`text-sm font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
              Protocolo fotografico (checklist obligatorio)
            </p>
            <p className={`text-xs ${labelCls}`}>
              Confirma que has documentado con las fotos de las fases lo siguiente:
            </p>
            {(
              [
                ["photoProtocolNameplates", "Placas de caracteristicas (etiquetas de equipos)"],
                [
                  "photoProtocolDistributionBoard",
                  "Cuadro de protecciones (abierto: cableado / cerrado: etiquetado)",
                ],
                ["photoProtocolFixings", "Fijaciones y anclajes (estanqueidad)"],
                ["photoProtocolStructureEarthing", "Puesta a tierra de la estructura"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                  traceability[key]
                    ? sunMode
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                    : sunMode
                      ? "border-neutral-300 bg-white text-neutral-900"
                      : "border-white/20 bg-slate-800 text-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0"
                  checked={traceability[key]}
                  onChange={() =>
                    setTraceability((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className={cardClass}>
          <h2 className={`text-lg font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
            Paso 5: Materiales y garantías
          </h2>
          <p className={`mt-1 text-xs ${labelCls}`}>
            Trazabilidad de equipos críticos y notas que protejan a tu empresa. Marca y modelo tienen
            sugerencias compartidas (sin números de serie). Puedes escanear el lector (modo teclado)
            en cada campo de serie.
          </p>
          <div className="mt-3 grid gap-3">
            <div className="rounded-xl border border-dashed border-slate-500/50 p-3">
              <p className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                Inversores (uno por equipo)
              </p>
              <p className={`mt-1 hidden text-[11px] sm:block ${labelCls}`}>
                Marca, modelo y número de serie por inversor. Nuevo inversor hereda marca y modelo del
                primero.
              </p>
              <p className={`mt-1 text-[11px] sm:hidden ${labelCls}`}>
                Mca., Mod., S/N por inversor. El nuevo hereda Mca./Mod. del primero.
              </p>
              <div className="mt-2 space-y-3">
                {traceability.inverterItems.map((item, index) => (
                  <div
                    key={`inverter-${index}`}
                    className={`text-[11px] font-semibold ${sunMode ? "text-black" : "text-slate-300"}`}
                  >
                    <p>Inversor {index + 1}</p>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <EquipmentCatalogAutocomplete
                        category="INVERTER"
                        field="brand"
                        value={item.brand}
                        onChange={(v) =>
                          setTraceability((prev) => ({
                            ...prev,
                            inverterItems: prev.inverterItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, brand: v } : row,
                            ),
                          }))
                        }
                        placeholder={ph.brand}
                        inputClassName={`${inputCls} mt-0 min-w-0`}
                        sunMode={sunMode}
                      />
                      <EquipmentCatalogAutocomplete
                        category="INVERTER"
                        field="model"
                        brandFilter={item.brand}
                        value={item.model}
                        onChange={(v) =>
                          setTraceability((prev) => ({
                            ...prev,
                            inverterItems: prev.inverterItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, model: v } : row,
                            ),
                          }))
                        }
                        placeholder={ph.model}
                        inputClassName={`${inputCls} mt-0 min-w-0`}
                        sunMode={sunMode}
                      />
                      <input
                        className={`${inputCls} mt-0 min-w-0`}
                        inputMode="decimal"
                        value={item.nominalKw}
                        onChange={(e) =>
                          setTraceability((prev) => ({
                            ...prev,
                            inverterItems: prev.inverterItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, nominalKw: e.target.value } : row,
                            ),
                          }))
                        }
                        placeholder={ph.nominalKw}
                        autoComplete="off"
                      />
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          className={`${inputCls} mt-0 min-w-0 flex-1`}
                          value={item.serial}
                          onChange={(e) =>
                            setTraceability((prev) => ({
                              ...prev,
                              inverterItems: prev.inverterItems.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, serial: e.target.value } : row,
                              ),
                            }))
                          }
                          placeholder={ph.serial}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScanError(null);
                            setScanTarget({ kind: "inverter", index });
                          }}
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${sunMode ? "border-2 border-neutral-900 bg-neutral-900 text-white" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
                          aria-label={`Escanear serie inversor ${index + 1}`}
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`mt-2 inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-extrabold ${sunMode ? "border-2 border-neutral-900 bg-neutral-900 text-white" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
                onClick={() =>
                  setTraceability((prev) => ({
                    ...prev,
                    inverterItems: [
                      ...prev.inverterItems,
                      {
                        ...emptyEquipmentItem(),
                        brand: prev.inverterItems[0]?.brand ?? "",
                        model: prev.inverterItems[0]?.model ?? "",
                        nominalKw: prev.inverterItems[0]?.nominalKw ?? "",
                      },
                    ],
                  }))
                }
              >
                [+] Añadir inversor
              </button>
            </div>
            <div className="rounded-xl border border-dashed border-slate-500/50 p-3">
              <p className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                Paneles (uno por equipo)
              </p>
              <p className={`mt-1 hidden text-[11px] sm:block ${labelCls}`}>
                Añade un campo por cada panel instalado. Ideal para escáner de código de barras.
              </p>
              <p className={`mt-1 text-[11px] sm:hidden ${labelCls}`}>
                Un bloque por panel. S/N con escáner.
              </p>
              <div className="mt-2 space-y-2">
                {traceability.panelItems.map((item, index) => (
                  <div
                    key={`panel-${index}`}
                    className={`block text-[11px] font-semibold ${sunMode ? "text-black" : "text-slate-300"}`}
                  >
                    <p>Panel {index + 1}</p>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <EquipmentCatalogAutocomplete
                        category="PANEL"
                        field="brand"
                        value={item.brand}
                        onChange={(v) =>
                          setTraceability((prev) => ({
                            ...prev,
                            panelItems: prev.panelItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, brand: v } : row,
                            ),
                          }))
                        }
                        placeholder={ph.brand}
                        inputClassName={`${inputCls} mt-0 min-w-0`}
                        sunMode={sunMode}
                      />
                      <EquipmentCatalogAutocomplete
                        category="PANEL"
                        field="model"
                        brandFilter={item.brand}
                        value={item.model}
                        onChange={(v) =>
                          setTraceability((prev) => ({
                            ...prev,
                            panelItems: prev.panelItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, model: v } : row,
                            ),
                          }))
                        }
                        placeholder={ph.model}
                        inputClassName={`${inputCls} mt-0 min-w-0`}
                        sunMode={sunMode}
                      />
                      <input
                        className={`${inputCls} mt-0 min-w-0`}
                        inputMode="decimal"
                        value={item.peakWp}
                        onChange={(e) =>
                          setTraceability((prev) => ({
                            ...prev,
                            panelItems: prev.panelItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, peakWp: e.target.value } : row,
                            ),
                          }))
                        }
                        placeholder={ph.peakWp}
                        autoComplete="off"
                      />
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          className={`${inputCls} mt-0 min-w-0 flex-1`}
                          value={item.serial}
                          onChange={(e) =>
                            setTraceability((prev) => ({
                              ...prev,
                              panelItems: prev.panelItems.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, serial: e.target.value } : row,
                              ),
                            }))
                          }
                          placeholder={ph.serial}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScanError(null);
                            setScanTarget({ kind: "panel", index });
                          }}
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${sunMode ? "border-2 border-neutral-900 bg-neutral-900 text-white" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
                          aria-label={`Escanear serie panel ${index + 1}`}
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`mt-2 inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-extrabold ${sunMode ? "border-2 border-neutral-900 bg-neutral-900 text-white" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
                onClick={() =>
                  setTraceability((prev) => ({
                    ...prev,
                    panelItems: [
                      ...prev.panelItems,
                      {
                        ...emptyEquipmentItem(),
                        brand: prev.panelItems[0]?.brand ?? "",
                        model: prev.panelItems[0]?.model ?? "",
                        peakWp: prev.panelItems[0]?.peakWp ?? "",
                      },
                    ],
                  }))
                }
              >
                [+] Anadir Panel
              </button>
            </div>
            <div className="rounded-xl border border-dashed border-slate-500/50 p-3">
              <p className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                Baterias (una por equipo)
              </p>
              <div className="mt-2 space-y-2">
                {traceability.batteryItems.map((item, index) => (
                  <div
                    key={`battery-${index}`}
                    className={`block text-[11px] font-semibold ${sunMode ? "text-black" : "text-slate-300"}`}
                  >
                    <p>Bateria {index + 1}</p>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <EquipmentCatalogAutocomplete
                        category="BATTERY"
                        field="brand"
                        value={item.brand}
                        onChange={(v) =>
                          setTraceability((prev) => ({
                            ...prev,
                            batteryItems: prev.batteryItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, brand: v } : row,
                            ),
                          }))
                        }
                        placeholder={ph.brand}
                        inputClassName={`${inputCls} mt-0 min-w-0`}
                        sunMode={sunMode}
                      />
                      <EquipmentCatalogAutocomplete
                        category="BATTERY"
                        field="model"
                        brandFilter={item.brand}
                        value={item.model}
                        onChange={(v) =>
                          setTraceability((prev) => ({
                            ...prev,
                            batteryItems: prev.batteryItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, model: v } : row,
                            ),
                          }))
                        }
                        placeholder={ph.model}
                        inputClassName={`${inputCls} mt-0 min-w-0`}
                        sunMode={sunMode}
                      />
                      <input
                        className={`${inputCls} mt-0 min-w-0`}
                        inputMode="decimal"
                        value={item.capacityKwh}
                        onChange={(e) =>
                          setTraceability((prev) => ({
                            ...prev,
                            batteryItems: prev.batteryItems.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, capacityKwh: e.target.value } : row,
                            ),
                          }))
                        }
                        placeholder={ph.capacityKwh}
                        autoComplete="off"
                      />
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          className={`${inputCls} mt-0 min-w-0 flex-1`}
                          value={item.serial}
                          onChange={(e) =>
                            setTraceability((prev) => ({
                              ...prev,
                              batteryItems: prev.batteryItems.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, serial: e.target.value } : row,
                              ),
                            }))
                          }
                          placeholder={ph.serial}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScanError(null);
                            setScanTarget({ kind: "battery", index });
                          }}
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${sunMode ? "border-2 border-neutral-900 bg-neutral-900 text-white" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
                          aria-label={`Escanear serie batería ${index + 1}`}
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`mt-2 inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-extrabold ${sunMode ? "border-2 border-neutral-900 bg-neutral-900 text-white" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
                onClick={() =>
                  setTraceability((prev) => ({
                    ...prev,
                    batteryItems: [
                      ...prev.batteryItems,
                      {
                        ...emptyEquipmentItem(),
                        brand: prev.batteryItems[0]?.brand ?? "",
                        model: prev.batteryItems[0]?.model ?? "",
                        capacityKwh: prev.batteryItems[0]?.capacityKwh ?? "",
                      },
                    ],
                    batterySerial: prev.batterySerial || "",
                  }))
                }
              >
                [+] Anadir Bateria
              </button>
            </div>
            <div className="rounded-xl border border-dashed border-slate-500/50 p-3">
              <p className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                Estructura
              </p>
              <p className={`mt-1 hidden text-[11px] sm:block ${labelCls}`}>
                Marca del sistema de fijacion e inclinacion / coplanar segun montaje.
              </p>
              <p className={`mt-1 text-[11px] sm:hidden ${labelCls}`}>
                Mca. de fijaciones / montaje.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  className={`${inputCls} mt-0 min-w-0`}
                  value={traceability.structureBrand}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, structureBrand: e.target.value }))
                  }
                  placeholder={ph.structureBrand}
                  autoComplete="off"
                />
                <select
                  className={`${inputCls} mt-0 min-w-0`}
                  value={traceability.structureMounting}
                  onChange={(e) =>
                    setTraceability((t) => ({
                      ...t,
                      structureMounting: e.target.value as StructureMounting,
                    }))
                  }
                >
                  <option value="">Tipo montaje…</option>
                  <option value="COPLANAR">Coplanar</option>
                  <option value="INCLINACION">Inclinación</option>
                  <option value="LASTRADA">Lastrada</option>
                </select>
              </div>
            </div>
            <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
              <span className="max-sm:hidden">N. serie vatimetro / contador (si aplica)</span>
              <span className="sm:hidden">S/N vatímetro / contador</span>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <input
                  className={`${inputCls} mt-0 min-w-0 flex-1`}
                  value={traceability.vatimetroSerial}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, vatimetroSerial: e.target.value }))
                  }
                  placeholder={ph.vatimetro}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScanError(null);
                    setScanTarget({ kind: "field", field: "vatimetroSerial" });
                  }}
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${sunMode ? "border-2 border-neutral-900 bg-neutral-900 text-white" : "border border-yellow-300/40 bg-yellow-300/20 text-yellow-100"}`}
                  aria-label="Escanear número de serie de vatímetro"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>
            </label>
            <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
              Observaciones técnicas / notas de garantía
              <textarea
                className={`${inputCls} min-h-28`}
                value={traceability.warrantyNotes}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, warrantyNotes: e.target.value }))
                }
                placeholder="Sustituciones, condiciones especiales acordadas, garantías de fabricante…"
                rows={5}
              />
            </label>
            <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
              Incidencias detectadas en campo (opcional)
              <textarea
                className={`${inputCls} min-h-24`}
                value={traceability.incidentNotes}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, incidentNotes: e.target.value }))
                }
                placeholder="Ej.: tejas rotas antes del montaje, sombras no reflejadas en el estudio, humedades previas..."
                rows={4}
              />
            </label>
            <p className={`text-xs ${labelCls}`}>
              Lo que indiques aquí quedará como descargo documentado en el dossier PDF ante reclamaciones.
            </p>
          </div>
        </div>
      ) : null}

      {step === 6 ? (
        <div className={cardClass}>
            <h2 className={`text-lg font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
            Paso 6: Validación eléctrica
          </h2>
          <p className={`mt-1 text-xs ${labelCls}`}>
            Mediciones y disposición para memoria y legalización. Los datos se reflejan en el PDF de
            certificación técnica.
          </p>
          <div className="mt-3 grid gap-3">
            <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
              <span className="max-sm:hidden">Configuración de strings (texto libre)</span>
              <span className="sm:hidden">Strings (texto)</span>
              <textarea
                className={`${inputCls} min-h-24 font-mono text-xs`}
                value={traceability.stringConfiguration}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, stringConfiguration: e.target.value }))
                }
                placeholder={ph.stringConfig}
                rows={4}
              />
            </label>
            <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
              <span className="max-sm:hidden">Modalidad de autoconsumo (RD 244/2019)</span>
              <span className="sm:hidden">Modalidad autoconsumo</span>
              <select
                className={`${inputCls} mt-0`}
                value={traceability.selfConsumptionModality}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, selfConsumptionModality: e.target.value }))
                }
              >
                <option value="">Seleccionar…</option>
                {SELF_CONSUMPTION_MODALITY_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {SELF_CONSUMPTION_MODALITY_LABEL[v]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                Sección de cable DC (mm²)
                <input
                  className={`${inputCls} mt-0`}
                  inputMode="decimal"
                  value={traceability.cableDcSectionMm2}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, cableDcSectionMm2: e.target.value }))
                  }
                  placeholder="Ej.: 6"
                  autoComplete="off"
                />
              </label>
              <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                Sección de cable AC (mm²)
                <input
                  className={`${inputCls} mt-0`}
                  inputMode="decimal"
                  value={traceability.cableAcSectionMm2}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, cableAcSectionMm2: e.target.value }))
                  }
                  placeholder="Ej.: 10"
                  autoComplete="off"
                />
              </label>
            </div>
            <p className={`text-[11px] leading-snug ${labelCls}`}>{CABLE_SECTIONS_REBT_NOTE_UI}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                <span className="max-sm:hidden">Voc circuito abierto (V)</span>
                <span className="sm:hidden">Voc (V)</span>
                <input
                  className={`${inputCls} mt-0`}
                  inputMode="decimal"
                  value={traceability.electricVoc}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, electricVoc: e.target.value }))
                  }
                />
              </label>
              <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                <span className="max-sm:hidden">Isc cortocircuito (A)</span>
                <span className="sm:hidden">Isc (A)</span>
                <input
                  className={`${inputCls} mt-0`}
                  inputMode="decimal"
                  value={traceability.electricIsc}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, electricIsc: e.target.value }))
                  }
                />
              </label>
              <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                <span className="max-sm:hidden">Resistencia de tierra (ohm)</span>
                <span className="sm:hidden">R tierra (Ω)</span>
                <input
                  className={`${inputCls} mt-0`}
                  inputMode="decimal"
                  value={traceability.earthResistance}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, earthResistance: e.target.value }))
                  }
                />
              </label>
            </div>
            <p className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
              Protecciones
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={`${inputCls} mt-0`}
                value={traceability.thermalProtectionBrand}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, thermalProtectionBrand: e.target.value }))
                }
                placeholder={ph.thermalBrand}
              />
              <input
                className={`${inputCls} mt-0`}
                value={traceability.thermalProtectionModel}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, thermalProtectionModel: e.target.value }))
                }
                placeholder={ph.thermalModel}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={`${inputCls} mt-0`}
                value={traceability.spdBrand}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, spdBrand: e.target.value }))
                }
                placeholder={ph.spdBrand}
              />
              <input
                className={`${inputCls} mt-0`}
                value={traceability.spdModel}
                onChange={(e) =>
                  setTraceability((t) => ({ ...t, spdModel: e.target.value }))
                }
                placeholder={ph.spdModel}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                <span className="max-sm:hidden">Azimut real (grados)</span>
                <span className="sm:hidden">Azimut (°)</span>
                <input
                  className={`${inputCls} mt-0`}
                  inputMode="decimal"
                  value={traceability.azimuthDegrees}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, azimuthDegrees: e.target.value }))
                  }
                />
              </label>
              <label className={`text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
                <span className="max-sm:hidden">Inclinación real módulo (grados)</span>
                <span className="sm:hidden">Inclin. mód. (°)</span>
                <input
                  className={`${inputCls} mt-0`}
                  inputMode="decimal"
                  value={traceability.panelTiltDegrees}
                  onChange={(e) =>
                    setTraceability((t) => ({ ...t, panelTiltDegrees: e.target.value }))
                  }
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {step === 7 ? (
        <div className={cardClass}>
          <h2 className={`text-lg font-bold ${sunMode ? "text-neutral-950" : "text-white"}`}>
            Paso 7: Firma y cierre legal
          </h2>
          <label className={`mt-2 block text-xs font-semibold ${sunMode ? "text-black" : "text-slate-200"}`}>
            <span className="max-sm:hidden">
              Numero de carne profesional del instalador (RITE / cualificacion)
            </span>
            <span className="sm:hidden">Carné profesional instalador</span>
            <input
              className={`${inputCls} mt-1`}
              value={installerCard}
              onChange={(e) => setInstallerCard(e.target.value)}
              placeholder={ph.installerCard}
              autoComplete="off"
            />
          </label>
          <label className={`mt-3 flex cursor-pointer items-start gap-3 text-xs ${sunMode ? "text-neutral-900" : "text-slate-200"}`}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0"
              checked={clientTrainingAck}
              onChange={() => setClientTrainingAck((v) => !v)}
            />
            <span>
              El cliente confirma que ha recibido la formacion basica de uso de la planta, manuales de
              usuario y acceso a la plataforma de monitorizacion.
            </span>
          </label>
          <div className="mt-3 grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 w-full">
              <p className={`mb-2 text-xs font-extrabold ${sunMode ? "text-neutral-950" : "text-slate-200"}`}>
                Firma del instalador
              </p>
              <div
                className={`w-full min-w-0 overflow-hidden rounded-xl ${sunMode ? "border-2 border-neutral-900 bg-white" : "border border-white/20 bg-white"}`}
              >
                <SignatureCanvas
                  ref={(ref) => {
                    installerSignatureRef.current = ref;
                  }}
                  penColor="#000000"
                  minWidth={4}
                  maxWidth={4.5}
                  velocityFilterWeight={0.85}
                  canvasProps={{
                    className: "h-52 w-full min-h-[13rem] max-w-full touch-none bg-white sm:h-48",
                  }}
                />
              </div>
            </div>
            <div className="min-w-0 w-full">
              <p className={`mb-2 text-xs font-extrabold ${sunMode ? "text-neutral-950" : "text-slate-200"}`}>
                Firma del cliente
              </p>
              <div
                className={`w-full min-w-0 overflow-hidden rounded-xl ${sunMode ? "border-2 border-neutral-900 bg-white" : "border border-white/20 bg-white"}`}
              >
                <SignatureCanvas
                  ref={(ref) => {
                    clientSignatureRef.current = ref;
                  }}
                  penColor="#000000"
                  minWidth={4}
                  maxWidth={4.5}
                  velocityFilterWeight={0.85}
                  canvasProps={{
                    className: "h-52 w-full min-h-[13rem] max-w-full touch-none bg-white sm:h-48",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                installerSignatureRef.current?.clear();
                clientSignatureRef.current?.clear();
              }}
              className={secondaryButtonClass}
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={saveSignature}
              disabled={!canFinalizeSignature || isFinalizing}
              className={`${sunMode ? "inline-flex min-h-16 items-center justify-center rounded-xl border-2 border-neutral-950 bg-neutral-950 text-sm font-extrabold text-white shadow-lg ring-2 ring-neutral-900" : "min-h-16 rounded-xl bg-yellow-400 text-sm font-extrabold text-yellow-950"} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isFinalizing ? "Finalizando..." : "Finalizar obra y guardar firma"}
            </button>
          </div>
          {finalizeNotice ? (
            <p className={`mt-2 text-xs font-medium ${sunMode ? "text-neutral-900" : "text-emerald-200"}`}>
              {finalizeNotice}
            </p>
          ) : null}
          {!canFinalizeSignature ? (
            <p className={`mt-2 text-xs font-medium ${sunMode ? "text-neutral-800" : "text-yellow-200"}`}>
              Completa PRL, checklist, fotos, protocolo fotografico, datos de obra (pasos 5–6), carnet
              profesional y confirmacion de formacion antes de firmar.
              {effectiveRebtCompanyNumber.length < 4
                ? " Falta el Nº de empresa instaladora (REBT) en Ajustes de la organización o como anulación en el expediente (mín. 4 caracteres); sin él no se puede generar el dossier PDF defendible."
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={step <= 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className={secondaryButtonClass}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={step === TOTAL_STEPS ? !signatureSent : !canGoNext}
          onClick={async () => {
            if (step >= TOTAL_STEPS) {
              if (!signatureSent) return;
              router.push("/operario/dashboard");
              return;
            }
            if (step === 1) {
              if (!canGoNext) return;
              const coords = await getCoords();
              if (typeof coords.latitude !== "number" || typeof coords.longitude !== "number") {
                showOperarioToast(
                  "Activa la ubicación GPS para registrar el protocolo PRL en el informe.",
                );
                return;
              }
              await enqueue({
                kind: "prlAck",
                lineLifeHarness: true,
                collectiveProtection: true,
                roofTransitOk: true,
                ppeInUse: true,
                latitude: coords.latitude,
                longitude: coords.longitude,
              });
              setPrlSubmitted(true);
              setStep(2);
              return;
            }
            if (step === 5) {
              if (!canGoNext) return;
              setStep(6);
              return;
            }
            if (step === 6) {
              setFinalizeNotice(null);
              await saveTraceabilityAndContinue();
              return;
            }
            if (!canGoNext) return;
            if (step === 3) {
              await enqueue({
                kind: "checklist",
                progreso: Math.round((checklist.filter(Boolean).length / checklist.length) * 100),
              });
            }
            setStep((s) => Math.min(TOTAL_STEPS, s + 1));
          }}
          className={`${primaryButtonClass} disabled:pointer-events-none disabled:opacity-40`}
        >
          {step >= TOTAL_STEPS
            ? "Terminar"
            : step === 6
              ? "Continuar a firma"
              : step === 5
                ? "Continuar a validacion electrica"
                : "Siguiente"}
        </button>
      </div>
      {signatureSent ? (
        <button
          type="button"
          onClick={() => router.push("/operario/dashboard")}
          className={`min-h-14 w-full rounded-xl text-sm font-extrabold ${sunMode ? "border-2 border-neutral-950 bg-neutral-950 text-white shadow-md" : "border border-emerald-300/40 bg-emerald-500/15 text-emerald-200"}`}
        >
          Volver al Inicio
        </button>
      ) : null}

      <button
        type="button"
        onClick={syncPending}
        className={`min-h-16 w-full rounded-xl text-sm font-extrabold ${sunMode ? "border-2 border-neutral-900 bg-neutral-100 text-neutral-950 shadow-sm" : "border border-yellow-300/40 bg-yellow-400/20 text-yellow-100"}`}
      >
        {isSyncing ? "Sincronizando..." : "Forzar sincronizacion"}
      </button>
      <button
        type="button"
        onClick={clearLocalQueue}
        className={`min-h-12 w-full rounded-xl text-xs font-extrabold ${sunMode ? "border-2 border-neutral-800 bg-white text-neutral-900" : "border border-red-300/40 bg-red-400/15 text-red-200"}`}
      >
        Limpiar cache local de esta obra (debug)
      </button>
      {scanTarget ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-labelledby="luxops-scan-title"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p id="luxops-scan-title" className="text-sm font-bold text-white">
              Escanear número de serie
            </p>
            <button
              type="button"
              onClick={closeSerialScanModal}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold text-white"
            >
              Cancelar
            </button>
          </div>

          {scanError ? (
            <div className="mx-4 mb-2 shrink-0 rounded-lg border border-red-400/40 bg-red-950/90 px-3 py-2 text-xs text-red-100">
              {scanError}
            </div>
          ) : null}

          {scanCameraPhase === "starting" ? (
            <p className="absolute left-0 right-0 top-28 z-20 text-center text-sm text-white/90">
              Iniciando cámara…
            </p>
          ) : null}

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              id={liveScannerElementId}
              className="relative min-h-[55vh] w-full flex-1 bg-black [&_video]:h-full [&_video]:min-h-[50vh] [&_video]:w-full [&_video]:object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
              <div
                className="relative aspect-square w-[min(78vw,20rem)] rounded-md border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                aria-hidden
              />
            </div>
            <p className="pointer-events-none absolute bottom-28 left-0 right-0 px-6 text-center text-[11px] leading-snug text-white/85">
              Coloca el código de barras, QR o el texto del S/N dentro del recuadro
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/15 bg-black/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={scanPhotoBusy}
              onClick={() => scanPhotoInputRef.current?.click()}
              className="min-h-11 flex-1 rounded-lg border border-emerald-400/50 bg-emerald-600/30 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {scanPhotoBusy ? "Procesando…" : "Foto (código o texto)"}
            </button>
            <button
              type="button"
              disabled={scanPhotoBusy}
              onClick={closeSerialScanModal}
              className="min-h-11 rounded-lg border border-white/30 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          <div
            id={fileScannerElementId}
            className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
            aria-hidden
          />
          <input
            ref={scanPhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleSerialPhotoFileChange}
          />
        </div>
      ) : null}
      {scanError && !scanTarget ? (
        <p className={`text-xs ${sunMode ? "text-red-700" : "text-red-300"}`}>{scanError}</p>
      ) : null}
    </section>
  );
}
