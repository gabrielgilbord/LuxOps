import type { Metadata } from "next";
import {
  formatLegalPlaceholder,
  getPublicLegalIdentity,
} from "@/lib/legal-public";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Información sobre tratamiento de datos personales (RGPD y LOPDGDD).",
};

export default function PrivacidadPage() {
  const L = getPublicLegalIdentity();
  const name = formatLegalPlaceholder(L.name, "NEXT_PUBLIC_LEGAL_NAME");
  const dni = formatLegalPlaceholder(L.dni, "NEXT_PUBLIC_LEGAL_DNI");
  const address = formatLegalPlaceholder(L.address, "NEXT_PUBLIC_LEGAL_ADDRESS");
  const email = formatLegalPlaceholder(L.email, "NEXT_PUBLIC_LEGAL_EMAIL");

  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        Política de privacidad
      </h1>
      <p className="text-sm text-slate-500">
        De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">1. Responsable del tratamiento</h2>
      <p className="text-slate-700 leading-relaxed">
        <strong>{name}</strong>
        <br />
        NIF/NIE: {dni}
        <br />
        Domicilio: {address}
        <br />
        Correo de contacto:{" "}
        <a className="font-medium text-amber-700 underline" href={`mailto:${email}`}>
          {email}
        </a>
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">2. Finalidades</h2>
      <ul className="list-disc space-y-2 pl-5 text-slate-700">
        <li>Gestión de cuentas de organización y usuarios (administradores y operarios).</li>
        <li>Ejecución del contrato de suscripción y facturación (incl. pasarela Stripe).</li>
        <li>Operación del servicio: proyectos, fotografías, firmas, documentación técnica generada.</li>
        <li>Cumplimiento de obligaciones legales y atención de solicitudes de derechos ARCO+/LOPDGDD.</li>
        <li>Comunicaciones operativas relacionadas con el servicio (p. ej. recuperación de acceso).</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">3. Base legal</h2>
      <p className="text-slate-700 leading-relaxed">
        Ejecución de contrato (art. 6.1.b RGPD), interés legítimo en la mejora y seguridad del
        servicio cuando corresponda (art. 6.1.f), y obligación legal cuando aplique (art. 6.1.c).
        El consentimiento se recabará cuando sea necesario para finalidades específicas (p. ej.
        cookies no esenciales, si en el futuro se incorporan).
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">4. Conservación</h2>
      <p className="text-slate-700 leading-relaxed">
        Los datos se conservan mientras se mantenga la relación contractual y el tiempo adicional
        exigido por ley o para la formulación, ejercicio o defensa de reclamaciones. Tras la baja,
        se aplicarán plazos de bloqueo y supresión conforme a política interna y normativa.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">5. Destinatarios y encargados</h2>
      <p className="text-slate-700 leading-relaxed">
        Proveedores que actúan como encargados del tratamiento (por ejemplo: alojamiento, base de
        datos, correo transaccional, pasarela de pago Stripe, almacenamiento de archivos), con
        contrato o cláusulas tipo adecuadas. No se ceden datos a terceros para su propio marketing
        salvo base legal específica e información previa.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">6. Derechos</h2>
      <p className="text-slate-700 leading-relaxed">
        Puede ejercer los derechos de acceso, rectificación, supresión, limitación, oposición y
        portabilidad escribiendo a{" "}
        <a className="font-medium text-amber-700 underline" href={`mailto:${email}`}>
          {email}
        </a>
        . Tiene derecho a reclamar ante la Agencia Española de Protección de Datos (
        <a
          href="https://www.aepd.es"
          className="font-medium text-amber-700 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          www.aepd.es
        </a>
        ).
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">7. Seguridad</h2>
      <p className="text-slate-700 leading-relaxed">
        Se aplican medidas técnicas y organizativas apropiadas al riesgo (control de accesos,
        conexiones cifradas, políticas de contraseñas en la medida de lo posible en el diseño del
        producto). Ningún sistema es invulnerable; notificaremos incidencias graves cuando la ley
        lo exija.
      </p>
    </article>
  );
}
