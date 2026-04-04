"use client";

import { DossierDownloadButton } from "@/components/dossier/dossier-download-button";

type Row = { id: string; cliente: string; direccion: string };

export function ReportsProjectRows({ projects }: { projects: Row[] }) {
  return (
    <>
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold">{project.cliente}</p>
            <p className="text-xs text-slate-400">{project.direccion}</p>
          </div>
          <DossierDownloadButton
            projectId={project.id}
            kind="pdf"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300 disabled:opacity-60"
          >
            Descargar PDF
          </DossierDownloadButton>
        </div>
      ))}
    </>
  );
}
