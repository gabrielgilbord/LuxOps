import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { RegisterCheckoutSection } from "@/app/register/register-checkout-section";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

function LuxOpsLogo() {
  return (
    <BrandLogo darkBackground className="h-12 w-auto" />
  );
}

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
        <div className="relative z-10">
          <LuxOpsLogo />
        </div>
        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <h2 className="text-5xl font-bold leading-tight text-white">
            Donde la energia solar se encuentra con la precision operativa
          </h2>
          <p className="mt-4 text-sm text-slate-200/85">
            Activa tu organizacion, configura tu equipo y centraliza la operacion solar
            desde el primer dia.
          </p>
          <p className="mt-4 text-xs font-medium text-slate-300/90">
            Únete a más de 50 empresas que ya han digitalizado sus instalaciones.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-100/60 px-4 py-10">
        <div className="animate-fade-in-up w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10">
          <h1 className="text-2xl font-bold text-slate-950">Activa LuxOps en 2 pasos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Primero completas el pago seguro de 150€/mes y despues registras tu
            organizacion y admin.
          </p>

          <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {[
              "Checkout seguro con Stripe",
              "Suscripcion mensual de 150€/mes",
              "Onboarding de empresa y admin al completar pago",
            ].map((item) => (
              <p key={item} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                {item}
              </p>
            ))}
          </div>

          <RegisterCheckoutSection />

          <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            Pago cifrado y verificado.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-slate-500">
            <span className="rounded border border-slate-300 px-2 py-1">VISA</span>
            <span className="rounded border border-slate-300 px-2 py-1">MASTERCARD</span>
            <span className="rounded border border-slate-300 px-2 py-1">STRIPE</span>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-slate-900 underline">
              Entrar
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-slate-500">
            <Link href="/support" className="underline underline-offset-2">
              ¿Necesitas ayuda? Contacta con soporte técnico
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
