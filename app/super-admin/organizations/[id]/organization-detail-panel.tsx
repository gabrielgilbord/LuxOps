"use client";

import { useActionState } from "react";
import {
  deleteOrganizationAction,
  updateOrganizationAction,
  type SuperAdminFormState,
} from "@/app/actions/super-admin";
import type { OrganizationVertical } from "@prisma/client";
import { ORGANIZATION_VERTICAL_LABEL } from "@/lib/organization-vertical";

type OrgUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type Props = {
  organization: {
    id: string;
    name: string;
    vertical: OrganizationVertical;
    taxAddress: string | null;
    isSubscribed: boolean;
    subscriptionStatus: string | null;
    rebtCompanyNumber: string | null;
    stripeCustomerId: string | null;
    createdAt: string;
    _count: { users: number; projects: number };
  };
  users: OrgUser[];
};

export function OrganizationDetailPanel({ organization, users }: Props) {
  const [updateState, updateAction, updatePending] = useActionState<
    SuperAdminFormState,
    FormData
  >(updateOrganizationAction, null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        action={updateAction}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
      >
        <h2 className="text-lg font-semibold">Datos de la organización</h2>
        <input type="hidden" name="organizationId" value={organization.id} />

        {updateState?.error ? (
          <p className="mt-3 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
            {updateState.error}
          </p>
        ) : null}
        {updateState?.ok ? (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Cambios guardados.
          </p>
        ) : null}

        <div className="mt-4 grid gap-3">
          <input
            name="companyName"
            defaultValue={organization.name}
            required
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
          />
          <select
            name="vertical"
            defaultValue={organization.vertical}
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
          >
            {(Object.keys(ORGANIZATION_VERTICAL_LABEL) as OrganizationVertical[]).map((v) => (
              <option key={v} value={v}>
                {ORGANIZATION_VERTICAL_LABEL[v]}
              </option>
            ))}
          </select>
          <textarea
            name="taxAddress"
            defaultValue={organization.taxAddress ?? ""}
            rows={3}
            placeholder="Dirección fiscal"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            name="rebtCompanyNumber"
            defaultValue={organization.rebtCompanyNumber ?? ""}
            placeholder="Nº REBT (solo solar)"
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isSubscribed"
              defaultChecked={organization.isSubscribed}
              className="accent-violet-500"
            />
            Suscripción activa
          </label>
          <select
            name="subscriptionStatus"
            defaultValue={organization.subscriptionStatus ?? "active"}
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
          >
            <option value="active">active</option>
            <option value="trialing">trialing</option>
            <option value="manual">manual</option>
            <option value="past_due">past_due</option>
            <option value="canceled">canceled</option>
          </select>
          <button
            type="submit"
            disabled={updatePending}
            className="h-11 rounded-xl bg-violet-500 text-sm font-bold hover:bg-violet-400 disabled:opacity-50"
          >
            {updatePending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Alta</dt>
              <dd>{new Date(organization.createdAt).toLocaleDateString("es-ES")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Usuarios</dt>
              <dd>{organization._count.users}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Obras</dt>
              <dd>{organization._count.projects}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Stripe</dt>
              <dd>{organization.stripeCustomerId ? "Vinculado" : "Alta manual"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">Equipo</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {users.map((u) => (
              <li key={u.id} className="flex justify-between border-b border-slate-800/80 py-2">
                <span>{u.name || u.email}</span>
                <span className="text-slate-500">{u.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <form
          action={deleteOrganizationAction}
          className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6"
        >
          <h2 className="text-lg font-semibold text-red-200">Zona peligrosa</h2>
          <p className="mt-2 text-xs text-red-200/80">
            Elimina la organización, todos sus datos y usuarios de Auth. Escribe el nombre exacto
            para confirmar.
          </p>
          <input type="hidden" name="organizationId" value={organization.id} />
          <input
            name="confirmName"
            placeholder={`Escribe "${organization.name}"`}
            className="mt-3 h-10 w-full rounded-lg border border-red-500/40 bg-slate-950 px-3 text-sm"
          />
          <button
            type="submit"
            className="mt-3 rounded-lg border border-red-500/50 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10"
          >
            Eliminar cliente
          </button>
        </form>
      </div>
    </div>
  );
}
