import crypto from "node:crypto";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { createSupabaseAdminClient } from "../lib/supabase/admin";

dotenv.config({ path: ".env.local", override: true });
dotenv.config();

const companyName = "FibraDemo Instalaciones S.L.";
const adminName = "Admin Fibra Demo";
const adminEmail = "fibra.demo@yopmail.com";
const taxAddress = "Calle Demo Fibra 1, Las Palmas";
const password = `LuxOps-Fibra-${crypto.randomBytes(4).toString("hex")}!`;

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.error("EMAIL_EXISTS");
    process.exit(1);
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: authCreate, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: adminName },
  });

  if (createErr || !authCreate.user) {
    console.error("AUTH_ERROR", createErr?.message);
    process.exit(1);
  }

  const authUserId = authCreate.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: companyName,
          vertical: "FIBER",
          taxAddress,
          isSubscribed: true,
          subscriptionStatus: "active",
          planPriceCents: 15000,
        },
      });

      const user = await tx.user.create({
        data: {
          supabaseUserId: authUserId,
          email: adminEmail,
          name: adminName,
          role: "ADMIN",
          organizationId: organization.id,
        },
      });

      return { organization, user };
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          company: result.organization.name,
          vertical: result.organization.vertical,
          organizationId: result.organization.id,
          email: adminEmail,
          password,
          loginUrl: "/login",
          dashboardUrl: "/dashboard",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    console.error("DB_ERROR", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
