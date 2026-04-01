"use server";

import { redirect } from "next/navigation";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

export async function createCheckoutSessionAction() {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await createStripeCheckoutSession(origin);
  if (!session.url) throw new Error("No se pudo iniciar Stripe Checkout");
  redirect(session.url);
}
