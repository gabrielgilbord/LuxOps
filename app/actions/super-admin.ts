"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrganizationVertical } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminUser } from "@/lib/authz";
import { sendLuxOpsSignupConfirmationEmail } from "@/lib/email";
import { getSupabaseAuthCallbackUrl } from "@/lib/public-app-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PLATFORM_ORG_ID } from "@/lib/super-admin";

const VERTICALS = new Set<string>(["SOLAR", "FIBER"]);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type SuperAdminFormState = { error?: string; ok?: boolean } | null;

export async function createOrganizationManualAction(
  _prev: SuperAdminFormState,
  formData: FormData,
): Promise<SuperAdminFormState> {
  await requireSuperAdminUser();

  const companyName = String(formData.get("companyName") ?? "").trim();
  const verticalRaw = String(formData.get("vertical") ?? "SOLAR").trim();
  const taxAddress = String(formData.get("taxAddress") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const markSubscribed = formData.get("markSubscribed") === "on";

  if (!companyName || companyName.length < 2) {
    return { error: "Indica un nombre de empresa válido." };
  }
  if (!VERTICALS.has(verticalRaw)) {
    return { error: "Vertical no válida." };
  }
  if (!isValidEmail(adminEmail)) {
    return { error: "Email del administrador no válido." };
  }
  if (adminPassword.length < 8) {
    return { error: "La contraseña del administrador debe tener al menos 8 caracteres." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  if (existingUser) {
    return { error: "Ese email ya está registrado en LuxOps." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: authCreate, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName || companyName },
  });

  if (createErr || !authCreate.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already")) {
      return { error: "Ese correo ya existe en Supabase Auth." };
    }
    return { error: createErr?.message || "No se pudo crear el usuario en Auth." };
  }

  const authUserId = authCreate.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: companyName,
          vertical: verticalRaw as OrganizationVertical,
          taxAddress: taxAddress || null,
          isSubscribed: markSubscribed,
          subscriptionStatus: markSubscribed ? "active" : "manual",
          planPriceCents: markSubscribed ? 15000 : null,
        },
      });

      await tx.user.create({
        data: {
          supabaseUserId: authUserId,
          email: adminEmail,
          name: adminName || null,
          role: "ADMIN",
          organizationId: organization.id,
        },
      });
    });
  } catch (e) {
    console.error("[super-admin] createOrganizationManualAction", e);
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return { error: "No se pudo guardar la organización en la base de datos." };
  }

  const confirmSend = await sendLuxOpsSignupConfirmationEmail({
    to: adminEmail,
    password: adminPassword,
    redirectTo: getSupabaseAuthCallbackUrl("/dashboard"),
    fullName: adminName || companyName,
  });
  if (!confirmSend.ok) {
    console.warn("[super-admin] email bienvenida no enviado:", confirmSend.error);
  }

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/organizations");
  redirect("/super-admin/organizations?created=1");
}

export async function updateOrganizationAction(
  _prev: SuperAdminFormState,
  formData: FormData,
): Promise<SuperAdminFormState> {
  await requireSuperAdminUser();

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const verticalRaw = String(formData.get("vertical") ?? "").trim();
  const taxAddress = String(formData.get("taxAddress") ?? "").trim();
  const isSubscribed = formData.get("isSubscribed") === "on";
  const subscriptionStatus = String(formData.get("subscriptionStatus") ?? "active").trim();
  const rebtCompanyNumber = String(formData.get("rebtCompanyNumber") ?? "").trim();

  if (!organizationId || organizationId === PLATFORM_ORG_ID) {
    return { error: "Organización no editable." };
  }
  if (!companyName) return { error: "Nombre obligatorio." };
  if (!VERTICALS.has(verticalRaw)) return { error: "Vertical no válida." };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: companyName,
      vertical: verticalRaw as OrganizationVertical,
      taxAddress: taxAddress || null,
      isSubscribed,
      subscriptionStatus: isSubscribed ? subscriptionStatus : "canceled",
      rebtCompanyNumber: rebtCompanyNumber || null,
    },
  });

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/${organizationId}`);
  return { ok: true };
}

export async function toggleOrganizationSubscriptionAction(formData: FormData) {
  await requireSuperAdminUser();
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!organizationId || organizationId === PLATFORM_ORG_ID) return;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isSubscribed: true },
  });
  if (!org) return;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      isSubscribed: !org.isSubscribed,
      subscriptionStatus: !org.isSubscribed ? "active" : "canceled",
    },
  });

  revalidatePath("/super-admin/organizations");
  revalidatePath(`/super-admin/organizations/${organizationId}`);
}

export async function deleteOrganizationAction(formData: FormData) {
  await requireSuperAdminUser();
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const confirmName = String(formData.get("confirmName") ?? "").trim();

  if (!organizationId || organizationId === PLATFORM_ORG_ID) return;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!org || org.name !== confirmName) return;

  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { supabaseUserId: true },
  });

  await prisma.organization.delete({ where: { id: organizationId } });

  const supabaseAdmin = createSupabaseAdminClient();
  for (const u of users) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(u.supabaseUserId);
    } catch {
      console.warn("[super-admin] no se pudo borrar auth user", u.supabaseUserId);
    }
  }

  revalidatePath("/super-admin/organizations");
  redirect("/super-admin/organizations?deleted=1");
}
