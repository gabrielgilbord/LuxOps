import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { getProjects } from "@/app/actions/projects";
import { ReportsProjectRows } from "@/app/dashboard/reports/reports-project-rows";
import { requireAdminUserForDashboard } from "@/lib/authz";

export const metadata = {
  title: "Informes",
};

export default async function ReportsPage() {
  await requireAdminUserForDashboard();
  const projects = await getProjects();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <FileText className="h-5 w-5 text-yellow-300" />
            <h1 className="text-2xl font-bold">Generación de Informes</h1>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">
            Volver al dashboard
          </Link>
        </div>
        <div className="grid gap-3">
          <ReportsProjectRows projects={projects} />
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-10 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300/30 to-sky-300/20">
                <Sparkles className="h-8 w-8 text-yellow-300" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-200">
                Todavía no hay informes para generar
              </p>
              <p className="text-xs text-slate-400">
                Crea y finaliza tu primera instalación para desbloquear PDFs automáticos.
              </p>
              <Link
                href="/dashboard/new-project"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300"
              >
                Crear instalación
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
