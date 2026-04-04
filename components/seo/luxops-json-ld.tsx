import { getPublicAppUrl } from "@/lib/public-app-url";

const DESCRIPTION =
  "Gestiona tus instalaciones fotovoltaicas, clientes y presupuestos con el CRM más rápido del sector solar. Optimiza tu oficina técnica hoy.";

/** Schema.org SoftwareApplication (JSON-LD) para rich results en Google. */
export function LuxOpsJsonLd() {
  const base = getPublicAppUrl().replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LuxOps",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Any modern browser.",
    description: DESCRIPTION,
    url: `${base}/`,
    inLanguage: "es-ES",
    offers: {
      "@type": "Offer",
      price: "150",
      priceCurrency: "EUR",
      priceValidUntil: "2035-12-31",
      availability: "https://schema.org/InStock",
      url: `${base}/register`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
