import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";
import { LoginForm } from "@/app/login/login-form";

function LuxOpsLogo() {
  return <BrandLogo darkBackground className="h-12 w-auto" />;
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
        <div className="relative z-10">
          <LuxOpsLogo />
        </div>
        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <h2 className="text-5xl font-bold leading-tight text-white">
            Donde la energia solar se encuentra con la precision operativa
          </h2>
          <p className="mt-4 text-sm text-slate-200/85">
            Accede al entorno de trabajo de LuxOps y coordina oficina, instaladores y
            subvenciones desde una unica plataforma.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-100/60 px-4 py-10">
        <div className="animate-fade-in-up w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10">
          <h1 className="text-2xl font-bold text-slate-950">Entrar a LuxOps</h1>
          <p className="mt-1 text-sm text-slate-600">
            Accede a tu panel de control operativo.
          </p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
