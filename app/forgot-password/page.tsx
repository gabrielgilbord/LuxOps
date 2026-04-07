"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseAuthResetPasswordUrl } from "@/lib/public-app-url";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>("");
  const [ok, setOk] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setOk("");

    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Introduce un correo válido.");
      return;
    }

    setPending(true);
    try {
      const redirectTo = getSupabaseAuthResetPasswordUrl();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo,
      });
      if (resetErr) {
        setError(resetErr.message || "No se pudo enviar el enlace. Inténtalo de nuevo.");
        return;
      }
      setOk(
        "Si existe una cuenta con ese correo, recibirás un enlace de recuperación en unos segundos.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0E14] px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo darkBackground className="h-12 w-auto" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-slate-300">
            Te enviaremos un enlace seguro para definir una nueva contraseña.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="h-11 border-white/10 bg-black/30 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-yellow-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/25 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300 disabled:pointer-events-none disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {pending ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {ok}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link href="/login" className="font-semibold text-yellow-200 underline underline-offset-2">
              Volver a login
            </Link>
            <Link href="/support" className="text-slate-300 underline underline-offset-2">
              Soporte
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

