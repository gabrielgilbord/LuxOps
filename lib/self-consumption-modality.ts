/** Valores alineados con el enum Prisma `SelfConsumptionModality`. */

export type SelfConsumptionModalityValue =
  | "SIN_EXCEDENTES"
  | "CON_EXCEDENTES_ACOGIDO_COMPENSACION"
  | "CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION";

export const SELF_CONSUMPTION_MODALITY_VALUES: readonly SelfConsumptionModalityValue[] = [
  "SIN_EXCEDENTES",
  "CON_EXCEDENTES_ACOGIDO_COMPENSACION",
  "CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION",
] as const;

export const SELF_CONSUMPTION_MODALITY_LABEL: Record<SelfConsumptionModalityValue, string> = {
  SIN_EXCEDENTES: "Sin excedentes",
  CON_EXCEDENTES_ACOGIDO_COMPENSACION: "Con excedentes acogido a compensación",
  CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION: "Con excedentes NO acogido a compensación",
};

export function isSelfConsumptionModality(v: string): v is SelfConsumptionModalityValue {
  return (SELF_CONSUMPTION_MODALITY_VALUES as readonly string[]).includes(v);
}

export function modalityLabel(m: string | null | undefined): string {
  if (!m) return "—";
  return isSelfConsumptionModality(m) ? SELF_CONSUMPTION_MODALITY_LABEL[m] : String(m);
}
