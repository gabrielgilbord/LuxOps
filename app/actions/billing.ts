"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error || !data.user) {
    throw new Error("No se pudo crear la cuenta del administrador.");
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

  const organization = await prisma.organization.create({
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

  await prisma.user.create({
    data: {
      supabaseUserId: data.user.id,
      email,
      name: fullName,
      role: "ADMIN",
      organizationId: organization.id,
    },
  });

  redirect("/dashboard");
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const returnUrl = appUrl
    ? `${appUrl}/dashboard/settings?tab=subscription`
    : "http://localhost:3000/dashboard/settings?tab=subscription";

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
  } catch (error) {
    console.error("No se pudo abrir portal de Stripe", error);
    const fallbackSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: returnUrl,
    });
    redirect(fallbackSession.url);
  }
}
