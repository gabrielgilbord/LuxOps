import Link from "next/link";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";
import { RescueAccessForm } from "@/app/recuperar-acceso/rescue-access-form";

function LuxOpsLogo() {
  return <BrandLogo darkBackground className="h-12 w-auto" />;
}

export default function RecuperarAccesoPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
        <div className="relative z-10">
          <LuxOpsLogo />
        </div>
        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight text-white">Recuperar acceso tras el pago</h2>
          <p className="mt-4 text-sm text-slate-200/85">
            Si ya pagaste en Stripe pero se cortó el registro, entra aquí con el correo del checkout. No
            volverás a pasar por la pasarela si tu suscripción ya está activa.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-100/60 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10">
          <h1 className="text-2xl font-bold text-slate-950">Recuperar acceso</h1>
          <p className="mt-1 text-sm text-slate-600">
            Verificamos tu pago y te damos acceso sin duplicar el cobro.
          </p>
          <div className="mt-6">
            <RescueAccessForm />
          </div>
          <p className="mt-8 text-center text-sm text-slate-600">
            <Link href="/register" className="font-medium text-slate-900 underline">
              Volver a registro
            </Link>
            {" · "}
            <Link href="/login" className="font-medium text-slate-900 underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
