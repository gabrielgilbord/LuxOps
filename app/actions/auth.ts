"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

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

  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  void formData;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await createStripeCheckoutSession(origin);
  if (!session.url) {
    return { error: "No se pudo iniciar el checkout de Stripe." };
  }
  redirect(session.url);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
