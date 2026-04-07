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

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPublicAppUrl } from "@/lib/public-app-url";
import { EmailLayout } from "@/lib/emails/layout";

function emailLogoUrl() {
  const base = getPublicAppUrl().replace(/\/$/, "");
  return `${base}/icon.svg`;
}

function wrapDeluxeEmail(opts: { title?: string; inner: string }) {
  // renderToStaticMarkup devuelve markup sin doctype; lo añadimos para compatibilidad.
  const element = React.createElement(
    EmailLayout,
    { logoUrl: emailLogoUrl(), title: opts.title },
    React.createElement("div", { dangerouslySetInnerHTML: { __html: opts.inner } }),
  );
  return `<!doctype html>${renderToStaticMarkup(element)}`;
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
