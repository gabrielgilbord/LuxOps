import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentDbUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
    },
  });
}

export async function requireAuthenticatedUser() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/login");
  return dbUser;
}

async function requireSubscribedOrganization(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isSubscribed: true, subscriptionStatus: true },
  });

  const isActive =
    organization?.isSubscribed &&
    ["active", "trialing"].includes(organization.subscriptionStatus ?? "active");

  if (!isActive) redirect("/register");
}

export async function requireAdminUser() {
  const dbUser = await requireAuthenticatedUser();
  if (dbUser.role !== "ADMIN") redirect("/mobile-dashboard");
  await requireSubscribedOrganization(dbUser.organizationId);
  return dbUser;
}

export async function requireAdminUserForDashboard() {
  const dbUser = await requireAuthenticatedUser();
  if (dbUser.role !== "ADMIN") redirect("/mobile-dashboard");
  return dbUser;
}

export async function requireOperarioUser() {
  const dbUser = await requireAuthenticatedUser();
  if (dbUser.role !== "OPERARIO") redirect("/dashboard");
  await requireSubscribedOrganization(dbUser.organizationId);
  return dbUser;
}

export async function requireSubscribedUser() {
  const dbUser = await requireAuthenticatedUser();
  await requireSubscribedOrganization(dbUser.organizationId);
  return dbUser;
}
