"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

function LuxOpsLogo() {
  return <BrandLogo darkBackground className="h-12 w-auto" />;
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
        <div className="relative z-10">
          <LuxOpsLogo />
        </div>
        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <h2 className="text-5xl font-bold leading-tight text-white">
            Donde la energia solar se encuentra con la precision operativa
          </h2>
          <p className="mt-4 text-sm text-slate-200/85">
            Accede al entorno de trabajo de LuxOps y coordina oficina, instaladores y
            subvenciones desde una unica plataforma.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-100/60 px-4 py-10">
        <div className="animate-fade-in-up w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10">
          <h1 className="text-2xl font-bold text-slate-950">Entrar a LuxOps</h1>
          <p className="mt-1 text-sm text-slate-600">
            Accede a tu panel de control operativo.
          </p>

          <form
            action={async (fd) => {
              await loginAction(fd);
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="pl-9 focus-visible:ring-2 focus-visible:ring-yellow-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <PasswordInput
                id="password"
                name="password"
                required
                variant="light"
                autoComplete="current-password"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 accent-yellow-400" />
              Recuérdame
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-2.5 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/30 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300"
            >
              Entrar
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Aun no tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-slate-900 underline">
              Crear cuenta
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-slate-500">
            <Link href="/support" className="underline underline-offset-2">
              ¿Necesitas ayuda? Contacta con soporte técnico
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
