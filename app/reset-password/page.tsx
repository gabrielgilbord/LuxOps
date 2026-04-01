"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PasswordInput } from "@/components/ui/password-input";

export default function ResetPasswordPage() {
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
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
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
      setReady(true);
    }

    bootstrapRecoverySession();
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
      setOk("Contraseña actualizada. Ya puedes iniciar sesión.");
      router.push("/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
        <p className="mt-2 text-sm text-slate-300">
          Define una nueva contraseña para tu acceso de operario.
        </p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nueva contraseña (mínimo 8 caracteres)"
            required
            minLength={8}
          />
          <PasswordInput
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="Repite la nueva contraseña"
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={pending || !ready}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300 disabled:opacity-60"
          >
            {pending ? "Guardando..." : !ready ? "Validando enlace..." : "Guardar contraseña"}
          </button>
        </form>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {ok}
          </p>
        ) : null}

        <Link href="/login" className="mt-4 inline-flex text-sm text-yellow-300 underline">
          Volver a login
        </Link>
      </div>
    </main>
  );
}
