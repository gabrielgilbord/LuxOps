"use client";

import { useActionState } from "react";
import { completeOperarioInviteAction } from "@/app/actions/projects";
import { PasswordInput } from "@/components/ui/password-input";

type Props = {
  token?: string;
  inviteId?: string;
  defaultName: string;
};

const initialState: { error?: string; ok?: boolean } = {};

export function CompleteInviteForm({ token, inviteId, defaultName }: Props) {
  const [state, formAction, pending] = useActionState<any, FormData>(
    async (
      _prevState: { error?: string; ok?: boolean } | undefined,
      formData: FormData,
    ) => completeOperarioInviteAction(undefined, formData),
    initialState,
  );

  return (
    <form action={formAction} className="mt-5 grid gap-3">
      <input type="hidden" name="token" value={token ?? ""} />
      <input type="hidden" name="inviteId" value={inviteId ?? ""} />
      <input
        name="fullName"
        defaultValue={defaultName}
        placeholder="Nombre completo"
        className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-yellow-300/70"
      />
      <PasswordInput
        name="password"
        required
        minLength={8}
        placeholder="Crea una contraseña (mínimo 8 caracteres)"
        variant="dark"
        autoComplete="new-password"
      />
      <PasswordInput
        name="passwordConfirm"
        required
        minLength={8}
        placeholder="Repite la contraseña"
        variant="dark"
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-yellow-950 hover:bg-yellow-300 disabled:opacity-60"
      >
        {pending ? "Activando..." : "Completar alta"}
      </button>
      {state?.error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
