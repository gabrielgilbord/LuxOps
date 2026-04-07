"use client";

import { openDB } from "idb";

export type EquipmentItemDraft = {
  brand: string;
  model: string;
  serial: string;
  /** Potencia pico unitaria W (paneles) */
  peakWp?: string;
  /** Potencia nominal kW (inversores) */
  nominalKw?: string;
  /** Capacidad útil kWh (baterías) */
  capacityKwh?: string;
};

export type OfflineOperation =
  | {
      id: string;
      kind: "prlAck";
      projectId: string;
      lineLifeHarness: true;
      collectiveProtection: true;
      roofTransitOk: true;
      ppeInUse: true;
      latitude: number;
      longitude: number;
      sync_pending: true;
      createdAt: string;
    }
  | {
      id: string;
      kind: "photo";
      projectId: string;
      tipo: "ANTES" | "DURANTE" | "DESPUES" | "ESQUEMA_UNIFILAR" | "ANEXO_PVGIS";
      imageDataUrl: string;
      latitude?: number;
      longitude?: number;
      sync_pending: true;
      createdAt: string;
    }
  | {
      id: string;
      kind: "signature";
      projectId: string;
      clientSignatureDataUrl: string;
      installerSignatureDataUrl: string;
      latitude?: number;
      longitude?: number;
      installerProfessionalCard: string;
      clientTrainingAcknowledged: true;
      sync_pending: true;
      createdAt: string;
    }
  | {
      id: string;
      kind: "checklist";
      projectId: string;
      progreso: number;
      sync_pending: true;
      createdAt: string;
    }
  | {
      id: string;
      kind: "traceability";
      projectId: string;
      inverterSerial: string;
      batterySerial: string;
      /** Nº boletín / CIE (subvenciones) */
      nBoletin?: string;
      /** Fecha emisión CIE (YYYY-MM-DD o ISO) */
      fechaCIE?: string;
      /** Presupuesto final (EUR, texto numérico) */
      presupuestoFinal?: string;
      /** Opcional en colas antiguas antes de multi-inversor */
      inverterItems?: EquipmentItemDraft[];
      panelSerials: string[];
      batterySerials: string[];
      panelItems: EquipmentItemDraft[];
      batteryItems: EquipmentItemDraft[];
      vatimetroSerial: string;
      warrantyNotes: string;
      incidentNotes: string;
      structureBrand?: string;
      structureMounting?: "" | "COPLANAR" | "INCLINACION" | "LASTRADA";
      stringConfiguration?: string;
      selfConsumptionModality?:
        | "SIN_EXCEDENTES"
        | "CON_EXCEDENTES_ACOGIDO_COMPENSACION"
        | "CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION";
      cableDcSectionMm2?: string;
      cableAcSectionMm2?: string;
      electricVoc?: string;
      electricIsc?: string;
      earthResistance?: string;
      thermalProtectionBrand?: string;
      thermalProtectionModel?: string;
      spdBrand?: string;
      spdModel?: string;
      azimuthDegrees?: string;
      panelTiltDegrees?: string;
      photoProtocolNameplates?: boolean;
      photoProtocolDistributionBoard?: boolean;
      photoProtocolFixings?: boolean;
      photoProtocolStructureEarthing?: boolean;
      sync_pending: true;
      createdAt: string;
    };

/** Payload para encolar (sin id, proyecto, timestamps ni flag de sync). */
export type OfflineOperationPayload =
  | {
      kind: "prlAck";
      lineLifeHarness: true;
      collectiveProtection: true;
      roofTransitOk: true;
      ppeInUse: true;
      latitude: number;
      longitude: number;
    }
  | {
      kind: "photo";
      tipo: "ANTES" | "DURANTE" | "DESPUES" | "ESQUEMA_UNIFILAR" | "ANEXO_PVGIS";
      imageDataUrl: string;
      latitude?: number;
      longitude?: number;
    }
  | {
      kind: "signature";
      clientSignatureDataUrl: string;
      installerSignatureDataUrl: string;
      latitude?: number;
      longitude?: number;
      installerProfessionalCard: string;
      clientTrainingAcknowledged: true;
    }
  | {
      kind: "checklist";
      progreso: number;
    }
  | {
      kind: "traceability";
      inverterSerial: string;
      batterySerial: string;
      nBoletin?: string;
      fechaCIE?: string;
      presupuestoFinal?: string;
      /** Opcional en colas antiguas antes de multi-inversor */
      inverterItems?: EquipmentItemDraft[];
      panelSerials: string[];
      batterySerials: string[];
      panelItems: EquipmentItemDraft[];
      batteryItems: EquipmentItemDraft[];
      vatimetroSerial: string;
      warrantyNotes: string;
      incidentNotes: string;
      structureBrand?: string;
      structureMounting?: "" | "COPLANAR" | "INCLINACION" | "LASTRADA";
      stringConfiguration?: string;
      selfConsumptionModality?:
        | "SIN_EXCEDENTES"
        | "CON_EXCEDENTES_ACOGIDO_COMPENSACION"
        | "CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION";
      cableDcSectionMm2?: string;
      cableAcSectionMm2?: string;
      electricVoc?: string;
      electricIsc?: string;
      earthResistance?: string;
      thermalProtectionBrand?: string;
      thermalProtectionModel?: string;
      spdBrand?: string;
      spdModel?: string;
      azimuthDegrees?: string;
      panelTiltDegrees?: string;
      photoProtocolNameplates?: boolean;
      photoProtocolDistributionBoard?: boolean;
      photoProtocolFixings?: boolean;
      photoProtocolStructureEarthing?: boolean;
    };

const DB_NAME = "luxops-offline-db";
const STORE_NAME = "operations";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
}

export async function queueOperation(operation: OfflineOperation) {
  const db = await getDb();
  await db.put(STORE_NAME, operation);
}

export async function getPendingOperations(): Promise<OfflineOperation[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function getPendingOperationsByProject(
  projectId: string,
): Promise<OfflineOperation[]> {
  const all = await getPendingOperations();
  return all.filter((op) => op.projectId === projectId);
}

export async function clearPendingOperations() {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function removePendingOperationsById(ids: string[]) {
  if (ids.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}
