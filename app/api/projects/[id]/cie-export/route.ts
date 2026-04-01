import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/authz";
import { buildCieExportText, type CieProjectFields } from "@/lib/cie-export";

function pickCieFields(p: {
  cups: string;
  catastralReference: string;
  ownerTaxId: string;
  cliente: string;
  direccion: string;
  electricVocVolts: CieProjectFields["electricVocVolts"];
  electricIscAmps: CieProjectFields["electricIscAmps"];
  earthResistanceOhms: CieProjectFields["earthResistanceOhms"];
  thermalProtectionBrand: string | null;
  thermalProtectionModel: string | null;
  spdBrand: string | null;
  spdModel: string | null;
  peakPowerKwp: CieProjectFields["peakPowerKwp"];
  equipmentPanelItems: CieProjectFields["equipmentPanelItems"];
  equipmentInverterItems: CieProjectFields["equipmentInverterItems"];
}): CieProjectFields {
  return {
    cups: p.cups,
    catastralReference: p.catastralReference,
    ownerTaxId: p.ownerTaxId,
    cliente: p.cliente,
    direccion: p.direccion,
    electricVocVolts: p.electricVocVolts,
    electricIscAmps: p.electricIscAmps,
    earthResistanceOhms: p.earthResistanceOhms,
    thermalProtectionBrand: p.thermalProtectionBrand,
    thermalProtectionModel: p.thermalProtectionModel,
    spdBrand: p.spdBrand,
    spdModel: p.spdModel,
    peakPowerKwp: p.peakPowerKwp,
    equipmentPanelItems: p.equipmentPanelItems,
    equipmentInverterItems: p.equipmentInverterItems,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { isSubscribed: true, subscriptionStatus: true },
  });
  if (!org?.isSubscribed || !["active", "trialing"].includes(org.subscriptionStatus ?? "active")) {
    return NextResponse.json({ error: "Suscripción inactiva" }, { status: 402 });
  }
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    select: {
      cliente: true,
      direccion: true,
      cups: true,
      catastralReference: true,
      ownerTaxId: true,
      electricVocVolts: true,
      electricIscAmps: true,
      earthResistanceOhms: true,
      thermalProtectionBrand: true,
      thermalProtectionModel: true,
      spdBrand: true,
      spdModel: true,
      peakPowerKwp: true,
      equipmentPanelItems: true,
      equipmentInverterItems: true,
    },
  });

  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const text = buildCieExportText(pickCieFields(project));
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const filename = `cie-${project.cliente.replaceAll(/\s+/g, "-").slice(0, 48).toLowerCase()}.txt`;

  if (download) {
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
  return NextResponse.json({ text });
}
