import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { CompleteInviteForm } from "@/app/invite/complete/complete-invite-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function CompleteInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  const safeToken = token?.trim() ?? "";
  const tokenHash = safeToken
    ? crypto.createHash("sha256").update(safeToken).digest("hex")
    : "";

  const inviteByToken = tokenHash
    ? await prisma.operatorInvite.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          expiresAt: true,
        },
      })
    : null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inviteBySessionEmail =
    !inviteByToken && user?.email
      ? await prisma.operatorInvite.findFirst({
          where: {
            email: user.email.toLowerCase(),
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            expiresAt: true,
          },
        })
      : null;

  const invite = inviteByToken ?? inviteBySessionEmail;

  const isValidInvite =
    !!invite && invite.status === "PENDING" && invite.expiresAt > new Date();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h1 className="text-2xl font-bold">Activar cuenta de operario</h1>
        {!isValidInvite ? (
          <p className="mt-3 text-sm text-red-300">
            Esta invitación no es válida o ha expirado. Solicita una nueva al administrador.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-300">
              Invitación para <span className="font-semibold">{invite.email}</span>.
            </p>
            <p className="text-xs text-slate-400">
              Si llegaste desde el email de Supabase, ya estás autenticado y puedes activar tu acceso.
            </p>
            <CompleteInviteForm
              token={safeToken || undefined}
              inviteId={invite.id}
              defaultName={invite.name}
            />
          </>
        )}
      </div>
    </main>
  );
}
