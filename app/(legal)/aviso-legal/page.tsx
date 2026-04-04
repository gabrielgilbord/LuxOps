import type { Metadata } from "next";
import {
  formatLegalPlaceholder,
  getPublicLegalIdentity,
} from "@/lib/legal-public";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Información general del sitio y condiciones LSSI-CE.",
};

export default function AvisoLegalPage() {
  const L = getPublicLegalIdentity();
  const name = formatLegalPlaceholder(L.name, "NEXT_PUBLIC_LEGAL_NAME");
  const dni = formatLegalPlaceholder(L.dni, "NEXT_PUBLIC_LEGAL_DNI");
  const address = formatLegalPlaceholder(L.address, "NEXT_PUBLIC_LEGAL_ADDRESS");
  const email = formatLegalPlaceholder(L.email, "NEXT_PUBLIC_LEGAL_EMAIL");

  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Aviso legal</h1>
      <p className="text-sm text-slate-500">Ley 34/2002, de 11 de julio, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE).</p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">Datos identificativos</h2>
      <p className="text-slate-700 leading-relaxed">
        Denominación: <strong>{name}</strong>
        <br />
        NIF/NIE: <strong>{dni}</strong>
        <br />
        Domicilio: <strong>{address}</strong>
        <br />
        Correo electrónico:{" "}
        <a className="font-medium text-amber-700 underline" href={`mailto:${email}`}>
          {email}
        </a>
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">Condiciones de uso del sitio</h2>
      <p className="text-slate-700 leading-relaxed">
        El acceso al sitio implica la aceptación de este aviso y de los{" "}
        <a href="/terminos" className="font-medium text-amber-700 underline">
          Términos de servicio
        </a>
        . El titular puede modificar el contenido del sitio con la finalidad de mantener la
        información actualizada.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">Propiedad intelectual</h2>
      <p className="text-slate-700 leading-relaxed">
        Los contenidos propios del sitio y de la marca LuxOps están protegidos. La reproducción no
        autorizada puede constituir infracción de los derechos del titular.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">Enlaces</h2>
      <p className="text-slate-700 leading-relaxed">
        Los enlaces a sitios externos se ofrecen a título informativo; el titular no se responsabiliza
        del contenido de dichos sitios.
      </p>
    </article>
  );
}
