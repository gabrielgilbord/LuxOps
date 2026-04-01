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

  try {
    await prisma.stripeEvent.create({
      data: { eventId: event.id, eventType: event.type },
    });
  } catch {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = typeof session.customer === "string" ? session.customer : null;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;

    await prisma.organization.updateMany({
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
    return NextResponse.json({ received: true });
  }

  if (event.type === "customer.subscription.updated") {
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
    return NextResponse.json({ received: true });
  }

  if (
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
    return NextResponse.json({ received: true });
  }
  return NextResponse.json({ received: true });
}
