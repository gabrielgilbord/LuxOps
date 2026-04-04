"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Mail, Building2, UserRound } from "lucide-react";
import {
  checkRescueEligibility,
  completeRescueRegistration,
  sendRescueMagicLinkAction,
  type RescueEligibilityResult,
} from "@/app/actions/rescue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

type Step =
  | { name: "email" }
  | { name: "existing"; email: string }
  | { name: "register"; email: string; suggestedCompany: string | null }
  | { name: "message"; title: string; body: string; showLogin?: boolean };

export function RescueAccessForm() {
  const [step, setStep] = useState<Step>({ name: "email" });
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  function applyEligibility(result: RescueEligibilityResult) {
    setFormError(null);
    switch (result.kind) {
      case "invalid_email":
        setFormError("Introduce un correo electrónico válido.");
        break;
      case "not_paid":
        setStep({
          name: "message",
          title: "No encontramos un pago activo",
          body: "Con ese correo no aparece una suscripción activa en Stripe. Si aún no has pagado, puedes activar LuxOps desde registro (pasarela segura). Si ya pagaste con otro email, prueba con el que usaste en el checkout.",
          showLogin: true,
        });
        break;
      case "unsubscribed":
        setStep({
          name: "message",
          title: "Cuenta sin suscripción activa",
          body: "Existe una cuenta LuxOps con ese correo, pero la organización no figura como suscrita. Entra al panel o revisa el estado del pago en ajustes. Si necesitas ayuda, contacta con soporte.",
          showLogin: true,
        });
        break;
      case "has_account_subscribed":
        setStep({ name: "existing", email: result.email });
        break;
      case "stripe_paid_no_app_account":
        setCompanyName(result.suggestedCompany ?? "");
        setStep({
          name: "register",
          email: result.email,
          suggestedCompany: result.suggestedCompany,
        });
        break;
      default:
        break;
    }
  }

  async function onCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      const result = await checkRescueEligibility(email);
      applyEligibility(result);
    } finally {
      setPending(false);
    }
  }

  async function onSendMagicLink() {
    if (step.name !== "existing") return;
    setFormError(null);
    setPending(true);
    setMagicSent(false);
    try {
      const res = await sendRescueMagicLinkAction(step.email);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setMagicSent(true);
    } finally {
      setPending(false);
    }
  }

  async function onCompleteRegister(e: React.FormEvent) {
    e.preventDefault();
    if (step.name !== "register") return;
    setFormError(null);
    setPending(true);
    try {
      const res = await completeRescueRegistration(
        step.email,
        password,
        fullName,
        companyName,
      );
      if (res?.error) {
        setFormError(res.error);
      }
    } finally {
      setPending(false);
    }
  }

  if (step.name === "message") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950">{step.title}</h2>
        <p className="text-sm text-slate-600">{step.body}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {step.showLogin ? (
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Ir a Iniciar sesión
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setStep({ name: "email" });
              setMagicSent(false);
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Probar otro correo
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Este flujo no vuelve a cargar el pago de Stripe si ya consta un pago asociado a tu caso;
          en caso contrario el registro normal sigue disponible.
        </p>
      </div>
    );
  }

  if (step.name === "existing") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Ya tienes organización activa en LuxOps con <strong>{step.email}</strong>. Puedes entrar con
          tu contraseña o pedir un enlace mágico al correo (sin pasar por Stripe).
        </p>
        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}
        {magicSent ? (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Revisa tu bandeja (y spam): te hemos enviado un enlace para entrar.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={pending}
            onClick={() => void onSendMagicLink()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar enlace de acceso
          </button>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Ir a Iniciar sesión
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            setStep({ name: "email" });
            setMagicSent(false);
          }}
          className="text-sm text-slate-600 underline"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  if (step.name === "register") {
    return (
      <form onSubmit={onCompleteRegister} className="space-y-4">
        <p className="text-sm text-slate-600">
          Hemos verificado una suscripción activa en Stripe para{" "}
          <strong>{step.email}</strong>. Crea tu contraseña y datos de empresa para activar el panel
          (sin volver a pagar).
        </p>
        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}
        <div>
          <Label htmlFor="rescue-company">Nombre de empresa</Label>
          <div className="relative mt-1">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="rescue-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="pl-9"
              placeholder="Ej. Instalaciones Solares García"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="rescue-name">Tu nombre</Label>
          <div className="relative mt-1">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="rescue-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="rescue-email">Correo</Label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="rescue-email"
              type="email"
              value={step.email}
              readOnly
              className="cursor-not-allowed bg-slate-50 pl-9"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="rescue-password">Contraseña</Label>
          <PasswordInput
            id="rescue-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            variant="light"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 py-2.5 text-sm font-bold text-yellow-950 shadow-lg disabled:opacity-60"
        >
          {pending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creando cuenta…
            </span>
          ) : (
            "Activar mi acceso"
          )}
        </button>
        <button
          type="button"
          onClick={() => setStep({ name: "email" })}
          className="text-sm text-slate-600 underline"
        >
          Volver
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onCheckEmail} className="space-y-4">
      <p className="text-sm text-slate-600">
        Escribe el <strong>mismo correo que usaste en Stripe</strong> al pagar. Comprobamos el pago y
        te guiamos sin pasar otra vez por la pasarela si ya estás al día.
      </p>
      {formError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}
      <div>
        <Label htmlFor="rescue-check-email">Correo electrónico</Label>
        <div className="relative mt-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="rescue-check-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-9"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Comprobando…
          </span>
        ) : (
          "Continuar"
        )}
      </button>
    </form>
  );
}
