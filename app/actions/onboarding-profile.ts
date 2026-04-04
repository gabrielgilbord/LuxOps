"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { requireAuthenticatedUser } from "@/lib/authz";

function isActiveSubscription(org: {
  isSubscribed: boolean;
  subscriptionStatus: string | null;
}): boolean {
  return (
    org.isSubscribed && ["active", "trialing"].includes(org.subscriptionStatus ?? "active")
  );
}

export async function completeOrganizationOnboardingAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireAuthenticatedUser();
  if (admin.role !== "ADMIN") {
    redirect("/mobile-dashboard");
  }

  const orgRow = await prisma.organization.findUnique({
    where: { id: admin.organizationId },
    select: {
      isSubscribed: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      name: true,
    },
  });
  if (!orgRow || !isActiveSubscription(orgRow)) {
    redirect("/recuperar-acceso");
  }

  const companyName = String(formData.get("companyName") ?? "").trim();
  const taxAddress = String(formData.get("taxAddress") ?? "").trim();
  const rebtCompanyNumber = String(formData.get("rebtCompanyNumber") ?? "").trim();

  if (!rebtCompanyNumber || rebtCompanyNumber.length < 4) {
    return {
      ok: false,
      error: "El Nº de empresa instaladora autorizada (REBT) es obligatorio (mínimo 4 caracteres).",
    };
  }
  if (!taxAddress || taxAddress.length < 5) {
    return { ok: false, error: "La dirección fiscal es obligatoria (mínimo 5 caracteres)." };
  }

  await prisma.organization.update({
    where: { id: admin.organizationId },
    data: {
      ...(companyName ? { name: companyName } : {}),
      taxAddress,
      rebtCompanyNumber,
    },
  });

  if (orgRow.stripeCustomerId) {
    try {
      const stripe = getStripe();
      await stripe.customers.update(orgRow.stripeCustomerId, {
        ...(companyName ? { name: companyName } : orgRow.name ? { name: orgRow.name } : {}),
        address: { line1: taxAddress.slice(0, 120) },
        metadata: { tax_address: taxAddress },
      });
    } catch (e) {
      console.error("[completeOrganizationOnboardingAction] Stripe customer update", e);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/company-settings");

  redirect("/dashboard");
}

export async function getOnboardingContinueOrgSnapshot(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      taxAddress: true,
      rebtCompanyNumber: true,
      isSubscribed: true,
      subscriptionStatus: true,
    },
  });
}
