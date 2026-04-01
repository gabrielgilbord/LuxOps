type WelcomeInstallerParams = {
  nombreInstalador: string;
  panelUrl: string;
};

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
      <p style="margin:8px 0 0 0;font-size:12px;color:#64748b">Lux Light / OPS Black</p>
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
      <p style="margin:0;font-size:12px;color:#64748b">Lux Light / OPS Black</p>
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
