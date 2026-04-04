"use client";

import { FileCheck2 } from "lucide-react";
import { DossierDownloadButton } from "@/components/dossier/dossier-download-button";

export function InformePdfButton({ projectId }: { projectId: string }) {
  return (
    <DossierDownloadButton
      projectId={projectId}
      kind="pdf"
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-base font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
    >
      <FileCheck2 className="h-5 w-5 shrink-0" />
      Generar PDF profesional
    </DossierDownloadButton>
  );
}
