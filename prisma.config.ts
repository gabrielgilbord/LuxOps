import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI does not auto-load .env.local in this setup.
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

/** Si existe, Prisma migrate usa esta URL (p. ej. Postgres directo con IPv4 en Supabase) en lugar de DIRECT_URL. */
const migrateDirectUrl =
  process.env["MIGRATE_DATABASE_URL"] ?? process.env["DIRECT_URL"] ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
    directUrl: migrateDirectUrl,
  },
});
