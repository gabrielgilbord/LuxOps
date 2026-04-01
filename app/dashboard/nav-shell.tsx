"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  CircleUserRound,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

type Props = {
  organizationName: string;
  userLabel: string;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Panel de Control", icon: LayoutDashboard },
  { href: "/dashboard/team", label: "Equipo", icon: Users },
  { href: "/dashboard/reports", label: "Informes", icon: FileText },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
] as const;

export function DashboardNavShell({ organizationName, userLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      window.addEventListener("mousedown", onClickOutside);
    }
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [profileOpen]);

  return (
    <>
      <div className="hidden items-center gap-4 sm:flex">
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-3 py-2 text-sm tracking-tight transition ${
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:bg-slate-900/80 hover:text-slate-300"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {isActive ? (
                  <motion.span
                    layoutId="nav-active-tab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-yellow-400 shadow-[0_-4px_10px_rgba(251,191,36,0.4)]"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live System
        </div>

        <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200">
          {organizationName}
        </span>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="rounded-full border border-slate-700 bg-slate-900/80 p-1.5 hover:border-slate-600"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-yellow-200">
                {userLabel.slice(0, 2).toUpperCase()}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </span>
          </button>
          <AnimatePresence>
            {profileOpen ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl"
              >
                <div className="absolute inset-0 -z-10 rounded-xl bg-slate-900/60 backdrop-blur-xl" />
                <Link href="/profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">
                  <CircleUserRound className="h-4 w-4" />
                  Mi Perfil
                </Link>
                <Link href="/dashboard/settings?tab=subscription" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">
                  <ShieldCheck className="h-4 w-4" />
                  Suscripción
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
                  >
                    Cerrar Sesión
                  </button>
                </form>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200 sm:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="fixed inset-0 z-40 bg-black/60 sm:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 z-50 h-full w-72 border-l border-slate-700 bg-slate-900 p-4 shadow-2xl sm:hidden"
          >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Menú</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-slate-700 p-1 text-slate-200"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-1">
          <p className="mb-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            Organización: <span className="font-semibold text-slate-100">{organizationName}</span>
          </p>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Mi Perfil
          </Link>
          <Link
            href="/dashboard/settings?tab=subscription"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Suscripción
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-2 w-full rounded-md border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
            >
              Salir
            </button>
          </form>
        </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
