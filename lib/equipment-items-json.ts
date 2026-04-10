import type { Prisma } from "@prisma/client";

export type EquipmentItemRow = {
  brand: string;
  model: string;
  serial: string;
  peakWp?: string;
  nominalKw?: string;
  capacityKwh?: string;
};

/** Parsea el JSON de paneles/inversores/baterías guardado por el stepper (sync offline). */
export function parseEquipmentItemsJson(value: Prisma.JsonValue | null | undefined): EquipmentItemRow[] {
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
  const out: EquipmentItemRow[] = [];
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

export function sumPanelPeakWpW(items: EquipmentItemRow[]): number {
  let sum = 0;
  for (const it of items) {
    const n = Number.parseFloat(String(it.peakWp ?? "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) sum += n;
  }
  return sum;
}
