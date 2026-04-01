import { logoutAction } from "@/app/actions/auth";
import { requireSubscribedUser } from "@/lib/authz";

export default async function ProfilePage() {
  const user = await requireSubscribedUser();
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h1 className="text-2xl font-bold">Perfil de Usuario</h1>
        <p className="mt-1 text-sm text-slate-300">
          Gestiona tu acceso y consulta la información de tu cuenta.
        </p>
        <div className="mt-5 grid gap-2 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
          <p>
            <span className="text-slate-400">Nombre:</span> {user.name || "Sin nombre"}
          </p>
          <p>
            <span className="text-slate-400">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-slate-400">Rol:</span> {user.role}
          </p>
        </div>
        <form action={logoutAction} className="mt-5">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-red-500 px-4 text-sm font-bold text-white transition hover:bg-red-400"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
