import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { dossierProjectInclude, generateDossierPdfBuffer } from "@/lib/generate-dossier-pdf";
import { getPublicAppUrl } from "@/lib/public-app-url";
import {
  buildCertificateEmail,
  buildOperarioObraAssignedEmail,
  buildPaidSubscriptionWelcomeEmail,
  buildWelcomeInstallerEmail,
} from "@/lib/email-templates";

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

export async function sendProjectFinishedEmail(params: SendProjectFinishedEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!apiKey || !from) return;

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
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !isLikelyEmail(params.to)) return false;
  try {
    const resend = new Resend(apiKey);
    const base = getPublicAppUrl().replace(/\/$/, "");
    const template = buildPaidSubscriptionWelcomeEmail({
      firstName: params.firstName,
      dashboardUrl: `${base}/login`,
    });
    await resend.emails.send({
      from,
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
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !isLikelyEmail(params.to)) return false;
  try {
    const resend = new Resend(apiKey);
    const template = buildOperarioObraAssignedEmail({
      operarioName: params.operarioName,
      cliente: params.cliente,
      obraUrl: params.obraUrl,
    });
    await resend.emails.send({
      from,
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
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return false;

  try {
    const resend = new Resend(apiKey);
    const template = buildWelcomeInstallerEmail({
      nombreInstalador: params.name,
      panelUrl: params.inviteUrl,
    });
    await resend.emails.send({
      from,
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
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return false;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
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
