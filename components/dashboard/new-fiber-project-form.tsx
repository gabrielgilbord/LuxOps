"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Cable } from "lucide-react";
import {
  createFiberProjectAction,
  type CreateProjectFormState,
} from "@/app/actions/projects";

type OperarioOption = { id: string; name: string | null; email: string };

export function NewFiberProjectForm({ operarios }: { operarios: OperarioOption[] }) {
  const [state, formAction, isPending] = useActionState(
    createFiberProjectAction,
    null as CreateProjectFormState,
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
      <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/15 px-3 py-1 text-xs font-bold text-cyan-200">
        <Cable className="h-4 w-4" />
        Nueva instalación de fibra
      </p>
      <h1 className="mt-3 text-2xl font-bold">Crear obra de fibra óptica</h1>
      <p className="mt-2 text-sm text-slate-300">
        Alta simplificada para FTTH/FTTB. Asigna el técnico que ejecutará la instalación en campo.
      </p>

      <form action={formAction} className="mt-6 grid gap-3">
        {state?.error ? (
          <p className="rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100" role="alert">
            {state.error}
          </p>
        ) : null}
        <input
          name="cliente"
          required
          placeholder="Cliente / titular *"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70"
        />
        <input
          name="direccion"
          required
          placeholder="Dirección de instalación *"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70"
        />
        <input
          name="serviceContractId"
          placeholder="Nº contrato / línea (opcional)"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70"
        />
        <select
          name="fiberInstallationType"
          defaultValue="FTTH"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70"
        >
          <option value="FTTH">FTTH — fibra hasta el hogar</option>
          <option value="FTTB">FTTB — fibra hasta el edificio</option>
          <option value="FTTO">FTTO — fibra hasta la oficina</option>
        </select>
        <input
          name="ownerTaxId"
          placeholder="DNI / NIE / CIF del titular (opcional)"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70"
        />
        <input
          name="clienteNotificacionEmail"
          type="email"
          placeholder="Email del cliente (opcional)"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70"
        />
        <input
          name="estimatedRevenue"
          inputMode="decimal"
          placeholder="Importe de la instalación (€) · opcional"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70"
        />
        <select
          name="assignedUserId"
          required
          defaultValue=""
          disabled={operarios.length === 0}
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70 disabled:opacity-50"
        >
          <option value="" disabled>
            {operarios.length === 0 ? "Primero invita técnicos en Equipo" : "Selecciona un técnico"}
          </option>
          {operarios.map((operario) => (
            <option key={operario.id} value={operario.id}>
              {operario.name || operario.email} ({operario.email})
            </option>
          ))}
        </select>
        {operarios.length === 0 ? (
          <p className="text-xs text-cyan-200">
            No hay técnicos activos. Ve a{" "}
            <Link href="/dashboard/team" className="underline">
              Equipo
            </Link>{" "}
            para invitarlos.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={operarios.length === 0 || isPending}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-bold text-cyan-950 shadow-lg shadow-cyan-400/20 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Guardando…" : "Guardar obra"}
        </button>
      </form>
    </section>
  );
}
