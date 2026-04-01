import archiver from "archiver";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/authz";
import { dossierProjectInclude, generateDossierPdfBuffer } from "@/lib/generate-dossier-pdf";
import { downloadStorageBytes } from "@/lib/storage";

function safeFilenamePart(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_|_$/g, "").slice(0, 80) || "proyecto";
}

function extensionFromPath(path: string) {
  const m = /\.(jpe?g|png|webp)$/i.exec(path);
  if (!m) return "jpg";
  const e = m[1].toLowerCase();
  return e === "jpeg" ? "jpg" : e;
}

function folderForTipo(tipo: string) {
  if (tipo === "ANTES") return "Antes";
  if (tipo === "DURANTE") return "Durante";
  return "Despues";
}

function streamArchiveToBuffer(archive: archiver.Archiver): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });
}

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

  const archive = archiver("zip", { zlib: { level: 6 } });
  const bufferPromise = streamArchiveToBuffer(archive);

  const pdfBuf = await generateDossierPdfBuffer(project);
  const base = safeFilenamePart(project.cliente);
  archive.append(pdfBuf, { name: `${base}/Dossier_Ejecutivo_LuxOps.pdf` });

  let n = 0;
  for (const photo of project.photos) {
    const key = photo.storagePath ?? photo.url;
    if (!key || key.startsWith("http")) continue;
    const bytes = await downloadStorageBytes({ bucket: "luxops-assets", path: key });
    if (!bytes) continue;
    n += 1;
    const ext = extensionFromPath(key);
    const folder = folderForTipo(photo.tipo);
    archive.append(bytes, {
      name: `${base}/Evidencias/${folder}/foto_${String(n).padStart(3, "0")}_${photo.id.slice(0, 8)}.${ext}`,
    });
  }

  try {
    await archive.finalize();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo generar el ZIP" }, { status: 500 });
  }

  const zipBuffer = await bufferPromise;

  await prisma.project.updateMany({
    where: { id: project.id, organizationId: user.organizationId },
    data: { subsidyPackDownloadedAt: new Date() },
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="pack-subvencion-${base}.zip"`,
    },
  });
}
