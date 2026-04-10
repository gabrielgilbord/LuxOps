import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  enqueueInstallationCompletedWhatsapp,
  processPendingNotifications,
} from "@/lib/notifications";
import { uploadDataUrlToStorage } from "@/lib/storage";
import { sendProjectFinishedEmail } from "@/lib/email";
import { recordCatalogFromTraceabilityItems } from "@/lib/equipment-catalog";

const baseSchema = z.object({
  id: z.string().min(8),
  projectId: z.string().min(8),
  createdAt: z.string().datetime().or(z.string().min(10)),
});

const prlAckSchema = baseSchema.extend({
  kind: z.literal("prlAck"),
  lineLifeHarness: z.literal(true),
  collectiveProtection: z.literal(true),
  roofTransitOk: z.literal(true),
  ppeInUse: z.literal(true),
  latitude: z.number(),
  longitude: z.number(),
});

const photoSchema = baseSchema.extend({
  kind: z.literal("photo"),
  tipo: z.enum(["ANTES", "DURANTE", "DESPUES", "ESQUEMA_UNIFILAR", "ANEXO_PVGIS"]),
  imageDataUrl: z.string().min(40),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const signatureSchema = baseSchema.extend({
  kind: z.literal("signature"),
  clientSignatureDataUrl: z.string().startsWith("data:image/"),
  installerSignatureDataUrl: z.string().startsWith("data:image/"),
  latitude: z.number(),
  longitude: z.number(),
  installerProfessionalCard: z.string().trim().min(1).max(64),
  clientTrainingAcknowledged: z.literal(true),
});

const checklistSchema = baseSchema.extend({
  kind: z.literal("checklist"),
  progreso: z.number().min(0).max(100),
});

const traceabilitySchema = baseSchema.extend({
  kind: z.literal("traceability"),
  inverterSerial: z.string().max(120),
  batterySerial: z.string().max(120),
  nBoletin: z.string().trim().max(64).optional(),
  /** YYYY-MM-DD o ISO (se parsea en servidor) */
  fechaCIE: z.string().trim().max(32).optional(),
  /** Número con hasta 2 decimales, como texto */
  presupuestoFinal: z.string().trim().max(32).optional(),
  panelSerials: z.array(z.string().trim().max(120)).max(400).optional(),
  batterySerials: z.array(z.string().trim().max(120)).max(100).optional(),
  panelItems: z
    .array(
      z.object({
        brand: z.string().trim().max(120),
        model: z.string().trim().max(120),
        serial: z.string().trim().max(120),
        peakWp: z.string().trim().max(32).optional(),
        nominalKw: z.string().trim().max(32).optional(),
        capacityKwh: z.string().trim().max(32).optional(),
      }),
    )
    .max(400)
    .optional(),
  batteryItems: z
    .array(
      z.object({
        brand: z.string().trim().max(120),
        model: z.string().trim().max(120),
        serial: z.string().trim().max(120),
        peakWp: z.string().trim().max(32).optional(),
        nominalKw: z.string().trim().max(32).optional(),
        capacityKwh: z.string().trim().max(32).optional(),
      }),
    )
    .max(100)
    .optional(),
  inverterItems: z
    .array(
      z.object({
        brand: z.string().trim().max(120),
        model: z.string().trim().max(120),
        serial: z.string().trim().max(120),
        peakWp: z.string().trim().max(32).optional(),
        nominalKw: z.string().trim().max(32).optional(),
        capacityKwh: z.string().trim().max(32).optional(),
      }),
    )
    .max(50)
    .optional(),
  vatimetroSerial: z.string().max(120),
  warrantyNotes: z.string().max(8000),
  incidentNotes: z.string().max(4000).optional(),
  structureBrand: z.string().trim().max(120).optional(),
  structureMounting: z.enum(["COPLANAR", "INCLINACION", "LASTRADA"]).optional(),
  stringConfiguration: z.string().max(8000).optional(),
  selfConsumptionModality: z
    .enum([
      "SIN_EXCEDENTES",
      "CON_EXCEDENTES_ACOGIDO_COMPENSACION",
      "CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION",
    ])
    .optional(),
  cableDcSectionMm2: z.string().max(32).optional(),
  cableAcSectionMm2: z.string().max(32).optional(),
  electricVoc: z.string().max(32).optional(),
  electricIsc: z.string().max(32).optional(),
  earthResistance: z.string().max(32).optional(),
  thermalProtectionBrand: z.string().max(120).optional(),
  thermalProtectionModel: z.string().max(120).optional(),
  spdBrand: z.string().max(120).optional(),
  spdModel: z.string().max(120).optional(),
  azimuthDegrees: z.string().max(32).optional(),
  panelTiltDegrees: z.string().max(32).optional(),
  photoProtocolNameplates: z.boolean().optional(),
  photoProtocolDistributionBoard: z.boolean().optional(),
  photoProtocolFixings: z.boolean().optional(),
  photoProtocolStructureEarthing: z.boolean().optional(),
});

const syncPayloadSchema = z.object({
  operations: z.array(
    z.discriminatedUnion("kind", [
      prlAckSchema,
      photoSchema,
      signatureSchema,
      checklistSchema,
      traceabilitySchema,
    ]),
  ),
});

function operationPriority(kind: string) {
  if (kind === "prlAck") return 0;
  if (kind === "photo") return 1;
  if (kind === "checklist") return 2;
  if (kind === "traceability") return 3;
  return 4;
}

function toPrismaDecimal(raw: string | undefined): Prisma.Decimal | null {
  if (!raw?.trim()) return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(n);
}

function toOptionalDate(raw: string | undefined): Date | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  // Acepta YYYY-MM-DD (input date) o ISO.
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseDataUrlMeta(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const payload = dataUrl.slice(match[0].length);
  const sizeBytes = Math.floor((payload.length * 3) / 4);
  return { mime, sizeBytes };
}

function parseMediaDataUrlMeta(dataUrl: string) {
  const match = /^data:([^;]+);base64,/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase().trim();
  const payload = dataUrl.slice(match[0].length);
  const sizeBytes = Math.floor((payload.length * 3) / 4);
  return { mime, sizeBytes };
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true, organizationId: true, role: true, name: true, email: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Usuario sin organizacion" }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: dbUser.organizationId },
      select: { isSubscribed: true, subscriptionStatus: true },
    });
    const hasAccess =
      organization?.isSubscribed &&
      ["active", "trialing"].includes(organization.subscriptionStatus ?? "active");
    if (!hasAccess) {
      return NextResponse.json({ error: "Suscripcion inactiva" }, { status: 402 });
    }

    const payload = syncPayloadSchema.parse(await request.json());
    const operations = [...payload.operations].sort((a, b) => {
      const byTime = a.createdAt.localeCompare(b.createdAt);
      if (byTime !== 0) return byTime;
      return operationPriority(a.kind) - operationPriority(b.kind);
    });
    const successIds: string[] = [];
    const rejected: Array<{ id: string; reason: string }> = [];
    for (const operation of operations) {
      const project = await prisma.project.findFirst({
        where: {
          id: operation.projectId,
          organizationId: dbUser.organizationId,
          ...(dbUser.role === "OPERARIO" ? { assignedUserId: dbUser.id } : {}),
        },
        select: { id: true, cliente: true },
      });

      if (!project) {
        rejected.push({ id: operation.id, reason: "Proyecto no encontrado o sin permisos" });
        continue;
      }

      const alreadyProcessed = await prisma.syncEvent.findUnique({
        where: { id: operation.id },
        select: { id: true },
      });
      if (alreadyProcessed) {
        successIds.push(operation.id);
        continue;
      }

      if (operation.kind === "photo") {
        const meta = parseMediaDataUrlMeta(operation.imageDataUrl);
        if (!meta) {
          rejected.push({ id: operation.id, reason: "Formato de archivo inválido" });
          continue;
        }
        const operationCreatedAt = (() => {
          const d = new Date(operation.createdAt);
          return Number.isFinite(d.getTime()) ? d : new Date();
        })();
        const isPvgis = operation.tipo === "ANEXO_PVGIS";
        if (isPvgis) {
          if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(meta.mime)) {
            rejected.push({ id: operation.id, reason: "Anexo PVGIS: solo PDF o imagen" });
            continue;
          }
          if (meta.sizeBytes > 12 * 1024 * 1024) {
            rejected.push({ id: operation.id, reason: "Anexo supera 12MB" });
            continue;
          }
        } else {
          if (!["image/jpeg", "image/png", "image/webp"].includes(meta.mime)) {
            rejected.push({ id: operation.id, reason: "Tipo MIME no permitido" });
            continue;
          }
          if (meta.sizeBytes > 5 * 1024 * 1024) {
            rejected.push({ id: operation.id, reason: "Imagen excede 5MB" });
            continue;
          }
          if (
            typeof operation.latitude !== "number" ||
            typeof operation.longitude !== "number"
          ) {
            rejected.push({ id: operation.id, reason: "Coordenadas GPS requeridas" });
            continue;
          }
        }
        const uploaded = await uploadDataUrlToStorage({
          bucket: "luxops-assets",
          path: `organizations/${dbUser.organizationId}/projects/${operation.projectId}/photos/${operation.id}`,
          dataUrl: operation.imageDataUrl,
        });
        await prisma.photo.create({
          data: {
            projectId: operation.projectId,
            tipo: operation.tipo,
            url: uploaded.path,
            storagePath: uploaded.path,
            latitude:
              typeof operation.latitude === "number" ? operation.latitude : null,
            longitude:
              typeof operation.longitude === "number" ? operation.longitude : null,
            // Guardamos el instante de captura en dispositivo (la cola envía createdAt al encolar).
            createdAt: operationCreatedAt,
          },
        });
        successIds.push(operation.id);
      } else if (operation.kind === "checklist") {
        await prisma.project.update({
          where: { id: operation.projectId },
          data: { progreso: operation.progreso },
        });
        successIds.push(operation.id);
      } else if (operation.kind === "prlAck") {
        await prisma.project.update({
          where: { id: operation.projectId },
          data: {
            prlLineLifeHarness: true,
            prlCollectiveProtection: true,
            prlRoofTransitOk: true,
            prlPpeInUse: true,
            prlAckLatitude: operation.latitude,
            prlAckLongitude: operation.longitude,
            prlAcknowledgedAt: new Date(),
          },
        });
        successIds.push(operation.id);
      } else if (operation.kind === "traceability") {
        const panelSerials = (operation.panelSerials ?? [])
          .map((serial) => serial.trim())
          .filter(Boolean);
        const batterySerials = (operation.batterySerials ?? [])
          .map((serial) => serial.trim())
          .filter(Boolean);
        const extendItem = (item: {
          brand: string;
          model: string;
          serial: string;
          peakWp?: string | undefined;
          nominalKw?: string | undefined;
          capacityKwh?: string | undefined;
        }) => ({
          brand: item.brand.trim(),
          model: item.model.trim(),
          serial: item.serial.trim(),
          ...(item.peakWp?.trim() ? { peakWp: item.peakWp.trim() } : {}),
          ...(item.nominalKw?.trim() ? { nominalKw: item.nominalKw.trim() } : {}),
          ...(item.capacityKwh?.trim() ? { capacityKwh: item.capacityKwh.trim() } : {}),
        });
        const panelItems = (operation.panelItems ?? [])
          .map((item) => extendItem(item))
          .filter((item) => item.brand || item.model || item.serial);
        const batteryItems = (operation.batteryItems ?? [])
          .map((item) => extendItem(item))
          .filter((item) => item.brand || item.model || item.serial);
        const inverterItems = (operation.inverterItems ?? [])
          .map((item) => extendItem(item))
          .filter((item) => item.brand || item.model || item.serial);
        const totalPanelPeakWp = panelItems.reduce((acc, p) => {
          const n = Number.parseFloat(String(p.peakWp ?? "").replace(",", "."));
          return acc + (Number.isFinite(n) && n > 0 ? n : 0);
        }, 0);
        await prisma.project.update({
          where: { id: operation.projectId },
          data: {
            nBoletin: (operation.nBoletin ?? "").trim() || null,
            fechaCIE: toOptionalDate(operation.fechaCIE) ?? null,
            presupuestoFinal: toPrismaDecimal(operation.presupuestoFinal),
            assetPanelBrand:
              panelItems.length > 0 ? panelItems[0].brand.trim() || null : null,
            assetPanelModel:
              panelItems.length > 0 ? panelItems[0].model.trim() || null : null,
            assetPanelSerial:
              panelItems.length > 0
                ? panelItems[0].serial.trim() || null
                : panelSerials[0]?.trim() || null,
            equipmentInverterSerial:
              operation.inverterSerial ||
              inverterItems.map((item) => item.serial).filter(Boolean)[0] ||
              null,
            assetInverterBrand:
              inverterItems.length > 0 ? inverterItems[0].brand.trim() || null : null,
            assetInverterModel:
              inverterItems.length > 0 ? inverterItems[0].model.trim() || null : null,
            assetBatteryBrand:
              batteryItems.length > 0 ? batteryItems[0].brand.trim() || null : null,
            assetBatteryModel:
              batteryItems.length > 0 ? batteryItems[0].model.trim() || null : null,
            peakPowerKwp:
              totalPanelPeakWp > 0
                ? toPrismaDecimal((totalPanelPeakWp / 1000).toFixed(2))
                : null,
            inverterPowerKwn:
              inverterItems[0]?.nominalKw?.trim()
                ? toPrismaDecimal(inverterItems[0].nominalKw.trim())
                : null,
            storageCapacityKwh:
              batteryItems[0]?.capacityKwh?.trim()
                ? toPrismaDecimal(batteryItems[0].capacityKwh.trim())
                : null,
            equipmentInverterItems:
              inverterItems.length > 0 ? (inverterItems as Prisma.InputJsonValue) : Prisma.JsonNull,
            equipmentBatterySerial:
              operation.batterySerial || batterySerials[0] || null,
            equipmentPanelSerials:
              panelItems.length > 0
                ? panelItems.map((item) => item.serial).filter(Boolean)
                : panelSerials,
            equipmentBatterySerials:
              batteryItems.length > 0
                ? batteryItems.map((item) => item.serial).filter(Boolean)
                : batterySerials,
            equipmentPanelItems:
              panelItems.length > 0 ? (panelItems as Prisma.InputJsonValue) : Prisma.JsonNull,
            equipmentBatteryItems:
              batteryItems.length > 0 ? (batteryItems as Prisma.InputJsonValue) : Prisma.JsonNull,
            equipmentVatimetroSerial: operation.vatimetroSerial || null,
            warrantyNotes: operation.warrantyNotes || null,
            installationIncidentNotes: (operation.incidentNotes ?? "").trim() || null,
            structureBrand: (operation.structureBrand ?? "").trim() || null,
            structureMounting: operation.structureMounting ?? null,
            stringConfiguration: (operation.stringConfiguration ?? "").trim() || null,
            selfConsumptionModality: operation.selfConsumptionModality ?? null,
            cableDcSectionMm2: (operation.cableDcSectionMm2 ?? "").trim() || null,
            cableAcSectionMm2: (operation.cableAcSectionMm2 ?? "").trim() || null,
            electricVocVolts: toPrismaDecimal(operation.electricVoc),
            electricIscAmps: toPrismaDecimal(operation.electricIsc),
            earthResistanceOhms: toPrismaDecimal(operation.earthResistance),
            thermalProtectionBrand: (operation.thermalProtectionBrand ?? "").trim() || null,
            thermalProtectionModel: (operation.thermalProtectionModel ?? "").trim() || null,
            spdBrand: (operation.spdBrand ?? "").trim() || null,
            spdModel: (operation.spdModel ?? "").trim() || null,
            panelAzimuthDegrees: toPrismaDecimal(operation.azimuthDegrees),
            panelTiltDegrees: toPrismaDecimal(operation.panelTiltDegrees),
            photoProtocolNameplates: operation.photoProtocolNameplates === true,
            photoProtocolDistributionBoard: operation.photoProtocolDistributionBoard === true,
            photoProtocolFixings: operation.photoProtocolFixings === true,
            photoProtocolStructureEarthing: operation.photoProtocolStructureEarthing === true,
          },
        });
        await recordCatalogFromTraceabilityItems(
          panelItems.map(({ brand, model }) => ({ brand, model })),
          inverterItems.map(({ brand, model }) => ({ brand, model })),
          batteryItems.map(({ brand, model }) => ({ brand, model })),
        );
        successIds.push(operation.id);
      } else if (operation.kind === "signature") {
        const clientMeta = parseDataUrlMeta(operation.clientSignatureDataUrl);
        const installerMeta = parseDataUrlMeta(operation.installerSignatureDataUrl);
        if (!clientMeta || !installerMeta) {
          rejected.push({ id: operation.id, reason: "Formato de firma inválido" });
          continue;
        }
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(clientMeta.mime) ||
          !["image/jpeg", "image/png", "image/webp"].includes(installerMeta.mime)
        ) {
          rejected.push({ id: operation.id, reason: "Tipo MIME de firma no permitido" });
          continue;
        }
        if (clientMeta.sizeBytes > 5 * 1024 * 1024 || installerMeta.sizeBytes > 5 * 1024 * 1024) {
          rejected.push({ id: operation.id, reason: "Firma excede 5MB" });
          continue;
        }
        if (
          typeof operation.latitude !== "number" ||
          typeof operation.longitude !== "number"
        ) {
          rejected.push({ id: operation.id, reason: "Coordenadas GPS requeridas en firma" });
          continue;
        }
        const requiredTypes = await prisma.photo.findMany({
          where: { projectId: operation.projectId },
          select: { tipo: true },
        });
        const hasAntes = requiredTypes.some((p) => p.tipo === "ANTES");
        const hasDurante = requiredTypes.some((p) => p.tipo === "DURANTE");
        const hasDespues = requiredTypes.some((p) => p.tipo === "DESPUES");
        const hasUnifilar = requiredTypes.some((p) => p.tipo === "ESQUEMA_UNIFILAR");
        if (!hasAntes || !hasDurante || !hasDespues || !hasUnifilar) {
          rejected.push({
            id: operation.id,
            reason:
              "Faltan evidencias obligatorias: ANTES, DURANTE, DESPUES y esquema unifilar (CIE/REBT)",
          });
          continue;
        }
        const clientUploaded = await uploadDataUrlToStorage({
          bucket: "luxops-assets",
          path: `organizations/${dbUser.organizationId}/projects/${operation.projectId}/signatures/${operation.id}/client`,
          dataUrl: operation.clientSignatureDataUrl,
        });
        const installerUploaded = await uploadDataUrlToStorage({
          bucket: "luxops-assets",
          path: `organizations/${dbUser.organizationId}/projects/${operation.projectId}/signatures/${operation.id}/installer`,
          dataUrl: operation.installerSignatureDataUrl,
        });
        await prisma.projectSignature.create({
          data: {
            projectId: operation.projectId,
            imageDataUrl: clientUploaded.path,
            storagePath: clientUploaded.path,
            installerImageDataUrl: installerUploaded.path,
            installerStoragePath: installerUploaded.path,
            installerName: dbUser.name ?? dbUser.email ?? null,
            clientName: project.cliente ?? null,
            latitude: operation.latitude,
            longitude: operation.longitude,
          },
        });
        await prisma.project.update({
          where: { id: operation.projectId },
          data: {
            estado: "FINALIZADO",
            installerProfessionalCard: operation.installerProfessionalCard.trim(),
            clientTrainingAcknowledged: true,
          },
        });
        await enqueueInstallationCompletedWhatsapp({
          projectId: operation.projectId,
          organizationId: dbUser.organizationId,
          userId: dbUser.id,
        });
        await sendProjectFinishedEmail({
          organizationId: dbUser.organizationId,
          projectId: operation.projectId,
        });
        successIds.push(operation.id);
      }

      await prisma.syncEvent.upsert({
        where: { id: operation.id },
        create: {
          id: operation.id,
          kind: operation.kind,
          organizationId: dbUser.organizationId,
          userId: dbUser.id,
        },
        update: {},
      });
    }

    await processPendingNotifications();

    return NextResponse.json({ ok: true, successIds, rejected }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Payload inválido", details: error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Idempotencia: si una operación ya se registró en paralelo, no rompemos el sync.
      return NextResponse.json(
        { ok: true, duplicated: true, successIds: [] },
        { status: 200 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Fallo de sincronización", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
