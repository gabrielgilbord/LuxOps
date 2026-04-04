import { NextResponse } from "next/server";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

export async function GET(request: Request) {
  try {
    const session = await createStripeCheckoutSession();
    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/#precios", request.url), 303);
  }
}
