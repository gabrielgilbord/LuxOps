import type { Prisma } from "@prisma/client";
import { sumPanelPeakWpW } from "@/lib/pv-yield-estimate";

type PanelRow = { peakWp?: string; nominalKw?: string; brand?: string; model?: string };

function parsePanelJson(value: Prisma.JsonValue | null | undefined): PanelRow[] {
  if (!Array.isArray(value)) return [];
  const out: PanelRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const r = item as Record<string, unknown>;
    out.push({
      peakWp: String(r.peakWp ?? ""),
      nominalKw: String(r.nominalKw ?? ""),
      brand: String(r.brand ?? ""),
      model: String(r.model ?? ""),
    });
  }
  return out;
}

type InverterRow = { nominalKw: string; brand: string; model: string };

function parseInverterJson(value: Prisma.JsonValue | null | undefined): InverterRow[] {
  if (!Array.isArray(value)) return [];
  const out: InverterRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const r = item as Record<string, unknown>;
    out.push({
      nominalKw: String(r.nominalKw ?? ""),
      brand: String(r.brand ?? ""),
      model: String(r.model ?? ""),
    });
  }
  return out;
}

export type CieProjectFields = {
  cups: string;
  catastralReference: string;
  ownerTaxId: string;
  cliente: string;
  direccion: string;
  electricVocVolts: Prisma.Decimal | null;
  electricIscAmps: Prisma.Decimal | null;
  earthResistanceOhms: Prisma.Decimal | null;
  thermalProtectionBrand: string | null;
  thermalProtectionModel: string | null;
  spdBrand: string | null;
  spdModel: string | null;
  peakPowerKwp: Prisma.Decimal | null;
  /** Potencia nominal inversor (oficina), kWn */
  inverterPowerKwn: Prisma.Decimal | null;
  equipmentPanelItems: Prisma.JsonValue | null;
  equipmentInverterItems: Prisma.JsonValue | null;
  /** N/S inversor si solo hay uno en expediente */
  equipmentInverterSerial: string | null;
  /** Activos / memoria oficina (prioridad si fila JSON viene vacía) */
  assetPanelBrand: string | null;
  assetPanelModel: string | null;
  assetInverterBrand: string | null;
  assetInverterModel: string | null;
};

export function isCieReady(p: CieProjectFields): boolean {
  const cups = p.cups.trim().toUpperCase();
  if (!/^[A-Z0-9]{20,22}$/.test(cups)) return false;
  if (!p.catastralReference?.trim() || p.catastralReference.trim().length < 10) return false;
  if (!p.ownerTaxId?.trim() || p.ownerTaxId.trim().length < 7) return false;
  if (p.electricVocVolts == null) return false;
  if (p.electricIscAmps == null) return false;
  if (p.earthResistanceOhms == null) return false;
  if (!p.thermalProtectionBrand?.trim() || !p.thermalProtectionModel?.trim()) return false;
  if (!p.spdBrand?.trim() || !p.spdModel?.trim()) return false;
  const panels = parsePanelJson(p.equipmentPanelItems);
  const sumW = sumPanelPeakWpW(panels);
  const kwp = p.peakPowerKwp != null ? Number(p.peakPowerKwp) : NaN;
  if (sumW <= 0 && !(Number.isFinite(kwp) && kwp > 0)) return false;
  return true;
}

function decStr(v: Prisma.Decimal | null | undefined): string {
  if (v == null) return "—";
  const s = v.toString().trim();
  return s || "—";
}

function officePanelBrand(p: CieProjectFields, row: PanelRow, index: number): string {
  const b = row.brand?.trim();
  if (b) return b;
  if (index === 0) return (p.assetPanelBrand ?? "").trim() || "—";
  return "—";
}

function officePanelModel(p: CieProjectFields, row: PanelRow, index: number): string {
  const m = row.model?.trim();
  if (m) return m;
  if (index === 0) return (p.assetPanelModel ?? "").trim() || "—";
  return "—";
}

function officeInvBrand(p: CieProjectFields, row: InverterRow, index: number): string {
  const b = row.brand?.trim();
  if (b) return b;
  if (index === 0) return (p.assetInverterBrand ?? "").trim() || "—";
  return "—";
}

function officeInvModel(p: CieProjectFields, row: InverterRow, index: number): string {
  const m = row.model?.trim();
  if (m) return m;
  if (index === 0) return (p.assetInverterModel ?? "").trim() || "—";
  return "—";
}

function officeInvNominalKw(
  p: CieProjectFields,
  row: InverterRow,
  index: number,
): string {
  const nk = row.nominalKw?.trim();
  if (nk) return nk;
  if (index === 0 && p.inverterPowerKwn != null) {
    const v = Number(p.inverterPowerKwn);
    if (Number.isFinite(v)) return String(v);
  }
  return "";
}

export function buildCieExportText(p: CieProjectFields): string {
  const panels = parsePanelJson(p.equipmentPanelItems);
  const sumWp = sumPanelPeakWpW(panels);
  const kwpOffice = p.peakPowerKwp != null ? Number(p.peakPowerKwp) : null;
  const potenciaPicoStr =
    sumWp > 0
      ? `${sumWp} W (${(sumWp / 1000).toFixed(3)} kWp) — sumatorio paneles (campo + oficina)`
      : kwpOffice != null && Number.isFinite(kwpOffice) && kwpOffice > 0
        ? `${kwpOffice} kWp (dato oficina / memoria)`
        : "—";
  const kwpOfficeStr =
    kwpOffice != null && Number.isFinite(kwpOffice) && kwpOffice > 0
      ? `${kwpOffice} kWp`
      : "— (no registrado en oficina)";

  let nominalSumKw = 0;
  for (const row of panels) {
    const nk = Number(String(row.nominalKw ?? "").replace(",", "."));
    if (Number.isFinite(nk) && nk > 0) nominalSumKw += nk;
  }
  const potenciaNominalPanelesStr =
    nominalSumKw > 0 ? `${nominalSumKw.toFixed(3)} kWn (sumatorio nominal filas panel)` : "—";

  const panelLines =
    panels.length > 0
      ? panels
          .map((row, i) => {
            const peak = row.peakWp?.trim() ? `${row.peakWp.trim()} W` : "—";
            const nom = row.nominalKw?.trim() ? `${row.nominalKw.trim()} kWn` : "—";
            return `  Panel ${i + 1}: ${officePanelBrand(p, row, i)} ${officePanelModel(p, row, i)} · Pico ${peak} · Nominal ${nom}`;
          })
          .join("\n")
      : `  (sin filas en inventario) — activo oficina: ${(p.assetPanelBrand ?? "").trim() || "—"} ${(p.assetPanelModel ?? "").trim() || ""}`;

  const inverters = parseInverterJson(p.equipmentInverterItems);
  const invSerial = (p.equipmentInverterSerial ?? "").trim();
  const invLines =
    inverters.length > 0
      ? inverters
          .map((inv, i) => {
            const nk = officeInvNominalKw(p, inv, i);
            const nkStr = nk ? `${nk} kWn` : "—";
            const serialNote =
              invSerial && (inverters.length === 1 || i === 0) ? ` · N/S ${invSerial}` : "";
            return `  Inversor ${i + 1}: ${nkStr} · ${officeInvBrand(p, inv, i)} ${officeInvModel(p, inv, i)}${serialNote}`;
          })
          .join("\n")
      : `  — (sin filas JSON) · Oficina: ${(p.assetInverterBrand ?? "").trim() || "—"} ${(p.assetInverterModel ?? "").trim() || ""}${
          invSerial ? ` · N/S ${invSerial}` : ""
        }`;

  const kwnOffice =
    p.inverterPowerKwn != null ? `${decStr(p.inverterPowerKwn)} kWn (campo oficina)` : "—";

  return `
═══════════════════════════════════════════════════════════
LUXOPS — DATOS PARA CIE (BOLETÍN / CERTIFICADO DE INSTALACIÓN)
Copiar y pegar en el trámite de Industria · ${new Date().toISOString()}
═══════════════════════════════════════════════════════════

IDENTIFICACIÓN SUMINISTRO / INMUEBLE
-------------------------------------
CUPS: ${p.cups.trim() || "—"}
Referencia catastral: ${p.catastralReference.trim() || "—"}
DNI / NIE / CIF titular: ${p.ownerTaxId.trim() || "—"}
Cliente / denominación: ${p.cliente}
Dirección instalación: ${p.direccion}

POTENCIAS (EQUIPO GENERADOR)
----------------------------
Potencia pico fotovoltaica (prioridad sumatorio paneles): ${potenciaPicoStr}
Potencia pico declarada oficina (kWp): ${kwpOfficeStr}
Potencia nominal paneles (sumatorio kWn en filas, si consta): ${potenciaNominalPanelesStr}
Potencia nominal inversor / inversores (oficina): ${kwnOffice}

Paneles (marca / modelo / pico / nominal — oficina rellena huecos en fila 1):
${panelLines}

Inversores (kWn / marca / modelo — oficina rellena huecos):
${invLines}

MEDICIONES ELÉCTRICAS (CAMPO)
-----------------------------
Tensión circuito abierto Voc (V): ${decStr(p.electricVocVolts)}
Corriente cortocircuito Isc (A): ${decStr(p.electricIscAmps)}
Resistencia de puesta a tierra medida (ohm): ${decStr(p.earthResistanceOhms)}

PROTECCIONES DECLARADAS (OFICINA / REBT)
----------------------------------------
Térmicos / magnetotérmicos — Marca: ${p.thermalProtectionBrand?.trim() || "—"}
Térmicos / magnetotérmicos — Modelo: ${p.thermalProtectionModel?.trim() || "—"}
Protección sobretensiones (SPD) — Marca: ${p.spdBrand?.trim() || "—"}
Protección sobretensiones (SPD) — Modelo: ${p.spdModel?.trim() || "—"}

— Fin del resumen — Revisar coherencia con memoria y esquemas antes de enviar.
`.trim();
}
