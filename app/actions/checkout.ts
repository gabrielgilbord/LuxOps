"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

export async function createCheckoutSessionAction() {
  const session = await createStripeCheckoutSession();
  if (!session.url) throw new Error("No se pudo iniciar Stripe Checkout");
  redirect(session.url);
}

/**
 * Tras el pago: alinea la organización en BD con Stripe (webhook puede ir con retraso).
 * No crea usuario ni org; útil si ya existe fila vinculada al checkout o al customer.
 */
export async function syncOrganizationFromCheckoutSession(sessionId: string) {
  const id = sessionId.trim();
  if (!id) return { ok: false as const, reason: "missing_session" };

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ["subscription"],
    });
    if (session.status !== "complete") {
      return { ok: false as const, reason: "not_complete" };
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer && "id" in session.customer
          ? session.customer.id
          : null;
    const sub = session.subscription;
    const subscriptionId =
      typeof sub === "string" ? sub : sub && typeof sub === "object" && "id" in sub ? sub.id : null;
    const subscriptionStatus =
      typeof sub === "string"
        ? "active"
        : sub && typeof sub === "object" && "status" in sub && typeof sub.status === "string"
          ? sub.status
          : "active";

    const result = await prisma.organization.updateMany({
      where: {
        OR: [
          { stripeCheckoutSessionId: session.id },
          ...(customerId ? [{ stripeCustomerId: customerId }] : []),
        ],
      },
      data: {
        isSubscribed: true,
        subscriptionStatus,
        stripeSubscriptionId: subscriptionId ?? undefined,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/mobile-dashboard");
    revalidatePath("/dashboard/settings");

    return { ok: true as const, updated: result.count };
  } catch {
    return { ok: false as const, reason: "stripe_or_db_error" };
  }
}
