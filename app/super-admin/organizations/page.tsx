import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminUser } from "@/lib/authz";
import { ORGANIZATION_VERTICAL_LABEL } from "@/lib/organization-vertical";
import { PLATFORM_ORG_ID } from "@/lib/super-admin";
import { toggleOrganizationSubscriptionAction } from "@/app/actions/super-admin";

export const metadata = { title: "Clientes — Super Admin" };

type Props = {
  searchParams: Promise<{ created?: string; deleted?: string }>;
};

export default async function OrganizationsListPage({ searchParams }: Props) {
  await requireSuperAdminUser();
  const sp = await searchParams;

  const organizations = await prisma.organization.findMany({
    where: { id: { not: PLATFORM_ORG_ID } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      vertical: true,
      isSubscribed: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      createdAt: true,
      _count: { select: { users: true, projects: true } },
      users: {
        where: { role: "ADMIN" },
        take: 1,
        select: { email: true, name: true },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="mt-1 text-sm text-slate-400">
            {organizations.length} instaladoras registradas
          </p>
        </div>
        <Link
          href="/super-admin/organizations/new"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white hover:bg-violet-400"
        >
          <Plus className="h-4 w-4" />
          Alta manual
        </Link>
      </div>

      {sp.created === "1" ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Cliente creado correctamente.
        </p>
      ) : null}
      {sp.deleted === "1" ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Cliente eliminado.
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="hidden px-4 py-3 sm:table-cell">Vertical</th>
              <th className="hidden px-4 py-3 md:table-cell">Admin</th>
              <th className="px-4 py-3">Estado</th>
              <th className="hidden px-4 py-3 lg:table-cell">Stripe</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-t border-slate-800/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/super-admin/organizations/${org.id}`}
                    className="font-medium hover:text-violet-200"
                  >
                    {org.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {org._count.users} usuarios · {org._count.projects} obras
                  </p>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {ORGANIZATION_VERTICAL_LABEL[org.vertical]}
                </td>
                <td className="hidden px-4 py-3 md:table-cell text-slate-400">
                  {org.users[0]?.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={org.isSubscribed ? "text-emerald-400" : "text-amber-400"}>
                    {org.isSubscribed ? org.subscriptionStatus ?? "active" : "inactiva"}
                  </span>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell text-slate-500">
                  {org.stripeCustomerId ? "Sí" : "Manual"}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleOrganizationSubscriptionAction}>
                    <input type="hidden" name="organizationId" value={org.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-violet-300 hover:underline"
                    >
                      {org.isSubscribed ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No hay clientes todavía.{" "}
            <Link href="/super-admin/organizations/new" className="text-violet-300 underline">
              Crear el primero
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
