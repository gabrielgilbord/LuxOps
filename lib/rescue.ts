import { getStripe } from "@/lib/stripe";

/**
 * Salvavidas si el webhook falla o llega antes de que exista `Organization` en BD:
 * consulta directa a Stripe por email del cliente (como en Checkout), sin depender de LuxOps.
 */
export type PaidStripeInfo = {
  customerId: string;
  subscriptionId: string;
  subscriptionStatus: string;
  suggestedName: string | null;
};

/**
 * Busca clientes con ese email y devuelve la primera suscripción `active` o `trialing`.
 * Usa la API de Stripe; no lee la base de datos de LuxOps.
 */
export async function findActiveSubscriptionForEmail(
  email: string,
): Promise<PaidStripeInfo | null> {
  const stripe = getStripe();
  const { data: customers } = await stripe.customers.list({ email, limit: 25 });
  for (const c of customers) {
    const { data: subs } = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 25,
    });
    const active = subs.find((s) => s.status === "active" || s.status === "trialing");
    if (active) {
      return {
        customerId: c.id,
        subscriptionId: active.id,
        subscriptionStatus: active.status,
        suggestedName: c.name ?? (c.metadata?.company_name as string | undefined) ?? null,
      };
    }
  }
  return null;
}
