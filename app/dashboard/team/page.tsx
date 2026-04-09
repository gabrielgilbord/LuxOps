import Link from "next/link";
import { MailPlus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminUserForDashboard } from "@/lib/authz";
import { TeamInviteForm } from "@/app/dashboard/team/invite-form";
import {
  resendOperarioInviteAction,
  sendOperarioPasswordResetAction,
} from "@/app/actions/projects";

export const metadata = {
  title: "Equipo",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    inviteStatus?: string;
    inviteMessage?: string;
    inviteLink?: string;
    resetStatus?: string;
    resetMessage?: string;
    resetLink?: string;
  }>;
}) {
  const admin = await requireAdminUserForDashboard();
  const {
    inviteStatus,
    inviteMessage,
    inviteLink,
    resetStatus,
    resetMessage,
    resetLink,
  } = await searchParams;
  const [operarios, invites] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: admin.organizationId, role: "OPERARIO" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, updatedAt: true },
    }),
    prisma.operatorInvite.findMany({
      where: { organizationId: admin.organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, email: true, name: true, status: true, expiresAt: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <Users className="h-5 w-5 text-yellow-300" />
            <h1 className="text-2xl font-bold">Equipo</h1>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">
            Volver al dashboard
          </Link>
        </div>

        {inviteStatus === "resent" ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            ✅ Invitación enviada correctamente.
          </div>
        ) : null}
        {inviteStatus === "error" ? (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            ❌ No se pudo enviar la invitación{inviteMessage ? `: ${inviteMessage}` : "."}
            {inviteLink ? (
              <span className="ml-1">
                Enlace manual:{" "}
                <a className="underline text-yellow-300" href={inviteLink}>
                  abrir
                </a>
              </span>
            ) : null}
          </div>
        ) : null}
        {resetStatus === "sent" ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            ✅ Correo de reseteo enviado al operario.
          </div>
        ) : null}
        {resetStatus === "error" ? (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            ❌ No se pudo enviar el reset password{resetMessage ? `: ${resetMessage}` : "."}
            {resetLink ? (
              <span className="ml-1">
                Enlace manual:{" "}
                <a className="underline text-yellow-300" href={resetLink}>
                  abrir
                </a>
              </span>
            ) : null}
          </div>
        ) : null}

        <TeamInviteForm />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-200">Operarios activos</h2>
            <div className="mt-3 space-y-2">
              {operarios.map((user) => (
                <div key={user.id} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-yellow-200">
                        {(user.name || user.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{user.name || "Operario"}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-200">
                      Activo
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <form action={sendOperarioPasswordResetAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      >
                        Enviar reset password
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {operarios.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-4 text-center">
                  <MailPlus className="mx-auto h-8 w-8 text-yellow-300" />
                  <p className="mt-2 text-xs text-slate-300">Aún no tienes operarios activos.</p>
                  <p className="text-xs text-slate-500">Invita a tu primer técnico para empezar a asignar obras.</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-200">Invitaciones recientes</h2>
            <div className="mt-3 space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{invite.name}</p>
                      <p className="text-xs text-slate-400">{invite.email}</p>
                      <p className="text-xs text-slate-500">
                        Estado: {invite.status} · expira {new Date(invite.expiresAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    {invite.status === "PENDING" ? (
                      <form action={resendOperarioInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                        >
                          Reenviar email
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
              {invites.length === 0 ? <p className="text-xs text-slate-400">No hay invitaciones aún.</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
