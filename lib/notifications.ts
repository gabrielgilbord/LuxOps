import { prisma } from "@/lib/prisma";
import { getPublicAppUrl } from "@/lib/public-app-url";

type InstallationPayload = {
  projectId: string;
};

async function sendInstallationCompletedWhatsapp(projectId: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.OWNER_WHATSAPP_TO;
  const appUrl = getPublicAppUrl();

  if (!sid || !token || !from || !to) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { cliente: true },
  });
  if (!project) return;

  const body = `✅ Instalación de ${project.cliente} finalizada. Fotos y coordenadas GPS recibidas correctamente. Informe PDF listo para descargar: ${appUrl}/projects/${projectId}/informe`;

  const form = new URLSearchParams();
  form.set("From", from);
  form.set("To", to);
  form.set("Body", body);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Twilio error: ${bodyText}`);
  }
}

export async function enqueueInstallationCompletedWhatsapp(params: {
  projectId: string;
  organizationId: string;
  userId: string;
}) {
  const { projectId, organizationId, userId } = params;
  return prisma.notificationJob.create({
    data: {
      type: "WHATSAPP_INSTALLATION_COMPLETED",
      payload: { projectId } satisfies InstallationPayload,
      organizationId,
      userId,
    },
  });
}

export async function processNotificationJob(jobId: string) {
  const job = await prisma.notificationJob.findUnique({
    where: { id: jobId },
    select: { id: true, type: true, payload: true, attempts: true, status: true },
  });
  if (!job || job.status === "SENT") return;

  try {
    if (job.type === "WHATSAPP_INSTALLATION_COMPLETED") {
      const payload = job.payload as InstallationPayload;
      await sendInstallationCompletedWhatsapp(payload.projectId);
    }
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: { status: "SENT", attempts: { increment: 1 }, lastError: null },
    });
  } catch (error) {
    const nextAttempt = new Date(Date.now() + 1000 * 60 * 5);
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: "RETRY",
        attempts: { increment: 1 },
        lastError: error instanceof Error ? error.message : "Unknown error",
        nextAttemptAt: nextAttempt,
      },
    });
  }
}

export async function processPendingNotifications(limit = 10) {
  const jobs = await prisma.notificationJob.findMany({
    where: {
      status: { in: ["PENDING", "RETRY"] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: 10 },
    },
    take: limit,
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  for (const job of jobs) {
    await processNotificationJob(job.id);
  }
}
