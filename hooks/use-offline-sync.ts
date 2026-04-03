"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearPendingOperations,
  getPendingOperations,
  removePendingOperationsById,
  queueOperation,
  type OfflineOperation,
  type OfflineOperationPayload,
} from "@/lib/offline-db";

export function useOfflineSync(projectId: string) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const operations = await getPendingOperations();
    setPendingCount(operations.length);
  }, []);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine) return { ok: false, successIds: [] as string[], rejected: [] as Array<{ id: string; reason: string }> };
    if (syncingRef.current) return { ok: false, successIds: [] as string[], rejected: [] as Array<{ id: string; reason: string }> };
    const operations = await getPendingOperations();
    setPendingCount(operations.length);
    if (operations.length === 0) return { ok: true, successIds: [] as string[], rejected: [] as Array<{ id: string; reason: string }> };

    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/offline/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          successIds?: string[];
          rejected?: Array<{ id: string; reason: string }>;
        };
        await removePendingOperationsById(data.successIds ?? []);
        await refreshPendingCount();
        if ((data.rejected?.length ?? 0) > 0) {
          setNotice(data.rejected?.[0]?.reason ?? "Algunas operaciones fueron rechazadas.");
        } else {
          setNotice((data.successIds?.length ?? 0) > 0 ? null : "Sin cambios pendientes válidos.");
        }
        return { ok: true, successIds: data.successIds ?? [], rejected: data.rejected ?? [] };
      } else {
        let message = "Error al sincronizar. Los datos siguen guardados y se reintentará.";
        try {
          const payload = (await res.json()) as { error?: string; detail?: string };
          if (payload.error) {
            message = payload.detail
              ? `${payload.error}: ${payload.detail}`
              : payload.error;
          }
        } catch {}
        setNotice(message);
        return { ok: false, successIds: [] as string[], rejected: [] as Array<{ id: string; reason: string }> };
      }
    } catch {
      setNotice("Error de red al sincronizar. Se reintentará automáticamente.");
      return { ok: false, successIds: [] as string[], rejected: [] as Array<{ id: string; reason: string }> };
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      await syncPending();
    };
    const onOffline = () => {
      setIsOnline(false);
      setNotice("Guardado localmente. Se subira al detectar conexion");
    };

    setIsOnline(navigator.onLine);
    refreshPendingCount();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncPending, refreshPendingCount]);

  const enqueue = useCallback(
    async (operation: OfflineOperationPayload) => {
      let fullOp: OfflineOperation;
      switch (operation.kind) {
        case "prlAck":
          fullOp = {
            id: crypto.randomUUID(),
            projectId,
            createdAt: new Date().toISOString(),
            sync_pending: true,
            kind: "prlAck",
            lineLifeHarness: operation.lineLifeHarness,
            collectiveProtection: operation.collectiveProtection,
            roofTransitOk: operation.roofTransitOk,
            ppeInUse: operation.ppeInUse,
            latitude: operation.latitude,
            longitude: operation.longitude,
          };
          break;
        case "photo":
          fullOp = {
            id: crypto.randomUUID(),
            projectId,
            createdAt: new Date().toISOString(),
            sync_pending: true,
            kind: "photo",
            tipo: operation.tipo,
            imageDataUrl: operation.imageDataUrl,
            latitude: operation.latitude,
            longitude: operation.longitude,
          };
          break;
        case "signature":
          fullOp = {
            id: crypto.randomUUID(),
            projectId,
            createdAt: new Date().toISOString(),
            sync_pending: true,
            kind: "signature",
            clientSignatureDataUrl: operation.clientSignatureDataUrl,
            installerSignatureDataUrl: operation.installerSignatureDataUrl,
            latitude: operation.latitude,
            longitude: operation.longitude,
            installerProfessionalCard: operation.installerProfessionalCard,
            clientTrainingAcknowledged: operation.clientTrainingAcknowledged,
          };
          break;
        case "traceability":
          fullOp = {
            id: crypto.randomUUID(),
            projectId,
            createdAt: new Date().toISOString(),
            sync_pending: true,
            kind: "traceability",
            inverterSerial: operation.inverterSerial,
            batterySerial: operation.batterySerial,
            inverterItems: operation.inverterItems,
            panelSerials: operation.panelSerials,
            batterySerials: operation.batterySerials,
            panelItems: operation.panelItems,
            batteryItems: operation.batteryItems,
            vatimetroSerial: operation.vatimetroSerial,
            warrantyNotes: operation.warrantyNotes,
            incidentNotes: operation.incidentNotes,
            structureBrand: operation.structureBrand,
            structureMounting: operation.structureMounting,
            stringConfiguration: operation.stringConfiguration,
            selfConsumptionModality: operation.selfConsumptionModality,
            cableDcSectionMm2: operation.cableDcSectionMm2,
            cableAcSectionMm2: operation.cableAcSectionMm2,
            electricVoc: operation.electricVoc,
            electricIsc: operation.electricIsc,
            earthResistance: operation.earthResistance,
            thermalProtectionBrand: operation.thermalProtectionBrand,
            thermalProtectionModel: operation.thermalProtectionModel,
            spdBrand: operation.spdBrand,
            spdModel: operation.spdModel,
            azimuthDegrees: operation.azimuthDegrees,
            panelTiltDegrees: operation.panelTiltDegrees,
            photoProtocolNameplates: operation.photoProtocolNameplates,
            photoProtocolDistributionBoard: operation.photoProtocolDistributionBoard,
            photoProtocolFixings: operation.photoProtocolFixings,
            photoProtocolStructureEarthing: operation.photoProtocolStructureEarthing,
          };
          break;
        case "checklist":
          fullOp = {
            id: crypto.randomUUID(),
            projectId,
            createdAt: new Date().toISOString(),
            sync_pending: true,
            kind: "checklist",
            progreso: operation.progreso,
          };
          break;
      }

      await queueOperation(fullOp);
      await refreshPendingCount();
      if (navigator.onLine) {
        try {
          await syncPending();
        } catch {
          setNotice("Guardado localmente por fallo de sincronización.");
        }
      } else {
        setNotice("Guardado localmente. Se subira al detectar conexion");
      }
      return fullOp.id;
    },
    [projectId, syncPending, refreshPendingCount],
  );

  const clearLocalQueue = useCallback(async () => {
    await clearPendingOperations();
    setPendingCount(0);
    setNotice("Caché local limpiada.");
  }, []);

  return {
    isOnline,
    isSyncing,
    notice,
    pendingCount,
    enqueue,
    syncPending,
    clearLocalQueue,
  };
}

export async function compressImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar compresion de imagen");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

/** Imagen comprimida o PDF en data URL (anexo PVGIS). */
export async function fileToEvidenceDataUrl(file: File): Promise<string> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer el PDF"));
      reader.readAsDataURL(file);
    });
  }
  return compressImageFile(file);
}
