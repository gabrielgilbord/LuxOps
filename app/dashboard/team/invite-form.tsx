"use client";

import { useActionState } from "react";
import { inviteOperarioAction } from "@/app/actions/projects";

type InviteState = {
  ok?: boolean;
  error?: string;
  inviteLink?: string;
};

const initialState: InviteState = {};

export function TeamInviteForm() {
  const [state, formAction, pending] = useActionState(inviteOperarioAction, initialState);

  return (
    <form action={formAction} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-3">
      <input
        name="name"
        required
        placeholder="Nombre operario"
        className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-yellow-300/70"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="email@empresa.com"
        className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-yellow-300/70"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-yellow-400 px-4 text-sm font-bold text-yellow-950 transition hover:bg-yellow-300 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Invitar operario"}
      </button>
      {state.error ? <p className="text-xs text-red-300 sm:col-span-3">{state.error}</p> : null}
      {state.ok ? (
        <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 sm:col-span-3">
          ✅ Invitación enviada correctamente.
        </p>
      ) : null}
      {state.inviteLink ? (
        <p className="text-xs text-slate-300 sm:col-span-3">
          Enlace de invitacion:{" "}
          <a className="text-yellow-300 underline" href={state.inviteLink}>
            {state.inviteLink}
          </a>
        </p>
      ) : null}
    </form>
  );
}
