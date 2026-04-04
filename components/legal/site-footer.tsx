import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-slate-50/90 py-6 pb-24 text-center text-xs text-slate-600 sm:pb-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-2 px-4 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
        <span className="font-medium text-slate-500">LuxOps</span>
        <Link href="/aviso-legal" className="hover:text-slate-900 hover:underline">
          Aviso legal
        </Link>
        <Link href="/privacidad" className="hover:text-slate-900 hover:underline">
          Privacidad
        </Link>
        <Link href="/cookies" className="hover:text-slate-900 hover:underline">
          Cookies
        </Link>
        <Link href="/terminos" className="hover:text-slate-900 hover:underline">
          Términos
        </Link>
        <Link href="/blog" className="hover:text-slate-900 hover:underline">
          Blog
        </Link>
      </div>
    </footer>
  );
}
