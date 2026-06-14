import type { OrganizationVertical } from "@prisma/client";

export const ORGANIZATION_VERTICAL_LABEL: Record<OrganizationVertical, string> = {
  SOLAR: "LuxOps — Solar",
  FIBER: "FibOps — Fibra óptica",
};

export function isFiberVertical(vertical: OrganizationVertical | string | null | undefined) {
  return vertical === "FIBER";
}

export function isSolarVertical(vertical: OrganizationVertical | string | null | undefined) {
  return vertical !== "FIBER";
}
