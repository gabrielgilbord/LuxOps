"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import {
  createProjectAction,
  type CreateProjectFormState,
} from "@/app/actions/projects";

type OperarioOption = { id: string; name: string | null; email: string };

export function NewProjectForm({ operarios }: { operarios: OperarioOption[] }) {
  const initialState: CreateProjectFormState = null;
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    initialState,
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
      <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300/15 px-3 py-1 text-xs font-bold text-yellow-200">
        <FolderPlus className="h-4 w-4" />
        Nuevo Proyecto
      </p>
      <h1 className="mt-3 text-2xl font-bold">Crear nueva instalación</h1>
      <p className="mt-2 text-sm text-slate-300">
        Crea un proyecto real y asigna el operario que lo ejecutará en Modo Tejado.
      </p>

      <form action={formAction} className="mt-6 grid gap-3">
        {state?.error ? (
          <p
            className="rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
        <input
          name="cliente"
          required
          placeholder="Cliente"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30"
        />
        <input
          name="direccion"
          required
          placeholder="Dirección"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30"
        />
        <input
          name="cups"
          required
          maxLength={22}
          minLength={20}
          placeholder="CUPS (20-22 caracteres, ej. ES002100000123456789AB)"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30"
        />
        <input
          name="catastralReference"
          required
          placeholder="Referencia catastral del inmueble"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30"
        />
        <input
          name="ownerTaxId"
          required
          placeholder="DNI / NIE / CIF del titular del suministro"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30"
        />
        <input
          name="clienteNotificacionEmail"
          type="email"
          placeholder="Email del cliente (opcional) · recibe copia al cerrar obra"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30"
        />
        <input
          name="estimatedRevenue"
          inputMode="decimal"
          placeholder="Importe de la instalación (€) · opcional"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30"
        />
        <select
          name="assignedUserId"
          required
          defaultValue=""
          disabled={operarios.length === 0}
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-300/30 disabled:opacity-50"
        >
          <option value="" disabled>
            {operarios.length === 0 ? "Primero invita operarios en Equipo" : "Selecciona un operario"}
          </option>
          {operarios.map((operario) => (
            <option key={operario.id} value={operario.id}>
              {operario.name || operario.email} ({operario.email})
            </option>
          ))}
        </select>
        {operarios.length === 0 ? (
          <p className="text-xs text-yellow-200">
            No hay operarios activos. Ve a{" "}
            <Link href="/dashboard/team" className="underline">
              Equipo
            </Link>{" "}
            para invitarlos.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={operarios.length === 0 || isPending}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/20 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Guardando…" : "Guardar proyecto"}
        </button>
      </form>
    </section>
  );
}
