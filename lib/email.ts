import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { dossierProjectInclude, generateDossierPdfBuffer } from "@/lib/generate-dossier-pdf";
import { getAuthConfirmUrl, getPublicAppUrl } from "@/lib/public-app-url";
import {
  buildCertificateEmail,
  buildLuxOpsAuthActionEmail,
  buildOperarioObraAssignedEmail,
  buildPaidSubscriptionWelcomeEmail,
  buildWelcomeInstallerEmail,
} from "@/lib/email-templates";
import { generateAuthActionLink } from "@/lib/supabase/generate-auth-action-link";

type SendProjectFinishedEmailParams = {
  organizationId: string;
  projectId: string;
};

type SendOperarioInviteEmailParams = {
  to: string;
  name: string;
  inviteUrl: string;
};

type SendOperarioResetEmailParams = {
  to: string;
  name: string;
  resetUrl: string;
};

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const DEFAULT_FROM = "LuxOps <hola@luxops.es>";
/** Remitente fijo para correos transaccionales de Auth (magic link, confirmación, recuperación). */
const LUXOPS_AUTH_FROM = "LuxOps <hola@luxops.es>";
const DEFAULT_REPLY_TO = "ggilbordon@gmail.com";

function getResendFrom(): string {
  const from = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  return from || DEFAULT_FROM;
}

function shouldLogInsteadOfSend(apiKey: string | undefined): boolean {
  return !(apiKey ?? "").trim();
}

async function sendLuxOpsAuthResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = params.to.trim().toLowerCase();
  if (!isLikelyEmail(to)) return false;
  if (shouldLogInsteadOfSend(apiKey)) {
    console.log("[email:dev] LuxOps auth email (missing RESEND_API_KEY)", {
      from: LUXOPS_AUTH_FROM,
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: params.subject,
      textPreview: params.text.slice(0, 200),
    });
    return true;
  }
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: LUXOPS_AUTH_FROM,
      replyTo: DEFAULT_REPLY_TO,
      to: [to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return true;
  } catch (e) {
    console.error("[email] LuxOps auth Resend send failed", e);
    return false;
  }
}

/** Magic link (usuario ya existe en Supabase Auth). */
export async function sendLuxOpsMagicLinkAccessEmail(params: {
  to: string;
  redirectTo: string;
  /** Ruta interna post-verificación (ej. /dashboard o /onboarding?continue=1). */
  nextPath: string;
  data?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = params.to.trim().toLowerCase();
  const link = await generateAuthActionLink({
    type: "magiclink",
    email,
    redirectTo: params.redirectTo,
    data: params.data,
  });
  if ("error" in link) return { ok: false, error: link.error };
  const confirmUrl = getAuthConfirmUrl({
    tokenHash: link.tokenHash,
    type: link.verificationType,
    nextPath: params.nextPath,
  });
  const tmpl = buildLuxOpsAuthActionEmail({
    heading: "Acceso a LuxOps",
    bodyLines: [
      "Has solicitado un acceso rápido y seguro. Pulsa el botón dorado inferior para entrar a tu panel de control.",
    ],
    buttonLabel: "ENTRAR CON ENLACE SEGURO",
    actionLink: confirmUrl,
  });
  const sent = await sendLuxOpsAuthResend({
    to: email,
    subject: "🔑 Tu clave de acceso a LuxOps",
    html: tmpl.html,
    text: tmpl.text,
  });
  if (!sent) return { ok: false, error: "No se pudo enviar el correo. Inténtalo más tarde." };
  return { ok: true };
}

/** Confirmación de alta tras `auth.admin.createUser` (sin envío automático de Supabase). */
export async function sendLuxOpsSignupConfirmationEmail(params: {
  to: string;
  password: string;
  redirectTo: string;
  fullName?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = params.to.trim().toLowerCase();
  const data = params.fullName ? { full_name: params.fullName } : undefined;
  const link = await generateAuthActionLink({
    type: "signup",
    email,
    password: params.password,
    redirectTo: params.redirectTo,
    data,
  });
  if ("error" in link) return { ok: false, error: link.error };
  const confirmUrl = getAuthConfirmUrl({
    tokenHash: link.tokenHash,
    type: link.verificationType,
    nextPath: "/dashboard",
  });
  const tmpl = buildLuxOpsAuthActionEmail({
    heading: "Confirma tu cuenta",
    bodyLines: [
      "Te damos la bienvenida.",
      "Tu cuenta está casi lista. Pulsa el botón para activar el acceso. Si no solicitaste LuxOps, ignora este mensaje.",
    ],
    buttonLabel: "CONFIRMAR CUENTA",
    actionLink: confirmUrl,
  });
  const sent = await sendLuxOpsAuthResend({
    to: email,
    subject: "✉️ Confirma tu correo en LuxOps",
    html: tmpl.html,
    text: tmpl.text,
  });
  if (!sent) return { ok: false, error: "No se pudo enviar el correo de confirmación." };
  return { ok: true };
}

/** Recuperación de contraseña (enlace tipo recovery de Supabase). */
export async function sendLuxOpsPasswordRecoveryEmail(params: {
  to: string;
  redirectTo: string;
}): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  const email = params.to.trim().toLowerCase();
  const link = await generateAuthActionLink({
    type: "recovery",
    email,
    redirectTo: params.redirectTo,
  });
  if ("error" in link) {
    return { ok: true, skipped: true };
  }
  const confirmUrl = getAuthConfirmUrl({
    tokenHash: link.tokenHash,
    type: link.verificationType,
    nextPath: "/auth/reset-password",
  });
  const tmpl = buildLuxOpsAuthActionEmail({
    heading: "Recuperar contraseña",
    bodyLines: [
      "Has pedido restablecer la contraseña de tu cuenta LuxOps.",
      "Pulsa el botón para elegir una nueva contraseña. Si no fuiste tú, ignora este correo.",
    ],
    buttonLabel: "RESTABLECER CONTRASEÑA",
    actionLink: confirmUrl,
  });
  const sent = await sendLuxOpsAuthResend({
    to: email,
    subject: "🔐 Restablece tu contraseña en LuxOps",
    html: tmpl.html,
    text: tmpl.text,
  });
  if (!sent) return { ok: false, error: "No se pudo enviar el correo. Inténtalo más tarde." };
  return { ok: true };
}

export async function sendProjectFinishedEmail(params: SendProjectFinishedEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFrom();
  const appUrl = getPublicAppUrl();
  if (shouldLogInsteadOfSend(apiKey)) {
    console.log("[email:dev] sendProjectFinishedEmail skipped (missing RESEND_API_KEY)", {
      from,
      replyTo: DEFAULT_REPLY_TO,
      organizationId: params.organizationId,
      projectId: params.projectId,
    });
    return;
  }

  const [project, admins, projectFull] = await Promise.all([
    prisma.project.findFirst({
      where: { id: params.projectId, organizationId: params.organizationId },
      select: { id: true, cliente: true, clienteNotificacionEmail: true },
    }),
    prisma.user.findMany({
      where: { organizationId: params.organizationId, role: "ADMIN" },
      select: { email: true },
    }),
    prisma.project.findFirst({
      where: { id: params.projectId, organizationId: params.organizationId },
      include: dossierProjectInclude,
    }),
  ]);
  if (!project || admins.length === 0 || !projectFull) return;

  const resend = new Resend(apiKey);
  const recipients = admins.map((admin) => admin.email);
  const reportUrl = `${appUrl}/api/projects/${project.id}/report`;
  const expediente = projectFull.dossierReference?.trim() || `EXP-${project.id.slice(-8).toUpperCase()}`;

  let pdfBytes: Buffer | null = null;
  try {
    pdfBytes = await generateDossierPdfBuffer(projectFull);
  } catch (e) {
    console.error("LuxOps: no se pudo generar PDF para email de obra terminada", e);
  }

  const safePdfName = `dossier-${project.cliente.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "luxops"}.pdf`;

  const notifyClient = (project.clienteNotificacionEmail ?? "").trim();
  const cc =
    notifyClient && isLikelyEmail(notifyClient) ? [notifyClient] : undefined;

  const certificateTemplate = buildCertificateEmail({
    idExpediente: expediente,
    nombreCliente: project.cliente,
    reportUrl,
  });

  await resend.emails.send({
    from,
    replyTo: DEFAULT_REPLY_TO,
    to: recipients,
    ...(cc?.length ? { cc } : {}),
    subject: `📄 Certificado Técnico LuxOps - Expediente ${expediente} - ${project.cliente}`,
    html: certificateTemplate.html,
    text: certificateTemplate.text,
    attachments: pdfBytes
      ? [
          {
            filename: safePdfName,
            content: pdfBytes,
          },
        ]
      : undefined,
  });
}

export async function sendPaidSubscriptionWelcomeEmail(params: {
  to: string;
  firstName: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFrom();
  if (!isLikelyEmail(params.to)) return false;
  if (shouldLogInsteadOfSend(apiKey)) {
    const base = getPublicAppUrl().replace(/\/$/, "");
    console.log("[email:dev] sendPaidSubscriptionWelcomeEmail skipped (missing RESEND_API_KEY)", {
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: params.to.trim().toLowerCase(),
      subject: "🚀 ¡Bienvenido a LuxOps! Tu empresa ya es digital.",
      dashboardUrl: `${base}/login`,
    });
    return true;
  }
  try {
    const resend = new Resend(apiKey);
    const base = getPublicAppUrl().replace(/\/$/, "");
    const template = buildPaidSubscriptionWelcomeEmail({
      firstName: params.firstName,
      dashboardUrl: `${base}/login`,
    });
    await resend.emails.send({
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: [params.to.trim().toLowerCase()],
      subject: "🚀 ¡Bienvenido a LuxOps! Tu empresa ya es digital.",
      html: template.html,
      text: template.text,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendOperarioObraAssignedEmail(params: {
  to: string;
  operarioName: string;
  cliente: string;
  obraUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFrom();
  if (!isLikelyEmail(params.to)) return false;
  if (shouldLogInsteadOfSend(apiKey)) {
    console.log("[email:dev] sendOperarioObraAssignedEmail skipped (missing RESEND_API_KEY)", {
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: params.to.trim().toLowerCase(),
      subject: "☀️ Nueva obra asignada en LuxOps",
      obraUrl: params.obraUrl,
      cliente: params.cliente,
      operarioName: params.operarioName,
    });
    return true;
  }
  try {
    const resend = new Resend(apiKey);
    const template = buildOperarioObraAssignedEmail({
      operarioName: params.operarioName,
      cliente: params.cliente,
      obraUrl: params.obraUrl,
    });
    await resend.emails.send({
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: [params.to.trim().toLowerCase()],
      subject: "☀️ Nueva obra asignada en LuxOps",
      html: template.html,
      text: template.text,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendOperarioInviteEmail(params: SendOperarioInviteEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFrom();
  if (shouldLogInsteadOfSend(apiKey)) {
    console.log("[email:dev] sendOperarioInviteEmail skipped (missing RESEND_API_KEY)", {
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: params.to.trim().toLowerCase(),
      subject: "☀️ Bienvenido a LuxOps | Tu cuenta de certificación técnica está activa",
      inviteUrl: params.inviteUrl,
      name: params.name,
    });
    return true;
  }

  try {
    const resend = new Resend(apiKey);
    const template = buildWelcomeInstallerEmail({
      nombreInstalador: params.name,
      panelUrl: params.inviteUrl,
    });
    await resend.emails.send({
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: [params.to],
      subject: "☀️ Bienvenido a LuxOps | Tu cuenta de certificación técnica está activa",
      html: template.html,
      text: template.text,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendOperarioResetEmail(params: SendOperarioResetEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFrom();
  if (shouldLogInsteadOfSend(apiKey)) {
    console.log("[email:dev] sendOperarioResetEmail skipped (missing RESEND_API_KEY)", {
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: params.to.trim().toLowerCase(),
      subject: "Restablece tu contraseña de LuxOps",
      resetUrl: params.resetUrl,
      name: params.name,
    });
    return true;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      replyTo: DEFAULT_REPLY_TO,
      to: [params.to],
      subject: "Restablece tu contraseña de LuxOps",
      html: `
        <p>Hola ${params.name},</p>
        <p>Te enviamos este enlace para restablecer tu contraseña de LuxOps.</p>
        <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
      `,
    });
    return true;
  } catch {
    return false;
  }
}
