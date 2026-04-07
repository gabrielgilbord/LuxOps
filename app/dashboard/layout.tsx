import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUserForDashboard } from "@/lib/authz";
import { DashboardNavShell } from "@/app/dashboard/nav-shell";
import { getOrgForDashboard } from "@/lib/cache/dashboard-queries";
import { LuxOpsLogo } from "@/components/brand/luxops-logo";
import { prisma } from "@/lib/prisma";
import { isOrganizationProfileIncomplete } from "@/lib/organization-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminUserForDashboard();
  const orgGate = await prisma.organization.findUnique({
    where: { id: admin.organizationId },
    select: {
      isSubscribed: true,
      rebtCompanyNumber: true,
      taxAddress: true,
    },
  });
  if (!orgGate) {
    redirect("/recuperar-acceso");
  }
  if (
    orgGate.isSubscribed &&
    isOrganizationProfileIncomplete({
      rebtCompanyNumber: orgGate.rebtCompanyNumber,
      taxAddress: orgGate.taxAddress,
    })
  ) {
    redirect("/onboarding?continue=1");
  }

  const org = await getOrgForDashboard(admin.organizationId);
  const orgName = org?.name ?? "Organización";
  const userLabel = admin.name || admin.email || "AD";
  const status = (org?.subscriptionStatus ?? "active").toLowerCase();
  const showSubscriptionAlert = ["past_due", "unpaid", "canceled", "incomplete"].includes(status);

  return (
    <main className="min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950 sm:bg-slate-950/80 sm:backdrop-blur-xl">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6">
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span className="pointer-events-none absolute -inset-x-2 -inset-y-1 -z-10 rounded-full bg-yellow-300/10 blur-md" />
            <LuxOpsLogo invertColors className="h-7 w-auto" />
          </Link>
          <DashboardNavShell organizationName={orgName} userLabel={userLabel} />
        </div>
      </header>
      {showSubscriptionAlert ? (
        <div className="relative z-20 w-full border-b border-red-500/40 bg-red-500/15">
          <div className="mx-auto w-full max-w-7xl px-4 py-2 text-sm leading-relaxed text-red-100 sm:px-6">
            <Link href="/dashboard/settings?tab=subscription" className="font-medium hover:text-white">
              Ups, hay un problema con tu suscripción. Haz clic aquí para actualizar tu método de pago y seguir operando.
            </Link>
          </div>
        </div>
      ) : null}
      {children}
    </main>
  );
}
