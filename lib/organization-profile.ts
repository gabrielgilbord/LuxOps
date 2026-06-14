/** Datos mínimos de empresa para considerar cerrado el onboarding de organización (post-pago). */
export function isOrganizationProfileIncomplete(org: {
  rebtCompanyNumber: string | null;
  taxAddress: string | null;
  vertical?: string | null;
}): boolean {
  const tax = org.taxAddress?.trim() ?? "";
  if (tax.length < 5) return true;
  if (org.vertical === "FIBER") return false;
  const rebt = org.rebtCompanyNumber?.trim() ?? "";
  return rebt.length < 4;
}
