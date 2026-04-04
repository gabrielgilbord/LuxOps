import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Image as ImageIcon } from "lucide-react";
import { InformePdfButton } from "@/app/projects/[id]/informe/informe-pdf-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectById } from "@/lib/data";

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) notFound();

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6">
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al proyecto
      </Link>

      <Card className="border-primary/20">
        <CardHeader>
          <Badge className="w-fit bg-accent text-accent-foreground">
            Generador de Informe
          </Badge>
          <CardTitle className="mt-2 inline-flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Informe de obra (Mockup)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Proyecto: <span className="font-medium">{project.cliente}</span>
          </p>
          <p>
            Direccion: <span className="font-medium">{project.direccion}</span>
          </p>
          <p>
            Progreso general: <span className="font-medium">{project.progreso}%</span>
          </p>
          <p className="inline-flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Fotos incluidas: <span className="font-medium">{project.photosCount}</span>
          </p>

          <InformePdfButton projectId={project.id} />
          <p className="text-xs text-muted-foreground">
            Incluye resumen, fotos geolocalizadas y firma del cliente con branding de empresa.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
