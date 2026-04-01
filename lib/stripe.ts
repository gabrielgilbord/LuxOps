import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

export function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en variables de entorno.");
  }
  return new Stripe(stripeKey, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export function getStripeJs() {
  const key =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!key) {
    throw new Error("Falta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY en variables de entorno.");
  }
  return loadStripe(key);
}
