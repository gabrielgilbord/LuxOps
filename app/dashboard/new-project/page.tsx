import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrganizationOperarios } from "@/app/actions/projects";
import { requireAdminUser } from "@/lib/authz";
import { NewProjectForm } from "@/components/dashboard/new-project-form";

export default async function NewProjectPage() {
  await requireAdminUser();
  const operarios = await getOrganizationOperarios();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>

        <NewProjectForm operarios={operarios} />
      </div>
    </main>
  );
}
