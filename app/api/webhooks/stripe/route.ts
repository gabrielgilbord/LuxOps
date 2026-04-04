import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

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
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

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
        },
      });
      if (result.count === 0) {
        console.error(
          "LuxOps Stripe webhook: checkout.session.completed matched 0 organizations — trace sessionId in Stripe Dashboard and DB",
          { sessionId: session.id, customerId },
        );
      }
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
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
      const customerId =
        "customer" in object && typeof object.customer === "string" ? object.customer : null;
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
