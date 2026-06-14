/** Operadores FTTH habituales en España (lista editable en super admin / formularios). */
export const FIBER_OPERATORS = [
  "Movistar",
  "Orange",
  "Vodafone",
  "MásMóvil / Yoigo",
  "Digi",
  "Adamo",
  "Avatel",
  "Euskaltel / R",
  "Telecable",
  "Otro",
] as const;

export type FiberOperator = (typeof FIBER_OPERATORS)[number];

export function isFiberOperator(value: string): value is FiberOperator {
  return (FIBER_OPERATORS as readonly string[]).includes(value);
}
