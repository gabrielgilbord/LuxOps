"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

function safeInternalNextPath(raw: string): string | null {
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  if (t.includes("://")) return null;
  return t;
}

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  const nextAdmin = safeInternalNextPath(nextRaw) ?? "/dashboard";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales invalidas." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      select: { role: true },
    });

    if (dbUser?.role === "OPERARIO") {
      redirect("/mobile-dashboard");
    }
  }

  redirect(nextAdmin);
}

export async function registerAction(
  formData: FormData,
): Promise<{ error?: string; checkoutUrl?: string }> {
  void formData;
  try {
    const session = await createStripeCheckoutSession();
    if (!session.url) {
      return { error: "No se pudo iniciar el checkout de Stripe." };
    }
    return { checkoutUrl: session.url };
  } catch (e) {
    console.error("[registerAction]", e);
    return { error: "No se pudo iniciar el pago. Revisa Stripe en el servidor." };
  }
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
