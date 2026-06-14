import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminUser } from "@/lib/authz";
import { PLATFORM_ORG_ID } from "@/lib/super-admin";
import { OrganizationDetailPanel } from "./organization-detail-panel";

export const metadata = { title: "Detalle cliente — Super Admin" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrganizationDetailPage({ params }: Props) {
  await requireSuperAdminUser();
  const { id } = await params;

  if (id === PLATFORM_ORG_ID) notFound();

  const organization = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      vertical: true,
      taxAddress: true,
      isSubscribed: true,
      subscriptionStatus: true,
      rebtCompanyNumber: true,
      stripeCustomerId: true,
      createdAt: true,
      _count: { select: { users: true, projects: true } },
    },
  });

  if (!organization) notFound();

  const users = await prisma.user.findMany({
    where: { organizationId: id },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, role: true },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Link
        href="/super-admin/organizations"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>
      <h1 className="text-2xl font-bold">{organization.name}</h1>
      <p className="mt-1 text-sm text-slate-400">ID: {organization.id}</p>

      <div className="mt-8">
        <OrganizationDetailPanel
          organization={{
            ...organization,
            createdAt: organization.createdAt.toISOString(),
          }}
          users={users}
        />
      </div>
    </div>
  );
}
