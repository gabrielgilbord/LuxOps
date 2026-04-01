import { PrismaClient } from "@prisma/client";

/**
 * Un solo cliente Prisma por proceso Node (crítico en `next dev` por HMR).
 *
 * Supabase "Session mode" tiene muy pocas conexiones: en Dashboard → Database
 * usa la connection string del pooler en modo **Transaction** (puerto 6543) como
 * `DATABASE_URL` y añade `?pgbouncer=true`. Deja el host directo (5432) en `DIRECT_URL`
 * solo para migraciones (`prisma migrate`).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

