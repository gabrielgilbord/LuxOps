import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentDbUser } from "@/lib/authz";
import { isOrganizationProfileIncomplete } from "@/lib/organization-profile";
import { getOnboardingContinueOrgSnapshot } from "@/app/actions/onboarding-profile";
import { OnboardingContinueForm } from "@/app/onboarding/onboarding-continue-form";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

function LuxOpsLogo() {
  return <BrandLogo darkBackground className="h-12 w-auto" />;
}

function isActiveSubscription(org: {
  isSubscribed: boolean;
  subscriptionStatus: string | null;
}): boolean {
  return (
    org.isSubscribed && ["active", "trialing"].includes(org.subscriptionStatus ?? "active")
  );
}

export async function OnboardingContinuePanel() {
  const user = await getCurrentDbUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding?continue=1")}`);
  }
  if (user.role !== "ADMIN") {
    redirect("/mobile-dashboard");
  }

  const org = await getOnboardingContinueOrgSnapshot(user.organizationId);
  if (!org) {
    redirect("/recuperar-acceso");
  }
  if (!isActiveSubscription(org)) {
    redirect("/recuperar-acceso");
  }
  if (!isOrganizationProfileIncomplete(org)) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
        <div className="relative z-10">
          <LuxOpsLogo />
        </div>
        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <h2 className="text-5xl font-bold leading-tight text-white">Un último paso fiscal</h2>
          <p className="mt-4 text-sm text-slate-200/85">
            Tu suscripción está activa. Completa los datos de empresa obligatorios para operar con
            LuxOps (REBT y dirección fiscal). No necesitas volver a pagar.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Cuenta de pago confirmada.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-100/60 px-4 py-10">
        <div className="animate-fade-in-up w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10">
          <h1 className="text-2xl font-bold text-slate-950">Completar datos de organización</h1>
          <p className="mt-1 text-sm text-slate-600">
            Requerido para informes y trazabilidad REBT. Podrás afinar el resto en Ajustes.
          </p>
          <OnboardingContinueForm
            defaultCompanyName={org.name}
            defaultTaxAddress={org.taxAddress ?? ""}
            defaultRebt={org.rebtCompanyNumber ?? ""}
          />
          <p className="mt-4 text-center text-xs text-slate-500">
            <Link href="/support" className="underline underline-offset-2">
              ¿Problemas? Soporte técnico
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
