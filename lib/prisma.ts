import { PrismaClient } from "@prisma/client";

/**
 * Cliente con todos los modelos. No uses `InstanceType<typeof PrismaClient>`: en TS suele
 * colapsar a un genérico sin `organization` en el language service.
 */
export type AppPrismaClient = PrismaClient;

/**
 * Un solo cliente Prisma por proceso Node (crítico en `next dev` por HMR).
 *
 * Supabase "Session mode": pooler **Transaction** (6543) como `DATABASE_URL` + `?pgbouncer=true`;
 * `DIRECT_URL` en 5432 solo para migraciones.
 *
 * No uses `new PrismaClient({ log: [...] })`: en Prisma 6 puede inferir un tipo sin delegados de modelo.
 */
const globalForPrisma = globalThis as unknown as { prisma?: AppPrismaClient };

export const prisma: AppPrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = new PrismaClient() as AppPrismaClient);
