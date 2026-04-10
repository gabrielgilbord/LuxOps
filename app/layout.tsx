import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { LuxOpsJsonLd } from "@/components/seo/luxops-json-ld";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { SiteFooter } from "@/components/legal/site-footer";
import { getCanonicalSiteUrlForIndexing } from "@/lib/public-app-url";
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

/** Misma base que sitemap/robots para URLs absolutas en metadatos (Search Console). */
const siteUrl = getCanonicalSiteUrlForIndexing().replace(/\/$/, "");

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
    icon: "/favicon-48x48.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "LuxOps",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
        <div className="flex min-h-screen flex-1 flex-col bg-slate-950">{children}</div>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
