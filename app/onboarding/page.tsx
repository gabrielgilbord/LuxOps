import Link from "next/link";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { completeCheckoutOnboarding } from "@/app/actions/billing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

type OnboardingPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

function LuxOpsLogo() {
  return (
    <BrandLogo darkBackground className="h-12 w-auto" />
  );
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <main className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
          <div className="relative z-10">
            <LuxOpsLogo />
          </div>
          <div className="relative z-10 max-w-lg animate-fade-in-up">
            <h2 className="text-5xl font-bold leading-tight text-white">
              Configuramos tu organización en minutos
            </h2>
            <p className="mt-4 text-sm text-slate-200/85">
              Vuelve al checkout para completar el proceso de activación.
            </p>
          </div>
        </section>
        <section className="flex items-center justify-center bg-slate-100/60 px-4 py-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10">
            <h1 className="text-2xl font-bold text-slate-950">Pago no detectado</h1>
            <p className="mt-2 text-sm text-slate-600">
              Para crear tu organización primero completa el checkout.
            </p>
            <Link
              href="/#precios"
              className="mt-5 inline-flex rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-yellow-950 hover:bg-yellow-300"
            >
              Volver a Precios
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
        <div className="relative z-10">
          <LuxOpsLogo />
        </div>
        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <h2 className="text-5xl font-bold leading-tight text-white">
            Tu pago está confirmado. Ahora activamos tu operación.
          </h2>
          <p className="mt-4 text-sm text-slate-200/85">
            Crea la organización y el administrador para entrar al panel de control.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Checkout seguro validado por Stripe.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-100/60 px-4 py-10">
        <div className="animate-fade-in-up w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10">
          <h1 className="text-2xl font-bold text-slate-950">Registro de Organización</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tu pago está confirmado. Completa los datos para activar LuxOps.
          </p>

          <form action={completeCheckoutOnboarding} className="mt-6 space-y-4">
            <input type="hidden" name="sessionId" value={sessionId} />
            <div>
              <Label htmlFor="companyName">Nombre de empresa</Label>
              <div className="relative mt-1">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="companyName"
                  name="companyName"
                  required
                  className="pl-9 focus-visible:ring-2 focus-visible:ring-yellow-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fullName">Nombre del admin</Label>
              <div className="relative mt-1">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="fullName"
                  name="fullName"
                  required
                  className="pl-9 focus-visible:ring-2 focus-visible:ring-yellow-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email de acceso</Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="pl-9 focus-visible:ring-2 focus-visible:ring-yellow-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" name="password" required />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-2.5 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/30 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300"
            >
              Crear organización y activar panel
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
