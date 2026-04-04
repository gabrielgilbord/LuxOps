import { getPublicAppUrl } from "@/lib/public-app-url";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function createStripeCheckoutSession() {
  const base = getPublicAppUrl();
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "LuxOps Professional",
              description: "Suscripcion mensual para instaladoras solares",
            },
            recurring: { interval: "month" as const },
            unit_amount: 15000,
          },
          quantity: 1,
        },
      ];

  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems,
    success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/register`,
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });
}
