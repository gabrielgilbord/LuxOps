import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.local", override: true });
dotenv.config();

type DeleteManyDelegate = { deleteMany: () => Promise<unknown> };
type OrganizationDelegate = { create: (args: { data: { name: string } }) => Promise<{ id: string }> };
type ProjectCreateArgs = {
  data: {
    cliente: string;
    direccion: string;
    estado: EstadoProyecto;
    progreso: number;
    operarioNombre: string;
    operarioInitials: string;
    organizationId: string;
    photos: { create: { url: string; tipo: TipoFoto }[] };
  };
};
type ProjectDelegate = { create: (args: ProjectCreateArgs) => Promise<unknown> };
type PrismaSeedClient = PrismaClient & {
  photo: DeleteManyDelegate;
  user: DeleteManyDelegate;
  project: DeleteManyDelegate & ProjectDelegate;
  organization: DeleteManyDelegate & OrganizationDelegate;
};

const prisma = new PrismaClient() as unknown as PrismaSeedClient;

type EstadoProyecto =
  | "PRESUPUESTO"
  | "PENDIENTE_MATERIAL"
  | "EN_INSTALACION"
  | "FINALIZADO"
  | "SUBVENCION_TRAMITADA";

type TipoFoto = "ANTES" | "DURANTE" | "DESPUES";

async function main() {
  await prisma.photo.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({
    data: { name: "LuxOps Demo Energy" },
  });

  const projects = [
    {
      cliente: "Instalacion Familia Garcia - Madrid",
      direccion: "Calle Alcala 154, Madrid",
      estado: "EN_INSTALACION" as EstadoProyecto,
      progreso: 65,
      operarioNombre: "Carlos Ortega",
      operarioInitials: "CO",
      photos: [
        { url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=80", tipo: "ANTES" as TipoFoto },
        { url: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1600&q=80", tipo: "DURANTE" as TipoFoto },
      ],
    },
    {
      cliente: "Planta Solar Empresa XYZ - Valencia",
      direccion: "Av. del Puerto 22, Valencia",
      estado: "PENDIENTE_MATERIAL" as EstadoProyecto,
      progreso: 25,
      operarioNombre: "Alicia Moreno",
      operarioInitials: "AM",
      photos: [{ url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1600&q=80", tipo: "ANTES" as TipoFoto }],
    },
    {
      cliente: "Cubierta Nave Indusol - Bilbao",
      direccion: "Poligono Iberia 9, Bilbao",
      estado: "FINALIZADO" as EstadoProyecto,
      progreso: 100,
      operarioNombre: "Javier Romero",
      operarioInitials: "JR",
      photos: [
        { url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=80", tipo: "ANTES" as TipoFoto },
        { url: "https://images.unsplash.com/photo-1438109491414-7198515b166b?auto=format&fit=crop&w=1600&q=80", tipo: "DESPUES" as TipoFoto },
      ],
    },
    {
      cliente: "Instalacion Comunidad SolMar - Malaga",
      direccion: "Calle Pacifico 47, Malaga",
      estado: "SUBVENCION_TRAMITADA" as EstadoProyecto,
      progreso: 100,
      operarioNombre: "Lucia Martin",
      operarioInitials: "LM",
      photos: [{ url: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1600&q=80", tipo: "DESPUES" as TipoFoto }],
    },
    {
      cliente: "Proyecto Residencial Los Olivos - Sevilla",
      direccion: "Calle Feria 31, Sevilla",
      estado: "PRESUPUESTO" as EstadoProyecto,
      progreso: 10,
      operarioNombre: "Sin asignar",
      operarioInitials: "--",
      photos: [],
    },
  ];

  const demoLegal = (idx: number) => ({
    cups: `ES0021${String(10000000000000 + idx).padStart(14, "0")}AB`,
    catastralReference: `${String(98765432 + idx)}NH8765N0001YZ`.slice(0, 22),
    ownerTaxId: idx % 2 === 0 ? `B${String(10000000 + idx).slice(0, 8)}` : `1234567${String.fromCharCode(65 + (idx % 6))}`,
  });

  let idx = 0;
  for (const project of projects) {
    const legal = demoLegal(idx);
    idx += 1;
    await prisma.project.create({
      data: {
        cliente: project.cliente,
        direccion: project.direccion,
        cups: legal.cups,
        catastralReference: legal.catastralReference,
        ownerTaxId: legal.ownerTaxId,
        estado: project.estado,
        progreso: project.progreso,
        operarioNombre: project.operarioNombre,
        operarioInitials: project.operarioInitials,
        organizationId: organization.id,
        photos: {
          create: project.photos,
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
