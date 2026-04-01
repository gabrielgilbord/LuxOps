import Link from "next/link";
import {
  BookOpenText,
  LifeBuoy,
  Mail,
  MessageSquare,
  PhoneCall,
  Search,
  ShieldCheck,
  SmartphoneNfc,
  Users,
  WalletCards,
} from "lucide-react";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

function LuxOpsLogo() {
  return <BrandLogo darkBackground className="h-11 w-auto" />;
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden px-4 py-14 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.2),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_30%)]" />
        <div className="relative mx-auto w-full max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <LuxOpsLogo />
            <Link
              href="/"
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
            >
              Volver al inicio
            </Link>
          </div>

          <div className="mt-10 animate-fade-in-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/35 bg-yellow-300/15 px-3 py-1 text-xs font-bold text-yellow-200">
              <LifeBuoy className="h-4 w-4" />
              Soporte técnico LuxOps
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Te ayudamos a no parar ninguna instalación
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200/85 sm:text-base">
              Soporte para incidencias de campo, dudas de oficina y problemas de
              sincronización en tiempo real.
            </p>
            <div className="mt-5 max-w-xl">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200/90" />
                <input
                  type="text"
                  placeholder="¿Cómo podemos ayudarte hoy?"
                  className="h-12 w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-slate-300 outline-none backdrop-blur-md focus:border-yellow-300/60"
                />
              </label>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: MessageSquare,
                title: "Chat técnico",
                text: "Respuesta rápida para bloqueos operativos durante la instalación.",
                cta: "Abrir chat",
                ctaHref: "#",
              },
              {
                icon: Mail,
                title: "Email prioritario",
                text: "Seguimiento detallado de incidencias y trazabilidad de cada caso.",
                cta: "Enviar email",
                ctaHref: "mailto:soporte@luxops.app",
              },
              {
                icon: PhoneCall,
                title: "Soporte de campo",
                text: "Asistencia para equipos en tejado con problemas de conectividad.",
                cta: "Contactar por WhatsApp",
                ctaHref: "https://wa.me/34600000000",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-yellow-300/40"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-300/20 text-yellow-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-200/85">{item.text}</p>
                <Link
                  href={item.ctaHref}
                  target={item.ctaHref.startsWith("http") ? "_blank" : undefined}
                  className={`mt-4 inline-flex rounded-lg px-3 py-2 text-sm font-bold transition ${
                    item.title === "Soporte de campo"
                      ? "bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
                      : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <section className="rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-md">
              <h2 className="text-xl font-bold">Recursos Rápidos</h2>
              <p className="mt-1 text-sm text-slate-200/80">
                Documentación operativa para resolver dudas en minutos.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: BookOpenText, label: "Guía del Operario", href: "#" },
                  {
                    icon: WalletCards,
                    label: "Configuración de Subvenciones",
                    href: "#",
                  },
                  {
                    icon: SmartphoneNfc,
                    label: "Sincronización Offline",
                    href: "#",
                  },
                  { icon: Users, label: "Gestión de Equipos", href: "#" },
                ].map((resource) => (
                  <Link
                    key={resource.label}
                    href={resource.href}
                    className="inline-flex min-h-16 items-center gap-3 rounded-xl border border-white/15 bg-slate-900/50 px-3 text-sm font-medium transition hover:border-yellow-300/40 hover:bg-slate-900"
                  >
                    <resource.icon className="h-5 w-5 text-yellow-300" />
                    {resource.label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-md">
              <h2 className="text-xl font-bold">Abre un ticket de incidencia</h2>
              <p className="mt-1 text-sm text-slate-200/80">
                Soporte 24/7 para profesionales. Te respondemos con prioridad.
              </p>
              <form className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-200">
                    Asunto
                  </label>
                  <input
                    type="text"
                    className="h-11 w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 text-sm outline-none focus:border-yellow-300/60"
                    placeholder="Ej: Error de sincronización en tejado"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-200">
                    Prioridad
                  </label>
                  <select className="h-11 w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 text-sm outline-none focus:border-yellow-300/60">
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-200">
                    Mensaje
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-yellow-300/60"
                    placeholder="Cuéntanos qué está pasando y en qué obra."
                  />
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-yellow-950 transition hover:bg-yellow-300"
                >
                  Enviar ticket
                </button>
              </form>
            </section>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-4">
            <p className="inline-flex items-center gap-2 text-sm text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Canal seguro para incidencias sensibles y datos de clientes.
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
        <div className="rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm">
          <p className="inline-flex items-center gap-2 text-emerald-300">
            <span className="relative inline-flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            Status: Todos los sistemas funcionando
          </p>
        </div>
      </footer>
    </main>
  );
}
