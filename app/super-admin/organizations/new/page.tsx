import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdminUser } from "@/lib/authz";
import { CreateOrganizationForm } from "./create-organization-form";

export const metadata = { title: "Alta manual — Super Admin" };

export default async function NewOrganizationPage() {
  await requireSuperAdminUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/super-admin/organizations"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>
      <CreateOrganizationForm />
    </div>
  );
}
