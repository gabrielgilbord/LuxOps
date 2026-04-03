"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/authz";
import { createSignedStorageUrl, uploadDataUrlToStorage } from "@/lib/storage";
import { getStripe } from "@/lib/stripe";

export async function updateCompanySettingsAction(
  _prevState: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const admin = await requireAdminUser();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const taxId = String(formData.get("taxId") ?? "").trim();
  const taxAddress = String(formData.get("taxAddress") ?? "").trim();
  const rebtCompanyNumber = String(formData.get("rebtCompanyNumber") ?? "").trim();
  if (!rebtCompanyNumber || rebtCompanyNumber.length < 4) {
    return {
      ok: false,
      error: "El Nº de empresa instaladora autorizada (REBT) es obligatorio (mínimo 4 caracteres).",
    };
  }
  const logoDataUrl = String(formData.get("logoDataUrl") ?? "").trim();
  const brandColorInput = String(formData.get("brandColor") ?? "").trim();
  const brandColor =
    /^#[0-9a-fA-F]{6}$/.test(brandColorInput) ? brandColorInput.toUpperCase() : "#1F2937";
  const current = await prisma.organization.findUnique({
    where: { id: admin.organizationId },
    select: { logoPath: true, logoUrl: true },
  });
  let logoPath = current?.logoPath ?? undefined;
  let logoUrl: string | undefined;

  if (logoDataUrl?.startsWith("data:image/")) {
    const upload = await uploadDataUrlToStorage({
      bucket: "luxops-assets",
      path: `organizations/${admin.organizationId}/logo-${Date.now()}`,
      dataUrl: logoDataUrl,
    });
    logoPath = upload.path;
    logoUrl = await createSignedStorageUrl({
      bucket: "luxops-assets",
      path: upload.path,
      expiresIn: 60 * 60 * 24 * 7,
    });
  } else if (logoDataUrl) {
    logoUrl = logoDataUrl;
  }

  await prisma.organization.update({
    where: { id: admin.organizationId },
    data: {
      ...(companyName ? { name: companyName } : {}),
      ...(logoPath ? { logoPath } : {}),
      ...(logoUrl ? { logoUrl } : {}),
      taxAddress: taxAddress || null,
      brandColor,
      rebtCompanyNumber,
    },
  });

  const stripeCustomerId = await prisma.organization.findUnique({
    where: { id: admin.organizationId },
    select: { stripeCustomerId: true },
  });
  if (stripeCustomerId?.stripeCustomerId) {
    try {
      const stripe = getStripe();
      await stripe.customers.update(stripeCustomerId.stripeCustomerId, {
        ...(companyName ? { name: companyName } : {}),
        ...(taxAddress
          ? {
              address: {
                line1: taxAddress.slice(0, 120),
              },
            }
          : {}),
        metadata: {
          tax_id: taxId || "",
          tax_address: taxAddress || "",
        },
      });
    } catch (error) {
      console.error("No se pudo sincronizar customer de Stripe", error);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/company-settings");
  return { ok: true, error: undefined };
}
