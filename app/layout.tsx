import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { SiteFooter } from "@/components/legal/site-footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LuxOps CRM Solar",
    template: "%s | LuxOps",
  },
  description: "MVP para gestion de instalaciones solares y subvenciones",
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
        <div className="flex min-h-full flex-1 flex-col">{children}</div>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
