import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { estimateAnnualYieldKwh, sumPanelPeakWpW } from "@/lib/pv-yield-estimate";
import { downloadStorageBytes } from "@/lib/storage";
import { modalityLabel } from "@/lib/self-consumption-modality";

export const dossierProjectInclude = {
  photos: { orderBy: { createdAt: "asc" as const } },
  signatures: { orderBy: { createdAt: "desc" as const }, take: 1 },
  organization: {
    select: {
      name: true,
      logoUrl: true,
      logoPath: true,
      brandColor: true,
      rebtCompanyNumber: true,
    },
  },
} satisfies Prisma.ProjectInclude;

/** Errores de negocio al generar dossier (faltan datos legales obligatorios). */
export class DossierGenerationError extends Error {
  constructor(
    message: string,
    /** Etiquetas legibles para mostrar al usuario (UI / API). */
    public readonly missingFields: string[],
    public readonly code: "INCOMPLETE_DOSSIER" = "INCOMPLETE_DOSSIER",
  ) {
    super(message);
    this.name = "DossierGenerationError";
  }
}

export type DossierProject = Prisma.ProjectGetPayload<{ include: typeof dossierProjectInclude }>;
type EquipmentItem = {
  brand: string;
  model: string;
  serial: string;
  peakWp?: string;
  nominalKw?: string;
  capacityKwh?: string;
};

const MOUNTING_LABEL: Record<string, string> = {
  COPLANAR: "Coplanar",
  INCLINACION: "Inclinación",
  LASTRADA: "Lastrada",
};

/** Origen abajo: nada de contenido debe quedar por debajo de esta Y (el pie se pinta al final ~18–70). */
const PDF_FOOTER_CLEARANCE_Y = 82;
/** Altura reservada para la franja de pie (rectángulo + textos). */
const PDF_FOOTER_BAND_HEIGHT = 66;

function isValidFontBytes(bytes: Uint8Array) {
  if (!bytes || bytes.byteLength < 4) return false;
  const b0 = bytes[0];
  const b1 = bytes[1];
  const b2 = bytes[2];
  const b3 = bytes[3];
  // TTF: 00 01 00 00
  if (b0 === 0x00 && b1 === 0x01 && b2 === 0x00 && b3 === 0x00) return true;
  // OTF: 'OTTO'
  if (b0 === 0x4f && b1 === 0x54 && b2 === 0x54 && b3 === 0x4f) return true;
  // TrueType collection / legacy tags: 'true' / 'typ1'
  if (b0 === 0x74 && b1 === 0x72 && b2 === 0x75 && b3 === 0x65) return true; // true
  if (b0 === 0x74 && b1 === 0x79 && b2 === 0x70 && b3 === 0x31) return true; // typ1
  return false;
}

async function embedSwissSansFont(pdf: PDFDocument) {
  try {
    const local = join(process.cwd(), "public", "fonts", "Inter-Regular.ttf");
    const bytes = await readFile(local);
    const u8 = new Uint8Array(bytes);
    if (u8.byteLength > 1000 && isValidFontBytes(u8)) {
      try {
        return pdf.embedFont(u8, { subset: true });
      } catch {
        /* fallback below */
      }
    }
  } catch {
    /* optional local font */
  }
  const urls = [
    "https://raw.githubusercontent.com/rsms/inter/v4.0-beta.2/docs/font-files/Inter-Regular.ttf",
    "https://github.com/googlefonts/inter/raw/refs/heads/main/fonts/ttf/Inter-Regular.ttf",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength < 1000) continue;
      if (!isValidFontBytes(bytes)) continue;
      try {
        return pdf.embedFont(bytes, { subset: true });
      } catch {
        /* next URL */
      }
    } catch {
      /* fallback below */
    }
  }
  return pdf.embedFont(StandardFonts.Helvetica);
}

async function embedInterBoldFont(pdf: PDFDocument) {
  try {
    const local = join(process.cwd(), "public", "fonts", "Inter-Bold.ttf");
    const bytes = await readFile(local);
    const u8 = new Uint8Array(bytes);
    if (u8.byteLength > 1000 && isValidFontBytes(u8)) {
      try {
        return pdf.embedFont(u8, { subset: true });
      } catch {
        /* fallback below */
      }
    }
  } catch {
    /* optional local font */
  }
  const urls = [
    "https://raw.githubusercontent.com/rsms/inter/v4.0-beta.2/docs/font-files/Inter-Bold.ttf",
    "https://github.com/googlefonts/inter/raw/refs/heads/main/fonts/ttf/Inter-Bold.ttf",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength < 1000) continue;
      if (!isValidFontBytes(bytes)) continue;
      try {
        return pdf.embedFont(bytes, { subset: true });
      } catch {
        /* next URL */
      }
    } catch {
      /* fallback below */
    }
  }
  return pdf.embedFont(StandardFonts.HelveticaBold);
}

/**
 * Si Inter no carga, el fallback es Helvetica (WinAnsi) y no admite Ω, °, etc.
 */
function pdfLibSafeText(raw: string): string {
  return String(raw)
    .replace(/\u03a9/g, "ohm")
    .replace(/\u2126/g, "ohm")
    .replace(/\u00b0/g, "deg")
    .replace(/\u2014|\u2013|\u2212/g, "-")
    .replace(/\u2011/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return rgb(0.12, 0.12, 0.12);
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function dataUrlToBytes(dataUrl: string) {
  const parts = dataUrl.split(",");
  if (parts.length < 2) return null;
  return Buffer.from(parts[1], "base64");
}

async function imageToBytes(source: string, storagePath?: string | null) {
  const src = (source ?? "").trim();
  if (!src) return null;
  if (storagePath) {
    const bytes = await downloadStorageBytes({ bucket: "luxops-assets", path: storagePath });
    if (bytes) return bytes;
  }
  if (src.startsWith("data:image/")) return dataUrlToBytes(src);
  if (src.includes("/") && !src.startsWith("http")) {
    const bytes = await downloadStorageBytes({ bucket: "luxops-assets", path: src });
    if (bytes) return bytes;
  }
  if (!src.startsWith("http")) return null;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

async function embedAutoImage(pdf: PDFDocument, source: string, storagePath?: string | null) {
  const bytes = await imageToBytes(source, storagePath);
  if (!bytes) return null;
  const b0 = bytes[0];
  const b1 = bytes[1];
  const b2 = bytes[2];
  const b3 = bytes[3];
  const isPng = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47;
  const isJpg = b0 === 0xff && b1 === 0xd8;
  if (isPng) {
    try {
      return pdf.embedPng(bytes);
    } catch {
      return null;
    }
  }
  if (isJpg) {
    try {
      return pdf.embedJpg(bytes);
    } catch {
      return null;
    }
  }
  // Fallback: intenta PNG primero (la mayoría de firmas son PNG).
  try {
    return await pdf.embedPng(bytes);
  } catch {
    try {
      return await pdf.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

function drawFooter(params: {
  page: import("pdf-lib").PDFPage;
  pageNumber: number;
  totalPages: number;
  companyName: string;
  italic: import("pdf-lib").PDFFont;
  projectId: string;
}) {
  const { page, pageNumber, totalPages, companyName, italic, projectId } = params;
  const { width } = page.getSize();
  const padX = 28;
  const innerW = width - 56;
  const footBaseY = 16;
  page.drawRectangle({
    x: 24,
    y: footBaseY,
    width: width - 48,
    height: PDF_FOOTER_BAND_HEIGHT,
    color: rgb(0.98, 0.98, 0.98),
  });
  page.drawText(
    `Documento generado por LuxOps para ${companyName} · Página ${pageNumber}/${totalPages}`,
    {
      x: padX,
      y: footBaseY + PDF_FOOTER_BAND_HEIGHT - 10,
      size: 8,
      font: italic,
      color: rgb(0.35, 0.35, 0.35),
    },
  );
  const audit = pdfLibSafeText(
    `ID de transacción: ${projectId} · Documento electrónico firmado mediante hash de integridad según Reglamento (UE) Nº 910/2014 (eIDAS)`,
  );
  let lineY = footBaseY + PDF_FOOTER_BAND_HEIGHT - 22;
  for (const line of wrapPdfLines(audit, innerW, italic, 5.2)) {
    page.drawText(line, {
      x: padX,
      y: lineY,
      size: 5.2,
      font: italic,
      color: rgb(0.42, 0.42, 0.46),
    });
    lineY -= 7;
    if (lineY < footBaseY + 6) break;
  }
}

function formatDurationMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "No disponible";
  const totalMinutes = Math.round(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

async function getDefaultLuxOpsLogo(pdf: PDFDocument) {
  const candidates = [
    join(process.cwd(), "public", "luxops-logo.png"),
    join(process.cwd(), "LuxOps-logo.png"),
    join(process.cwd(), "luxops_logo.png"),
  ];
  for (const logoPath of candidates) {
    try {
      const bytes = await readFile(logoPath);
      return await pdf.embedPng(bytes);
    } catch {
      /* siguiente candidato (Vercel / local) */
    }
  }
  return null;
}

function wrapPdfLines(text: string, maxWidth: number, font: import("pdf-lib").PDFFont, size: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(w, size) <= maxWidth) {
        current = w;
      } else {
        let chunk = "";
        for (const ch of w) {
          const t2 = chunk + ch;
          if (font.widthOfTextAtSize(t2, size) <= maxWidth) chunk = t2;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** Opacidad del sello VERIFICADO en portada (marca de agua). */
const COVER_SEAL_WATERMARK_OPACITY = 0.6;

function parseEquipmentItems(value: Prisma.JsonValue | null | undefined): EquipmentItem[] {
  if (value == null || value === undefined) return [];
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: EquipmentItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    out.push({
      brand: String(row.brand ?? "").trim(),
      model: String(row.model ?? "").trim(),
      serial: String(row.serial ?? row.sn ?? row.SN ?? "").trim(),
      peakWp: String(row.peakWp ?? row.peak_wp ?? "").trim() || undefined,
      nominalKw: String(row.nominalKw ?? row.nominal_kw ?? "").trim() || undefined,
      capacityKwh: String(row.capacityKwh ?? row.capacity_kwh ?? "").trim() || undefined,
    });
  }
  return out;
}

function uniqueSerials(list: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = (raw ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Une filas JSON del stepper con N/S sueltos en arrays legacy (misma marca/modelo de activo). */
function mergeSerialsIntoItems(
  items: EquipmentItem[],
  serials: string[],
  brand: string | null | undefined,
  model: string | null | undefined,
): EquipmentItem[] {
  const seen = new Set(items.map((i) => i.serial.trim()).filter(Boolean));
  const b = (brand ?? "").trim();
  const m = (model ?? "").trim();
  const out = [...items];
  for (const serial of serials) {
    const t = serial.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push({ brand: b, model: m, serial: t });
  }
  return out;
}

function equipmentSpecCell(kind: "panel" | "inverter" | "battery", item: EquipmentItem): string {
  if (kind === "panel") return item.peakWp ? `${item.peakWp} W` : "—";
  if (kind === "inverter") return item.nominalKw ? `${item.nominalKw} kW` : "—";
  return item.capacityKwh ? `${item.capacityKwh} kWh` : "—";
}

const PRODUCTION_ESTIMATE_DISCLAIMER =
  "Estimación de producción basada en rendimiento específico anual (1420 kWh/kWp).";

const CABLE_SECTIONS_REBT_NOTE =
  "Secciones calculadas para garantizar una caída de tensión inferior a los límites establecidos en la ITC-BT-19 e ITC-BT-07 del REBT.";

export async function generateDossierPdfBuffer(project: DossierProject): Promise<Buffer> {
  const orgRebt = (project.organization.rebtCompanyNumber ?? "").trim();
  const projRebt = (project.rebtCompanyNumber ?? "").trim();
  const rebtEmpresaNum = projRebt || orgRebt;
  const cableDcMm2 = (project.cableDcSectionMm2 ?? "").trim();
  const cableAcMm2 = (project.cableAcSectionMm2 ?? "").trim();

  const missingFields: string[] = [];
  if (!rebtEmpresaNum) {
    missingFields.push(
      "Nº de empresa instaladora REBT (Ajustes → organización o anulación en expediente)",
    );
  }
  if (!project.selfConsumptionModality) {
    missingFields.push("Modalidad de autoconsumo (RD 244/2019)");
  }
  if (!cableDcMm2) {
    missingFields.push("Sección de cable DC (mm²)");
  }
  if (!cableAcMm2) {
    missingFields.push("Sección de cable AC (mm²)");
  }
  if (missingFields.length > 0) {
    throw new DossierGenerationError(
      "Faltan datos obligatorios para generar el dossier.",
      missingFields,
    );
  }

  const modalityLabelPdf = modalityLabel(project.selfConsumptionModality);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await embedInterBoldFont(pdf);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const inter = await embedSwissSansFont(pdf);
  const luxBlack = rgb(0.0431, 0.0549, 0.0784); // #0B0E14
  const slateText = luxBlack;
  const slateBorder = rgb(0.2, 0.2549, 0.3333);
  const solarYellow = rgb(0.9843, 0.749, 0.1412); // #FBBF24
  const accent = solarYellow;
  const companyName = (project.organization.name ?? "").trim() || "Organización";
  const installerCompanyLabel = pdfLibSafeText(companyName);
  const dossierReference =
    project.dossierReference?.trim() ||
    `EXP-${project.id.slice(-8).toUpperCase()}-${new Date(project.updatedAt).getFullYear()}`;
  const installerCard = (project.installerProfessionalCard ?? "").trim();
  const firstPhotoAt = project.photos[0]?.createdAt ?? null;
  const lastPhotoAt = project.photos[project.photos.length - 1]?.createdAt ?? null;
  const totalTimeLabel =
    firstPhotoAt && lastPhotoAt
      ? formatDurationMs(lastPhotoAt.getTime() - firstPhotoAt.getTime())
      : "No disponible";

  const panelItemsForYield = parseEquipmentItems(project.equipmentPanelItems);
  let totalPeakWpW = sumPanelPeakWpW(panelItemsForYield);
  if (totalPeakWpW <= 0 && project.peakPowerKwp != null) {
    const kwp = Number(project.peakPowerKwp);
    if (Number.isFinite(kwp) && kwp > 0) totalPeakWpW = kwp * 1000;
  }
  const annualYieldKwh = estimateAnnualYieldKwh({
    totalPeakWp: totalPeakWpW,
    azimuthDegrees:
      project.panelAzimuthDegrees != null ? Number(project.panelAzimuthDegrees) : undefined,
    tiltDegrees:
      project.panelTiltDegrees != null ? Number(project.panelTiltDegrees) : undefined,
  });

  const coverPage = pdf.addPage([595, 842]);
  coverPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
  coverPage.drawRectangle({ x: 0, y: 794, width: 595, height: 48, color: rgb(0.97, 0.98, 1) });
  coverPage.drawText(installerCompanyLabel, {
    x: 24,
    y: 818,
    size: 9.5,
    font: bold,
    color: rgb(0.1, 0.1, 0.12),
    maxWidth: 420,
  });
  coverPage.drawText("Dossier certificado · trazabilidad LuxOps", {
    x: 24,
    y: 800,
    size: 7.5,
    font,
    color: rgb(0.32, 0.34, 0.38),
  });

  const orgLogoSource =
    project.organization.logoUrl ?? project.organization.logoPath ?? "";
  let drewCompanyLogo = false;
  if (orgLogoSource) {
    const logo = await embedAutoImage(
      pdf,
      orgLogoSource,
      project.organization.logoPath ?? null,
    );
    if (logo) {
      const maxW = 150;
      const maxH = 150;
      const ratio = Math.min(maxW / logo.width, maxH / logo.height);
      const w = logo.width * ratio;
      const h = logo.height * ratio;
      coverPage.drawImage(logo, { x: (595 - w) / 2, y: 640, width: w, height: h });
      drewCompanyLogo = true;
    }
  }
  if (!drewCompanyLogo) {
    const defaultLogo = await getDefaultLuxOpsLogo(pdf);
    if (defaultLogo) {
      // 35mm de ancho ≈ 99pt
      const maxW = 100;
      const maxH = 100;
      const ratio = Math.min(maxW / defaultLogo.width, maxH / defaultLogo.height);
      const w = defaultLogo.width * ratio;
      const h = defaultLogo.height * ratio;
      coverPage.drawImage(defaultLogo, { x: (595 - w) / 2, y: 660, width: w, height: h });
      coverPage.drawText("Aval de calidad LuxOps", {
        x: (595 - bold.widthOfTextAtSize("Aval de calidad LuxOps", 9)) / 2,
        y: 648,
        size: 9,
        font,
        color: rgb(0.35, 0.35, 0.4),
      });
    } else {
      coverPage.drawCircle({ x: 298, y: 712, size: 26, borderColor: accent, borderWidth: 2 });
      coverPage.drawCircle({ x: 298, y: 712, size: 11, color: accent });
      coverPage.drawText("LuxOps", {
        x: 250,
        y: 670,
        size: 22,
        font: bold,
        color: rgb(0.07, 0.1, 0.17),
      });
    }
  }
  const companyLabelWidth = bold.widthOfTextAtSize(companyName, 15);
  coverPage.drawText(companyName, {
    x: (595 - companyLabelWidth) / 2,
    y: 620,
    size: 15,
    font: bold,
    color: rgb(0.12, 0.12, 0.12),
  });
  coverPage.drawText("DOSSIER TÉCNICO", {
    x: 170,
    y: 572,
    size: 28,
    font: bold,
    color: rgb(0.08, 0.09, 0.11),
  });
  coverPage.drawText("DE INSTALACIÓN", {
    x: 193,
    y: 542,
    size: 21,
    font: bold,
    color: rgb(0.12, 0.12, 0.12),
  });
  coverPage.drawText(`Proyecto: ${project.cliente}`, {
    x: 88,
    y: 518,
    size: 11,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  const cupsHead = (project.cups ?? "").trim() || "—";
  const catHead = (project.catastralReference ?? "").trim() || "—";
  const ownerHead = (project.ownerTaxId ?? "").trim() || "—";
  coverPage.drawText(`CUPS: ${cupsHead}`, {
    x: 88,
    y: 500,
    size: 10,
    font: bold,
    color: rgb(0.15, 0.15, 0.18),
  });
  coverPage.drawText(`Ref. catastral: ${catHead}`, {
    x: 88,
    y: 485,
    size: 9,
    font,
    color: rgb(0.28, 0.28, 0.3),
  });
  coverPage.drawText(`Titular (DNI/CIF): ${ownerHead}`, {
    x: 88,
    y: 472,
    size: 9,
    font,
    color: rgb(0.28, 0.28, 0.3),
  });

  // KPI block: ancho y alto según contenido (sin desbordes)
  const kpiPadX = 26;
  const kpiInnerMax = 470;
  const addrLines = wrapPdfLines(project.direccion, kpiInnerMax, bold, 10.5);
  const certPrefix = "Instalacion certificada por: ";
  const certLines = wrapPdfLines(
    `${certPrefix}${project.operarioNombre}`,
    kpiInnerMax,
    bold,
    10,
  );
  const kpiTitleW = bold.widthOfTextAtSize("Resumen ejecutivo de obra", 12);
  const lineWidths = [
    kpiTitleW,
    font.widthOfTextAtSize("Tiempo total", 8.5),
    bold.widthOfTextAtSize(totalTimeLabel, 11),
    font.widthOfTextAtSize("Evidencias", 8.5),
    bold.widthOfTextAtSize(`${project.photos.length} fotos capturadas`, 11),
    font.widthOfTextAtSize("Ubicacion", 8.5),
    ...addrLines.map((ln) => bold.widthOfTextAtSize(ln, 10.5)),
    ...certLines.map((ln) => bold.widthOfTextAtSize(ln, 10)),
  ];
  const maxInner = Math.min(515, Math.max(...lineWidths, 240));
  const boxW = Math.min(545, maxInner + kpiPadX * 2);
  const boxX = (595 - boxW) / 2;
  const extraLines = Math.max(0, addrLines.length - 1) + Math.max(0, certLines.length - 1);
  const boxH = 184 + extraLines * 13;
  const kpiTop = 438;
  const boxY = kpiTop - boxH;
  const kpiTextX = boxX + kpiPadX;

  coverPage.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    color: rgb(0.975, 0.975, 0.975),
    borderColor: rgb(0.89, 0.89, 0.89),
    borderWidth: 1,
  });
  let kpy = kpiTop - 24;
  coverPage.drawText("Resumen ejecutivo de obra", {
    x: kpiTextX,
    y: kpy,
    size: 12,
    font: bold,
    color: rgb(0.13, 0.13, 0.13),
  });
  kpy -= 26;
  coverPage.drawText("Tiempo total", {
    x: kpiTextX,
    y: kpy,
    size: 8.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  kpy -= 14;
  coverPage.drawText(totalTimeLabel, {
    x: kpiTextX,
    y: kpy,
    size: 11,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });
  kpy -= 24;
  coverPage.drawText("Evidencias", {
    x: kpiTextX,
    y: kpy,
    size: 8.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  kpy -= 14;
  coverPage.drawText(`${project.photos.length} fotos capturadas`, {
    x: kpiTextX,
    y: kpy,
    size: 11,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });
  kpy -= 24;
  coverPage.drawText("Ubicacion", {
    x: kpiTextX,
    y: kpy,
    size: 8.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  kpy -= 14;
  for (const ln of addrLines) {
    coverPage.drawText(ln, {
      x: kpiTextX,
      y: kpy,
      size: 10.5,
      font: bold,
      color: rgb(0.2, 0.2, 0.2),
    });
    kpy -= 14;
  }
  kpy -= 6;
  for (const ln of certLines) {
    coverPage.drawText(ln, {
      x: kpiTextX,
      y: kpy,
      size: 10,
      font: bold,
      color: rgb(0.08, 0.09, 0.11),
    });
    kpy -= 12;
  }

  // Sello VERIFICADO: centro vertical, mitad derecha de la portada — marca de agua (más grande).
  const pageH = 842;
  const pageW = 595;
  const sealR = 36;
  const sealCX = (pageW * 3) / 4 + 8;
  const sealCY = pageH / 2;
  const sealOp = COVER_SEAL_WATERMARK_OPACITY;
  coverPage.drawCircle({
    x: sealCX,
    y: sealCY,
    size: sealR + 14,
    color: rgb(1, 1, 1),
    borderColor: solarYellow,
    borderWidth: 2.4,
    opacity: sealOp,
    borderOpacity: sealOp,
  });
  coverPage.drawCircle({
    x: sealCX,
    y: sealCY,
    size: sealR + 2,
    borderColor: solarYellow,
    borderWidth: 1.6,
    opacity: sealOp,
    borderOpacity: sealOp,
  });
  coverPage.drawText("VERIFICADO", {
    x: sealCX - bold.widthOfTextAtSize("VERIFICADO", 9.8) / 2,
    y: sealCY + sealR * 0.3,
    size: 9.8,
    font: bold,
    color: luxBlack,
    opacity: sealOp,
  });
  coverPage.drawText("LuxOps", {
    x: sealCX - bold.widthOfTextAtSize("LuxOps", 9) / 2,
    y: sealCY - 3,
    size: 9,
    font: bold,
    color: luxBlack,
    opacity: sealOp,
  });
  coverPage.drawText("CONTROL", {
    x: sealCX - bold.widthOfTextAtSize("CONTROL", 8.4) / 2,
    y: sealCY - sealR * 0.44,
    size: 8.4,
    font: bold,
    color: luxBlack,
    opacity: sealOp,
  });

  const adminDisclaimer = pdfLibSafeText(
    "Nota para tramitación administrativa y ayudas públicas: este dossier documenta la ejecución de la instalación y criterios habituales de trazabilidad (REBT, evidencias fotográficas, firmas y datos técnicos). " +
      "Cada convocatoria de subvenciones o créditos (estatal, autonómico o europeo) impone requisitos y plazos propios: el titular o la empresa instaladora debe contrastar este documento con las bases vigentes y la normativa aplicable en el momento de la solicitud. " +
      "LuxOps facilita la documentación; no sustituye asesoramiento jurídico ni la resolución de la administración competente. " +
      "Protección de datos: tratamiento conforme al Reglamento (UE) 2016/679 y la LOPDGDD, en la medida aplicable al encargado y al responsable del tratamiento.",
  );
  const adminLines = wrapPdfLines(adminDisclaimer, 531, font, 6.5).slice(0, 10);
  let discY = 40;
  for (const ln of adminLines) {
    coverPage.drawText(ln, {
      x: 32,
      y: discY,
      size: 6.5,
      font,
      color: rgb(0.4, 0.4, 0.43),
    });
    discY += 8;
  }

  discY += 4;
  const legalNameEnv = (process.env.NEXT_PUBLIC_LEGAL_NAME ?? "").trim();
  const rgpdFooterClause = pdfLibSafeText(
    legalNameEnv
      ? `Clausula RGPD (informacion basica): responsable del tratamiento en relacion con la plataforma LuxOps: ${legalNameEnv}. Puede ejercer sus derechos segun la Politica de privacidad del servicio y la normativa aplicable.`
      : "Clausula RGPD (informacion basica): responsable del tratamiento segun la Politica de privacidad publicada en el servicio LuxOps; configure NEXT_PUBLIC_LEGAL_NAME en el despliegue para mostrar la identidad completa en esta portada.",
  );
  const rgpdFooterLines = wrapPdfLines(rgpdFooterClause, 531, font, 6).slice(0, 8);
  for (const ln of rgpdFooterLines) {
    coverPage.drawText(ln, {
      x: 32,
      y: discY,
      size: 6,
      font,
      color: rgb(0.32, 0.32, 0.36),
    });
    discY += 7;
  }

  let summaryPage = pdf.addPage([595, 842]);
  summaryPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
  summaryPage.drawRectangle({ x: 24, y: 768, width: 547, height: 2, color: solarYellow });
  summaryPage.drawText("INFORME DE INSTALACION", {
    x: 24,
    y: 818,
    size: 18,
    color: rgb(0, 0, 0),
    font: bold,
  });
  summaryPage.drawText("Dossier técnico de ejecución", {
    x: 24,
    y: 748,
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
    font,
  });

  summaryPage.drawRectangle({
    x: 24,
    y: 422,
    width: 547,
    height: 292,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 0.5,
  });

  summaryPage.drawText(`Empresa instaladora: ${installerCompanyLabel}`, {
    x: 36,
    y: 698,
    size: 11,
    font: bold,
    maxWidth: 340,
  });
  summaryPage.drawText(`Cliente: ${project.cliente}`, { x: 36, y: 682, size: 10, font });
  summaryPage.drawText(`CUPS: ${cupsHead}`, { x: 36, y: 666, size: 9.5, font: bold });
  summaryPage.drawText(`Ref. catastral: ${catHead}`, { x: 36, y: 652, size: 9, font });
  summaryPage.drawText(`Titular (DNI/CIF): ${ownerHead}`, { x: 36, y: 638, size: 9, font });
  summaryPage.drawText(`Dirección: ${project.direccion}`, { x: 36, y: 622, size: 10, font });
  summaryPage.drawText(
    `Fecha de finalización: ${new Date(project.updatedAt).toLocaleString("es-ES")}`,
    { x: 36, y: 606, size: 10, font },
  );
  summaryPage.drawText(`Estado: ${project.estado}`, { x: 36, y: 590, size: 10, font });
  summaryPage.drawText(pdfLibSafeText(`Modalidad de autoconsumo: ${modalityLabelPdf}`), {
    x: 36,
    y: 574,
    size: 9,
    font,
    maxWidth: 500,
    lineHeight: 11,
  });
  summaryPage.drawText(pdfLibSafeText(`Nº empresa instaladora autorizada (REBT): ${rebtEmpresaNum}`), {
    x: 36,
    y: 556,
    size: 9.5,
    font: bold,
    maxWidth: 500,
    lineHeight: 11,
  });
  summaryPage.drawText(pdfLibSafeText(`Carné profesional del instalador: ${installerCard || "—"}`), {
    x: 36,
    y: 538,
    size: 9,
    font,
    maxWidth: 500,
    lineHeight: 11,
  });
  summaryPage.drawText(`Referencia de expediente: ${dossierReference}`, {
    x: 36,
    y: 520,
    size: 9.5,
    font: bold,
    color: rgb(0.2, 0.2, 0.25),
  });
  summaryPage.drawText(pdfLibSafeText(`Sección de cable DC (mm²): ${cableDcMm2}`), {
    x: 36,
    y: 502,
    size: 9,
    font,
    maxWidth: 500,
  });
  summaryPage.drawText(pdfLibSafeText(`Sección de cable AC (mm²): ${cableAcMm2}`), {
    x: 36,
    y: 484,
    size: 9,
    font,
    maxWidth: 500,
  });
  let cableNoteY = 468;
  for (const ln of wrapPdfLines(pdfLibSafeText(CABLE_SECTIONS_REBT_NOTE), 500, italic, 7.2)) {
    summaryPage.drawText(ln, {
      x: 36,
      y: cableNoteY,
      size: 7.2,
      font: italic,
      color: rgb(0.28, 0.32, 0.36),
      maxWidth: 500,
    });
    cableNoteY -= 9;
  }

  if (project.organization.logoUrl || project.organization.logoPath) {
    const image = await embedAutoImage(
      pdf,
      project.organization.logoUrl ?? project.organization.logoPath ?? "",
      project.organization.logoPath,
    );
    if (image) {
      const maxW = 128;
      const maxH = 62;
      const ratio = Math.min(maxW / image.width, maxH / image.height);
      const w = image.width * ratio;
      const h = image.height * ratio;
      summaryPage.drawImage(image, {
        x: 430 + (maxW - w) / 2,
        y: 658 + (maxH - h) / 2,
        width: w,
        height: h,
      });
    }
  }

  if (project.reviewedByOfficeTech) {
    summaryPage.drawRectangle({
      x: 404,
      y: 730,
      width: 160,
      height: 24,
      color: rgb(0.93, 0.98, 0.95),
      borderColor: rgb(0.16, 0.52, 0.34),
      borderWidth: 1,
    });
    summaryPage.drawText("Documento validado por la Dirección Técnica", {
      x: 411,
      y: 739,
      size: 7.5,
      font: bold,
      color: rgb(0.1, 0.43, 0.29),
    });
  }

  summaryPage.drawText("INVENTARIO DE EQUIPOS CERTIFICADOS", { x: 24, y: 412, size: 12, font: bold });
  summaryPage.drawText("Tabla de trazabilidad de activos", {
    x: 24,
    y: 398,
    size: 8.5,
    font,
    color: rgb(0.38, 0.38, 0.42),
  });
  const tableX = 24;
  const tableYTop = 384;
  const colW = [102, 92, 92, 78, 175];
  const panelItemsFromDb = parseEquipmentItems(project.equipmentPanelItems);
  const batteryItemsFromDb = parseEquipmentItems(project.equipmentBatteryItems);
  const inverterItemsFromDb = parseEquipmentItems(project.equipmentInverterItems);
  const inverterSerials = uniqueSerials(
    project.equipmentInverterSerial?.trim()
      ? [project.equipmentInverterSerial.trim()]
      : [],
  );
  const panelSerials = uniqueSerials([
    ...(project.equipmentPanelSerials ?? []),
    ...(project.assetPanelSerial?.trim() ? [project.assetPanelSerial.trim()] : []),
  ]);
  const batterySerials = uniqueSerials([
    ...(project.equipmentBatterySerials ?? []),
    ...(project.equipmentBatterySerial?.trim() ? [project.equipmentBatterySerial.trim()] : []),
  ]);
  let normalizedPanelItems: EquipmentItem[] = mergeSerialsIntoItems(
    panelItemsFromDb,
    panelSerials,
    project.assetPanelBrand,
    project.assetPanelModel,
  );
  const normalizedBatteryItems: EquipmentItem[] = mergeSerialsIntoItems(
    batteryItemsFromDb,
    batterySerials,
    project.assetBatteryBrand,
    project.assetBatteryModel,
  );
  let normalizedInverterItems: EquipmentItem[] = mergeSerialsIntoItems(
    inverterItemsFromDb,
    inverterSerials,
    project.assetInverterBrand,
    project.assetInverterModel,
  );
  if (normalizedInverterItems.length === 0 && inverterSerials.length > 0) {
    normalizedInverterItems = [
      {
        brand: project.assetInverterBrand?.trim() || "",
        model: project.assetInverterModel?.trim() || "",
        serial: inverterSerials[0],
        nominalKw:
          project.inverterPowerKwn != null
            ? String(Number(project.inverterPowerKwn))
            : undefined,
      },
    ];
  }
  normalizedInverterItems = normalizedInverterItems.map((it) => {
    if (it.nominalKw?.trim()) return it;
    if (project.inverterPowerKwn == null) return it;
    return { ...it, nominalKw: String(Number(project.inverterPowerKwn)) };
  });
  const peakKwpStr =
    project.peakPowerKwp != null
      ? String(Number(project.peakPowerKwp))
      : totalPeakWpW > 0
        ? String(Math.round((totalPeakWpW / 1000) * 100) / 100)
        : "";
  if (
    normalizedPanelItems.length === 1 &&
    peakKwpStr &&
    !normalizedPanelItems[0].peakWp?.trim()
  ) {
    normalizedPanelItems = [{ ...normalizedPanelItems[0], peakWp: peakKwpStr }];
  }
  const tableRows: string[][] = [
    ...normalizedPanelItems.map((item, index) => [
      `Panel ${index + 1}`,
      item.brand || "—",
      item.model || "—",
      equipmentSpecCell("panel", item),
      item.serial || "—",
    ]),
    ...normalizedInverterItems.map((item, index) => [
      `Inversor ${index + 1}`,
      item.brand || "—",
      item.model || "—",
      equipmentSpecCell("inverter", item),
      item.serial || "—",
    ]),
    ...normalizedBatteryItems.map((item, index) => [
      `Batería ${index + 1}`,
      item.brand || "—",
      item.model || "—",
      equipmentSpecCell("battery", item),
      item.serial || "—",
    ]),
  ];
  if (normalizedPanelItems.length === 0) {
    const serialCell =
      panelSerials.length > 0
        ? pdfLibSafeText(panelSerials.join(", ").slice(0, 120))
        : project.assetPanelSerial?.trim() || "—";
    tableRows.unshift([
      "Panel",
      project.assetPanelBrand?.trim() || "—",
      project.assetPanelModel?.trim() || "—",
      peakKwpStr ? `${peakKwpStr} kWp` : "—",
      serialCell,
    ]);
  }
  if (normalizedInverterItems.length === 0) {
    tableRows.push([
      "Inversor",
      project.assetInverterBrand?.trim() || "—",
      project.assetInverterModel?.trim() || "—",
      "—",
      project.equipmentInverterSerial?.trim() || "—",
    ]);
  }
  if (normalizedBatteryItems.length === 0) {
    tableRows.push([
      "Batería",
      project.assetBatteryBrand?.trim() || "—",
      project.assetBatteryModel?.trim() || "—",
      "—",
      "—",
    ]);
  }
  const rowH = 18;
  const headers = ["Equipo", "Marca", "Modelo", "Pot. / cap.", "Nº serie"];
  const invHeaderFill = solarYellow;
  const invHeaderBorder = luxBlack;
  const invCellBorder = rgb(0.82, 0.84, 0.88);
  const invBorderW = 0.35;
  let xPos = tableX;
  for (let ci = 0; ci < headers.length; ci += 1) {
    summaryPage.drawRectangle({
      x: xPos,
      y: tableYTop - rowH,
      width: colW[ci],
      height: rowH,
      color: invHeaderFill,
      borderColor: invHeaderBorder,
      borderWidth: invBorderW,
    });
    summaryPage.drawText(headers[ci], {
      x: xPos + 5,
      y: tableYTop - 12,
      size: 7.8,
      font: bold,
      color: luxBlack,
    });
    xPos += colW[ci];
  }
  for (let ri = 0; ri < tableRows.length; ri += 1) {
    const yTop = tableYTop - rowH * (ri + 1);
    const rowFill = ri % 2 === 0 ? rgb(1, 1, 1) : rgb(0.992, 0.993, 0.996);
    let x = tableX;
    for (let ci = 0; ci < 5; ci += 1) {
      summaryPage.drawRectangle({
        x,
        y: yTop - rowH,
        width: colW[ci],
        height: rowH,
        color: rowFill,
        borderColor: invCellBorder,
        borderWidth: invBorderW,
      });
      summaryPage.drawText(String(tableRows[ri][ci]), {
        x: x + 5,
        y: yTop - 12,
        size: 7.6,
        font,
        maxWidth: colW[ci] - 10,
      });
      x += colW[ci];
    }
  }

  const tableBottomY = tableYTop - rowH * (tableRows.length + 1);
  summaryPage.drawText(
    pdfLibSafeText("Certificación CE y cumplimiento de normativa IEC verificada por LuxOps."),
    {
      x: 24,
      y: tableBottomY - 10,
      size: 7.4,
      font: italic,
      color: rgb(0.32, 0.32, 0.36),
    },
  );
  const traceStartY = Math.max(250, tableBottomY - 20);
  summaryPage.drawText("Trazabilidad y garantías", { x: 24, y: traceStartY, size: 11, font: bold });
  let traceY = traceStartY - 16;
  const serialRows: [string, string | null][] = [
    [
      "Inversor (N/S)",
      normalizedInverterItems.length > 0
        ? normalizedInverterItems.map((item) => item.serial).filter(Boolean).join(", ")
        : project.equipmentInverterSerial,
    ],
    [
      "Baterías (N/S)",
      normalizedBatteryItems.length > 0
        ? normalizedBatteryItems.map((item) => item.serial).filter(Boolean).join(", ")
        : project.equipmentBatterySerial,
    ],
    ["Vatímetro (N/S)", project.equipmentVatimetroSerial],
  ];
  for (const [label, val] of serialRows) {
    const text = (val ?? "").trim();
    summaryPage.drawText(`${label}: ${text || "—"}`, {
      x: 24,
      y: traceY,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    traceY -= 13;
  }
  traceY -= 4;
  summaryPage.drawText("Observaciones técnicas / notas de garantía", {
    x: 24,
    y: traceY,
    size: 9,
    font: bold,
    color: rgb(0.15, 0.15, 0.15),
  });
  traceY -= 12;
  const notes = (project.warrantyNotes ?? "").trim();
  if (notes) {
    const noteLines = wrapPdfLines(notes, 520, font, 9);
    const maxNoteLines = 22;
    for (let ni = 0; ni < Math.min(noteLines.length, maxNoteLines); ni += 1) {
      summaryPage.drawText(noteLines[ni], {
        x: 24,
        y: traceY,
        size: 9,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      traceY -= 11;
    }
    if (noteLines.length > maxNoteLines) {
      summaryPage.drawText("(Continuación en registro digital de obra.)", {
        x: 24,
        y: traceY,
        size: 8,
        font: italic,
        color: rgb(0.45, 0.45, 0.45),
      });
      traceY -= 10;
    }
  } else {
    summaryPage.drawText("Sin notas adicionales registradas.", {
      x: 24,
      y: traceY,
      size: 9,
      font: italic,
      color: rgb(0.45, 0.45, 0.45),
    });
    traceY -= 12;
  }

  traceY -= 14;
  summaryPage.drawText("Incidencias en campo y descargo de responsabilidad", {
    x: 24,
    y: traceY,
    size: 10,
    font: bold,
    color: rgb(0.55, 0.22, 0.08),
  });
  traceY -= 14;
  const incidents = (project.installationIncidentNotes ?? "").trim();
  if (incidents) {
    const incLines = wrapPdfLines(incidents, 520, font, 9);
    const maxInc = 18;
    for (let ii = 0; ii < Math.min(incLines.length, maxInc); ii += 1) {
      summaryPage.drawText(incLines[ii], {
        x: 24,
        y: traceY,
        size: 9,
        font,
        color: rgb(0.25, 0.22, 0.2),
      });
      traceY -= 11;
    }
    if (incLines.length > maxInc) {
      summaryPage.drawText("(Texto truncado. Registro completo en LuxOps.)", {
        x: 24,
        y: traceY,
        size: 8,
        font: italic,
        color: rgb(0.45, 0.45, 0.45),
      });
      traceY -= 10;
    }
    traceY -= 6;
    const legal =
      "Lo anterior queda constancia para trámites de garantía y subvenciones. Condiciones no reflejadas en la documentación previa acordada o en el presente acta no podrán imputarse a la empresa instaladora con carácter retroactivo tras la firma de recepción por el cliente.";
    for (const ln of wrapPdfLines(legal, 520, italic, 8)) {
      summaryPage.drawText(ln, {
        x: 24,
        y: traceY,
        size: 8,
        font: italic,
        color: rgb(0.38, 0.36, 0.34),
      });
      traceY -= 10;
    }
  } else {
    for (const ln of wrapPdfLines(
      "El operario no registró incidencias adicionales en campo (tejas rotas previas, sombras no previstas, etc.).",
      520,
      italic,
      9,
    )) {
      summaryPage.drawText(ln, {
        x: 24,
        y: traceY,
        size: 9,
        font: italic,
        color: rgb(0.42, 0.42, 0.42),
      });
      traceY -= 12;
    }
  }

  traceY -= 6;
  summaryPage.drawText("Dossier Técnico y Memoria de Ingeniería", {
    x: 24,
    y: traceY,
    size: 11,
    font: bold,
  });
  traceY -= 14;
  const memoryText = (project.technicalMemory ?? "").trim();
  if (memoryText) {
    for (const ln of wrapPdfLines(memoryText, 520, font, 9)) {
      summaryPage.drawText(ln, { x: 24, y: traceY, size: 9, font, color: rgb(0.22, 0.22, 0.24) });
      traceY -= 11;
      if (traceY < PDF_FOOTER_CLEARANCE_Y + 200) break;
    }
  } else {
    summaryPage.drawText("Sin memoria técnica adicional registrada por oficina.", {
      x: 24,
      y: traceY,
      size: 9,
      font: italic,
      color: rgb(0.45, 0.45, 0.45),
    });
    traceY -= 12;
  }

  traceY -= 8;

  const kwpStr =
    project.peakPowerKwp != null
      ? String(Number(project.peakPowerKwp))
      : totalPeakWpW > 0
        ? String(Math.round((totalPeakWpW / 1000) * 100) / 100)
        : "—";
  const kwnStr = project.inverterPowerKwn != null ? String(Number(project.inverterPowerKwn)) : "—";
  const kwhStr = project.storageCapacityKwh != null ? String(Number(project.storageCapacityKwh)) : "—";
  const energyDisclaimerLines = wrapPdfLines(
    pdfLibSafeText(PRODUCTION_ESTIMATE_DISCLAIMER),
    520,
    italic,
    7.8,
  );
  const energyInnerTitle = 18;
  const energyLineStep = 13;
  const energyYieldBlock = annualYieldKwh != null ? 18 : 0;
  const energyDisclaimerH = energyDisclaimerLines.length * 9 + 6;
  const energyBoxH = Math.max(
    102,
    energyInnerTitle + 3 * energyLineStep + energyYieldBlock + energyDisclaimerH + 16,
  );

  const minTraceForEnergy = PDF_FOOTER_CLEARANCE_Y + energyBoxH + 56;
  if (traceY < minTraceForEnergy) {
    const cont = pdf.addPage([595, 842]);
    cont.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
    cont.drawText("INFORME DE INSTALACION", {
      x: 24,
      y: 818,
      size: 14,
      font: bold,
      color: rgb(0, 0, 0),
    });
    cont.drawText("Continuacion del resumen (energia y evidencias)", {
      x: 24,
      y: 798,
      size: 9,
      font,
      color: rgb(0.38, 0.38, 0.4),
    });
    summaryPage = cont;
    traceY = 772;
  }

  summaryPage.drawRectangle({
    x: 24,
    y: traceY - energyBoxH,
    width: 547,
    height: energyBoxH,
    color: rgb(0.99, 0.99, 0.99),
    borderColor: slateBorder,
    borderWidth: 0.5,
  });
  summaryPage.drawText("Resumen energético", {
    x: 30,
    y: traceY - 12,
    size: 9.5,
    font: bold,
    color: slateText,
  });
  let energyLineY = traceY - 28;
  summaryPage.drawText(pdfLibSafeText(`Potencia pico total: ${kwpStr} kWp`), {
    x: 30,
    y: energyLineY,
    size: 8.5,
    font,
    maxWidth: 520,
    color: slateText,
  });
  energyLineY -= energyLineStep;
  summaryPage.drawText(pdfLibSafeText(`Potencia nominal inversor: ${kwnStr} kWn`), {
    x: 30,
    y: energyLineY,
    size: 8.5,
    font,
    maxWidth: 520,
    color: slateText,
  });
  energyLineY -= energyLineStep;
  summaryPage.drawText(pdfLibSafeText(`Capacidad almacenamiento: ${kwhStr} kWh`), {
    x: 30,
    y: energyLineY,
    size: 8.5,
    font,
    maxWidth: 520,
    color: slateText,
  });
  energyLineY -= energyLineStep;
  if (annualYieldKwh != null) {
    summaryPage.drawText(
      `Rendimiento energético estimado posinstalación: ${annualYieldKwh.toLocaleString("es-ES")} kWh/año`,
      {
        x: 30,
        y: energyLineY,
        size: 9,
        font: bold,
        maxWidth: 520,
        color: solarYellow,
      },
    );
    energyLineY -= 16;
  }
  energyLineY -= 4;
  for (const dl of energyDisclaimerLines) {
    summaryPage.drawText(dl, {
      x: 30,
      y: energyLineY,
      size: 7.8,
      font: italic,
      maxWidth: 520,
      color: rgb(0.38, 0.4, 0.42),
    });
    energyLineY -= 9;
  }

  traceY -= energyBoxH + 14;
  summaryPage.drawText("Evidencias fotográficas", { x: 24, y: traceY, size: 12, font: bold });
  traceY -= 16;
  const fieldEvidenceCount = project.photos.filter((p) => p.tipo !== "ANEXO_PVGIS").length;
  summaryPage.drawText(
    `${fieldEvidenceCount} evidencias registradas con geolocalización y marca de tiempo.`,
    { x: 24, y: traceY, size: 9, font, color: rgb(0.35, 0.35, 0.35) },
  );

  const CERT_BOTTOM_SAFE = PDF_FOOTER_CLEARANCE_Y + 18;
  const PAGE_BREAK_MIN_SPACE = 150;

  const drawNewCertPage = (continuation: boolean): { page: PDFPage; cy: number } => {
    const page = pdf.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 40, y: 802, width: 515, height: 0.5, color: slateBorder });
    if (!continuation) {
      page.drawText("CERTIFICACIÓN TÉCNICA DE OBRA", {
        x: 40,
        y: 788,
        size: 13,
        font: bold,
        color: slateText,
      });
      page.drawText("Ingeniería de ejecución · mediciones y configuración registradas en campo", {
        x: 40,
        y: 770,
        size: 8,
        font: inter,
        color: rgb(0.38, 0.38, 0.4),
      });
      return { page, cy: 742 };
    }
    page.drawText("CERTIFICACIÓN TÉCNICA DE OBRA (continuación)", {
      x: 40,
      y: 788,
      size: 11,
      font: bold,
      color: slateText,
    });
    return { page, cy: 758 };
  };

  const certFirst = drawNewCertPage(false);
  let certPage = certFirst.page;
  let cy = certFirst.cy;

  const ensureCertVerticalSpace = (minRemainingAboveBottom: number) => {
    if (cy - CERT_BOTTOM_SAFE < minRemainingAboveBottom) {
      const next = drawNewCertPage(true);
      certPage = next.page;
      cy = next.cy;
    }
  };

  const prlComplete =
    Boolean(project.prlAcknowledgedAt) &&
    project.prlLineLifeHarness &&
    project.prlCollectiveProtection &&
    project.prlRoofTransitOk &&
    project.prlPpeInUse;

  if (prlComplete) {
    ensureCertVerticalSpace(PAGE_BREAK_MIN_SPACE);
    certPage.drawText("Seguridad y salud en el trabajo (PRL)", {
      x: 40,
      y: cy,
      size: 9.5,
      font: bold,
      color: slateText,
    });
    cy -= 14;
    const prlItems: [string, string][] = [
      ["Línea de vida e integridad de arneses verificada.", "Sí"],
      ["Protecciones colectivas/individuales operativas.", "Sí"],
      ["Estado del tejado/soporte apto para el tránsito.", "Sí"],
      ["EPIS (Casco, guantes, calzado) en uso.", "Sí"],
    ];
    const prlLh = 18;
    const prlC1 = 365;
    const prlC2 = 110;
    for (const [label, ok] of prlItems) {
      certPage.drawRectangle({
        x: 40,
        y: cy - prlLh + 14,
        width: prlC1,
        height: prlLh,
        borderColor: slateBorder,
        borderWidth: 0.5,
      });
      certPage.drawRectangle({
        x: 40 + prlC1,
        y: cy - prlLh + 14,
        width: prlC2,
        height: prlLh,
        borderColor: slateBorder,
        borderWidth: 0.5,
      });
      certPage.drawText(pdfLibSafeText(label), {
        x: 44,
        y: cy - 4,
        size: 7.5,
        font: inter,
        color: slateText,
        maxWidth: prlC1 - 8,
      });
      certPage.drawText(pdfLibSafeText(ok), {
        x: 44 + prlC1 + 42,
        y: cy - 4,
        size: 8,
        font: inter,
        color: slateText,
      });
      cy -= prlLh;
    }
    cy -= 8;
    certPage.drawText("Protocolo de seguridad validado por el operario antes de iniciar trabajos", {
      x: 40,
      y: cy,
      size: 8.5,
      font: inter,
      color: slateText,
      maxWidth: 510,
    });
    cy -= 20;
    const ts = project.prlAcknowledgedAt
      ? new Date(project.prlAcknowledgedAt).toLocaleString("es-ES")
      : "—";
    const gpsPrl =
      project.prlAckLatitude != null && project.prlAckLongitude != null
        ? `${project.prlAckLatitude.toFixed(6)}, ${project.prlAckLongitude.toFixed(6)}`
        : "—";
    certPage.drawText(`Timestamp: ${ts} · GPS: ${gpsPrl}`, {
      x: 40,
      y: cy,
      size: 7.5,
      font: inter,
      color: rgb(0.35, 0.38, 0.42),
    });
    cy -= 22;
  }

  const dec = (v: { toString: () => string } | null | undefined) =>
    pdfLibSafeText(v != null && String(v).trim() !== "" ? v.toString() : "-");
  /** Campos explícitos de BD (no reutilizar marca/modelo de batería del inventario). */
  const measThermalBrand = pdfLibSafeText((project.thermalProtectionBrand ?? "").trim() || "—");
  const measThermalModel = pdfLibSafeText((project.thermalProtectionModel ?? "").trim() || "—");
  const measSpdBrand = pdfLibSafeText((project.spdBrand ?? "").trim() || "—");
  const measSpdModel = pdfLibSafeText((project.spdModel ?? "").trim() || "—");
  const certRowsA: [string, string][] = [
    ["Estructura — marca", (project.structureBrand ?? "").trim() || "—"],
    [
      "Tipo de montaje",
      project.structureMounting
        ? (MOUNTING_LABEL[project.structureMounting] ?? project.structureMounting)
        : "—",
    ],
    [
      "Configuración de strings",
      (project.stringConfiguration ?? "").trim() || "—",
    ],
    ["Modalidad de autoconsumo", modalityLabelPdf],
    ["Sección de cable DC (mm²)", cableDcMm2],
    ["Sección de cable AC (mm²)", cableAcMm2],
    ["Tensión circuito abierto Voc (V)", dec(project.electricVocVolts)],
    ["Corriente cortocircuito Isc (A)", dec(project.electricIscAmps)],
    ["Resistencia de puesta a tierra (ohm)", dec(project.earthResistanceOhms)],
    ["Protección térmica — marca", measThermalBrand],
    ["Protección térmica — modelo", measThermalModel],
    ["SPD — marca", measSpdBrand],
    ["SPD — modelo", measSpdModel],
    ["Azimut (grados)", dec(project.panelAzimuthDegrees)],
    ["Inclinación módulo (grados)", dec(project.panelTiltDegrees)],
  ];
  const c1 = 200;
  const c2 = 315;
  const lhBase = 20;
  ensureCertVerticalSpace(PAGE_BREAK_MIN_SPACE);
  certPage.drawText("Mediciones y protecciones", {
    x: 40,
    y: cy,
    size: 9,
    font: bold,
    color: slateText,
  });
  cy -= 16;
  for (const [k, val] of certRowsA) {
    const valLines = wrapPdfLines(pdfLibSafeText(val), c2 - 12, inter, 8);
    const rowH = Math.max(lhBase, 16 + Math.max(0, valLines.length - 1) * 10);
    ensureCertVerticalSpace(rowH + 36);
    certPage.drawRectangle({
      x: 40,
      y: cy - rowH + 14,
      width: c1,
      height: rowH,
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawRectangle({
      x: 40 + c1,
      y: cy - rowH + 14,
      width: c2,
      height: rowH,
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawText(pdfLibSafeText(k), {
      x: 44,
      y: cy - 4,
      size: 8,
      font: inter,
      color: slateText,
      maxWidth: c1 - 12,
    });
    let valY = cy - 4;
    for (const vl of valLines.length > 0 ? valLines : ["-"]) {
      certPage.drawText(vl, {
        x: 44 + c1,
        y: valY,
        size: 8,
        font: inter,
        color: slateText,
        maxWidth: c2 - 12,
      });
      valY -= 10;
    }
    cy -= rowH;
  }
  cy -= 6;
  ensureCertVerticalSpace(48);
  certPage.drawText("Justificación secciones de cable (ITC-BT-19 / ITC-BT-07)", {
    x: 40,
    y: cy,
    size: 8,
    font: bold,
    color: slateText,
  });
  cy -= 12;
  for (const ln of wrapPdfLines(pdfLibSafeText(CABLE_SECTIONS_REBT_NOTE), 510, inter, 7.5)) {
    ensureCertVerticalSpace(14);
    certPage.drawText(ln, {
      x: 40,
      y: cy,
      size: 7.5,
      font: inter,
      color: rgb(0.32, 0.34, 0.38),
      maxWidth: 510,
    });
    cy -= 11;
  }
  cy -= 8;
  ensureCertVerticalSpace(PAGE_BREAK_MIN_SPACE);
  certPage.drawText("Protocolo fotográfico (confirmaciones de obra)", {
    x: 40,
    y: cy,
    size: 9,
    font: bold,
  });
  cy -= 14;
  const protoRows: [string, string][] = [
    ["Placas de características", project.photoProtocolNameplates ? "Sí" : "No"],
    ["Cuadro de protecciones (cableado / etiquetado)", project.photoProtocolDistributionBoard ? "Sí" : "No"],
    ["Fijaciones y anclajes", project.photoProtocolFixings ? "Sí" : "No"],
    ["Puesta a tierra de estructura", project.photoProtocolStructureEarthing ? "Sí" : "No"],
  ];
  for (const [k, val] of protoRows) {
    ensureCertVerticalSpace(lhBase + 36);
    certPage.drawRectangle({
      x: 40,
      y: cy - lhBase + 14,
      width: c1,
      height: lhBase,
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawRectangle({
      x: 40 + c1,
      y: cy - lhBase + 14,
      width: c2,
      height: lhBase,
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawText(pdfLibSafeText(k), {
      x: 44,
      y: cy - 4,
      size: 8,
      font: inter,
      color: slateText,
    });
    certPage.drawText(pdfLibSafeText(val), {
      x: 44 + c1,
      y: cy - 4,
      size: 8,
      font: inter,
      color: slateText,
    });
    cy -= lhBase;
  }
  if (annualYieldKwh != null) {
    ensureCertVerticalSpace(68);
    cy -= 10;
    certPage.drawRectangle({
      x: 40,
      y: cy - 50,
      width: 515,
      height: 50,
      color: rgb(0.9725, 0.9804, 0.9882),
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawText("Rendimiento energético estimado posinstalación:", {
      x: 48,
      y: cy - 16,
      size: 8,
      font: inter,
      color: slateText,
    });
    certPage.drawText(`${annualYieldKwh.toLocaleString("es-ES")} kWh/año`, {
      x: 48,
      y: cy - 30,
      size: 11,
      font: bold,
      color: solarYellow,
    });
    certPage.drawText(PRODUCTION_ESTIMATE_DISCLAIMER, {
      x: 48,
      y: cy - 42,
      size: 7.5,
      font: italic,
      color: rgb(0.38, 0.4, 0.42),
      maxWidth: 460,
    });
    cy -= 58;
  } else {
    ensureCertVerticalSpace(28);
    cy -= 8;
    certPage.drawText(PRODUCTION_ESTIMATE_DISCLAIMER, {
      x: 40,
      y: cy,
      size: 7.8,
      font: italic,
      color: rgb(0.38, 0.4, 0.42),
      maxWidth: 510,
    });
    cy -= 20;
  }
  ensureCertVerticalSpace(130);
  cy -= 12;
  certPage.drawText("Instalador — carné profesional", {
    x: 40,
    y: cy,
    size: 9,
    font: bold,
    color: slateText,
  });
  cy -= 14;
  certPage.drawText((project.installerProfessionalCard ?? "").trim() || "—", {
    x: 40,
    y: cy,
    size: 9,
    font: inter,
  });
  cy -= 18;
  certPage.drawText(
    "Formación y entrega de documentación: el cliente confirma haber recibido formación básica, manuales y acceso a monitorización.",
    { x: 40, y: cy, size: 8, font: inter, maxWidth: 510, lineHeight: 11 },
  );
  certPage.drawText(project.clientTrainingAcknowledged ? "Declaración registrada en acta digital." : "—", {
    x: 40,
    y: cy - 28,
    size: 8,
    font: inter,
    color: rgb(0.25, 0.45, 0.32),
  });

  const cellW = 252;
  const cellH = 314;
  const rowGap = 20;
  const cellBlock = cellH + rowGap;
  const startX = 24;
  const minPhotoY = 52;
  let photoIndex = 0;
  const photoList = project.photos;
  const evidencePhotoList = photoList.filter(
    (p) => p.tipo !== "ESQUEMA_UNIFILAR" && p.tipo !== "ANEXO_PVGIS",
  );
  const unifilarPhotoList = photoList.filter((p) => p.tipo === "ESQUEMA_UNIFILAR");

  while (photoIndex < evidencePhotoList.length) {
    const photoPage = pdf.addPage([595, 842]);
    photoPage.drawText("EVIDENCIAS DE CAMPO", {
      x: 24,
      y: 808,
      size: 14,
      font: bold,
    });
    photoPage.drawText("Grid 2x2 · GPS y hora por evidencia · paginación dinámica", {
      x: 24,
      y: 792,
      size: 9,
      color: rgb(0.35, 0.35, 0.35),
      font,
    });

    let yTop = 752;
    let drawnOnPage = false;

    while (photoIndex < evidencePhotoList.length) {
      const remaining = evidencePhotoList.length - photoIndex;
      const rowSize = remaining >= 2 ? 2 : 1;
      if (rowSize === 1 && drawnOnPage) {
        break;
      }
      if (yTop - cellH < minPhotoY) {
        break;
      }

      for (let slot = 0; slot < rowSize; slot += 1) {
        const photo = evidencePhotoList[photoIndex + slot];
        const col = slot;
        const x = startX + col * (cellW + 24);
        const yTopCell = yTop;

        photoPage.drawRectangle({
          x,
          y: yTopCell - cellH,
          width: cellW,
          height: cellH,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.88, 0.88, 0.88),
          borderWidth: 1,
        });

        const img = await embedAutoImage(pdf, photo.url, photo.storagePath);
        if (img) {
          const maxW = cellW - 24;
          const maxH = 216;
          const ratio = Math.min(maxW / img.width, maxH / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          photoPage.drawImage(img, {
            x: x + (cellW - w) / 2,
            y: yTopCell - 14 - h,
            width: w,
            height: h,
          });
        }

        photoPage.drawRectangle({
          x: x + 10,
          y: yTopCell - 286,
          width: cellW - 20,
          height: 40,
          color: rgb(0.94, 0.94, 0.94),
          borderColor: rgb(0.9, 0.9, 0.9),
          borderWidth: 0.8,
        });
        photoPage.drawText(`${photo.tipo}`, {
          x: x + 16,
          y: yTopCell - 269,
          size: 8.6,
          font: bold,
        });
        photoPage.drawText(
          `GPS ${photo.latitude?.toFixed(6) ?? "-"}, ${photo.longitude?.toFixed(6) ?? "-"}`,
          { x: x + 74, y: yTopCell - 269, size: 8, font, color: rgb(0.25, 0.25, 0.25) },
        );
        photoPage.drawText(
          `Hora ${new Date(photo.createdAt).toLocaleString("es-ES")}`,
          { x: x + 16, y: yTopCell - 281, size: 8, font, color: rgb(0.35, 0.35, 0.35) },
        );
      }

      photoIndex += rowSize;
      yTop -= cellBlock;
      drawnOnPage = true;
    }
  }

  for (let ui = 0; ui < unifilarPhotoList.length; ui += 1) {
    const photo = unifilarPhotoList[ui];
    const annexPage = pdf.addPage([595, 842]);
    annexPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
    const annexTitlePrefix =
      unifilarPhotoList.length > 1
        ? `ANEXO I (${ui + 1}/${unifilarPhotoList.length}):`
        : "ANEXO I:";
    annexPage.drawText(annexTitlePrefix, {
      x: 40,
      y: 808,
      size: 11,
      font: bold,
      color: rgb(0.12, 0.12, 0.14),
    });
    annexPage.drawText("ESQUEMA UNIFILAR DE LA INSTALACIÓN", {
      x: 40,
      y: 790,
      size: 13,
      font: bold,
      color: rgb(0.05, 0.05, 0.08),
    });
    const img = await embedAutoImage(pdf, photo.url, photo.storagePath);
    const margin = 40;
    const maxW = 595 - margin * 2;
    const topY = 772;
    const annexMetaBand = 34;
    const imageBandBottom = PDF_FOOTER_CLEARANCE_Y + annexMetaBand;
    const maxH = Math.max(120, topY - imageBandBottom);
    if (img) {
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      // Alinea arriba para aprovechar espacio y evitar huecos grandes.
      const yImgBottom = Math.max(imageBandBottom, topY - h);
      annexPage.drawImage(img, {
        x: (595 - w) / 2,
        y: yImgBottom,
        width: w,
        height: h,
      });
    } else {
      annexPage.drawRectangle({
        x: margin,
        y: 100,
        width: maxW,
        height: 620,
        borderColor: rgb(0.82, 0.82, 0.85),
        borderWidth: 1,
        color: rgb(0.97, 0.97, 0.98),
      });
      annexPage.drawText("Espacio para esquema unifilar — imagen no disponible en almacenamiento.", {
        x: margin + 16,
        y: 400,
        size: 10,
        font: inter,
        color: rgb(0.42, 0.42, 0.45),
        maxWidth: maxW - 32,
      });
    }
    annexPage.drawText(
      `GPS ${photo.latitude != null && photo.longitude != null ? `${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}` : "— (carga desde oficina)"}`,
      { x: 40, y: PDF_FOOTER_CLEARANCE_Y + 22, size: 8, font, color: rgb(0.35, 0.35, 0.35) },
    );
    annexPage.drawText(`Registro ${new Date(photo.createdAt).toLocaleString("es-ES")}`, {
      x: 40,
      y: PDF_FOOTER_CLEARANCE_Y + 10,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  if (unifilarPhotoList.length === 0) {
    const annexPage = pdf.addPage([595, 842]);
    annexPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
    annexPage.drawText("ANEXO I:", {
      x: 40,
      y: 808,
      size: 11,
      font: bold,
      color: rgb(0.12, 0.12, 0.14),
    });
    annexPage.drawText("ESQUEMA UNIFILAR DE LA INSTALACIÓN", {
      x: 40,
      y: 790,
      size: 13,
      font: bold,
      color: rgb(0.05, 0.05, 0.08),
    });
    annexPage.drawRectangle({
      x: 40,
      y: 100,
      width: 515,
      height: 620,
      borderColor: rgb(0.78, 0.78, 0.82),
      borderWidth: 1.2,
      color: rgb(0.98, 0.98, 0.99),
    });
    let annexPlaceholderY = 400;
    for (const ln of wrapPdfLines(
      pdfLibSafeText(
        "Espacio reservado para la representación gráfica del esquema unifilar conforme a RD 244/2019 y REBT. Incorpore la imagen desde la app (operario) o desde la oficina técnica (administrador).",
      ),
      470,
      inter,
      10,
    )) {
      annexPage.drawText(ln, {
        x: 56,
        y: annexPlaceholderY,
        size: 10,
        font: inter,
        color: rgb(0.38, 0.38, 0.42),
      });
      annexPlaceholderY -= 13;
    }
  }

  const pvgisPhotos = photoList.filter((p) => p.tipo === "ANEXO_PVGIS");
  for (let pi = 0; pi < pvgisPhotos.length; pi += 1) {
    const photo = pvgisPhotos[pi];
    const bytes = await imageToBytes(photo.url, photo.storagePath ?? null);
    const isPdf =
      bytes &&
      bytes.length > 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46;
    const cover = pdf.addPage([595, 842]);
    cover.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
    const pvgisTitle =
      pvgisPhotos.length > 1
        ? `ANEXO II (${pi + 1}/${pvgisPhotos.length}): INFORME DE PRODUCCIÓN (DOCUMENTO APORTADO)`
        : "ANEXO II: INFORME DE PRODUCCIÓN (DOCUMENTO APORTADO)";
    cover.drawText(pvgisTitle, {
      x: 40,
      y: 808,
      size: 11,
      font: bold,
      color: rgb(0.12, 0.12, 0.14),
      maxWidth: 510,
    });
    cover.drawText("Documento opcional aportado por el operario (p. ej. informe PVGIS oficial).", {
      x: 40,
      y: 786,
      size: 8.5,
      font: inter,
      color: rgb(0.38, 0.38, 0.42),
      maxWidth: 510,
    });
    const regGps =
      photo.latitude != null && photo.longitude != null
        ? `${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`
        : "—";
    cover.drawText(`Registro ${new Date(photo.createdAt).toLocaleString("es-ES")} · GPS ${regGps}`, {
      x: 40,
      y: 768,
      size: 7.5,
      font: inter,
      color: rgb(0.42, 0.42, 0.45),
    });
    if (isPdf && bytes) {
      try {
        const srcDoc = await PDFDocument.load(bytes);
        const indices = srcDoc.getPageIndices();
        for (const idx of indices) {
          const [copied] = await pdf.copyPages(srcDoc, [idx]);
          pdf.addPage(copied);
        }
        continue;
      } catch {
        /* mostrar aviso en portada */
      }
    }
    // Si no es PDF, intentamos incrustarlo como imagen (captura PVGIS).
    const img = await embedAutoImage(pdf, photo.url, photo.storagePath ?? null);
    if (img) {
      const maxW = 515;
      // Reserva espacio para la línea "Adjunto aportado..." sin que se solape con la imagen.
      const labelY = 742;
      const topY = labelY - 14;
      const bottomY = PDF_FOOTER_CLEARANCE_Y;
      const maxH = Math.max(200, topY - bottomY);
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (595 - w) / 2;
      // Alineado arriba para evitar “aire” enorme como en Gmail/PDF viewers.
      const y = Math.max(bottomY, topY - h);
      cover.drawImage(img, { x, y, width: w, height: h });
      cover.drawText("Adjunto aportado como imagen (captura).", {
        x: 40,
        y: labelY,
        size: 8,
        font: inter,
        color: rgb(0.42, 0.42, 0.45),
      });
      continue;
    }

    cover.drawText("No se pudo incrustar el adjunto (PDF o imagen). Sube un PDF válido o revisa el archivo en LuxOps.", {
      x: 40,
      y: 400,
      size: 10,
      font: inter,
      color: rgb(0.55, 0.35, 0.28),
      maxWidth: 500,
    });
  }

  const legalBoxBg = rgb(0.985, 0.985, 0.985);
  const legalBorder = rgb(0.85, 0.85, 0.85);

  let legalPage = pdf.addPage([595, 842]);
  legalPage.drawText("CIERRE LEGAL", { x: 24, y: 808, size: 14, font: bold });
  legalPage.drawText("DECLARACIÓN RESPONSABLE DEL INSTALADOR:", {
    x: 24,
    y: 782,
    size: 10.5,
    font: bold,
  });
  const legalText =
    "El instalador autorizado abajo firmante certifica que la instalación descrita en este informe técnico ha sido ejecutada siguiendo las especificaciones del fabricante, cumpliendo estrictamente con el Reglamento Electrotécnico de Baja Tensión (REBT) y la normativa vigente para instalaciones de autoconsumo. Los datos de geolocalización y números de serie aquí reflejados han sido verificados mediante la plataforma LuxOps y corresponden fielmente a la obra ejecutada.";
  let legalY = 760;
  for (const line of wrapPdfLines(pdfLibSafeText(legalText), 546, font, 10)) {
    legalPage.drawText(line, { x: 24, y: legalY, size: 10, font, color: rgb(0.2, 0.2, 0.22) });
    legalY -= 15;
  }
  legalY -= 10;
  const installCard = (project.installerProfessionalCard ?? "").trim();
  const complianceExtra = `${installCard ? `Carné profesional instalador: ${installCard}. ` : ""}El cliente confirma que ha recibido la formación básica de uso de la planta, manuales de usuario y acceso a la plataforma de monitorización.`;
  for (const line of wrapPdfLines(pdfLibSafeText(complianceExtra), 546, font, 9.5)) {
    legalPage.drawText(line, { x: 24, y: legalY, size: 9.5, font, color: rgb(0.22, 0.22, 0.24) });
    legalY -= 14;
  }

  legalY -= 8;
  const exemption = pdfLibSafeText(
    "LuxOps certifica la trazabilidad de los datos capturados en campo mediante coordenadas GPS y marcas de tiempo criptográficas, vinculando de forma unívoca la ejecución con el instalador autorizado.",
  );
  for (const line of wrapPdfLines(exemption, 546, italic, 7.6).slice(0, 6)) {
    legalPage.drawText(line, { x: 24, y: legalY, size: 7.6, font: italic, color: rgb(0.35, 0.35, 0.38) });
    legalY -= 10;
  }
  legalY -= 56;

  const signature = project.signatures[0];
  const installerSigSource = signature?.installerImageDataUrl ?? "";
  const installerSigPath = signature?.installerStoragePath ?? null;
  const clientSigSource = signature?.imageDataUrl ?? "";
  const clientSigPath = signature?.storagePath ?? null;
  const installerName = (signature?.installerName ?? project.operarioNombre ?? "").trim() || "Instalador";
  const clientName = (signature?.clientName ?? project.cliente ?? "").trim() || "Cliente";

  // Incluye metadatos (GPS + timestamp) bajo las cajas de firma.
  const signatureBlockH = 318;
  const minBottom = PDF_FOOTER_CLEARANCE_Y + 36;
  if (legalY - signatureBlockH < minBottom) {
    // No cabe holgado: saltamos a nueva página para firmas.
    legalPage = pdf.addPage([595, 842]);
    legalPage.drawText("FIRMAS Y CONFORMIDAD", { x: 24, y: 808, size: 14, font: bold });
    legalY = 752;
  } else {
    legalPage.drawText("FIRMAS Y CONFORMIDAD", { x: 24, y: legalY, size: 12, font: bold });
    legalY -= 44;
  }

  const sigBoxYTop = legalY;
  const sigBoxH = 210;
  const gapX = 26;
  const sigBoxW = (547 - gapX) / 2;
  const leftX = 24;
  const rightX = 24 + sigBoxW + gapX;
  const sigBoxY = sigBoxYTop - sigBoxH;

  const drawSigBox = async (params: {
    x: number;
    title: string;
    name: string;
    source: string;
    storagePath: string | null;
    meta?: { latitude?: number | null; longitude?: number | null; createdAt?: Date | null } | null;
  }) => {
    legalPage.drawText(params.title, { x: params.x, y: sigBoxYTop + 14, size: 9.5, font: bold });
    legalPage.drawRectangle({
      x: params.x,
      y: sigBoxY,
      width: sigBoxW,
      height: sigBoxH,
      color: legalBoxBg,
      borderColor: legalBorder,
      borderWidth: 1,
    });
    // Caja blanca interior para que el negro sea visible (siempre).
    legalPage.drawRectangle({
      x: params.x + 10,
      y: sigBoxY + 42,
      width: sigBoxW - 20,
      height: sigBoxH - 84,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 0.8,
    });

    if (params.source) {
      const img = await embedAutoImage(pdf, params.source, params.storagePath);
      if (img) {
        const maxW = sigBoxW - 22;
        const maxH = sigBoxH - 86;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        legalPage.drawImage(img, {
          x: params.x + (sigBoxW - w) / 2,
          y: sigBoxY + 52 + (maxH - h) / 2,
          width: w,
          height: h,
        });
      }
    }

    legalPage.drawText(pdfLibSafeText(params.name), {
      x: params.x + 12,
      y: sigBoxY + 18,
      size: 8.5,
      font,
      color: rgb(0.18, 0.18, 0.2),
      maxWidth: sigBoxW - 24,
    });

    // Metadatos antifraude bajo cada firma (REBT / firma digital): GPS + timestamp de captura.
    const gps =
      params.meta?.latitude != null && params.meta?.longitude != null
        ? `${params.meta.latitude.toFixed(6)}, ${params.meta.longitude.toFixed(6)}`
        : "-, -";
    const ts = params.meta?.createdAt ? new Date(params.meta.createdAt).toLocaleString("es-ES") : "-";
    legalPage.drawText(pdfLibSafeText(`GPS ${gps}`), {
      x: params.x + 12,
      y: sigBoxY + 6,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: sigBoxW - 24,
    });
    legalPage.drawText(pdfLibSafeText(`Timestamp ${ts}`), {
      x: params.x + 12,
      y: sigBoxY - 5,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: sigBoxW - 24,
    });
  };

  await drawSigBox({
    x: leftX,
    title: "Instalador",
    name: installerName,
    source: installerSigSource,
    storagePath: installerSigPath,
    meta: signature,
  });
  await drawSigBox({
    x: rightX,
    title: "Cliente",
    name: clientName,
    source: clientSigSource,
    storagePath: clientSigPath,
    meta: signature,
  });

  // Nota: los metadatos se renderizan ahora bajo cada caja de firma.

  const allPages = pdf.getPages();
  for (const [index, page] of allPages.entries()) {
    drawFooter({
      page,
      pageNumber: index + 1,
      totalPages: allPages.length,
      companyName,
      italic,
      projectId: project.id,
    });
  }

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
