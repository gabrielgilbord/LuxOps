/** REBT efectivo en campo: anulación en proyecto o valor de organización. */
export function effectiveRebtCompanyNumberFromContext(ctx: {
  projectRebtCompanyNumber?: string | null;
  organizationRebtCompanyNumber?: string | null;
}): string {
  const p = (ctx.projectRebtCompanyNumber ?? "").trim();
  const o = (ctx.organizationRebtCompanyNumber ?? "").trim();
  return p || o;
}

/** Mínimo legal en LuxOps para habilitar firma final y dossier defendible. */
export function isRebtLengthValidForDossierFinalize(effectiveRebt: string): boolean {
  return effectiveRebt.trim().length >= 4;
}
