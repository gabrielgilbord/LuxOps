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
  equipmentPanelItems: Prisma.JsonValue | null;
  equipmentInverterItems: Prisma.JsonValue | null;
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

export function buildCieExportText(p: CieProjectFields): string {
  const panels = parsePanelJson(p.equipmentPanelItems);
  const sumWp = sumPanelPeakWpW(panels);
  const kwpOffice = p.peakPowerKwp != null ? Number(p.peakPowerKwp) : null;
  const potenciaPicoStr =
    sumWp > 0
      ? `${sumWp} W (${(sumWp / 1000).toFixed(3)} kWp) — sumatorio paneles`
      : kwpOffice != null && Number.isFinite(kwpOffice) && kwpOffice > 0
        ? `${kwpOffice} kWp (dato oficina)`
        : "—";

  const inverters = parseInverterJson(p.equipmentInverterItems);
  const invLines =
    inverters.length > 0
      ? inverters
          .map(
            (inv, i) =>
              `  Inversor ${i + 1}: ${inv.nominalKw ? `${inv.nominalKw} kWn` : "—"} · ${inv.brand || "—"} ${inv.model || ""}`,
          )
          .join("\n")
      : "  —";

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
Potencia pico fotovoltaica: ${potenciaPicoStr}
Inversores:
${invLines}

MEDICIONES ELÉCTRICAS (CAMPO)
-----------------------------
Tensión circuito abierto Voc (V): ${decStr(p.electricVocVolts)}
Corriente cortocircuito Isc (A): ${decStr(p.electricIscAmps)}
Resistencia de tierra (Ω): ${decStr(p.earthResistanceOhms)}

PROTECCIONES DECLARADAS
-----------------------
Térmicos / magnetotérmicos — Marca: ${p.thermalProtectionBrand?.trim() || "—"}
Térmicos / magnetotérmicos — Modelo: ${p.thermalProtectionModel?.trim() || "—"}
Protección sobretensiones (SPD) — Marca: ${p.spdBrand?.trim() || "—"}
Protección sobretensiones (SPD) — Modelo: ${p.spdModel?.trim() || "—"}

— Fin del resumen — Revisar coherencia con memoria y esquemas antes de enviar.
`.trim();
}
