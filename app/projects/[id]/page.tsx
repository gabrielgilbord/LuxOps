import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  PenSquare,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProjectAdminOfficePanel } from "@/components/projects/project-admin-office-panel";
import { getProjectById } from "@/lib/data";
import { getCurrentDbUser } from "@/lib/authz";
import { EjecucionObra } from "@/app/operario/obra/[id]/stepper-flow";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

function photoTypeLabel(
  type: "ANTES" | "DURANTE" | "DESPUES" | "ESQUEMA_UNIFILAR" | "ANEXO_PVGIS",
): string {
  if (type === "ANTES") return "Antes";
  if (type === "DURANTE") return "Durante";
  if (type === "ESQUEMA_UNIFILAR") return "Esquema unifilar";
  if (type === "ANEXO_PVGIS") return "Anexo PVGIS";
  return "Despues";
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const [project, dbUser] = await Promise.all([getProjectById(id), getCurrentDbUser()]);

  if (!project) notFound();
  const isAdmin = dbUser?.role === "ADMIN";

  return (
    <main
      className={
        isAdmin
          ? "mx-auto min-h-screen w-full max-w-4xl px-4 py-4 sm:px-6 bg-slate-950 text-slate-100"
          : "mx-auto min-h-screen w-full max-w-3xl px-4 py-4 sm:px-6"
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isAdmin ? "/dashboard" : "/"}
          className={
            isAdmin
              ? "inline-flex h-11 items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              : "inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          }
        >
          {isAdmin ? (
            <LayoutDashboard className="h-4 w-4 text-emerald-400" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          {isAdmin ? "Dashboard" : "Volver"}
        </Link>
        <Badge
          className={
            isAdmin
              ? "border border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
              : "bg-primary text-primary-foreground"
          }
        >
          {isAdmin ? "Vista administrador" : "Vista operario"}
        </Badge>
      </div>

      {isAdmin ? <ProjectAdminOfficePanel project={project} /> : null}

      <Card className={isAdmin ? "mb-4 border-slate-800 bg-slate-900/50 text-slate-100" : "mb-4"}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">{project.cliente}</CardTitle>
          <p className={isAdmin ? "text-sm text-slate-400" : "text-sm text-muted-foreground"}>
            {project.direccion}
          </p>
          <p className="inline-flex items-center gap-2 text-sm">
            <User className={`h-4 w-4 ${isAdmin ? "text-emerald-400" : "text-primary"}`} />
            Operario: <span className="font-medium">{project.operarioNombre}</span>
          </p>
        </CardHeader>
      </Card>

      <Card className={isAdmin ? "mb-4 border-slate-800 bg-slate-900/50" : "mb-4"}>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <PenSquare className={`h-5 w-5 ${isAdmin ? "text-emerald-400" : "text-primary"}`} />
            Firma del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {project.signatures.map((signature) => (
            <div
              key={signature.id}
              className={
                isAdmin
                  ? "overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40"
                  : "overflow-hidden rounded-lg border bg-muted/20"
              }
            >
              <Image
                src={signature.url}
                alt="Firma del cliente"
                width={1200}
                height={500}
                className="h-40 w-full object-contain bg-slate-900"
              />
              <div className={`p-2 text-xs ${isAdmin ? "text-slate-500" : "text-muted-foreground"}`}>
                {typeof signature.latitude === "number" && typeof signature.longitude === "number"
                  ? `GPS: ${signature.latitude.toFixed(6)}, ${signature.longitude.toFixed(6)}`
                  : "GPS no disponible"}
              </div>
            </div>
          ))}
          {project.signatures.length === 0 ? (
            <p className={isAdmin ? "text-sm text-slate-500" : "text-sm text-muted-foreground"}>
              Aun no hay firma guardada.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className={isAdmin ? "mb-4 border border-emerald-500/25 bg-slate-900/30" : "mb-4 border-accent/60"}>
        <CardContent className="pt-6">
          <EjecucionObra
            projectId={project.id}
            serverLegalElectricHints={{
              selfConsumptionModality: project.selfConsumptionModality,
              cableDcSectionMm2: project.cableDcSectionMm2,
              cableAcSectionMm2: project.cableAcSectionMm2,
            }}
            serverRebtContext={{
              projectRebtCompanyNumber: project.rebtCompanyNumber,
              organizationRebtCompanyNumber: project.organizationRebtCompanyNumber,
            }}
          />
        </CardContent>
      </Card>

      <Card className={isAdmin ? "mb-4 border-slate-800 bg-slate-900/50" : "mb-4"}>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ClipboardCheck className={`h-5 w-5 ${isAdmin ? "text-emerald-400" : "text-primary"}`} />
            Fotos del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {project.photos.map((photo) => (
            <div
              key={photo.id}
              className={
                isAdmin
                  ? "overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40"
                  : "overflow-hidden rounded-lg border bg-muted/20"
              }
            >
              <Image
                src={photo.url}
                alt={`Foto ${photoTypeLabel(photo.tipo)}`}
                width={800}
                height={600}
                className="h-40 w-full object-cover"
              />
              <div className={`p-2 text-xs ${isAdmin ? "text-slate-500" : "text-muted-foreground"}`}>
                Tipo: <span className="font-medium">{photoTypeLabel(photo.tipo)}</span>
              </div>
            </div>
          ))}
          {project.photos.length === 0 ? (
            <p className={isAdmin ? "text-sm text-slate-500" : "text-sm text-muted-foreground"}>
              Aun no hay fotos subidas.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Separator className={isAdmin ? "my-4 border-slate-800" : "my-4"} />

      <Link
        href={`/projects/${project.id}/informe`}
        className={
          isAdmin
            ? "inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
            : "inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-400 bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-100"
        }
      >
        <FileText className={`mr-2 h-5 w-5 ${isAdmin ? "text-emerald-400" : "text-primary"}`} />
        Generar Informe PDF (Mockup)
      </Link>
    </main>
  );
}
