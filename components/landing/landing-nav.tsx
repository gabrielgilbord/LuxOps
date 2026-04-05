"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

function LuxOpsLogo() {
  return <BrandLogo darkBackground className="h-9 w-auto sm:h-10" />;
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const linkClass =
    "rounded-lg px-3 py-2 text-sm font-medium text-yellow-300 transition hover:bg-yellow-400/15 hover:text-yellow-200";
  const mobileLinkClass =
    "rounded-xl px-4 py-3 text-base font-medium text-slate-200 transition hover:bg-white/10 hover:text-yellow-200";

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/15 bg-slate-900/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:h-[4.5rem] sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" onClick={() => setMenuOpen(false)}>
          <LuxOpsLogo />
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex md:gap-2"
          aria-label="Principal"
        >
          <Link href="/#precios" className={linkClass}>
            Precios
          </Link>
          <Link href="/blog" className={linkClass}>
            Blog
          </Link>
          <Link href="/login" className={linkClass}>
            Login
          </Link>
          <Link
            href="/register"
            className="ml-1 rounded-lg border border-yellow-300/60 bg-yellow-400 px-4 py-2 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/20 transition hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            Comenzar ahora
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-yellow-200 transition hover:border-yellow-300/40 hover:bg-yellow-400/10 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] md:hidden"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="landing-mobile-menu"
            className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l border-white/10 bg-[#0B0E14] shadow-2xl shadow-black/50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="text-sm font-semibold text-yellow-200">Menú</span>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-5" aria-label="Móvil">
              <Link
                href="/#precios"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Precios
              </Link>
              <Link
                href="/blog"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/login"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-yellow-400 px-4 py-3.5 text-center text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/25"
                onClick={() => setMenuOpen(false)}
              >
                Comenzar ahora
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
