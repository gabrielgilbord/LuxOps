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

const lxLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 512 512" style="display:block;margin:0 auto 16px;">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FBBF24"/><stop offset="100%" style="stop-color:#D97706"/></linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="#0B0E14"/>
  <text x="256" y="330" text-anchor="middle" font-family="system-ui,sans-serif" font-size="200" font-weight="800" fill="url(#g)">LX</text>
</svg>`;

export function buildPaidSubscriptionWelcomeEmail(params: PaidSubscriptionWelcomeParams) {
  const html = `
  <div style="font-family:Inter,system-ui,Arial,sans-serif;background:#0B0E14;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#161B22;border:1px solid rgba(251,191,36,0.25);border-radius:16px;padding:32px 28px;">
      ${lxLogoSvg}
      <p style="margin:0 0 12px 0;font-size:15px;color:#e2e8f0">Hola ${params.firstName},</p>
      <p style="margin:0 0 12px 0;font-size:15px;color:#cbd5e1;line-height:1.55">
        Tu pago se ha confirmado. <strong style="color:#fbbf24">LuxOps</strong> ya es el cerebro digital de tu instaladora: obras, equipo y trazabilidad en un solo flujo.
      </p>
      <p style="margin:0 0 24px 0;font-size:14px;color:#94a3b8">
        Entra cuando quieras para completar el alta y abrir el panel.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${params.dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#FBBF24,#D97706);color:#0f172a;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:12px;font-size:15px;">
          Ir a mi Dashboard
        </a>
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />
      <p style="margin:0;font-size:12px;color:#64748b;text-align:center">LuxOps · CRM para instaladoras solares</p>
    </div>
  </div>`;
  const text = `Hola ${params.firstName},

Tu pago se ha confirmado. LuxOps ya es el cerebro digital de tu instaladora.

Ir a mi Dashboard: ${params.dashboardUrl}

LuxOps · CRM para instaladoras solares`;
  return { html, text };
}

export function buildOperarioObraAssignedEmail(params: OperarioObraAssignedParams) {
  const html = `
  <div style="font-family:Inter,system-ui,Arial,sans-serif;background:#0B0E14;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#161B22;border:1px solid rgba(251,191,36,0.25);border-radius:16px;padding:32px 28px;">
      ${lxLogoSvg}
      <p style="margin:0 0 8px 0;font-size:15px;color:#e2e8f0">Hola ${params.operarioName},</p>
      <p style="margin:0 0 12px 0;font-size:15px;color:#cbd5e1;line-height:1.55">
        Te han asignado una obra en <strong style="color:#fbbf24">LuxOps</strong>.
      </p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#94a3b8">Cliente / instalación:</p>
      <p style="margin:0 0 24px 0;font-size:16px;color:#f1f5f9;font-weight:700">${params.cliente}</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${params.obraUrl}" style="display:inline-block;background:linear-gradient(135deg,#FBBF24,#D97706);color:#0f172a;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:12px;font-size:15px;">
          Abrir obra en el móvil
        </a>
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />
      <p style="margin:0;font-size:12px;color:#64748b;text-align:center">LuxOps · Modo tejado</p>
    </div>
  </div>`;
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
