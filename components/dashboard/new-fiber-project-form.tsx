"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Cable } from "lucide-react";
import {
  createFiberProjectAction,
  type CreateProjectFormState,
} from "@/app/actions/projects";
import { FIBER_OPERATORS } from "@/lib/fiber-operators";

type OperarioOption = { id: string; name: string | null; email: string };

const inputClass =
  "h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20";

export function NewFiberProjectForm({ operarios }: { operarios: OperarioOption[] }) {
  const [state, formAction, isPending] = useActionState(
    createFiberProjectAction,
    null as CreateProjectFormState,
  );

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
      <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/15 px-3 py-1 text-xs font-bold text-cyan-200">
        <Cable className="h-4 w-4" />
        FibOps · Nueva instalación
      </p>
      <h1 className="mt-3 text-2xl font-bold">Alta de obra FTTH</h1>
      <p className="mt-2 text-sm text-slate-300">
        Datos del cliente, pedido del operador y ubicación. El técnico completará ONT y mediciones en
        campo.
      </p>

      <form action={formAction} className="mt-6 grid gap-3 sm:grid-cols-2">
        {state?.error ? (
          <p
            className="sm:col-span-2 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <input name="cliente" required placeholder="Cliente / titular *" className={`${inputClass} sm:col-span-2`} />
        <input name="clientPhone" required type="tel" placeholder="Teléfono cliente *" className={inputClass} />
        <input name="ownerTaxId" placeholder="DNI / NIE / CIF (opcional)" className={inputClass} />

        <input name="direccion" required placeholder="Dirección completa *" className={`${inputClass} sm:col-span-2`} />
        <input name="installFloorDoor" required placeholder="Piso / puerta / escalera *" className={inputClass} />
        <select name="fiberInstallationType" defaultValue="FTTH" className={inputClass}>
          <option value="FTTH">FTTH — hasta el hogar</option>
          <option value="FTTB">FTTB — hasta el edificio</option>
          <option value="FTTO">FTTO — hasta la oficina</option>
        </select>

        <select name="fiberOperator" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Operador *
          </option>
          {FIBER_OPERATORS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
        <input name="fiberOrderReference" placeholder="Nº pedido operador" className={inputClass} />
        <input name="serviceContractId" placeholder="Nº línea / contrato" className={inputClass} />
        <input name="fiberCtoReference" placeholder="Referencia CTO / NAP" className={inputClass} />

        <input
          name="clienteNotificacionEmail"
          type="email"
          placeholder="Email cliente (opcional)"
          className={inputClass}
        />
        <input
          name="estimatedRevenue"
          inputMode="decimal"
          placeholder="Importe instalación (€)"
          className={inputClass}
        />

        <select
          name="assignedUserId"
          required
          defaultValue=""
          disabled={operarios.length === 0}
          className={`${inputClass} sm:col-span-2 disabled:opacity-50`}
        >
          <option value="" disabled>
            {operarios.length === 0 ? "Invita técnicos en Equipo" : "Técnico asignado *"}
          </option>
          {operarios.map((operario) => (
            <option key={operario.id} value={operario.id}>
              {operario.name || operario.email} ({operario.email})
            </option>
          ))}
        </select>

        {operarios.length === 0 ? (
          <p className="text-xs text-cyan-200 sm:col-span-2">
            No hay técnicos. Ve a{" "}
            <Link href="/dashboard/team" className="underline">
              Equipo
            </Link>
            .
          </p>
        ) : null}

        <button
          type="submit"
          disabled={operarios.length === 0 || isPending}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-bold text-cyan-950 shadow-lg shadow-cyan-400/20 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2"
        >
          {isPending ? "Guardando…" : "Crear obra FibOps"}
        </button>
      </form>
    </section>
  );
}
