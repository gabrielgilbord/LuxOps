"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendLuxOpsPasswordRecoveryEmail } from "@/lib/email";
import { getSupabaseAuthResetPasswordUrl } from "@/lib/public-app-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

function safeInternalNextPath(raw: string): string | null {
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  if (t.includes("://")) return null;
  return t;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Recuperación de contraseña: enlace generado con Supabase Admin (`recovery`) y envío con Resend.
 * No revela si el correo existe en Auth (mensaje genérico si no hay usuario).
 */
export async function sendPasswordResetEmailAction(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { error: "Introduce un correo válido." };
  }

  try {
    const redirectTo = getSupabaseAuthResetPasswordUrl();
    const result = await sendLuxOpsPasswordRecoveryEmail({ to: email, redirectTo });
    if (!result.ok) {
      return { error: result.error };
    }
  } catch (e) {
    console.error("[auth] sendPasswordResetEmailAction", e);
    return { error: "No se pudo procesar la solicitud. Inténtalo más tarde." };
  }

  return { ok: true };
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
  } catch {
    console.error("[auth] registerAction: error al crear sesión de checkout");
    return { error: "No se pudo iniciar el pago. Revisa Stripe en el servidor." };
  }
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
