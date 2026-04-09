"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { updateCompanySettingsAction } from "@/app/actions/company";

const initialState = { ok: false, error: undefined as string | undefined };

export function CompanySettingsForm({
  defaultName,
  defaultTaxId,
  defaultTaxAddress,
  defaultLogoUrl,
  defaultBrandColor,
  defaultRebtCompanyNumber,
}: {
  defaultName: string;
  defaultTaxId: string;
  defaultTaxAddress: string;
  defaultLogoUrl: string;
  defaultBrandColor: string;
  defaultRebtCompanyNumber: string;
}) {
  const [logoPreview, setLogoPreview] = useState(defaultLogoUrl);
  const [state, formAction, pending] = useActionState(updateCompanySettingsAction, initialState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoFileName, setLogoFileName] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  const hasLogo = Boolean(logoPreview?.trim());
  const isDefaultLogo = logoPreview === defaultLogoUrl;

  const prettyHint = useMemo(() => {
    if (logoFileName) return logoFileName;
    if (hasLogo) return "Logo cargado";
    return "Sin logo";
  }, [hasLogo, logoFileName]);

  async function readLogoFile(file: File) {
    setLogoFileName(file.name);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer el logo"));
      reader.readAsDataURL(file);
    });
    setLogoPreview(dataUrl);
  }

  useEffect(() => {
    setLogoPreview(defaultLogoUrl);
    setLogoFileName("");
  }, [defaultLogoUrl]);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <input
        name="companyName"
        defaultValue={defaultName}
        placeholder="Nombre de empresa"
        className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-yellow-300/70"
      />
      <input
        name="taxId"
        defaultValue={defaultTaxId}
        placeholder="CIF / NIF"
        className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-yellow-300/70"
      />
      <textarea
        name="taxAddress"
        defaultValue={defaultTaxAddress}
        placeholder="Dirección fiscal para informes PDF"
        rows={4}
        className="min-h-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300/70"
      />
      <label className="text-xs font-semibold text-slate-300">
        Nº empresa instaladora autorizada (REBT) — obligatorio
      </label>
      <input
        name="rebtCompanyNumber"
        defaultValue={defaultRebtCompanyNumber}
        required
        minLength={4}
        placeholder="Ej. registro o código de empresa autorizada"
        className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-yellow-300/70"
      />
      <div className="grid gap-1">
        <label className="text-xs text-slate-300">Color corporativo (PDF)</label>
        <input
          name="brandColor"
          type="color"
          defaultValue={defaultBrandColor}
          className="h-10 w-20 rounded border border-slate-700 bg-slate-950"
        />
      </div>
      <input type="hidden" name="logoDataUrl" value={logoPreview} />
      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <div className="grid gap-0.5">
            <label className="text-xs font-semibold text-slate-200">Logo de empresa</label>
            <p className="text-[11px] text-slate-400">
              Arrastra y suelta una imagen aquí o haz clic para seleccionarla. Recomendado: PNG con fondo
              transparente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-yellow-300/60"
          >
            Elegir logo
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (!file) return;
            await readLogoFile(file);
          }}
          className={`rounded-xl border p-3 transition ${
            dragActive
              ? "border-yellow-300/80 bg-yellow-300/10"
              : "border-slate-800 bg-slate-950 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-lg border border-slate-800 bg-slate-900/60">
              {hasLogo ? (
                <Image
                  src={logoPreview}
                  alt="Logo empresa"
                  width={120}
                  height={120}
                  unoptimized
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <span className="text-xs font-semibold text-slate-400">LOGO</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{prettyHint}</p>
              <p className="text-xs text-slate-400">JPG/PNG/WebP · máximo recomendado 1 MB</p>
            </div>
            {hasLogo ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLogoPreview("");
                  setLogoFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-red-400/60 hover:text-red-200"
              >
                Quitar
              </button>
            ) : null}
            {!isDefaultLogo && defaultLogoUrl ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLogoPreview(defaultLogoUrl);
                  setLogoFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700"
              >
                Restaurar
              </button>
            ) : null}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await readLogoFile(file);
          }}
        />
      </div>
      {logoPreview ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
          <Image
            src={logoPreview}
            alt="Preview logo empresa"
            width={220}
            height={80}
            unoptimized
            className="h-16 w-auto object-contain"
          />
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          "Guardar configuración"
        )}
      </button>
      {state.error ? <p className="text-xs text-red-300">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-300">Configuración actualizada.</p> : null}
      {state.ok ? (
        <div className="fixed bottom-6 right-6 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-lg backdrop-blur">
          Cambios guardados correctamente
        </div>
      ) : null}
    </form>
  );
}
