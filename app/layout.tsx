import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { LuxOpsJsonLd } from "@/components/seo/luxops-json-ld";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { SiteFooter } from "@/components/legal/site-footer";
import { getPublicAppUrl } from "@/lib/public-app-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "LuxOps | El CRM nº1 para Instaladores de Placas Solares";
const SITE_DESCRIPTION =
  "Gestiona tus instalaciones fotovoltaicas, clientes y presupuestos con el CRM más rápido del sector solar. Optimiza tu oficina técnica hoy.";

const siteUrl = getPublicAppUrl().replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: {
    default: SITE_TITLE,
    template: "%s | LuxOps",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "CRM placas solares",
    "software fotovoltaica",
    "gestión instalaciones solares",
    "LuxOps",
    "energía solar España",
  ],
  authors: [{ name: "LuxOps" }],
  creator: "LuxOps",
  publisher: "LuxOps",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/luxops-logo.svg", type: "image/svg+xml" }],
    shortcut: "/luxops-logo.svg",
    apple: "/luxops-logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "LuxOps",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/luxops-logo.svg",
        width: 512,
        height: 512,
        alt: "LuxOps — CRM para instaladores solares",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/luxops-logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <LuxOpsJsonLd />
        <div className="flex min-h-full flex-1 flex-col">{children}</div>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
