"use client";

import { AlertTriangle, X } from "lucide-react";

export type DossierErrorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Si hay lista, se muestra el texto legal + viñetas; si no, solo `detailMessage`. */
  missingFields?: string[];
  /** Mensaje secundario o error genérico (401, red, etc.). */
  detailMessage?: string | null;
};

export function DossierErrorDialog({
  open,
  onClose,
  missingFields,
  detailMessage,
}: DossierErrorDialogProps) {
  if (!open) return null;

  const hasList = missingFields && missingFields.length > 0;
  const intro =
    "No se pudo generar el dossier. Faltan datos obligatorios:";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dossier-error-title"
      aria-describedby="dossier-error-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-[91] w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-5 shadow-2xl ring-2 ring-amber-400/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="dossier-error-title" className="text-base font-bold text-white">
              Dossier no disponible
            </h2>
            <div id="dossier-error-desc" className="mt-2 text-sm leading-relaxed text-slate-300">
              {hasList ? (
                <>
                  <p className="font-medium text-slate-200">{intro}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                    {missingFields.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{detailMessage ?? "Ha ocurrido un error inesperado. Inténtalo de nuevo."}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-amber-950 transition hover:bg-amber-300"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
