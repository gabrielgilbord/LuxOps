"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import {
  createOrganizationManualAction,
  type SuperAdminFormState,
} from "@/app/actions/super-admin";

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState<
    SuperAdminFormState,
    FormData
  >(createOrganizationManualAction, null);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">
        <Building2 className="h-4 w-4" />
        Alta manual de cliente
      </p>
      <h1 className="mt-3 text-2xl font-bold">Nueva instaladora</h1>
      <p className="mt-2 text-sm text-slate-400">
        Crea la organización y el usuario administrador sin pasar por Stripe.
      </p>

      {state?.error ? (
        <p className="mt-4 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3">
        <input
          name="companyName"
          required
          placeholder="Nombre de la empresa *"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-violet-400/70"
        />
        <select
          name="vertical"
          defaultValue="SOLAR"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-violet-400/70"
        >
          <option value="SOLAR">LuxOps — Solar</option>
          <option value="FIBER">FibOps — Fibra óptica</option>
        </select>
        <textarea
          name="taxAddress"
          rows={3}
          placeholder="Dirección fiscal (opcional)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-400/70"
        />

        <hr className="border-slate-800" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Administrador de la cuenta
        </p>
        <input
          name="adminName"
          placeholder="Nombre del administrador"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-violet-400/70"
        />
        <input
          name="adminEmail"
          type="email"
          required
          placeholder="Email del administrador *"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-violet-400/70"
        />
        <input
          name="adminPassword"
          type="password"
          required
          minLength={8}
          placeholder="Contraseña inicial (mín. 8 caracteres) *"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-violet-400/70"
        />

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="markSubscribed"
            defaultChecked
            className="h-4 w-4 accent-violet-500"
          />
          Activar suscripción de inmediato (sin Stripe)
        </label>

        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-500 px-5 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-50"
          >
            {pending ? "Creando…" : "Crear cliente"}
          </button>
          <Link
            href="/super-admin/organizations"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
