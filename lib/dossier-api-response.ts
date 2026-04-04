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
