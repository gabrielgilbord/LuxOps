import type { EquipmentCatalogCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CatalogItemInput = { brand: string; model: string };

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

/** Registra pares marca+modelo en catálogo global (sin S/N). Idempotente. */
export async function recordEquipmentCatalogPairs(
  category: EquipmentCatalogCategory,
  items: CatalogItemInput[],
): Promise<void> {
  for (const raw of items) {
    const brand = raw.brand.trim();
    const model = raw.model.trim();
    if (!brand || !model) continue;
    const brandKey = normKey(brand);
    const modelKey = normKey(model);
    if (!brandKey || !modelKey) continue;

    await prisma.equipmentCatalogEntry.upsert({
      where: {
        category_brandKey_modelKey: {
          category,
          brandKey,
          modelKey,
        },
      },
      create: {
        category,
        brand,
        model,
        brandKey,
        modelKey,
        hitCount: 1,
      },
      update: {
        hitCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }
}

export async function recordCatalogFromTraceabilityItems(
  panelItems: CatalogItemInput[],
  inverterItems: CatalogItemInput[],
  batteryItems: CatalogItemInput[],
): Promise<void> {
  await Promise.all([
    recordEquipmentCatalogPairs("PANEL", panelItems),
    recordEquipmentCatalogPairs("INVERTER", inverterItems),
    recordEquipmentCatalogPairs("BATTERY", batteryItems),
  ]);
}

export async function suggestCatalogBrands(
  category: EquipmentCatalogCategory,
  q: string,
): Promise<string[]> {
  const qn = normKey(q);
  const where: Prisma.EquipmentCatalogEntryWhereInput = { category };

  if (qn.length > 0) {
    where.OR = [
      { brandKey: { contains: qn } },
      { modelKey: { contains: qn } },
    ];
  }

  const rows = await prisma.equipmentCatalogEntry.findMany({
    where,
    orderBy: [{ hitCount: "desc" }, { updatedAt: "desc" }],
    take: qn.length > 0 ? 60 : 100,
    select: { brand: true, brandKey: true },
  });

  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.brandKey)) continue;
    seen.add(r.brandKey);
    out.push(r.brand);
    if (out.length >= 14) break;
  }
  return out;
}

export async function suggestCatalogModels(
  category: EquipmentCatalogCategory,
  brandFilter: string,
  q: string,
): Promise<string[]> {
  const qn = normKey(q);
  const brandKey = normKey(brandFilter);

  const where: Prisma.EquipmentCatalogEntryWhereInput = { category };
  if (brandKey.length > 0) {
    where.brandKey = brandKey;
  }
  if (qn.length > 0) {
    where.modelKey = { contains: qn };
  }

  const rows = await prisma.equipmentCatalogEntry.findMany({
    where,
    orderBy: [{ hitCount: "desc" }, { updatedAt: "desc" }],
    take: 40,
    select: { model: true, modelKey: true },
  });

  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.modelKey)) continue;
    seen.add(r.modelKey);
    out.push(r.model);
    if (out.length >= 14) break;
  }
  return out;
}
