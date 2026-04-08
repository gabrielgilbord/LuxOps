type WelcomeInstallerParams = {
  nombreInstalador: string;
  panelUrl: string;
};

type PaidSubscriptionWelcomeParams = {
  firstName: string;
  dashboardUrl: string;
};

type OperarioObraAssignedParams = {
  operarioName: string;
  cliente: string;
  obraUrl: string;
};

import { getPublicAppUrl } from "@/lib/public-app-url";

function emailLogoUrl() {
  const base = getPublicAppUrl().replace(/\/$/, "");
  return `${base}/icon.svg`;
}

function wrapDeluxeEmail(opts: { title?: string; inner: string }) {
  const logoUrl = emailLogoUrl();
  const titleHtml = opts.title
    ? `<h1 style="margin:0 0 14px 0;font-size:18px;line-height:1.25;color:#F1F5F9;text-align:center;letter-spacing:-0.01em;">${opts.title}</h1>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0B0E14;">
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0B0E14;padding:32px 16px;">
      <div style="max-width:560px;margin:0 auto;background:#161B22;border:1px solid rgba(251,191,36,0.22);border-radius:16px;padding:28px 24px;">
        <div style="text-align:center;margin-bottom:16px;">
          <img src="${logoUrl}" width="72" height="72" alt="LuxOps" style="display:block;margin:0 auto;background:#0B0E14;border-radius:18px;" />
        </div>
        ${titleHtml}
        <div>${opts.inner}</div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.10);margin:22px 0 14px 0;" />
        <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
          LuxOps - Hecho en Canarias. Has recibido este correo porque eres cliente de LuxOps.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

export function buildPaidSubscriptionWelcomeEmail(params: PaidSubscriptionWelcomeParams) {
  const inner = `
    <p style="margin:0 0 12px 0;font-size:15px;color:#E2E8F0">Hola ${params.firstName},</p>
    <p style="margin:0 0 12px 0;font-size:15px;color:#CBD5E1;line-height:1.55">
      Tu pago se ha confirmado. <strong style="color:#FBBF24">LuxOps</strong> ya es el cerebro digital de tu instaladora:
      obras, equipo y trazabilidad en un solo flujo.
    </p>
    <p style="margin:0 0 22px 0;font-size:14px;color:#94A3B8">
      Entra cuando quieras para completar el alta y abrir el panel.
    </p>
    <div style="text-align:center;margin:26px 0;">
      <a href="${params.dashboardUrl}" style="display:inline-block;background:#FBBF24;color:#0B0E14;text-decoration:none;font-weight:900;padding:14px 28px;border-radius:12px;font-size:15px;">
        Ir a mi Dashboard
      </a>
    </div>
    <p style="margin:0;font-size:12px;color:#64748B;text-align:center">
      Si no puedes hacer clic, copia y pega este enlace: ${params.dashboardUrl}
    </p>
  `;
  const html = wrapDeluxeEmail({ title: "Bienvenido a LuxOps", inner });
  const text = `Hola ${params.firstName},

Tu pago se ha confirmado. LuxOps ya es el cerebro digital de tu instaladora.

Ir a mi Dashboard: ${params.dashboardUrl}

LuxOps · CRM para instaladoras solares`;
  return { html, text };
}

export function buildOperarioObraAssignedEmail(params: OperarioObraAssignedParams) {
  const inner = `
    <p style="margin:0 0 8px 0;font-size:15px;color:#E2E8F0">Hola ${params.operarioName},</p>
    <p style="margin:0 0 12px 0;font-size:15px;color:#CBD5E1;line-height:1.55">
      Te han asignado una obra en <strong style="color:#FBBF24">LuxOps</strong>.
    </p>
    <p style="margin:0 0 8px 0;font-size:14px;color:#94A3B8">Cliente / instalación:</p>
    <p style="margin:0 0 22px 0;font-size:16px;color:#F1F5F9;font-weight:800">${params.cliente}</p>
    <div style="text-align:center;margin:26px 0;">
      <a href="${params.obraUrl}" style="display:inline-block;background:#FBBF24;color:#0B0E14;text-decoration:none;font-weight:900;padding:14px 28px;border-radius:12px;font-size:15px;">
        Abrir obra en el móvil
      </a>
    </div>
    <p style="margin:0;font-size:12px;color:#64748B;text-align:center">
      Si no puedes hacer clic, copia y pega este enlace: ${params.obraUrl}
    </p>
  `;
  const html = wrapDeluxeEmail({ title: "Nueva obra asignada", inner });
  const text = `Hola ${params.operarioName},

Te han asignado una obra en LuxOps.
Cliente: ${params.cliente}

Abrir obra: ${params.obraUrl}

LuxOps`;
  return { html, text };
}

type CertificateEmailParams = {
  idExpediente: string;
  nombreCliente: string;
  reportUrl: string;
};

export function buildWelcomeInstallerEmail(params: WelcomeInstallerParams) {
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#111827">Hola ${params.nombreInstalador},</p>
      <p style="margin:0 0 12px 0;font-size:14px;color:#111827">
        Ya tienes acceso a la plataforma de gestión operativa y certificación solar más avanzada.
      </p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155">
        Cada informe generado en LuxOps integra trazabilidad técnica (GPS + S/N) para procesos de subvención, auditoría y garantías de fabricante.
      </p>
      <a href="${params.panelUrl}" style="display:inline-block;background:#FACC15;color:#111827;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:8px;">
        Acceder al Panel de Control
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="margin:0;font-size:13px;color:#475569">Elevemos el estándar de tus instalaciones.</p>
      <p style="margin:8px 0 0 0;font-size:12px;color:#64748b">LuxOps</p>
    </div>
  </div>`;
  const text = `Hola ${params.nombreInstalador}.

Ya tienes acceso a la plataforma de gestión operativa y certificación solar más avanzada.
Cada informe generado en LuxOps integra trazabilidad técnica (GPS + S/N) para subvenciones, auditoría y garantías.

Acceder al Panel de Control: ${params.panelUrl}

Elevemos el estándar de tus instalaciones.`;
  return { html, text };
}

export function buildCertificateEmail(params: CertificateEmailParams) {
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#111827">
        Adjunto enviamos el Dossier Técnico de Certificación Fotovoltaica generado mediante la plataforma LuxOps.
      </p>
      <p style="margin:0 0 12px 0;font-size:14px;color:#334155">
        El documento incluye la Trazabilidad de Activos (Números de Serie) y la Declaración Responsable del Instalador.
      </p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155">
        Este dossier constituye la evidencia técnica clave para la justificación de subvenciones y garantías de fabricante.
      </p>
      <p style="margin:0 0 16px 0;font-size:13px;color:#0f172a">
        Expediente: <strong>${params.idExpediente}</strong> · Cliente: <strong>${params.nombreCliente}</strong>
      </p>
      <a href="${params.reportUrl}" style="display:inline-block;background:#FACC15;color:#111827;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:8px;">
        Ver certificado online
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="margin:0;font-size:12px;color:#64748b">LuxOps</p>
    </div>
  </div>`;
  const text = `Adjunto enviamos el Dossier Técnico de Certificación Fotovoltaica generado mediante la plataforma LuxOps.

Incluye Trazabilidad de Activos (Números de Serie) y Declaración Responsable del Instalador.
Documento válido para justificación de subvenciones y garantías de fabricante.

Expediente: ${params.idExpediente}
Cliente: ${params.nombreCliente}
Ver certificado online: ${params.reportUrl}`;
  return { html, text };
}

function escapeHtmlPlain(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Codifica una URL para atributo `href` (ampersands y comillas) y evita HTML roto en Gmail y similares. */
export function escapeHrefAttribute(url: string): string {
  return url
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const LUXOPS_AUTH_EMAIL_LOGO = "https://luxops.es/icon.svg";

/**
 * Correo transaccional Auth (magic link / confirmación / recovery).
 * Maquetación en tablas y logo absoluto para máxima compatibilidad con Gmail.
 */
export function buildLuxOpsAuthActionEmail(params: {
  heading: string;
  bodyLines: string[];
  buttonLabel: string;
  actionLink: string;
}) {
  const heading = escapeHtmlPlain(params.heading);
  const bodyLines = params.bodyLines.map(escapeHtmlPlain);
  const btn = escapeHtmlPlain(params.buttonLabel);
  const href = escapeHrefAttribute(params.actionLink);

  const html = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0E14; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 10px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 450px; background-color: #161B22; border: 2px solid #FBBF24; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
        <tr>
          <td align="center" style="padding: 40px 30px;">
            
            <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
              <tr>
                <td>
                  <img src="${LUXOPS_AUTH_EMAIL_LOGO}" width="80" height="80" alt="LuxOps Deluxe" style="display: block; border-radius: 15px;">
                </td>
              </tr>
            </table>

            <h1 style="color: #F1F5F9; font-family: sans-serif; font-size: 24px; font-weight: bold; margin: 0 0 15px 0; text-align: center;">
              ${heading}
            </h1>

            ${bodyLines
              .map(
                (line) => `
              <p style="color: #CBD5E1; font-family: sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0; text-align: center;">
                ${line}
              </p>
            `,
              )
              .join("")}

            <table border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-top: 30px;">
              <tr><td height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
            </table>

            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <a href="${href}" style="background-color: #FBBF24; color: #0B0E14; font-family: sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 18px 0; border-radius: 12px; display: block; width: 100%; text-align: center; letter-spacing: 0.5px;">
                    ${btn}
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>
        
        <tr>
          <td align="center" style="background-color: #111419; padding: 20px; border-top: 1px solid #30363D;">
            <p style="color: #94A3B8; font-family: sans-serif; font-size: 12px; margin: 0;">
              LuxOps - Sistema Operativo de Lujo
            </p>
          </td>
        </tr>
      </table>
      </td>
  </tr>
</table>`;

  const text = [
    params.heading,
    "",
    ...params.bodyLines,
    "",
    `${params.buttonLabel}: ${params.actionLink}`,
    "",
    "LuxOps - Hecho en Canarias",
  ].join("\n");

  return { html, text };
}
