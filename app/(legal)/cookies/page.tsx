import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Uso de cookies técnicas y de terceros (Stripe) en LuxOps.",
};

export default function CookiesPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Política de cookies</h1>
      <p className="text-sm text-slate-500">
        Información sobre almacenamiento local y tecnologías similares utilizadas en LuxOps (por
        ejemplo en luxops.es) o dominios asociados al servicio.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">1. Cookies técnicas y funcionales</h2>
      <p className="text-slate-700 leading-relaxed">
        LuxOps utiliza cookies o almacenamiento equivalente necesarios para el funcionamiento de la
        sesión, la autenticación (por ejemplo a través de Supabase), la seguridad CSRF y preferencias
        básicas de la aplicación. Estas cookies son imprescindibles para prestar el servicio
        solicitado por el usuario.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">2. Stripe (pagos)</h2>
      <p className="text-slate-700 leading-relaxed">
        En el proceso de suscripción y facturación,{" "}
        <strong>Stripe, Inc.</strong> puede establecer cookies o identificadores propios para
        prevenir fraude, procesar el pago y cumplir normativa financiera. El tratamiento de datos
        en ese flujo se rige por la{" "}
        <a
          href="https://stripe.com/es/legal/privacy-center"
          className="font-medium text-amber-700 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          política de privacidad de Stripe
        </a>
        . Le recomendamos revisarla antes de completar un pago.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">3. Consentimiento y almacenamiento local</h2>
      <p className="text-slate-700 leading-relaxed">
        Para mensajes informativos no esenciales (p. ej. recuerdo de que ha visto el aviso de
        cookies), puede usarse <code className="rounded bg-slate-100 px-1">localStorage</code> en su
        navegador, sin identificación cruzada con terceros para publicidad por parte de LuxOps.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">4. Más información</h2>
      <p className="text-slate-700 leading-relaxed">
        Para el tratamiento de datos personales, consulte la{" "}
        <Link href="/privacidad" className="font-medium text-amber-700 underline">
          Política de privacidad
        </Link>
        .
      </p>
    </article>
  );
}
