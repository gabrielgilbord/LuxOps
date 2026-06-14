import type { OrganizationVertical } from "@prisma/client";
import { FibOpsLogo } from "@/components/brand/fibops-logo";
import { LuxOpsLogo } from "@/components/brand/luxops-logo";
import { isFiberVertical } from "@/lib/organization-vertical";

type Props = {
  vertical?: OrganizationVertical | string | null;
  darkBackground?: boolean;
  invertColors?: boolean;
  className?: string;
};

export function ProductLogo({ vertical, darkBackground, invertColors, className }: Props) {
  if (isFiberVertical(vertical)) {
    return <FibOpsLogo darkBackground={darkBackground} className={className} />;
  }
  return (
    <LuxOpsLogo
      darkBackground={darkBackground}
      invertColors={invertColors}
      className={className}
    />
  );
}
