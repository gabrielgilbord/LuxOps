"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCopy, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  projectId: string | null;
  clienteLabel: string;
  open: boolean;
  onClose: () => void;
};

function CieExportModalBody({
  projectId,
  clienteLabel,
  onClose,
}: {
  projectId: string;
  clienteLabel: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/cie-export`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "No se pudo cargar");
        }
        if (typeof data.text !== "string") throw new Error("Respuesta inválida");
        return data.text as string;
      })
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const onCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles");
    }
  }, [text]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cie-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-[81] flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-600/80 bg-slate-900 shadow-2xl ring-1 ring-yellow-400/15">
        <div className="flex items-start justify-between gap-3 border-b border-slate-700/90 px-5 py-4">
          <div>
            <h2
              id="cie-modal-title"
              className="text-base font-bold tracking-tight text-slate-100"
            >
              Datos para CIE (Boletín)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {clienteLabel ? `Proyecto: ${clienteLabel}` : "Resumen técnico"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
              <Loader2 className="size-8 animate-spin text-yellow-400/90" />
              <p className="text-sm">Generando resumen…</p>
            </div>
          ) : error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : (
            <textarea
              readOnly
              className="font-mono h-[min(52vh,480px)] w-full resize-y rounded-xl border border-slate-600 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
              value={text}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-700/90 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-600 bg-slate-800/80 text-slate-100 hover:bg-slate-700"
            disabled={!text || loading}
            onClick={onCopy}
          >
            <ClipboardCopy className="mr-1.5 size-3.5" />
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <a
            href={`/api/projects/${projectId}/cie-export?download=1`}
            download
            className="inline-flex h-8 items-center justify-center rounded-lg border border-yellow-400/50 bg-gradient-to-r from-amber-400/25 via-yellow-400/20 to-amber-400/25 px-3 text-xs font-bold text-yellow-100 shadow-md ring-1 ring-yellow-400/25 hover:from-amber-400/35 hover:to-amber-400/30 disabled:pointer-events-none disabled:opacity-50"
            {...(!loading && text ? {} : { "aria-disabled": true, onClick: (e) => e.preventDefault() })}
          >
            <Download className="mr-1.5 size-3.5" />
            Descargar .txt
          </a>
        </div>
      </div>
    </div>
  );
}

export function CieExportModal({ projectId, clienteLabel, open, onClose }: Props) {
  if (!open || !projectId) return null;
  return (
    <CieExportModalBody
      key={projectId}
      projectId={projectId}
      clienteLabel={clienteLabel}
      onClose={onClose}
    />
  );
}
