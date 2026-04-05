import Link from "next/link";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

const footerLink = "text-sm text-slate-400 transition hover:text-yellow-200";
const colTitle = "text-xs font-bold uppercase tracking-[0.15em] text-yellow-300/90";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0B0E14] pb-28 pt-12 text-slate-300 sm:pb-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="space-y-4">
            <BrandLogo darkBackground className="h-9 w-auto opacity-95" />
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              CRM y operativa para instaladoras solares. Oficina y campo en un solo flujo.
            </p>
          </div>

          <div>
            <p className={colTitle}>Producto</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href="/#precios" className={footerLink}>
                  Precios
                </Link>
              </li>
              <li>
                <Link href="/register" className={footerLink}>
                  Registro
                </Link>
              </li>
              <li>
                <Link href="/login" className={footerLink}>
                  Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className={colTitle}>Legal</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href="/aviso-legal" className={footerLink}>
                  Aviso legal
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className={footerLink}>
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/cookies" className={footerLink}>
                  Cookies
                </Link>
              </li>
              <li>
                <Link href="/terminos" className={footerLink}>
                  Términos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className={colTitle}>Recursos</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href="/blog" className={footerLink}>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/support" className={footerLink}>
                  Soporte
                </Link>
              </li>
              <li>
                <Link href="/recuperar-acceso" className={footerLink}>
                  Recuperar acceso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="text-center text-xs text-slate-500">
            © 2026 LuxOps. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
