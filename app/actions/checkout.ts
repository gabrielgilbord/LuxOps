"use server";

import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

/** `checkoutUrl`: abrir en el cliente con `window.location.assign` (no usar `redirect()` a Stripe desde Server Action: CORS/preflight 403). */
export type CheckoutSessionActionState =
  | { error?: string; checkoutUrl?: string }
  | undefined;

function checkoutErrorMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    const code = err.code;
    if (code === "resource_missing" || err.message.includes("No such price")) {
      return "El precio de Stripe no existe o no coincide con el modo de la clave (test vs producción). Revisa STRIPE_PRICE_ID_MONTHLY y STRIPE_SECRET_KEY en Vercel.";
    }
    return "La pasarela de pago rechazó la solicitud. Comprueba la configuración de Stripe en el servidor.";
  }
  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    return "Clave de Stripe inválida o no configurada. Revisa STRIPE_SECRET_KEY en Vercel (entorno Production).";
  }
  if (err instanceof Error && err.message.includes("STRIPE_SECRET_KEY")) {
    return "Falta STRIPE_SECRET_KEY en el servidor. Añádela en Vercel → Settings → Environment Variables (Production).";
  }
  return "No se pudo iniciar el pago. Inténtalo de nuevo o contacta con soporte.";
}

/**
 * Usar con useActionState: (prev, formData) => …
 * No lanzar errores a la red: en producción Next oculta el mensaje y solo ves digest / 500.
 */
export async function createCheckoutSessionAction(
  _prev: CheckoutSessionActionState,
  _formData: FormData,
): Promise<{ error?: string; checkoutUrl?: string }> {
  try {
    const session = await createStripeCheckoutSession();
    if (!session.url) {
      return { error: "No se pudo obtener el enlace de pago." };
    }
    return { checkoutUrl: session.url };
  } catch (err) {
    console.error("[checkout] createCheckoutSessionAction", err);
    return { error: checkoutErrorMessage(err) };
  }
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
