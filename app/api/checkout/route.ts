import { NextResponse } from "next/server";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

export async function GET(request: Request) {
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await createStripeCheckoutSession(origin);
    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/#precios", request.url), 303);
  }
}
