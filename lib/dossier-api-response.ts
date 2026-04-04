/** Cuerpo JSON cuando el dossier no puede generarse por datos incompletos (consumo en cliente). */
export type DossierClientErrorBody = {
  dossierError: true;
  missingFields: string[];
  code?: string;
};

export function isDossierClientErrorBody(x: unknown): x is DossierClientErrorBody {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    o.dossierError === true &&
    Array.isArray(o.missingFields) &&
    o.missingFields.every((f) => typeof f === "string")
  );
}

/** Error 500 al generar el PDF (no validación de datos). */
export type DossierPdfGenerationFailedBody = {
  error: string;
  code: "PDF_GENERATION_FAILED";
};

export function isDossierPdfGenerationFailedBody(x: unknown): x is DossierPdfGenerationFailedBody {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return o.code === "PDF_GENERATION_FAILED" && typeof o.error === "string";
}
