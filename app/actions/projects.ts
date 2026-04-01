"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminUser, requireSubscribedUser } from "@/lib/authz";
import {
  sendOperarioInviteEmail,
  sendOperarioResetEmail,
  sendProjectFinishedEmail,
} from "@/lib/email";

export async function getProjects() {
  try {
    const dbUser = await requireSubscribedUser();
    if (!dbUser) return [];

    return await prisma.project.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...(dbUser.role === "OPERARIO" ? { assignedUserId: dbUser.id } : {}),
      },
      include: {
        photos: true,
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error loading projects:", error);
    return [];
  }
}

export async function getOrganizationOperarios() {
  const admin = await requireAdminUser();
  return prisma.user.findMany({
    where: {
      organizationId: admin.organizationId,
      role: "OPERARIO",
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function resendProjectDossierEmailAction(formData: FormData): Promise<void> {
  const admin = await requireAdminUser();
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Proyecto invalido.");

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: admin.organizationId,
      estado: { in: ["FINALIZADO", "SUBVENCION_TRAMITADA"] },
    },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Proyecto no encontrado o aun no finalizado.");
  }

  try {
    await sendProjectFinishedEmail({
      organizationId: admin.organizationId,
      projectId: project.id,
    });
  } catch (e) {
    console.error("LuxOps: reenvio email dossier", e);
    throw new Error("No se pudo enviar el correo (comprueba Resend y bandeja).");
  }

  revalidatePath("/dashboard");
}

export async function createProjectAction(formData: FormData) {
  const admin = await requireAdminUser();

  const cliente = String(formData.get("cliente") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const cupsRaw = String(formData.get("cups") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const catastralReference = String(formData.get("catastralReference") ?? "").trim().toUpperCase();
  const ownerTaxId = String(formData.get("ownerTaxId") ?? "").trim().toUpperCase();
  const assignedUserId = String(formData.get("assignedUserId") ?? "").trim();
  const clienteNotificacionEmail = String(formData.get("clienteNotificacionEmail") ?? "").trim();
  const estimatedRevenueRaw = String(formData.get("estimatedRevenue") ?? "").trim().replace(",", ".");

  if (!cliente || !direccion || !assignedUserId) {
    return { error: "Completa cliente, direccion y operario asignado." };
  }
  if (!/^[A-Z0-9]{20,22}$/.test(cupsRaw)) {
    return {
      error: "CUPS obligatorio: 20 a 22 caracteres alfanumericos (sin espacios). Ej.: ES0021...",
    };
  }
  if (!catastralReference || catastralReference.length < 10 || catastralReference.length > 50) {
    return {
      error: "Referencia catastral obligatoria (entre 10 y 50 caracteres, sin espacios irrelevantes).",
    };
  }
  if (!ownerTaxId || ownerTaxId.length < 7 || ownerTaxId.length > 14) {
    return { error: "DNI/NIE/CIF del titular obligatorio (7 a 14 caracteres)." };
  }
  if (
    clienteNotificacionEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteNotificacionEmail)
  ) {
    return { error: "El email de notificacion al cliente no es valido." };
  }
  if (estimatedRevenueRaw && !/^\d+(\.\d{1,2})?$/.test(estimatedRevenueRaw)) {
    return { error: "El importe estimado debe ser un numero valido (max 2 decimales)." };
  }

  const assignedUser = await prisma.user.findFirst({
    where: {
      id: assignedUserId,
      organizationId: admin.organizationId,
      role: "OPERARIO",
    },
    select: { id: true, name: true, email: true },
  });

  if (!assignedUser) {
    return { error: "El operario seleccionado no es valido." };
  }

  const initials = (assignedUser.name ?? assignedUser.email)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

  await prisma.project.create({
    data: {
      cliente,
      direccion,
      cups: cupsRaw,
      catastralReference,
      ownerTaxId,
      estado: "PRESUPUESTO",
      progreso: 0,
      organizationId: admin.organizationId,
      assignedUserId: assignedUser.id,
      operarioNombre: assignedUser.name ?? assignedUser.email,
      operarioInitials: initials || "OP",
      clienteNotificacionEmail: clienteNotificacionEmail || null,
      estimatedRevenue: estimatedRevenueRaw || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/mobile-dashboard");
  redirect("/dashboard");
}

export async function saveProjectAdminMemoryAction(formData: FormData): Promise<void> {
  const admin = await requireAdminUser();
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Proyecto invalido.");

  const parseNullableDecimal = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
    if (!raw) return null;
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error(`Valor inválido para ${key}`);
    return raw;
  };

  let peakPowerKwp: string | null;
  let inverterPowerKwn: string | null;
  let storageCapacityKwh: string | null;
  let estimatedRevenue: string | null;
  try {
    peakPowerKwp = parseNullableDecimal("peakPowerKwp");
    inverterPowerKwn = parseNullableDecimal("inverterPowerKwn");
    storageCapacityKwh = parseNullableDecimal("storageCapacityKwh");
    estimatedRevenue = parseNullableDecimal("estimatedRevenue");
  } catch {
    throw new Error(
      "Revisa importes y potencias: solo números con hasta 2 decimales (ej. 12450.00).",
    );
  }

  const quoteReference =
    String(formData.get("quoteReference") ?? "")
      .trim()
      .slice(0, 200) || null;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: admin.organizationId },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no encontrado.");

  await prisma.project.update({
    where: { id: projectId },
    data: {
      technicalMemory: String(formData.get("technicalMemory") ?? "").trim() || null,
      reviewedByOfficeTech: String(formData.get("reviewedByOfficeTech") ?? "") === "on",
      rebtCompanyNumber: String(formData.get("rebtCompanyNumber") ?? "").trim() || null,
      dossierReference: String(formData.get("dossierReference") ?? "").trim() || null,
      equipmentInverterSerial: String(formData.get("equipmentInverterSerial") ?? "").trim() || null,
      equipmentBatterySerial: String(formData.get("equipmentBatterySerial") ?? "").trim() || null,
      equipmentVatimetroSerial: String(formData.get("equipmentVatimetroSerial") ?? "").trim() || null,
      assetPanelBrand: String(formData.get("assetPanelBrand") ?? "").trim() || null,
      assetPanelModel: String(formData.get("assetPanelModel") ?? "").trim() || null,
      assetPanelSerial: String(formData.get("assetPanelSerial") ?? "").trim() || null,
      assetInverterBrand: String(formData.get("assetInverterBrand") ?? "").trim() || null,
      assetInverterModel: String(formData.get("assetInverterModel") ?? "").trim() || null,
      assetBatteryBrand: String(formData.get("assetBatteryBrand") ?? "").trim() || null,
      assetBatteryModel: String(formData.get("assetBatteryModel") ?? "").trim() || null,
      peakPowerKwp,
      inverterPowerKwn,
      storageCapacityKwh,
      estimatedRevenue,
      quoteReference,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/mobile-dashboard");
}

export async function reassignUnassignedProjectAction(formData: FormData): Promise<void> {
  const admin = await requireAdminUser();
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Proyecto invalido.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: admin.organizationId },
    select: { id: true, assignedUserId: true },
  });
  if (!project) throw new Error("Proyecto no encontrado.");
  if (project.assignedUserId) return;

  const operario = await prisma.user.findFirst({
    where: { organizationId: admin.organizationId, role: "OPERARIO" },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  });
  if (!operario) throw new Error("No hay operarios disponibles.");

  const initials = (operario.name ?? operario.email)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

  await prisma.project.update({
    where: { id: project.id },
    data: {
      assignedUserId: operario.id,
      operarioNombre: operario.name ?? operario.email,
      operarioInitials: initials || "OP",
    },
  });

  revalidatePath("/dashboard");
}

export async function inviteOperarioAction(
  _prevState: { ok?: boolean; error?: string; inviteLink?: string } | undefined,
  formData: FormData,
) {
  const admin = await requireAdminUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name || !email) {
    return { error: "Nombre y email son obligatorios." };
  }

  const existingPending = await prisma.operatorInvite.findFirst({
    where: {
      organizationId: admin.organizationId,
      email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (existingPending) {
    return { error: "Ya existe una invitacion pendiente para este email." };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const fromRequest = host ? `${proto}://${host}` : null;
  const appUrl = fromRequest ?? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const inviteLink = `${appUrl}/invite/complete?token=${token}`;

  await prisma.operatorInvite.create({
    data: {
      name,
      email,
      tokenHash,
      expiresAt,
      invitedByUserId: admin.id,
      organizationId: admin.organizationId,
    },
  });

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: { full_name: name },
    });
    if (error) {
      const { data: fallbackData } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: inviteLink,
          data: { full_name: name },
        },
      });
      const manualAuthLink =
        fallbackData?.properties?.action_link ||
        fallbackData?.properties?.hashed_token ||
        inviteLink;
      const resendSent = await sendOperarioInviteEmail({
        to: email,
        name,
        inviteUrl: String(manualAuthLink),
      });
      if (resendSent) {
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/team");
        return { ok: true, inviteLink: String(manualAuthLink) };
      }
      return {
        error: `Invitación creada. Supabase no pudo enviar email automático: ${error.message}. Usa el enlace manual.`,
        inviteLink: String(manualAuthLink),
      };
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("No se pudo enviar invitacion por Supabase:", error);
    try {
      const supabaseAdmin = createSupabaseAdminClient();
      const { data: fallbackData } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: inviteLink,
          data: { full_name: name },
        },
      });
      const manualAuthLink =
        fallbackData?.properties?.action_link ||
        fallbackData?.properties?.hashed_token ||
        inviteLink;
      const resendSent = await sendOperarioInviteEmail({
        to: email,
        name,
        inviteUrl: String(manualAuthLink),
      });
      if (resendSent) {
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/team");
        return { ok: true, inviteLink: String(manualAuthLink) };
      }
      return {
        error: `No se pudo enviar email por Supabase (${errMessage}). Usa el enlace manual.`,
        inviteLink: String(manualAuthLink),
      };
    } catch {
      // Si también falla generateLink, devolvemos al menos el link interno.
    }
    return {
      error: `No se pudo enviar email por Supabase (${errMessage}).`,
      inviteLink,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  return { ok: true, inviteLink };
}

export async function resendOperarioInviteAction(formData: FormData) {
  const admin = await requireAdminUser();
  const inviteId = String(formData.get("inviteId") ?? "").trim();
  if (!inviteId) {
    redirect("/dashboard/team?inviteStatus=error");
  }

  const invite = await prisma.operatorInvite.findFirst({
    where: {
      id: inviteId,
      organizationId: admin.organizationId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: { id: true, email: true, name: true },
  });

  if (!invite) {
    redirect("/dashboard/team?inviteStatus=error");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const fromRequest = host ? `${proto}://${host}` : null;
  const appUrl = fromRequest ?? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const inviteLink = `${appUrl}/invite/complete?token=${token}`;

  await prisma.operatorInvite.update({
    where: { id: invite.id },
    data: { tokenHash, expiresAt },
  });

  let status: "resent" | "error" = "resent";
  let message = "";
  let outputLink = inviteLink;

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: inviteLink,
      data: { full_name: invite.name },
    });
    if (error) {
      const { data: fallbackData } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: invite.email,
        options: {
          redirectTo: inviteLink,
          data: { full_name: invite.name },
        },
      });
      const manualAuthLink =
        fallbackData?.properties?.action_link ||
        fallbackData?.properties?.hashed_token ||
        inviteLink;
      const resendSent = await sendOperarioInviteEmail({
        to: invite.email,
        name: invite.name,
        inviteUrl: String(manualAuthLink),
      });
      if (resendSent) {
        status = "resent";
        message = "";
        outputLink = String(manualAuthLink);
      } else {
        status = "error";
        message = error.message;
        outputLink = String(manualAuthLink);
      }
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error desconocido";
    try {
      const supabaseAdmin = createSupabaseAdminClient();
      const { data: fallbackData } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: invite.email,
        options: {
          redirectTo: inviteLink,
          data: { full_name: invite.name },
        },
      });
      const manualAuthLink =
        fallbackData?.properties?.action_link ||
        fallbackData?.properties?.hashed_token ||
        inviteLink;
      const resendSent = await sendOperarioInviteEmail({
        to: invite.email,
        name: invite.name,
        inviteUrl: String(manualAuthLink),
      });
      if (resendSent) {
        status = "resent";
        message = "";
        outputLink = String(manualAuthLink);
      } else {
        status = "error";
        message = errMessage;
        outputLink = String(manualAuthLink);
      }
    } catch {
      // Si falla también generateLink, dejamos fallback al enlace interno.
    }
    status = "error";
    message = errMessage;
    outputLink = inviteLink;
  }

  revalidatePath("/dashboard/team");
  if (status === "error") {
    redirect(
      `/dashboard/team?inviteStatus=error&inviteMessage=${encodeURIComponent(message || "No se pudo enviar correo desde Supabase")}&inviteLink=${encodeURIComponent(outputLink)}`,
    );
  }
  redirect("/dashboard/team?inviteStatus=resent");
}

export async function completeOperarioInviteAction(
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
) {
  const token = String(formData.get("token") ?? "").trim();
  const inviteId = String(formData.get("inviteId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  if (!token && !inviteId) return { error: "Invitacion invalida." };
  if (!password || password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== passwordConfirm) {
    return { error: "Las contraseñas no coinciden." };
  }

  const tokenHash = token
    ? crypto.createHash("sha256").update(token).digest("hex")
    : null;
  const invite = await prisma.operatorInvite.findFirst({
    where: tokenHash ? { tokenHash } : { id: inviteId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      expiresAt: true,
      organizationId: true,
    },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return { error: "Invitacion expirada o no valida." };
  }

  const supabase = createSupabaseAdminClient();
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  let authUserId = user?.id ?? null;

  if (user && user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return { error: "El email autenticado no coincide con la invitacion." };
  }

  if (!authUserId) {
    const created = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || invite.name },
    });
    authUserId = created.data.user?.id ?? null;

    if (!authUserId) {
      const generated = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: invite.email,
        options: {
          data: { full_name: fullName || invite.name },
        },
      });
      authUserId = generated.data.user?.id ?? null;
    }
  }

  if (!authUserId) {
    return { error: "No se pudo activar el usuario en Supabase Auth. Reintenta en 10 segundos." };
  }

  const updateAuth = await supabase.auth.admin.updateUserById(authUserId, {
    password,
    user_metadata: { full_name: fullName || invite.name },
  });
  if (updateAuth.error) {
    return { error: `No se pudo configurar la contraseña: ${updateAuth.error.message}` };
  }

  await prisma.user.upsert({
    where: { supabaseUserId: authUserId },
    update: {
      email: invite.email,
      name: fullName || invite.name,
      role: "OPERARIO",
      organizationId: invite.organizationId,
    },
    create: {
      supabaseUserId: authUserId,
      email: invite.email,
      name: fullName || invite.name,
      role: "OPERARIO",
      organizationId: invite.organizationId,
    },
  });

  await prisma.operatorInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  const signInResult = await supabaseServer.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInResult.error) {
    return {
      error:
        "Cuenta activada, pero no se pudo iniciar sesión automáticamente. Entra desde Login con tu email y contraseña.",
    };
  }

  revalidatePath("/dashboard");
  redirect("/mobile-dashboard");
}

export async function sendOperarioPasswordResetAction(formData: FormData) {
  const admin = await requireAdminUser();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    redirect("/dashboard/team?resetStatus=error");
  }

  const operario = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId: admin.organizationId,
      role: "OPERARIO",
    },
    select: { id: true, email: true, name: true },
  });

  if (!operario) {
    redirect("/dashboard/team?resetStatus=error");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const fromRequest = host ? `${proto}://${host}` : null;
  const appUrl = fromRequest ?? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  let status: "sent" | "error" = "error";
  let message = "";
  let outputLink = "";

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const generated = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: operario.email,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      },
    });
    const resetLink =
      generated.data.properties?.action_link ||
      generated.data.properties?.hashed_token ||
      "";
    if (!resetLink) {
      status = "error";
      message = "No se pudo generar enlace de recuperación.";
    } else {
      outputLink = String(resetLink);
      const sent = await sendOperarioResetEmail({
        to: operario.email,
        name: operario.name || "Operario",
        resetUrl: String(resetLink),
      });

      if (sent) {
        status = "sent";
      } else {
        status = "error";
        message = "No se pudo enviar por Resend";
      }
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error desconocido";
    status = "error";
    message = errMessage;
  }

  revalidatePath("/dashboard/team");
  if (status === "sent") {
    redirect("/dashboard/team?resetStatus=sent");
  }
  redirect(
    `/dashboard/team?resetStatus=error&resetMessage=${encodeURIComponent(message || "No se pudo enviar reset")}&resetLink=${encodeURIComponent(outputLink)}`,
  );
}
