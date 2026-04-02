import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { estimateAnnualYieldKwh, sumPanelPeakWpW } from "@/lib/pv-yield-estimate";
import { downloadStorageBytes } from "@/lib/storage";

export const dossierProjectInclude = {
  photos: { orderBy: { createdAt: "asc" as const } },
  signatures: { orderBy: { createdAt: "desc" as const }, take: 1 },
  organization: { select: { name: true, logoUrl: true, logoPath: true, brandColor: true } },
} satisfies Prisma.ProjectInclude;

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

async function embedSwissSansFont(pdf: PDFDocument) {
  try {
    const local = join(process.cwd(), "public", "fonts", "Inter-Regular.ttf");
    const bytes = await readFile(local);
    if (bytes.byteLength > 1000) {
      return pdf.embedFont(bytes, { subset: true });
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
      return pdf.embedFont(bytes, { subset: true });
    } catch {
      /* fallback below */
    }
  }
  return pdf.embedFont(StandardFonts.Helvetica);
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
  if (storagePath) {
    const bytes = await downloadStorageBytes({ bucket: "luxops-assets", path: storagePath });
    if (bytes) return bytes;
  }
  if (source.startsWith("data:image/")) return dataUrlToBytes(source);
  if (source.includes("/") && !source.startsWith("http")) {
    const bytes = await downloadStorageBytes({ bucket: "luxops-assets", path: source });
    if (bytes) return bytes;
  }
  const res = await fetch(source);
  if (!res.ok) return null;
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
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
  if (isPng) return pdf.embedPng(bytes);
  if (isJpg) return pdf.embedJpg(bytes);
  // Fallback: intenta PNG primero (la mayoría de firmas son PNG).
  try {
    return await pdf.embedPng(bytes);
  } catch {
    return await pdf.embedJpg(bytes);
  }
}

function drawFooter(params: {
  page: import("pdf-lib").PDFPage;
  pageNumber: number;
  totalPages: number;
  companyName: string;
  font: import("pdf-lib").PDFFont;
  italic: import("pdf-lib").PDFFont;
  projectId: string;
}) {
  const { page, pageNumber, totalPages, companyName, font, italic, projectId } = params;
  const { width } = page.getSize();
  const padX = 28;
  const innerW = width - 56;
  const footH = 40;
  page.drawRectangle({ x: 24, y: 18, width: width - 48, height: footH, color: rgb(0.98, 0.98, 0.98) });
  page.drawText(
    `Documento generado por LuxOps para ${companyName} · Pagina ${pageNumber}/${totalPages}`,
    { x: padX, y: 50, size: 8, font: italic, color: rgb(0.35, 0.35, 0.35) },
  );
  const audit =
    `ID de Transaccion: ${projectId} · Integridad de datos verificada por LuxOps Blockchain-Ready System`;
  let lineY = 38;
  for (const line of wrapPdfLines(audit, innerW, italic, 5.2)) {
    page.drawText(line, {
      x: padX,
      y: lineY,
      size: 5.2,
      font: italic,
      color: rgb(0.42, 0.42, 0.46),
    });
    lineY -= 7;
    if (lineY < 22) break;
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

export async function generateDossierPdfBuffer(project: DossierProject): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const inter = await embedSwissSansFont(pdf);
  const slateText = rgb(0.0588, 0.0902, 0.1647);
  const slateBorder = rgb(0.2, 0.2549, 0.3333);
  const solarYellow = rgb(0.9843, 0.8196, 0.1412);
  const accent = hexToRgb(project.organization.brandColor ?? "#1F2937");
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
      const maxW = 170;
      const maxH = 170;
      const ratio = Math.min(maxW / defaultLogo.width, maxH / defaultLogo.height);
      const w = defaultLogo.width * ratio;
      const h = defaultLogo.height * ratio;
      coverPage.drawImage(defaultLogo, { x: (595 - w) / 2, y: 632, width: w, height: h });
      coverPage.drawText("Aval de calidad LuxOps", {
        x: (595 - bold.widthOfTextAtSize("Aval de calidad LuxOps", 9)) / 2,
        y: 618,
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
    color: rgb(0.94, 0.97, 0.96),
    borderColor: rgb(0.06, 0.45, 0.32),
    borderWidth: 2.4,
    opacity: sealOp,
    borderOpacity: sealOp,
  });
  coverPage.drawCircle({
    x: sealCX,
    y: sealCY,
    size: sealR + 2,
    borderColor: rgb(0.06, 0.45, 0.32),
    borderWidth: 1.6,
    opacity: sealOp,
    borderOpacity: sealOp,
  });
  coverPage.drawText("VERIFICADO", {
    x: sealCX - bold.widthOfTextAtSize("VERIFICADO", 9.8) / 2,
    y: sealCY + sealR * 0.3,
    size: 9.8,
    font: bold,
    color: rgb(0.05, 0.38, 0.28),
    opacity: sealOp,
  });
  coverPage.drawText("LuxOps", {
    x: sealCX - bold.widthOfTextAtSize("LuxOps", 9) / 2,
    y: sealCY - 3,
    size: 9,
    font: bold,
    color: rgb(0.05, 0.38, 0.28),
    opacity: sealOp,
  });
  coverPage.drawText("CONTROL", {
    x: sealCX - bold.widthOfTextAtSize("CONTROL", 8.4) / 2,
    y: sealCY - sealR * 0.44,
    size: 8.4,
    font: bold,
    color: rgb(0.05, 0.38, 0.28),
    opacity: sealOp,
  });

  const summaryPage = pdf.addPage([595, 842]);
  summaryPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
  summaryPage.drawRectangle({ x: 24, y: 768, width: 547, height: 2, color: accent });
  summaryPage.drawText("INFORME DE INSTALACION", {
    x: 24,
    y: 818,
    size: 18,
    color: rgb(0, 0, 0),
    font: bold,
  });
  summaryPage.drawText("Dossier tecnico de ejecucion", {
    x: 24,
    y: 748,
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
    font,
  });

  summaryPage.drawRectangle({
    x: 24,
    y: 516,
    width: 547,
    height: 198,
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
  summaryPage.drawText(`Direccion: ${project.direccion}`, { x: 36, y: 622, size: 10, font });
  summaryPage.drawText(
    `Fecha finalizacion: ${new Date(project.updatedAt).toLocaleString("es-ES")}`,
    { x: 36, y: 606, size: 10, font },
  );
  summaryPage.drawText(`Estado: ${project.estado}`, { x: 36, y: 590, size: 10, font });
  summaryPage.drawText(
    pdfLibSafeText(
      `Nº Empresa Instaladora Autorizada (REBT): ${installerCard || "—"}`,
    ),
    {
      x: 36,
      y: 574,
      size: 9.5,
      font: bold,
      maxWidth: 500,
      lineHeight: 11,
    },
  );
  summaryPage.drawText(`Referencia de Expediente: ${dossierReference}`, {
    x: 36,
    y: 532,
    size: 9.5,
    font: bold,
    color: rgb(0.2, 0.2, 0.25),
  });

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

  summaryPage.drawText("INVENTARIO DE EQUIPOS CERTIFICADOS", { x: 24, y: 502, size: 12, font: bold });
  summaryPage.drawText("Tabla de trazabilidad de activos", {
    x: 24,
    y: 488,
    size: 8.5,
    font,
    color: rgb(0.38, 0.38, 0.42),
  });
  const tableX = 24;
  const tableYTop = 474;
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
  let normalizedBatteryItems: EquipmentItem[] = mergeSerialsIntoItems(
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
    project.peakPowerKwp != null ? String(Number(project.peakPowerKwp)) : "";
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
  const invHeaderFill = rgb(0.92, 0.925, 0.93);
  const invHeaderBorder = rgb(0.72, 0.74, 0.78);
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
    summaryPage.drawText(headers[ci], { x: xPos + 5, y: tableYTop - 12, size: 7.8, font: bold });
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
  const traceStartY = Math.max(250, tableBottomY - 20);
  summaryPage.drawText("Trazabilidad y garantias", { x: 24, y: traceStartY, size: 11, font: bold });
  let traceY = traceStartY - 16;
  const serialRows: [string, string | null][] = [
    [
      "Inversor (N/S)",
      normalizedInverterItems.length > 0
        ? normalizedInverterItems.map((item) => item.serial).filter(Boolean).join(", ")
        : project.equipmentInverterSerial,
    ],
    [
      "Baterias (N/S)",
      normalizedBatteryItems.length > 0
        ? normalizedBatteryItems.map((item) => item.serial).filter(Boolean).join(", ")
        : project.equipmentBatterySerial,
    ],
    ["Vatimetro (N/S)", project.equipmentVatimetroSerial],
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
  summaryPage.drawText("Observaciones tecnicas / notas de garantia", {
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
      summaryPage.drawText("(Continuacion en registro digital de obra.)", {
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
      "Lo anterior queda constancia para tramites de garantia y subvenciones. Condiciones no reflejadas en la documentacion previa acordada o en el presente acta no podran imputarse a la empresa instaladora con caracter retroactivo tras la firma de recepcion por el cliente.";
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
      "El operario no registro incidencias adicionales en campo (tejas rotas previas, sombras no previstas, etc.).",
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
      if (traceY < 120) break;
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
  const energyBoxH = annualYieldKwh != null ? 56 : 40;
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
  summaryPage.drawText(
    `Potencia Pico Total: ${project.peakPowerKwp?.toString() ?? "—"} kWp · Potencia Nominal Inversor: ${project.inverterPowerKwn?.toString() ?? "—"} kWn · Capacidad Almacenamiento: ${project.storageCapacityKwh?.toString() ?? "—"} kWh`,
    { x: 30, y: traceY - 26, size: 8.5, font, maxWidth: 530, color: slateText },
  );
  if (annualYieldKwh != null) {
    summaryPage.drawText(
      `Rendimiento Energético Estimado post-ejecución: ${annualYieldKwh.toLocaleString("es-ES")} kWh/año`,
      {
        x: 30,
        y: traceY - 44,
        size: 9,
        font: bold,
        maxWidth: 520,
        color: solarYellow,
      },
    );
  }

  traceY -= energyBoxH + 14;
  summaryPage.drawText("Evidencias fotograficas", { x: 24, y: traceY, size: 12, font: bold });
  traceY -= 16;
  summaryPage.drawText(
    `${project.photos.length} evidencias registradas con geolocalizacion y timestamp.`,
    { x: 24, y: traceY, size: 9, font, color: rgb(0.35, 0.35, 0.35) },
  );

  const CERT_BOTTOM_SAFE = 72;
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
    ["Tensión circuito abierto Voc (V)", dec(project.electricVocVolts)],
    ["Corriente cortocircuito Isc (A)", dec(project.electricIscAmps)],
    ["Resistencia de puesta a tierra (ohm)", dec(project.earthResistanceOhms)],
    ["Protección térmica — marca", (project.thermalProtectionBrand ?? "").trim() || "—"],
    ["Protección térmica — modelo", (project.thermalProtectionModel ?? "").trim() || "—"],
    ["SPD — marca", (project.spdBrand ?? "").trim() || "—"],
    ["SPD — modelo", (project.spdModel ?? "").trim() || "—"],
    ["Azimut (grados)", dec(project.panelAzimuthDegrees)],
    ["Inclinacion modulo (grados)", dec(project.panelTiltDegrees)],
  ];
  const c1 = 200;
  const c2 = 315;
  const lh = 20;
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
    ensureCertVerticalSpace(lh + 36);
    certPage.drawRectangle({
      x: 40,
      y: cy - lh + 14,
      width: c1,
      height: lh,
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawRectangle({
      x: 40 + c1,
      y: cy - lh + 14,
      width: c2,
      height: lh,
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
    const valLines = wrapPdfLines(pdfLibSafeText(val), c2 - 12, inter, 8);
    certPage.drawText(valLines[0] ?? "-", {
      x: 44 + c1,
      y: cy - 4,
      size: 8,
      font: inter,
      color: slateText,
      maxWidth: c2 - 12,
    });
    cy -= lh;
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
    ensureCertVerticalSpace(lh + 36);
    certPage.drawRectangle({
      x: 40,
      y: cy - lh + 14,
      width: c1,
      height: lh,
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawRectangle({
      x: 40 + c1,
      y: cy - lh + 14,
      width: c2,
      height: lh,
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
    cy -= lh;
  }
  if (annualYieldKwh != null) {
    ensureCertVerticalSpace(56);
    cy -= 10;
    certPage.drawRectangle({
      x: 40,
      y: cy - 38,
      width: 515,
      height: 38,
      color: rgb(0.9725, 0.9804, 0.9882),
      borderColor: slateBorder,
      borderWidth: 0.5,
    });
    certPage.drawText("Rendimiento Energético Estimado post-ejecución:", {
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
    cy -= 46;
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
  const evidencePhotoList = photoList.filter((p) => p.tipo !== "ESQUEMA_UNIFILAR");
  const unifilarPhotoList = photoList.filter((p) => p.tipo === "ESQUEMA_UNIFILAR");

  while (photoIndex < evidencePhotoList.length) {
    const photoPage = pdf.addPage([595, 842]);
    photoPage.drawText("EVIDENCIAS DE CAMPO", {
      x: 24,
      y: 808,
      size: 14,
      font: bold,
    });
    photoPage.drawText("Grid 2x2 · GPS y hora por evidencia · paginacion dinamica", {
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
    const maxH = 698;
    if (img) {
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const topY = 772;
      annexPage.drawImage(img, {
        x: (595 - w) / 2,
        y: topY - h,
        width: w,
        height: h,
      });
    } else {
      annexPage.drawText("Imagen no disponible.", { x: 40, y: 420, size: 11, font });
    }
    annexPage.drawText(
      `GPS ${photo.latitude?.toFixed(6) ?? "-"}, ${photo.longitude?.toFixed(6) ?? "-"}`,
      { x: 40, y: 44, size: 8, font, color: rgb(0.35, 0.35, 0.35) },
    );
    annexPage.drawText(`Registro ${new Date(photo.createdAt).toLocaleString("es-ES")}`, {
      x: 40,
      y: 32,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
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
  legalY -= 36;

  const signature = project.signatures[0];
  const installerSigSource = signature?.installerImageDataUrl ?? "";
  const installerSigPath = signature?.installerStoragePath ?? null;
  const clientSigSource = signature?.imageDataUrl ?? "";
  const clientSigPath = signature?.storagePath ?? null;
  const installerName = (signature?.installerName ?? project.operarioNombre ?? "").trim() || "Instalador";
  const clientName = (signature?.clientName ?? project.cliente ?? "").trim() || "Cliente";

  // Incluye metadatos (GPS + timestamp) bajo las cajas de firma.
  const signatureBlockH = 318;
  const minBottom = 110;
  if (legalY - signatureBlockH < minBottom) {
    // No cabe holgado: saltamos a nueva página para firmas.
    legalPage = pdf.addPage([595, 842]);
    legalPage.drawText("FIRMAS Y CONFORMIDAD", { x: 24, y: 808, size: 14, font: bold });
    legalY = 752;
  } else {
    legalPage.drawText("FIRMAS Y CONFORMIDAD", { x: 24, y: legalY, size: 12, font: bold });
    legalY -= 32;
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
        const baseRatio = Math.min(maxW / img.width, maxH / img.height);
        const ratio = Math.min(baseRatio * 1.28, maxW / img.width, maxH / img.height);
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
      font,
      italic,
      projectId: project.id,
    });
  }

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
