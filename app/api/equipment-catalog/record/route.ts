import { NextResponse } from "next/server";
import { z } from "zod";
import { EquipmentCatalogCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordEquipmentCatalogPairs } from "@/lib/equipment-catalog";

const bodySchema = z.object({
  category: z.enum(["PANEL", "INVERTER", "BATTERY"]),
  brand: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(120),
});

async function requireSubscribedAuth(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { organizationId: true },
  });
  if (!dbUser) return false;
  const organization = await prisma.organization.findUnique({
    where: { id: dbUser.organizationId },
    select: { isSubscribed: true, subscriptionStatus: true },
  });
  return Boolean(
    organization?.isSubscribed &&
      ["active", "trialing"].includes(organization.subscriptionStatus ?? "active"),
  );
}

/** Registra un par marca+modelo en el catálogo global (sin S/N). Útil antes de sincronizar obra. */
export async function POST(request: Request) {
  try {
    const ok = await requireSubscribedAuth();
    if (!ok) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.parse(json);
    const category = parsed.category as EquipmentCatalogCategory;

    await recordEquipmentCatalogPairs(category, [{ brand: parsed.brand, model: parsed.model }]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
