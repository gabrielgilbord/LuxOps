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
  inverterPowerKwn: CieProjectFields["inverterPowerKwn"];
  equipmentPanelItems: CieProjectFields["equipmentPanelItems"];
  equipmentInverterItems: CieProjectFields["equipmentInverterItems"];
  equipmentInverterSerial: string | null;
  assetPanelBrand: string | null;
  assetPanelModel: string | null;
  assetInverterBrand: string | null;
  assetInverterModel: string | null;
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
    inverterPowerKwn: p.inverterPowerKwn,
    equipmentPanelItems: p.equipmentPanelItems,
    equipmentInverterItems: p.equipmentInverterItems,
    equipmentInverterSerial: p.equipmentInverterSerial,
    assetPanelBrand: p.assetPanelBrand,
    assetPanelModel: p.assetPanelModel,
    assetInverterBrand: p.assetInverterBrand,
    assetInverterModel: p.assetInverterModel,
  };
}

/** Solo ASCII para `filename=` (cabeceras rotas con comillas / UTF-8 → 500 en algunos proxies). */
function asciiSafeFileSlug(cliente: string): string {
  const base = cliente
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
  return base || "proyecto";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  try {
    const user = await getCurrentDbUser();
    if (!user) {
      console.error("[cie-export] Sin sesión", { download, path: url.pathname });
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      console.error("[cie-export] Rol no admin", {
        userId: user.id,
        role: user.role,
        download,
      });
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { isSubscribed: true, subscriptionStatus: true },
    });
    if (!org?.isSubscribed || !["active", "trialing"].includes(org.subscriptionStatus ?? "active")) {
      console.error("[cie-export] Suscripción inactiva", {
        userId: user.id,
        orgId: user.organizationId,
        isSubscribed: org?.isSubscribed,
        subscriptionStatus: org?.subscriptionStatus,
      });
      return NextResponse.json({ error: "Suscripción inactiva" }, { status: 402 });
    }

    const { id: projectId } = await params;
    if (!projectId?.trim()) {
      console.error("[cie-export] projectId vacío", { userId: user.id });
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: user.organizationId },
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
        inverterPowerKwn: true,
        equipmentPanelItems: true,
        equipmentInverterItems: true,
        equipmentInverterSerial: true,
        assetPanelBrand: true,
        assetPanelModel: true,
        assetInverterBrand: true,
        assetInverterModel: true,
      },
    });

    if (!project) {
      console.error("[cie-export] Proyecto no encontrado o otra org", {
        userId: user.id,
        orgId: user.organizationId,
        projectId,
      });
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const text = buildCieExportText(pickCieFields(project));
    const slug = asciiSafeFileSlug(project.cliente);
    const filenameAscii = `cie-${slug}.txt`;
    const cacheHeaders = {
      "Cache-Control": "private, no-store, max-age=0",
    } as const;

    if (download) {
      return new NextResponse(text, {
        headers: {
          ...cacheHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filenameAscii)}`,
        },
      });
    }
    return NextResponse.json(
      { text },
      {
        headers: cacheHeaders,
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[cie-export] Error generando export", {
      message,
      stack,
      download,
      url: request.url,
    });
    return NextResponse.json(
      { error: "Error al generar el archivo CIE. Revisa los logs del servidor." },
      { status: 500 },
    );
  }
}
