import type { OrganizationVertical } from "@prisma/client";
import { isFiberVertical } from "@/lib/organization-vertical";

export type ProductBrand = {
  id: "luxops" | "fibops";
  name: string;
  tagline: string;
  accentClass: string;
  accentBgClass: string;
  accentBorderClass: string;
  fieldLabel: string;
};

const LUXOPS_BRAND: ProductBrand = {
  id: "luxops",
  name: "LuxOps",
  tagline: "Operativa solar",
  accentClass: "text-yellow-300",
  accentBgClass: "bg-yellow-400",
  accentBorderClass: "border-yellow-300/40",
  fieldLabel: "Modo Tejado",
};

const FIBOPS_BRAND: ProductBrand = {
  id: "fibops",
  name: "FibOps",
  tagline: "Operativa de fibra óptica",
  accentClass: "text-cyan-300",
  accentBgClass: "bg-cyan-400",
  accentBorderClass: "border-cyan-400/40",
  fieldLabel: "Modo Campo",
};

export function getProductBrand(vertical: OrganizationVertical | string | null | undefined): ProductBrand {
  return isFiberVertical(vertical) ? FIBOPS_BRAND : LUXOPS_BRAND;
}
