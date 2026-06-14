import { prisma } from "@/lib/prisma";

/** Organización interna para usuarios SUPER_ADMIN de plataforma. */
export const PLATFORM_ORG_ID = "luxops-platform-org";

export function getSuperAdminEmailsFromEnv(): string[] {
  return (process.env.LUXOPS_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return getSuperAdminEmailsFromEnv().includes(normalized);
}

/**
 * Si el email está en LUXOPS_SUPER_ADMIN_EMAILS, asegura org de plataforma y rol SUPER_ADMIN.
 * Devuelve true si el usuario quedó como super admin.
 */
export async function ensureSuperAdminFromEnv(params: {
  email: string;
  supabaseUserId: string;
  name?: string | null;
}): Promise<boolean> {
  if (!isSuperAdminEmail(params.email)) return false;

  await prisma.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { id: PLATFORM_ORG_ID },
      create: {
        id: PLATFORM_ORG_ID,
        name: "LuxOps Platform",
        vertical: "SOLAR",
        isSubscribed: true,
        subscriptionStatus: "active",
      },
      update: {},
    });

    await tx.user.upsert({
      where: { supabaseUserId: params.supabaseUserId },
      create: {
        supabaseUserId: params.supabaseUserId,
        email: params.email.trim().toLowerCase(),
        name: params.name?.trim() || null,
        role: "SUPER_ADMIN",
        organizationId: PLATFORM_ORG_ID,
      },
      update: {
        role: "SUPER_ADMIN",
        organizationId: PLATFORM_ORG_ID,
      },
    });
  });

  return true;
}
