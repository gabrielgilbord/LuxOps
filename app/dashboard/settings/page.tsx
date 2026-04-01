import Link from "next/link";
import { Building2, CreditCard, Palette } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminUserForDashboard } from "@/lib/authz";
import { CompanySettingsForm } from "@/app/dashboard/company-settings/settings-form";
import { createSignedStorageUrl } from "@/lib/storage";
import { ProfileSettingsForm } from "@/app/dashboard/settings/profile-settings-form";
import { SettingsTabsNav } from "@/app/dashboard/settings/settings-tabs-nav";
import { openCustomerPortalAction } from "@/app/actions/billing";
import { getStripe } from "@/lib/stripe";

export const metadata = {
  title: "Ajustes",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await requireAdminUserForDashboard();
  const { tab } = await searchParams;
  const currentTab =
    tab === "profile" || tab === "ops" || tab === "subscription" ? tab : "organization";
  const org = await prisma.organization.findUnique({
    where: { id: admin.organizationId },
    select: {
      name: true,
      taxAddress: true,
      logoUrl: true,
      logoPath: true,
      brandColor: true,
      subscriptionStatus: true,
      planPriceCents: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  const previewLogoUrl =
    org?.logoPath
      ? await createSignedStorageUrl({
          bucket: "luxops-assets",
          path: org.logoPath,
          expiresIn: 60 * 60 * 12,
        })
      : (org?.logoUrl ?? "");

  const [counts, latestErrors] =
    currentTab === "ops"
      ? await Promise.all([
          prisma.notificationJob.groupBy({
            by: ["status"],
            where: { organizationId: admin.organizationId },
            _count: { _all: true },
          }),
          prisma.notificationJob.findMany({
            where: { organizationId: admin.organizationId, status: "RETRY" },
            orderBy: { updatedAt: "desc" },
            take: 8,
            select: {
              id: true,
              type: true,
              attempts: true,
              lastError: true,
              nextAttemptAt: true,
            },
          }),
        ])
      : [[], [] as Array<{ id: string; type: string; attempts: number; lastError: string | null; nextAttemptAt: Date }>];
  const statusMap = Object.fromEntries(
    (counts as Array<{ status: string; _count: { _all: number } }>).map((c) => [c.status, c._count._all]),
  );

  let nextChargeDate: string | null = null;
  let nextChargeLine: string | null = null;
  let paymentMethodLast4: string | null = null;
  let paymentMethodBrand: string | null = null;
  let defaultTaxId = "";
  let invoices: Array<{
    id: string;
    date: string;
    amount: string;
    status: string;
    statusClass: string;
    pdfUrl: string | null;
  }> = [];
  const subscriptionStatus = (org?.subscriptionStatus ?? "active").toLowerCase();
  const statusUi: Record<string, { label: string; text: string; dot: string; pulse: string }> = {
    active: { label: "Activo", text: "text-emerald-300", dot: "bg-emerald-400", pulse: "bg-emerald-400" },
    trialing: { label: "Trial", text: "text-sky-300", dot: "bg-sky-400", pulse: "bg-sky-400" },
    past_due: { label: "Pago pendiente", text: "text-red-300", dot: "bg-red-400", pulse: "bg-red-400" },
    unpaid: { label: "Impagado", text: "text-red-300", dot: "bg-red-400", pulse: "bg-red-400" },
    canceled: { label: "Cancelado", text: "text-slate-300", dot: "bg-slate-400", pulse: "bg-slate-400" },
    incomplete: { label: "Incompleto", text: "text-slate-300", dot: "bg-slate-400", pulse: "bg-slate-400" },
  };
  const currentStatusUi = statusUi[subscriptionStatus] ?? {
    label: subscriptionStatus,
    text: "text-slate-300",
    dot: "bg-slate-400",
    pulse: "bg-slate-400",
  };

  if ((currentTab === "subscription" || currentTab === "organization") && org?.stripeCustomerId) {
    try {
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(org.stripeCustomerId);
      if (!("deleted" in customer)) {
        defaultTaxId = customer.metadata?.tax_id ?? "";
      }
      if (currentTab !== "subscription") {
        // No cargamos más datos de Stripe si no estamos en tab suscripción.
      } else if (org.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        const nextUnix = (subscription as { current_period_end?: number }).current_period_end;
        if (nextUnix) {
          nextChargeDate = new Date(nextUnix * 1000).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const amountCents =
            subscription.items.data[0]?.price?.unit_amount ??
            org.planPriceCents ??
            15000;
          const amount = new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
          }).format((amountCents ?? 15000) / 100);
          nextChargeLine = `${amount} el ${nextChargeDate}`;
        }

        const defaultPm =
          typeof subscription.default_payment_method === "string"
            ? await stripe.paymentMethods.retrieve(subscription.default_payment_method)
            : subscription.default_payment_method;
        if (defaultPm && defaultPm.type === "card") {
          paymentMethodLast4 = defaultPm.card?.last4 ?? null;
          paymentMethodBrand = defaultPm.card?.brand ?? null;
        }
      }

      if (currentTab === "subscription") {
        const invoiceList = await stripe.invoices.list({
          customer: org.stripeCustomerId,
          limit: 8,
        });
        const statusLabel: Record<string, { label: string; className: string }> = {
          paid: { label: "Pagada", className: "text-emerald-300" },
          open: { label: "Pendiente", className: "text-amber-300" },
          draft: { label: "Borrador", className: "text-slate-300" },
          uncollectible: { label: "Impagada", className: "text-red-300" },
          void: { label: "Anulada", className: "text-slate-400" },
        };
        invoices = invoiceList.data.map((invoice) => {
          const status = statusLabel[invoice.status ?? "open"] ?? {
            label: invoice.status ?? "Pendiente",
            className: "text-slate-300",
          };
          return {
            id: invoice.id,
            date: new Date(invoice.created * 1000).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            amount: new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
            }).format((invoice.amount_paid || invoice.amount_due || 0) / 100),
            status: status.label,
            statusClass: status.className,
            pdfUrl: invoice.invoice_pdf ?? null,
          };
        });
      }
    } catch (error) {
      console.error("No se pudo cargar la suscripción desde Stripe", error);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-yellow-300">
              <Building2 className="h-4 w-4" />
              Ajustes de Organización
            </p>
            <h1 className="mt-1 text-2xl font-bold">Branding y perfil de empresa</h1>
            <p className="text-sm text-slate-300">
              Configura logo, color corporativo y dirección fiscal para tus informes.
            </p>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">
            Volver
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <SettingsTabsNav currentTab={currentTab} />

          {currentTab === "organization" ? (
            <>
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Palette className="h-4 w-4 text-yellow-300" />
                Configuración visual y legal
              </p>
              <CompanySettingsForm
                defaultName={org?.name ?? ""}
                defaultTaxId={defaultTaxId}
                defaultTaxAddress={org?.taxAddress ?? ""}
                defaultLogoUrl={previewLogoUrl}
                defaultBrandColor={org?.brandColor ?? "#1F2937"}
              />
            </>
          ) : null}

          {currentTab === "profile" ? (
            <ProfileSettingsForm defaultName={admin.name ?? ""} email={admin.email} />
          ) : null}

          {currentTab === "subscription" ? (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-300">Plan Actual</p>
                      <span className="rounded-full border border-yellow-300/40 bg-yellow-300/20 px-2 py-0.5 text-xs font-semibold text-yellow-200">
                        LuxOps Enterprise / Premium
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <p className="text-slate-200">
                        Estado:{" "}
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${currentStatusUi.text}`}>
                          <span className="relative flex h-2 w-2">
                            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${currentStatusUi.pulse} opacity-80`} />
                            <span className={`relative inline-flex h-2 w-2 rounded-full ${currentStatusUi.dot}`} />
                          </span>
                          {currentStatusUi.label}
                        </span>
                      </p>
                      <p className="text-slate-200">
                        Próximo Cobro:{" "}
                        <span className="font-medium text-white">{nextChargeLine ?? "No disponible"}</span>
                      </p>
                      <p className="text-slate-200">
                        Método de Pago:{" "}
                        <span className="inline-flex items-center gap-2 font-medium text-white">
                          <CreditCard className="h-4 w-4 text-yellow-300" />
                          {paymentMethodLast4
                            ? `${(paymentMethodBrand ?? "Tarjeta").toUpperCase()} •••• ${paymentMethodLast4}`
                            : "No disponible"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid w-full max-w-xs gap-2">
                    <form action={openCustomerPortalAction}>
                      <input type="hidden" name="intent" value="update_payment" />
                      <button
                        type="submit"
                        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300"
                      >
                        Actualizar Método de Pago
                      </button>
                    </form>
                    <form action={openCustomerPortalAction}>
                      <input type="hidden" name="intent" value="cancel_subscription" />
                      <button
                        type="submit"
                        className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800"
                      >
                        Cancelar Suscripción
                      </button>
                    </form>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-semibold text-slate-100">Historial de Facturas</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-slate-400">
                        <th className="py-2 pr-3 font-medium">Fecha</th>
                        <th className="py-2 pr-3 font-medium">Importe</th>
                        <th className="py-2 pr-3 font-medium">Estado</th>
                        <th className="py-2 pr-3 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-slate-900">
                          <td className="py-2 pr-3 text-slate-200">{invoice.date}</td>
                          <td className="py-2 pr-3 text-slate-200">{invoice.amount}</td>
                          <td className={`py-2 pr-3 text-xs font-semibold ${invoice.statusClass}`}>
                            {invoice.status}
                          </td>
                          <td className="py-2 pr-3">
                            {invoice.pdfUrl ? (
                              <a
                                href={invoice.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800"
                              >
                                Descargar PDF
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500">No disponible</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invoices.length === 0 ? (
                    <p className="py-4 text-sm text-slate-400">Aún no tienes facturas procesadas.</p>
                  ) : null}
                </div>
              </section>
              <p className="text-xs text-slate-400">
                Tus pagos son procesados de forma segura por Stripe. LuxOps no almacena los datos de tu tarjeta.
              </p>
            </div>
          ) : null}

          {currentTab === "ops" ? (
            <div className="space-y-4">
              <section className="grid gap-3 sm:grid-cols-3">
                {["PENDING", "RETRY", "SENT"].map((status) => (
                  <div key={status} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs text-slate-400">{status}</p>
                    <p className="mt-1 text-3xl font-bold">{statusMap[status] ?? 0}</p>
                  </div>
                ))}
              </section>
              <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-semibold text-slate-200">Salud del sistema</p>
                <div className="mt-3 space-y-2">
                  {latestErrors.map((job) => (
                    <div key={job.id} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
                      <p className="font-semibold">{job.type}</p>
                      <p className="text-slate-400">Intentos: {job.attempts}</p>
                      <p className="text-slate-400">
                        Próximo: {new Date(job.nextAttemptAt).toLocaleString("es-ES")}
                      </p>
                      <p className="text-red-300">{job.lastError || "Sin detalle"}</p>
                    </div>
                  ))}
                  {latestErrors.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay errores recientes en la cola.</p>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
