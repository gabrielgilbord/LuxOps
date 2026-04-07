"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendLuxOpsSignupConfirmationEmail } from "@/lib/email";
import { getPublicAppUrl, getSupabaseAuthCallbackUrl } from "@/lib/public-app-url";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/authz";

export async function completeCheckoutOnboarding(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const companyName = String(formData.get("companyName") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!sessionId || !companyName || !email || !password) {
    throw new Error("Faltan campos obligatorios del onboarding.");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (session.status !== "complete") {
    throw new Error("El pago no esta completado.");
  }

  const existingOrg = await prisma.organization.findUnique({
    where: { stripeCheckoutSessionId: session.id },
    select: { id: true },
  });

  if (existingOrg) {
    redirect("/login");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: authCreate, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });

  if (createErr || !authCreate.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    const code = createErr?.code ?? "";
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered") ||
      code === "user_already_exists"
    ) {
      throw new Error(
        "Ese correo ya tiene cuenta de acceso. Inicia sesión o usa «¿Olvidaste tu contraseña?».",
      );
    }
    throw new Error(
      createErr?.message || "No se pudo crear la cuenta del administrador. Revisa el email o prueba otro.",
    );
  }

  const authUserId = authCreate.user.id;

  const confirmSend = await sendLuxOpsSignupConfirmationEmail({
    to: email,
    password,
    redirectTo: getSupabaseAuthCallbackUrl("/dashboard"),
    fullName: fullName,
  });
  if (!confirmSend.ok) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw new Error(confirmSend.error);
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const subscriptionStatus =
    typeof session.subscription === "string"
      ? null
      : session.subscription?.status ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: companyName,
          isSubscribed: true,
          stripeCheckoutSessionId: session.id,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: subscriptionStatus ?? "active",
          planPriceCents: 15000,
        },
      });

      await tx.user.create({
        data: {
          supabaseUserId: authUserId,
          email,
          name: fullName,
          role: "ADMIN",
          organizationId: organization.id,
        },
      });
    });
  } catch {
    console.error("[billing] completeCheckoutOnboarding: error al persistir organización");
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw new Error(
      "No se pudo guardar la empresa en LuxOps. Si el cargo aparece en Stripe, contacta con soporte con tu correo de pago.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/mobile-dashboard");
  revalidatePath("/dashboard/settings");

  redirect("/login?verify=1");
}

export async function openCustomerPortalAction(formData: FormData) {
  const intentRaw = String(formData.get("intent") ?? "manage");
  const intent =
    intentRaw === "update_payment" || intentRaw === "cancel_subscription"
      ? intentRaw
      : "manage";
  const admin = await requireAdminUser();
  const organization = await prisma.organization.findUnique({
    where: { id: admin.organizationId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!organization?.stripeCustomerId) {
    redirect("/dashboard/settings?tab=subscription");
  }

  const stripe = getStripe();
  const appUrl = getPublicAppUrl();
  const returnUrl = `${appUrl}/dashboard/settings?tab=subscription`;

  try {
    const flowData =
      intent === "update_payment"
        ? { type: "payment_method_update" as const }
        : intent === "cancel_subscription" && organization.stripeSubscriptionId
          ? {
              type: "subscription_cancel" as const,
              subscription_cancel: { subscription: organization.stripeSubscriptionId },
            }
          : undefined;

    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: returnUrl,
      ...(flowData ? { flow_data: flowData } : {}),
    });

    redirect(session.url);
  } catch {
    console.error("[billing] openCustomerPortalAction: error al abrir portal de Stripe");
    const fallbackSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: returnUrl,
    });
    redirect(fallbackSession.url);
  }
}
