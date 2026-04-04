"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  isDossierClientErrorBody,
  isDossierPdfGenerationFailedBody,
} from "@/lib/dossier-api-response";
import { DossierErrorDialog } from "@/components/dossier/dossier-error-dialog";
import { Loader2 } from "lucide-react";

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].replace(/^"+|"+$/g, "").trim();
  return null;
}

type Kind = "pdf" | "zip";

async function downloadFromApi(projectId: string, kind: Kind): Promise<
  | { ok: true }
  | { ok: false; missingFields?: string[]; message?: string }
> {
  const path =
    kind === "pdf"
      ? `/api/projects/${projectId}/report`
      : `/api/projects/${projectId}/subsidy-pack`;
  const res = await fetch(path);
  const defaultName = kind === "pdf" ? "dossier.pdf" : "pack-subvencion.zip";

  if (res.ok) {
    const blob = await res.blob();
    const name =
      parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
      defaultName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  }

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const data: unknown = await res.json().catch(() => null);
    if (isDossierClientErrorBody(data)) {
      return { ok: false, missingFields: data.missingFields };
    }
    if (isDossierPdfGenerationFailedBody(data)) {
      return { ok: false, message: data.error };
    }
    if (data && typeof data === "object" && "error" in data) {
      const err = (data as { error?: unknown }).error;
      if (typeof err === "string") return { ok: false, message: err };
    }
  }

  if (res.status === 401) {
    return { ok: false, message: "No autorizado. Vuelve a iniciar sesión." };
  }
  if (res.status === 402) {
    return {
      ok: false,
      message: "La suscripción no está activa. Renueva en Ajustes para descargar el dossier.",
    };
  }
  if (res.status === 404) {
    return { ok: false, message: "Proyecto no encontrado." };
  }

  return {
    ok: false,
    message: "No se pudo completar la descarga. Inténtalo de nuevo.",
  };
}

type Props = {
  projectId: string;
  kind: Kind;
  className?: string;
  children: ReactNode;
};

export function DossierDownloadButton({ projectId, kind, className, children }: Props) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{
    open: boolean;
    missingFields?: string[];
    message?: string | null;
  }>({ open: false });

  const closeDialog = useCallback(() => {
    setDialog({ open: false });
  }, []);

  const onClick = useCallback(async () => {
    setBusy(true);
    try {
      const result = await downloadFromApi(projectId, kind);
      if (!result.ok) {
        setDialog({
          open: true,
          missingFields: result.missingFields,
          message: result.message ?? null,
        });
      }
    } catch {
      setDialog({
        open: true,
        message: "Error de red. Comprueba la conexión e inténtalo de nuevo.",
      });
    } finally {
      setBusy(false);
    }
  }, [projectId, kind]);

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={className}
      >
        {busy ? (
          <Loader2 className="mr-1 inline h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        ) : null}
        {children}
      </button>
      <DossierErrorDialog
        open={dialog.open}
        onClose={closeDialog}
        missingFields={dialog.missingFields}
        detailMessage={dialog.message}
      />
    </>
  );
}
