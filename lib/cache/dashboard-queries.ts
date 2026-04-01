import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Una sola consulta por petición RSC cuando el layout y otras rutas piden la misma org. */
export const getOrgForDashboard = cache(async (organizationId: string) => {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, subscriptionStatus: true },
  });
});
