/**
 * Genera un dossier PDF de un proyecto real (DB) y escribe tmp/dossier-smoke.pdf.
 * Uso: npx tsx scripts/pdf-dossier-smoke.ts [projectId]
 * Requiere DATABASE_URL. Opcional: PROJECT_ID o primer argumento = id de proyecto.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { dossierProjectInclude, generateDossierPdfBuffer } from "@/lib/generate-dossier-pdf";
import { prisma } from "@/lib/prisma";

async function main() {
  const projectId = process.argv[2] ?? process.env.PROJECT_ID ?? "";
  const where = projectId
    ? { id: projectId }
    : { estado: "FINALIZADO" as const };

  const project = await prisma.project.findFirst({
    where,
    include: dossierProjectInclude,
    orderBy: { updatedAt: "desc" },
  });

  if (!project) {
    console.error("No hay proyecto (ajusta id o crea datos en la BD).");
    process.exit(1);
  }

  const buf = await generateDossierPdfBuffer(project);
  const doc = await PDFDocument.load(new Uint8Array(buf));
  const pages = doc.getPageCount();

  const outDir = join(process.cwd(), "tmp");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "dossier-smoke.pdf");
  await writeFile(outPath, buf);

  console.log("OK:", outPath);
  console.log("Páginas:", pages, "| proyecto:", project.id, project.cliente);
  if (pages < 3) {
    console.warn("Pocas páginas: para ~10 páginas hace falta más fotos/adjuntos en el proyecto.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
