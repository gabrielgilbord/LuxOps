"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Mail } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-2.5 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/30 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
      {pending ? "Procesando..." : "Entrar"}
    </button>
  );
}

type LoginFormProps = {
  showEmailVerificationNotice?: boolean;
  showAuthError?: boolean;
};

export function LoginForm({
  showEmailVerificationNotice = false,
  showAuthError = false,
}: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {showEmailVerificationNotice ? (
        <p
          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
          role="status"
        >
          Revisa tu correo (incluida la carpeta de spam) y abre el enlace para confirmar la cuenta.
          Después podrás entrar aquí con tu email y contraseña.
        </p>
      ) : null}
      {showAuthError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          El enlace de acceso no es válido o ha caducado. Vuelve a intentarlo desde el correo o
          entra con tu contraseña.
        </p>
      ) : null}
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
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

      <LoginSubmitButton />

      <p className="mt-4 text-sm text-slate-600">
        ¿Pagaste y no terminaste el alta?{" "}
        <Link href="/recuperar-acceso" className="font-medium text-amber-900 underline">
          Recuperar acceso
        </Link>
      </p>
      <p className="mt-2 text-sm text-slate-600">
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
    </form>
  );
}
