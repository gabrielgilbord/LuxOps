import Link from "next/link";
import { Building2, Cable, Plus, Sun, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminUser } from "@/lib/authz";
import { ORGANIZATION_VERTICAL_LABEL } from "@/lib/organization-vertical";
import { PLATFORM_ORG_ID } from "@/lib/super-admin";

export const metadata = { title: "Super Admin" };

export default async function SuperAdminPage() {
  await requireSuperAdminUser();

  const [orgCount, solarCount, fiberCount, userCount, projectCount, recentOrgs] =
    await Promise.all([
      prisma.organization.count({ where: { id: { not: PLATFORM_ORG_ID } } }),
      prisma.organization.count({
        where: { id: { not: PLATFORM_ORG_ID }, vertical: "SOLAR" },
      }),
      prisma.organization.count({
        where: { id: { not: PLATFORM_ORG_ID }, vertical: "FIBER" },
      }),
      prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
      prisma.project.count(),
      prisma.organization.findMany({
        where: { id: { not: PLATFORM_ORG_ID } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          vertical: true,
          isSubscribed: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: { select: { users: true, projects: true } },
        },
      }),
    ]);

  const stats = [
    { label: "Clientes activos", value: orgCount, icon: Building2 },
    { label: "Solar", value: solarCount, icon: Sun },
    { label: "Fibra", value: fiberCount, icon: Cable },
    { label: "Usuarios", value: userCount, icon: Users },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">
            Panel de plataforma
          </p>
          <h1 className="mt-3 text-3xl font-bold">Super Admin LuxOps</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Gestiona clientes (instaladoras), altas manuales sin Stripe y el estado de suscripciones.
          </p>
        </div>
        <Link
          href="/super-admin/organizations/new"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-400"
        >
          <Plus className="h-4 w-4" />
          Alta manual
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <s.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <p className="text-sm text-slate-400">Total obras en plataforma</p>
        <p className="text-2xl font-bold">{projectCount}</p>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos clientes</h2>
          <Link href="/super-admin/organizations" className="text-sm text-violet-300 hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="hidden px-4 py-3 sm:table-cell">Vertical</th>
                <th className="px-4 py-3">Suscripción</th>
                <th className="hidden px-4 py-3 md:table-cell">Usuarios</th>
                <th className="hidden px-4 py-3 md:table-cell">Obras</th>
              </tr>
            </thead>
            <tbody>
              {recentOrgs.map((org) => (
                <tr key={org.id} className="border-t border-slate-800/80 hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/super-admin/organizations/${org.id}`}
                      className="font-medium text-white hover:text-violet-200"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {ORGANIZATION_VERTICAL_LABEL[org.vertical]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        org.isSubscribed
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {org.isSubscribed ? org.subscriptionStatus ?? "active" : "inactiva"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">{org._count.users}</td>
                  <td className="hidden px-4 py-3 md:table-cell">{org._count.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
