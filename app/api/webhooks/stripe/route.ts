import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/** Stripe devuelve a veces string id y a veces objeto expandido. */
function stripeRefId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Subscription | null | undefined,
): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

/**
 * Suscripción activa en LuxOps = `Organization.isSubscribed` (+ `subscriptionStatus`).
 * No hay campo de suscripción en `User`; los usuarios heredan el estado vía su organización.
 *
 * URL en Stripe Dashboard (producción): `https://luxops.es/api/webhooks/stripe`
 * Secreto: `STRIPE_WEBHOOK_SECRET` (Signing secret del endpoint, empieza por `whsec_`).
 *
 * Eventos recomendados: `checkout.session.completed`, `customer.subscription.updated`,
 * `customer.subscription.deleted`, `invoice.payment_failed`.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Invalid webhook signature", error);
    return NextResponse.json({ error: "Firma invalida" }, { status: 400 });
  }

  const alreadyProcessed = await prisma.stripeEvent.findUnique({
    where: { eventId: event.id },
    select: { id: true },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = stripeRefId(session.customer);
      const subscriptionId = stripeRefId(session.subscription);

      const result = await prisma.organization.updateMany({
        where: {
          OR: [
            { stripeCheckoutSessionId: session.id },
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
          ],
        },
        data: {
          isSubscribed: true,
          subscriptionStatus: "active",
          stripeSubscriptionId: subscriptionId ?? undefined,
          ...(customerId ? { stripeCustomerId: customerId } : {}),
        },
      });
      if (result.count === 0) {
        console.warn(
          "LuxOps Stripe webhook: checkout.session.completed — 0 filas (normal si el alta de org aún no guardó `stripeCheckoutSessionId`).",
          { sessionId: session.id, customerId },
        );
      }
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = stripeRefId(subscription.customer);
      if (customerId) {
        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: subscription.status,
            isSubscribed: ["active", "trialing"].includes(subscription.status),
            stripeSubscriptionId: subscription.id,
          },
        });
      }
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.payment_failed"
    ) {
      const object = event.data.object as Stripe.Subscription | Stripe.Invoice;
      const customerId = stripeRefId(
        "customer" in object ? object.customer : undefined,
      );
      if (customerId) {
        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            isSubscribed: false,
            subscriptionStatus:
              event.type === "customer.subscription.deleted" ? "canceled" : "past_due",
          },
        });
      }
    }

    await prisma.stripeEvent.create({
      data: { eventId: event.id, eventType: event.type },
    });
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("LuxOps Stripe webhook: handler failed before persisting stripeEvent", e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}
