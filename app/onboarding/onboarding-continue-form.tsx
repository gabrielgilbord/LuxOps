"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, MapPin, Loader2 } from "lucide-react";
import { completeOrganizationOnboardingAction } from "@/app/actions/onboarding-profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  defaultCompanyName: string;
  defaultTaxAddress: string;
  defaultRebt: string;
};

export function OnboardingContinueForm({
  defaultCompanyName,
  defaultTaxAddress,
  defaultRebt,
}: Props) {
  const [state, formAction] = useActionState(completeOrganizationOnboardingAction, undefined);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="cont-company">Nombre de empresa</Label>
        <div className="relative mt-1">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="cont-company"
            name="companyName"
            required
            defaultValue={defaultCompanyName}
            className="pl-9 focus-visible:ring-2 focus-visible:ring-yellow-400"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="cont-tax">Dirección fiscal</Label>
        <div className="relative mt-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="cont-tax"
            name="taxAddress"
            required
            minLength={5}
            defaultValue={defaultTaxAddress}
            placeholder="Calle, número, CP, ciudad"
            className="pl-9 focus-visible:ring-2 focus-visible:ring-yellow-400"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="cont-rebt">Nº empresa instaladora (REBT)</Label>
        <Input
          id="cont-rebt"
          name="rebtCompanyNumber"
          required
          minLength={4}
          defaultValue={defaultRebt}
          className="mt-1 focus-visible:ring-2 focus-visible:ring-yellow-400"
        />
      </div>
      <SubmitRow />
    </form>
  );
}

function SubmitRow() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-2.5 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/30 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-yellow-300 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? "Guardando…" : "Guardar y entrar al panel"}
    </button>
  );
}
