import type { Metadata } from "next";
import {
  formatLegalPlaceholder,
  getPublicLegalIdentity,
} from "@/lib/legal-public";

export const metadata: Metadata = {
  title: "Términos de servicio",
  description: "Términos de uso del software LuxOps (LSSI-CE y condiciones generales).",
};

export default function TerminosPage() {
  const L = getPublicLegalIdentity();
  const name = formatLegalPlaceholder(L.name, "NEXT_PUBLIC_LEGAL_NAME");
  const dni = formatLegalPlaceholder(L.dni, "NEXT_PUBLIC_LEGAL_DNI");
  const address = formatLegalPlaceholder(L.address, "NEXT_PUBLIC_LEGAL_ADDRESS");
  const email = formatLegalPlaceholder(L.email, "NEXT_PUBLIC_LEGAL_EMAIL");

  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        Términos de servicio
      </h1>
      <p className="text-sm text-slate-500">Última actualización: documento marco para usuarios de LuxOps.</p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">1. Titular del servicio</h2>
      <p className="text-slate-700 leading-relaxed">
        El titular del sitio web y del servicio SaaS LuxOps es <strong>{name}</strong>, con NIF/NIE{" "}
        <strong>{dni}</strong>, domicilio en <strong>{address}</strong>. Contacto:{" "}
        <a className="font-medium text-amber-700 underline" href={`mailto:${email}`}>
          {email}
        </a>
        .
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">2. Objeto</h2>
      <p className="text-slate-700 leading-relaxed">
        LuxOps es una herramienta de gestión operativa para empresas del sector solar (seguimiento de
        obras, evidencias, generación de documentación técnica, etc.). El acceso y uso quedan
        supeditados a estos términos y a la suscripción contratada.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">
        3. Exención de responsabilidad técnica del software
      </h2>
      <p className="text-slate-700 leading-relaxed">
        El software se suministra «tal cual» y según disponibilidad. LuxOps no sustituye el criterio
        profesional del instalador autorizado, la revisión de proyecto según REBT ni la decisión
        administrativa de organismos públicos o distribuidoras. Los informes, dossiers y datos
        generados son auxiliares: la empresa usuaria es responsable de la exactitud de los datos
        introducidos, del cumplimiento normativo de la instalación y de la tramitación ante terceros.
        No se garantiza la ausencia de errores en el código ni la continuidad ininterrumpida del
        servicio; en la medida permitida por la ley, quedan excluidas garantías implícitas.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">4. Propiedad intelectual de LuxOps</h2>
      <p className="text-slate-700 leading-relaxed">
        El nombre LuxOps, el diseño de la interfaz, el código, la documentación asociada y los
        materiales de marca son titularidad de sus respectivos propietarios y están protegidos por
        la legislación de propiedad intelectual. Se concede una licencia limitada, no exclusiva e
        intransferible para usar el servicio conforme a la suscripción. Queda prohibida la copia,
        ingeniería inversa, reventa o explotación no autorizada del software.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">5. Cuenta y uso aceptable</h2>
      <p className="text-slate-700 leading-relaxed">
        El usuario debe proporcionar datos veraces y mantener la confidencialidad de sus credenciales.
        Está prohibido el uso del servicio para fines ilícitos, para vulnerar sistemas de terceros o
        para cargar contenido que infrinja derechos de terceros.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">6. Contratación y pagos</h2>
      <p className="text-slate-700 leading-relaxed">
        Los pagos recurrentes pueden procesarse a través de Stripe según las condiciones mostradas en
        el checkout. El titular del servicio puede modificar precios con preaviso razonable según lo
        establecido en la comunicación comercial o en el panel de facturación.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">7. Legislación aplicable</h2>
      <p className="text-slate-700 leading-relaxed">
        En lo no regulado expresamente, serán de aplicación la Ley 34/2002 (LSSI-CE) y la normativa
        española y europea vigente. Para controversias, los tribunales del domicilio del titular
        podrán resultar competentes, sin perjuicio de derechos imperativos del consumidor.
      </p>
    </article>
  );
}
