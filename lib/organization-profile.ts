/** Datos mínimos de empresa para considerar cerrado el onboarding de organización (post-pago). */
export function isOrganizationProfileIncomplete(org: {
  rebtCompanyNumber: string | null;
  taxAddress: string | null;
}): boolean {
  const rebt = org.rebtCompanyNumber?.trim() ?? "";
  const tax = org.taxAddress?.trim() ?? "";
  return rebt.length < 4 || tax.length < 5;
}
