import { LandingShell } from "@/components/landing/landing-shell";

/**
 * Misma identidad que la landing: `<Navbar />` (vía `LandingShell`) + fondo oscuro.
 * `<Footer />` es el `SiteFooter` global en `app/layout.tsx` — un solo pie para todo el sitio.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <LandingShell>{children}</LandingShell>;
}
