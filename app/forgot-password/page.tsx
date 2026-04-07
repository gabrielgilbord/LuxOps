"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail, Loader2 } from "lucide-react";
import { sendPasswordResetEmailAction } from "@/app/actions/auth";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/25 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? "Enviando..." : "Enviar enlace de recuperación"}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(sendPasswordResetEmailAction, undefined);

  return (
    <main className="min-h-screen bg-[#0B0E14] px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo darkBackground className="h-12 w-auto" />
        </div>
        <div className="rounded-2xl border border-[#FBBF24]/30 bg-[#161B22] p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-slate-300">
            Te enviaremos un enlace seguro (correo LuxOps vía Resend) para definir una nueva contraseña.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="h-11 border-white/10 bg-black/30 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-yellow-400"
                />
              </div>
            </div>

            <SubmitButton />
          </form>

          {state?.error ? (
            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? (
            <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Si existe una cuenta con ese correo, recibirás un enlace de recuperación en unos segundos.
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
