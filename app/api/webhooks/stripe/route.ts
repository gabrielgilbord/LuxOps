import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { firstNameForWelcome } from "@/lib/celebration-name";
import { sendPaidSubscriptionWelcomeEmail } from "@/lib/email";
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
  } catch {
    console.error("LuxOps Stripe webhook: firma inválida o cuerpo corrupto");
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
          "LuxOps Stripe webhook: checkout.session.completed sin fila Organization (esperable si el alta aún no guardó sesión; rescate vía Stripe API por email).",
        );
      }
      try {
        const full = await stripe.checkout.sessions.retrieve(session.id);
        const payerEmail =
          full.customer_details?.email ??
          (typeof full.customer_email === "string" ? full.customer_email : null) ??
          null;
        const payerName = full.customer_details?.name ?? null;
        if (payerEmail) {
          const firstName = firstNameForWelcome(payerName, payerEmail);
          void sendPaidSubscriptionWelcomeEmail({ to: payerEmail, firstName });
        }
      } catch {
        /* no bloquear el webhook si falla el correo o el retrieve */
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

    try {
      await prisma.stripeEvent.create({
        data: { eventId: event.id, eventType: event.type },
      });
    } catch (createErr) {
      if (
        createErr instanceof Prisma.PrismaClientKnownRequestError &&
        createErr.code === "P2002"
      ) {
        // Misma entrega concurrente o reintento muy rápido: otro worker ya insertó este event.id.
        return NextResponse.json({ received: true, deduplicated: true });
      }
      throw createErr;
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("LuxOps Stripe webhook: error al procesar evento o persistir deduplicación");
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}
