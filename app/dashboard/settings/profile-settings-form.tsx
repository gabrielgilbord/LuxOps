"use client";

import { useActionState } from "react";
import { updateAdminProfileAction, updatePasswordAction } from "@/app/actions/account";

const profileInitialState = {} as { ok?: boolean; error?: string };
const passwordInitialState = {} as { ok?: boolean; error?: string };

export function ProfileSettingsForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState<any, FormData>(
    async (_prevState: { ok?: boolean; error?: string }, formData: FormData) =>
      updateAdminProfileAction(formData),
    profileInitialState,
  );
  const [passState, passAction, passPending] = useActionState<any, FormData>(
    async (_prevState: { ok?: boolean; error?: string }, formData: FormData) =>
      updatePasswordAction(formData),
    passwordInitialState,
  );

  return (
    <div className="grid gap-4">
      <form action={profileAction} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-sm font-semibold text-slate-200">Datos personales</p>
        <input
          value={email}
          disabled
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-400"
        />
        <input
          name="name"
          defaultValue={defaultName}
          placeholder="Nombre visible"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-yellow-300/70"
        />
        <button
          type="submit"
          disabled={profilePending}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300 disabled:opacity-60"
        >
          {profilePending ? "Guardando..." : "Guardar perfil"}
        </button>
        {profileState.ok ? <p className="text-xs text-emerald-300">Perfil actualizado.</p> : null}
      </form>

      <form action={passAction} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-sm font-semibold text-slate-200">Seguridad</p>
        <input
          name="nextPassword"
          type="password"
          minLength={8}
          required
          placeholder="Nueva contraseña (mínimo 8)"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-yellow-300/70"
        />
        <button
          type="submit"
          disabled={passPending}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {passPending ? "Actualizando..." : "Cambiar contraseña"}
        </button>
        {passState.error ? <p className="text-xs text-red-300">{passState.error}</p> : null}
        {passState.ok ? <p className="text-xs text-emerald-300">Contraseña actualizada.</p> : null}
      </form>
    </div>
  );
}
