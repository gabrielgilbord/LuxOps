import { EstadoProyecto, TipoFoto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser, requireSubscribedUser } from "@/lib/authz";
import { createSignedStorageUrl } from "@/lib/storage";

export type DashboardProject = {
  id: string;
  cliente: string;
  direccion: string;
  estado: EstadoProyecto;
  assignedUserId: string | null;
  operarioNombre: string;
  operarioInitials: string;
  progreso: number;
  photosCount: number;
};

export type ProjectDetail = DashboardProject & {
  cups?: string;
  catastralReference?: string;
  ownerTaxId?: string;
  estimatedRevenue?: string | null;
  quoteReference?: string | null;
  technicalMemory?: string | null;
  reviewedByOfficeTech?: boolean;
  rebtCompanyNumber?: string | null;
  dossierReference?: string | null;
  equipmentInverterSerial?: string | null;
  equipmentBatterySerial?: string | null;
  equipmentVatimetroSerial?: string | null;
  assetPanelBrand?: string | null;
  assetPanelModel?: string | null;
  assetPanelSerial?: string | null;
  assetInverterBrand?: string | null;
  assetInverterModel?: string | null;
  assetBatteryBrand?: string | null;
  assetBatteryModel?: string | null;
  peakPowerKwp?: string | null;
  inverterPowerKwn?: string | null;
  storageCapacityKwh?: string | null;
  photos: {
    id: string;
    tipo: TipoFoto;
    url: string;
  }[];
  signatures: {
    id: string;
    imageDataUrl: string;
    url: string;
    latitude: number | null;
    longitude: number | null;
  }[];
};

const demoProjects: ProjectDetail[] = [
  {
    id: "demo-1",
    cliente: "Metalurgica JRC S.L.",
    direccion: "Poligono El Prado 18, Sevilla",
    estado: "EN_INSTALACION",
    assignedUserId: null,
    operarioNombre: "Carlos Ortega",
    operarioInitials: "CO",
    progreso: 60,
    photosCount: 2,
    photos: [
      {
        id: "p1",
        tipo: "ANTES",
        url:
          "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=80",
      },
      {
        id: "p2",
        tipo: "DURANTE",
        url:
          "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1600&q=80",
      },
    ],
    signatures: [],
  },
  {
    id: "demo-2",
    cliente: "Laura M. Prieto",
    direccion: "Calle Encina 6, Cordoba",
    estado: "PENDIENTE_MATERIAL",
    assignedUserId: null,
    operarioNombre: "Alicia Moreno",
    operarioInitials: "AM",
    progreso: 20,
    photosCount: 0,
    photos: [],
    signatures: [],
  },
];

function toDashboardProject(project: ProjectDetail): DashboardProject {
  return {
    id: project.id,
    cliente: project.cliente,
    direccion: project.direccion,
    estado: project.estado,
    assignedUserId: project.assignedUserId,
    operarioNombre: project.operarioNombre,
    operarioInitials: project.operarioInitials,
    progreso: project.progreso,
    photosCount: project.photosCount,
  };
}

export async function getDashboardProjects(): Promise<DashboardProject[]> {
  try {
    const dbUser = await getCurrentDbUser();
    if (!dbUser) return [];

    const projects = await prisma.project.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...(dbUser.role === "OPERARIO" ? { assignedUserId: dbUser.id } : {}),
      },
      include: {
        photos: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return projects.map((project) => ({
      id: project.id,
      cliente: project.cliente,
      direccion: project.direccion,
      estado: project.estado,
      assignedUserId: project.assignedUserId,
      operarioNombre: project.operarioNombre,
      operarioInitials: project.operarioInitials,
      progreso: project.progreso,
      photosCount: project.photos.length,
    }));
  } catch {
    return demoProjects.map(toDashboardProject);
  }
}

export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  try {
    const dbUser = await requireSubscribedUser();
    if (!dbUser) return null;

    const project = await prisma.project.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
        ...(dbUser.role === "OPERARIO" ? { assignedUserId: dbUser.id } : {}),
      },
      include: {
        photos: { orderBy: { createdAt: "desc" } },
        signatures: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!project) return null;

    const photos = await Promise.all(
      project.photos.map(async (photo) => {
        const rawUrl = photo.url?.trim() ?? "";
        if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) {
          return {
            id: photo.id,
            tipo: photo.tipo,
            url: rawUrl,
          };
        }
        const signedUrl = await createSignedStorageUrl({
          bucket: "luxops-assets",
          path: photo.storagePath ?? rawUrl,
        });
        return {
          id: photo.id,
          tipo: photo.tipo,
          url: signedUrl,
        };
      }),
    );
    const signatures = await Promise.all(
      project.signatures.map(async (signature) => {
        const rawUrl = signature.imageDataUrl?.trim() ?? "";
        if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) {
          return {
            id: signature.id,
            imageDataUrl: rawUrl,
            url: rawUrl,
            latitude: signature.latitude,
            longitude: signature.longitude,
          };
        }
        const signedUrl = await createSignedStorageUrl({
          bucket: "luxops-assets",
          path: signature.storagePath ?? rawUrl,
        });
        return {
          id: signature.id,
          imageDataUrl: rawUrl,
          url: signedUrl,
          latitude: signature.latitude,
          longitude: signature.longitude,
        };
      }),
    );

    return {
      id: project.id,
      cliente: project.cliente,
      direccion: project.direccion,
      estado: project.estado,
      assignedUserId: project.assignedUserId,
      operarioNombre: project.operarioNombre,
      operarioInitials: project.operarioInitials,
      progreso: project.progreso,
      cups: project.cups,
      catastralReference: project.catastralReference,
      ownerTaxId: project.ownerTaxId,
      estimatedRevenue: project.estimatedRevenue?.toString() ?? null,
      quoteReference: project.quoteReference ?? null,
      technicalMemory: project.technicalMemory,
      reviewedByOfficeTech: project.reviewedByOfficeTech,
      rebtCompanyNumber: project.rebtCompanyNumber,
      dossierReference: project.dossierReference,
      equipmentInverterSerial: project.equipmentInverterSerial,
      equipmentBatterySerial: project.equipmentBatterySerial,
      equipmentVatimetroSerial: project.equipmentVatimetroSerial,
      assetPanelBrand: project.assetPanelBrand,
      assetPanelModel: project.assetPanelModel,
      assetPanelSerial: project.assetPanelSerial,
      assetInverterBrand: project.assetInverterBrand,
      assetInverterModel: project.assetInverterModel,
      assetBatteryBrand: project.assetBatteryBrand,
      assetBatteryModel: project.assetBatteryModel,
      peakPowerKwp: project.peakPowerKwp?.toString() ?? null,
      inverterPowerKwn: project.inverterPowerKwn?.toString() ?? null,
      storageCapacityKwh: project.storageCapacityKwh?.toString() ?? null,
      photosCount: project.photos.length,
      photos,
      signatures,
    };
  } catch {
    return demoProjects.find((project) => project.id === id) ?? null;
  }
}
