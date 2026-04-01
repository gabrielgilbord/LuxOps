"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/authz";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateAdminProfileAction(formData: FormData) {
  const admin = await requireAdminUser();
  const name = String(formData.get("name") ?? "").trim();

  await prisma.user.update({
    where: { id: admin.id },
    data: { name: name || null },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updatePasswordAction(formData: FormData) {
  await requireAdminUser();
  const nextPassword = String(formData.get("nextPassword") ?? "").trim();
  if (nextPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) return { error: "No se pudo actualizar la contraseña." };
  return { ok: true };
}
