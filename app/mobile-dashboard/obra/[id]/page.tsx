import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/data";
import { EjecucionObra } from "@/app/operario/obra/[id]/stepper-flow";
import { requireOperarioUser } from "@/lib/authz";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MobileObraPage({ params }: Props) {
  const dbUser = await requireOperarioUser();
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project || project.assignedUserId !== dbUser.id) notFound();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <header className="mb-4 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3">
        <p className="text-xs text-slate-300">Modo Tejado</p>
        <h1 className="text-lg font-bold">{project.cliente}</h1>
        <p className="text-xs text-slate-300">{project.direccion}</p>
      </header>
      <EjecucionObra projectId={project.id} />
    </main>
  );
}
