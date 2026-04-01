import { NextResponse } from "next/server";
import { z } from "zod";
import { EquipmentCatalogCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { suggestCatalogBrands, suggestCatalogModels } from "@/lib/equipment-catalog";

const querySchema = z.object({
  category: z.enum(["PANEL", "INVERTER", "BATTERY"]),
  field: z.enum(["brand", "model"]),
  q: z.string().max(120).optional().default(""),
  brand: z.string().max(120).optional().default(""),
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

export async function GET(request: Request) {
  try {
    const ok = await requireSubscribedAuth();
    if (!ok) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      category: searchParams.get("category") ?? "",
      field: searchParams.get("field") ?? "",
      q: searchParams.get("q") ?? "",
      brand: searchParams.get("brand") ?? "",
    });

    const category = parsed.category as EquipmentCatalogCategory;

    const suggestions =
      parsed.field === "brand"
        ? await suggestCatalogBrands(category, parsed.q)
        : await suggestCatalogModels(category, parsed.brand, parsed.q);

    return NextResponse.json({ suggestions });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Parametros invalidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
