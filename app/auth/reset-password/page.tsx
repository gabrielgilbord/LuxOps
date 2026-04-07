"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PasswordInput } from "@/components/ui/password-input";

export default function AuthResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    async function bootstrapRecoverySession() {
      setError("");
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(`No se pudo validar el enlace de recuperación: ${sessionError.message}`);
          setReady(false);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.");
        setReady(false);
        return;
      }

      setReady(true);
    }

    void bootstrapRecoverySession();
  }, [supabase]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOk("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "No se pudo actualizar la contraseña.");
        return;
      }
      setOk("Contraseña actualizada. Redirigiendo a login…");
      window.setTimeout(() => router.push("/login"), 3000);
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
          <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-slate-300">
            Define una nueva contraseña para tu cuenta de LuxOps.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-3">
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nueva contraseña (mínimo 8 caracteres)"
              required
              minLength={8}
              variant="dark"
              autoComplete="new-password"
            />
            <PasswordInput
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="Confirmar contraseña"
              required
              minLength={8}
              variant="dark"
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={pending || !ready}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/25 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300 disabled:pointer-events-none disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {pending ? "Actualizando..." : !ready ? "Validando enlace..." : "Actualizar contraseña"}
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
            <Link href="/forgot-password" className="text-slate-300 underline underline-offset-2">
              Pedir otro enlace
            </Link>
            <Link href="/login" className="font-semibold text-yellow-200 underline underline-offset-2">
              Volver a login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

