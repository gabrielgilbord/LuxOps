import { NextResponse } from "next/server";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

export async function GET(request: Request) {
  try {
    const session = await createStripeCheckoutSession();

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch {
    console.error("[api/stripe/checkout] no se pudo crear sesión de Stripe");
    return NextResponse.redirect(new URL("/#precios", request.url), 303);
  }
}
