import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/authz";
import type { DossierClientErrorBody } from "@/lib/dossier-api-response";
import {
  DossierGenerationError,
  dossierProjectInclude,
  generateDossierPdfBuffer,
} from "@/lib/generate-dossier-pdf";

export async function GET(
  _request: Request,
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
    include: dossierProjectInclude,
  });

  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await generateDossierPdfBuffer(project);
  } catch (e) {
    if (e instanceof DossierGenerationError) {
      const body: DossierClientErrorBody = {
        dossierError: true,
        missingFields: e.missingFields,
        code: e.code,
      };
      return NextResponse.json(body, { status: 400 });
    }
    throw e;
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dossier-${project.cliente.replaceAll(" ", "-").toLowerCase()}.pdf"`,
    },
  });
}
