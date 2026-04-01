"use server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TipoFoto } from "@prisma/client";

async function getScopedOrganizationId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true, organizationId: true, role: true },
  });
}

export async function savePhotoAction(payload: {
  projectId: string;
  tipo: TipoFoto;
  imageDataUrl: string;
  latitude?: number;
  longitude?: number;
}) {
  const dbUser = await getScopedOrganizationId();
  if (!dbUser) throw new Error("No autorizado");

  const project = await prisma.project.findFirst({
    where: {
      id: payload.projectId,
      organizationId: dbUser.organizationId,
      ...(dbUser.role === "OPERARIO" ? { assignedUserId: dbUser.id } : {}),
    },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no permitido");

  await prisma.photo.create({
    data: {
      projectId: payload.projectId,
      tipo: payload.tipo,
      url: payload.imageDataUrl,
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
  });
}

export async function saveChecklistProgressAction(payload: {
  projectId: string;
  progreso: number;
}) {
  const dbUser = await getScopedOrganizationId();
  if (!dbUser) throw new Error("No autorizado");

  const project = await prisma.project.findFirst({
    where: {
      id: payload.projectId,
      organizationId: dbUser.organizationId,
      ...(dbUser.role === "OPERARIO" ? { assignedUserId: dbUser.id } : {}),
    },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no permitido");

  await prisma.project.update({
    where: { id: payload.projectId },
    data: { progreso: payload.progreso },
  });
}
