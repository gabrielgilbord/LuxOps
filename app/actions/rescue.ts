"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSupabaseAuthCallbackUrl } from "@/lib/public-app-url";
import { isOrganizationProfileIncomplete } from "@/lib/organization-profile";
import { firstNameForWelcome } from "@/lib/celebration-name";
import { findActiveSubscriptionForEmail } from "@/lib/rescue";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type RescueEligibilityResult =
  | { kind: "invalid_email" }
  | { kind: "not_paid" }
  | { kind: "unsubscribed" }
  | { kind: "has_account_subscribed"; email: string; needsOrgProfile: boolean }
  | { kind: "stripe_paid_no_app_account"; email: string; suggestedCompany: string | null };

/**
 * Comprueba si el correo puede usar el flujo de rescate (pago en Stripe sin registro completo,
 * o cuenta LuxOps ya activa). No muestra ni crea sesiones de Checkout.
 */
export async function checkRescueEligibility(emailRaw: string): Promise<RescueEligibilityResult> {
  const email = normalizeEmail(emailRaw);
  if (!email || !isValidEmail(email)) {
    return { kind: "invalid_email" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: {
        select: {
          isSubscribed: true,
          rebtCompanyNumber: true,
          taxAddress: true,
        },
      },
    },
  });

  if (dbUser) {
    if (dbUser.organization.isSubscribed) {
      const needsOrgProfile = isOrganizationProfileIncomplete({
        rebtCompanyNumber: dbUser.organization.rebtCompanyNumber,
        taxAddress: dbUser.organization.taxAddress,
      });
      return { kind: "has_account_subscribed", email, needsOrgProfile };
    }
    return { kind: "unsubscribed" };
  }

  const paid = await findActiveSubscriptionForEmail(email);
  if (!paid) {
    return { kind: "not_paid" };
  }

  return {
    kind: "stripe_paid_no_app_account",
    email,
    suggestedCompany: paid.suggestedName,
  };
}

/** Solo si ya existe usuario LuxOps con org suscrita (evita spam de magic links). */
export async function sendRescueMagicLinkAction(
  emailRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Correo no válido." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: {
        select: {
          isSubscribed: true,
          rebtCompanyNumber: true,
          taxAddress: true,
        },
      },
    },
  });
  if (!dbUser?.organization.isSubscribed) {
    return { ok: false, error: "No hay cuenta activa con suscripción para ese correo." };
  }

  const needsOrgProfile = isOrganizationProfileIncomplete({
    rebtCompanyNumber: dbUser.organization.rebtCompanyNumber,
    taxAddress: dbUser.organization.taxAddress,
  });
  const nextPath = needsOrgProfile ? "/onboarding?continue=1" : "/dashboard";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getSupabaseAuthCallbackUrl(nextPath),
    },
  });

  if (error) {
    return { ok: false, error: error.message || "No se pudo enviar el enlace." };
  }
  return { ok: true };
}

export async function completeRescueRegistration(
  emailRaw: string,
  password: string,
  fullName: string,
  companyName: string,
): Promise<{ error: string } | void> {
  const email = normalizeEmail(emailRaw);
  const name = fullName.trim();
  const company = companyName.trim();

  if (!isValidEmail(email)) {
    return { error: "Correo no válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!name || !company) {
    return { error: "Nombre y empresa son obligatorios." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return {
      error:
        "Ya existe una cuenta LuxOps con ese correo. Usa Iniciar sesión o el enlace mágico desde el paso anterior.",
    };
  }

  const paid = await findActiveSubscriptionForEmail(email);
  if (!paid) {
    return {
      error:
        "No encontramos una suscripción activa en Stripe para ese correo. Si acabas de pagar, espera unos minutos o contacta con soporte.",
    };
  }

  const orgByCustomer = await prisma.organization.findUnique({
    where: { stripeCustomerId: paid.customerId },
    include: { _count: { select: { users: true } } },
  });

  if (orgByCustomer && orgByCustomer._count.users > 0) {
    return {
      error:
        "Esa suscripción de Stripe ya está vinculada a otra cuenta. Entra con el administrador de esa empresa o escribe a soporte.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: getSupabaseAuthCallbackUrl("/dashboard"),
    },
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered") ||
      error.code === "user_already_exists"
    ) {
      return {
        error:
          "Ese correo ya está registrado en el sistema de acceso. Usa Iniciar sesión o recupera la contraseña desde ahí.",
      };
    }
    return { error: error.message || "No se pudo crear la cuenta." };
  }
  if (!data.user) {
    return { error: "No se pudo crear la cuenta de acceso." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (orgByCustomer) {
        await tx.organization.update({
          where: { id: orgByCustomer.id },
          data: {
            name: company,
            isSubscribed: true,
            stripeSubscriptionId: paid.subscriptionId,
            subscriptionStatus: paid.subscriptionStatus,
            planPriceCents: 15000,
          },
        });
        await tx.user.create({
          data: {
            supabaseUserId: data.user!.id,
            email,
            name,
            role: "ADMIN",
            organizationId: orgByCustomer.id,
          },
        });
      } else {
        const organization = await tx.organization.create({
          data: {
            name: company,
            isSubscribed: true,
            stripeCustomerId: paid.customerId,
            stripeSubscriptionId: paid.subscriptionId,
            subscriptionStatus: paid.subscriptionStatus,
            planPriceCents: 15000,
          },
        });
        await tx.user.create({
          data: {
            supabaseUserId: data.user!.id,
            email,
            name,
            role: "ADMIN",
            organizationId: organization.id,
          },
        });
      }
    });
  } catch {
    console.error("[rescue] completeRescueRegistration: error al persistir organización");
    return {
      error:
        "No se pudo guardar la organización. Si el problema continúa, contacta con soporte indicando tu correo de pago.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/mobile-dashboard");
  revalidatePath("/dashboard/settings");

  if (!data.session) {
    redirect("/login?verify=1");
  }
  const elite = encodeURIComponent(firstNameForWelcome(name, email));
  redirect(`/onboarding?continue=1&celebrate=1&elite=${elite}`);
}
