"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderX,
  HardHat,
  HelpCircle,
  Scale,
  ShieldCheck,
  TriangleAlert,
  UserRoundCog,
} from "lucide-react";
import { useActionState, useEffect } from "react";
import { createCheckoutSessionAction } from "@/app/actions/checkout";
import { LandingShell } from "@/components/landing/landing-shell";

export type LandingBlogTeaser = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
};

type LandingPageProps = {
  latestBlogPosts?: LandingBlogTeaser[];
};

function formatBlogDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function LandingPage({ latestBlogPosts = [] }: LandingPageProps) {
  const [checkoutState, checkoutFormAction, checkoutPending] = useActionState(
    createCheckoutSessionAction,
    undefined,
  );

  useEffect(() => {
    const url = checkoutState?.checkoutUrl;
    if (url?.startsWith("https://")) {
      window.location.assign(url);
    }
  }, [checkoutState?.checkoutUrl]);

  return (
    <LandingShell>
      <main className="relative w-full">
      <section className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24">
        <div className="animate-fade-in-up">
          <p className="mb-4 inline-flex rounded-full border border-yellow-300/35 bg-yellow-300/15 px-3 py-1 text-xs font-bold text-yellow-200">
            SaaS para instaladoras solares
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-transparent sm:text-6xl bg-gradient-to-r from-sky-200 via-sky-300 to-yellow-300 bg-clip-text">
            LuxOps: operativa solar, control total.
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-200/90 sm:text-lg">
            Gestiona equipos de tejado y oficina en una sola plataforma con
            multitenancy, fotos geolocalizadas y trazabilidad por organizacion.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex rounded-xl bg-yellow-400 px-7 py-3 text-sm font-bold text-yellow-950 shadow-2xl shadow-yellow-400/30 transition hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            Comenzar ahora
          </Link>
        </div>

        <div className="relative grid gap-4 lg:pt-8">
          {[
            {
              icon: ClipboardList,
              title: "Checklist en tejado",
              desc: "Ejecucion guiada en tiempo real para cada instalacion.",
            },
            {
              icon: Camera,
              title: "Gestion de fotos",
              desc: "Registro visual ANTES / DURANTE / DESPUES, siempre trazable.",
            },
            {
              icon: FileText,
              title: "Control de subvenciones",
              desc: "Visibilidad de estados y documentacion de cada expediente.",
            },
          ].map((item, index) => (
            <article
              key={item.title}
              className={`animate-fade-in-up rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-md shadow-xl shadow-black/20 ${
                index === 1 ? "lg:ml-8" : ""
              }`}
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-300/20 text-yellow-300">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-200/80">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <section className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-20">
        <div className="animate-fade-in-up text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/80">
            El caos actual
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            ¿Sigues gestionando tus instalaciones con WhatsApp y carpetas compartidas?
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FolderX,
              title: "Fotos Perdidas",
              text: "El instalador olvida la foto del inversor y tienes que volver a la obra perdiendo gasolina y tiempo.",
            },
            {
              icon: TriangleAlert,
              title: "Subvenciones Denegadas",
              text: "Expedientes rechazados por falta de documentación técnica organizada.",
            },
            {
              icon: UserRoundCog,
              title: "Caos Administrativo",
              text: "No sabes qué operario está en qué tejado ni cuánto falta para terminar.",
            },
          ].map((pain, i) => (
            <article
              key={pain.title}
              className="animate-fade-in-up rounded-2xl border border-red-300/20 bg-red-500/10 p-5 backdrop-blur-md"
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/15 text-red-300">
                <pain.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">{pain.title}</h3>
              <p className="mt-2 text-sm text-slate-200/85">{pain.text}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <section className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-20">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/80">
              La solución LuxOps
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Menos fricción, más instalaciones cerradas
            </h2>
          </div>
          <Link
            href="/register"
            className="inline-flex rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/25 transition hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            Empezar ahora
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ClipboardCheck,
              title: "Checklist Inteligente",
              text: '"Obliga" a cumplir el protocolo antes de bajar del tejado.',
            },
            {
              icon: FileText,
              title: "Reportes en 1-Clic",
              text: "Genera el dossier para industria o para el cliente en segundos, no en horas.",
            },
            {
              icon: Camera,
              title: "Multi-Empresa / Multi-Equipo",
              text: "Gestiona varias cuadrillas desde una sola pantalla sin mezclar datos.",
            },
          ].map((feature, i) => (
            <article
              key={feature.title}
              className="animate-fade-in-up rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md shadow-xl"
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-300/20 text-yellow-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-200/85">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <section className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-20">
        <div className="animate-fade-in-up">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/80">
            Cómo funciona
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            El Proceso 1-2-3 para ejecutar y cobrar más rápido
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Alta del Proyecto",
              text: "La oficina crea la obra en 10 segundos.",
            },
            {
              step: "02",
              title: "Ejecución Guíada",
              text: "El técnico sigue el checklist desde su móvil.",
            },
            {
              step: "03",
              title: "Cierre y Cobro",
              text: "Fotos subidas, informe generado, subvención lista.",
            },
          ].map((step, i) => (
            <article
              key={step.step}
              className="animate-fade-in-up rounded-2xl border border-white/15 bg-slate-900/50 p-5 shadow-lg"
              style={{ animationDelay: `${0.12 * (i + 1)}s` }}
            >
              <p className="text-sm font-bold text-yellow-300">{step.step}</p>
              <h3 className="mt-2 text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-200/85">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pb-14">
        <div className="animate-fade-in-up rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-5 backdrop-blur-md">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
            <ShieldCheck className="h-5 w-5" />
            Datos cifrados y almacenados de forma segura. Cumple con la LOPD y
            normativas de industria.
          </p>
        </div>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <section className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-20">
        <div className="animate-fade-in-up rounded-3xl border border-yellow-300/25 bg-yellow-300/8 p-7 backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/80">
            Lo que te ahorras
          </p>
          <ul className="mt-4 space-y-3">
            {[
              "Ahorra una media de 4 horas de oficina por instalación.",
              "Elimina los desplazamientos repetidos por olvidos técnicos.",
              "Garantiza el 100% de la documentación para subvenciones.",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-slate-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-300" />
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-7 inline-flex rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-yellow-950 shadow-xl shadow-yellow-400/20 transition hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            Empezar ahora
          </Link>
        </div>
      </section>

      <section id="precios" className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pb-24">
        <div className="animate-fade-in-up rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl sm:p-9 lg:p-12">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr,26rem] lg:gap-14">
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/80">
                Precios
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold text-white sm:text-4xl">
                Plan profesional para instaladoras
              </h2>
              <p className="mt-3 max-w-xl text-sm text-slate-200/85 sm:text-base">
                Activa LuxOps y centraliza obras, evidencias, REBT y dossiers institucionales. El
                checkout permite aplicar códigos promocionales.
              </p>

              <ul className="mt-7 grid gap-3 text-sm text-slate-100 sm:max-w-xl sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
                {[
                  "Proyectos ilimitados",
                  "Sincronización Offline",
                  "Soporte 24/7 de campo",
                  "Multitenancy activa",
                ].map((item) => (
                  <li key={item} className="inline-flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-yellow-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border-2 border-yellow-300/70 bg-[#0B0E14]/70 p-7 text-center shadow-[0_24px_90px_-28px_rgba(251,191,36,0.35)] sm:p-9">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300/15 px-3 py-1 text-xs font-bold text-yellow-200">
                <CheckCircle2 className="h-4 w-4" />
                Plan profesional
              </div>
              <p className="text-6xl font-bold text-yellow-300">150€/mes</p>
              <p className="mt-5 text-sm text-slate-200/85">
                Incluye autenticacion, multiorganizacion y dashboard operativo.
              </p>

              <form action={checkoutFormAction} className="mt-8">
                {checkoutState?.error ? (
                  <p className="mb-4 rounded-lg border border-red-300/50 bg-red-950/40 px-3 py-2 text-left text-sm text-red-100">
                    {checkoutState.error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={checkoutPending}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-slate-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {checkoutPending ? "Abriendo pago…" : "Activar LuxOps"}
                </button>

                <p className="mt-4 text-xs font-medium text-slate-200/80">
                  Oferta de lanzamiento disponible: 50% de descuento para siempre para los primeros 5
                  registros con código.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section
        id="blog"
        aria-labelledby="blog-landing-title"
        className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pb-24"
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0B0E14]/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="relative">
            <div className="mb-10 flex flex-col gap-4 text-center sm:mb-12">
              <p className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/90">
                <BookOpen className="h-4 w-4" aria-hidden />
                Blog y recursos
              </p>
              <h2
                id="blog-landing-title"
                className="text-balance text-3xl font-bold text-white sm:text-4xl"
              >
                Guías para profesionalizar tu instaladora
              </h2>
              <p className="mx-auto max-w-2xl text-pretty text-sm text-slate-300 sm:text-base">
                Estrategia operativa, digitalización y CRM solar. Contenido pensado para quienes
                viven del tejado y la legalización.
              </p>
            </div>

            {latestBlogPosts.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {latestBlogPosts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-yellow-300/35 hover:bg-white/[0.07]"
                    >
                      <time
                        dateTime={post.publishedAt}
                        className="text-xs font-medium uppercase tracking-wide text-yellow-300/90"
                      >
                        {formatBlogDate(post.publishedAt)}
                      </time>
                      <h3 className="mt-3 text-lg font-bold leading-snug text-white group-hover:text-yellow-200">
                        {post.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">
                        {post.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-yellow-400">
                        Leer artículo
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-slate-400">
                Pronto publicaremos nuevas guías. Mientras tanto, visita el blog.
              </p>
            )}

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/blog"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300/50 bg-yellow-400/10 px-6 py-3 text-sm font-bold text-yellow-200 transition hover:bg-yellow-400/20"
              >
                Ver todo el blog
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
              >
                Comenzar ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pb-28">
        <div className="mb-8 animate-fade-in-up text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/80">
            <HelpCircle className="h-4 w-4" />
            Preguntas frecuentes
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Resolvemos las dudas clave antes de empezar
          </h2>
        </div>

        <div className="grid gap-4">
          {[
            {
              q: "¿Cómo protege LuxOps los datos de mi empresa y mis clientes?",
              a: "Toda la información se transmite cifrada y se almacena de forma segura en infraestructura cloud de alta disponibilidad. Además, cada empresa trabaja aislada por organización para evitar cruces de datos.",
            },
            {
              q: "¿Qué tipo de soporte técnico incluye el plan?",
              a: "Incluye soporte técnico para incidencias y dudas operativas del equipo (oficina y técnicos). Te ayudamos en la puesta en marcha y en el uso diario para que no pares una instalación por un problema de herramienta.",
            },
            {
              q: "¿Funciona en tejados con mala cobertura o sin conexión?",
              a: "Sí, está pensado para escenarios de campo. El técnico puede trabajar con conectividad limitada y, cuando recupera señal, la información se sincroniza para mantener trazabilidad de checklist, fotos y estados.",
            },
          ].map((item, i) => (
            <article
              key={item.q}
              className="animate-fade-in-up rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-md"
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              <h3 className="text-base font-bold text-white">{item.q}</h3>
              <p className="mt-2 text-sm text-slate-200/85">{item.a}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/register"
            className="inline-flex rounded-xl bg-yellow-400 px-7 py-3 text-sm font-bold text-yellow-950 shadow-xl shadow-yellow-400/20 transition hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            Empezar ahora
          </Link>
        </div>
      </section>

      <section
        id="autoridad"
        aria-labelledby="autoridad-titulo"
        className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pb-16"
      >
        <div className="rounded-3xl border border-white/15 bg-slate-800/50 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10 lg:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="flex flex-col items-center justify-center lg:items-start">
              <div
                className="relative flex h-44 w-44 items-center justify-center rounded-3xl border border-yellow-300/40 bg-gradient-to-br from-yellow-300/25 via-yellow-400/15 to-transparent shadow-[0_0_48px_-8px_rgba(250,204,21,0.45)] sm:h-52 sm:w-52"
                aria-hidden
              >
                <HardHat
                  className="h-24 w-24 text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.65)] sm:h-28 sm:w-28"
                  strokeWidth={1.25}
                />
                <div className="pointer-events-none absolute -right-1 -top-1 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-300/50 bg-slate-900/60 backdrop-blur-sm">
                  <Scale className="h-6 w-6 text-yellow-300" strokeWidth={1.5} />
                </div>
              </div>
              <p className="mt-6 max-w-sm text-center text-xs font-medium leading-relaxed text-slate-400 lg:text-left">
                Tu éxito en la legalización es nuestra prioridad. Habla de ingeniero a instalador.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300/90">
                Autoridad y respaldo
              </p>
              <h2
                id="autoridad-titulo"
                className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl"
              >
                Ingeniería Real
                <br />
                detrás de cada Dossier
              </h2>
              <p className="mt-3 text-base font-medium text-yellow-200/95 sm:text-lg">
                No es solo software. Es el rigor de un Ingeniero Superior a tu servicio.
              </p>
              <p className="mt-5 text-sm leading-relaxed text-slate-200/90">
                Detrás de LuxOps hay un perfil de{" "}
                <span className="font-semibold text-white">Ingeniero Superior</span>, con formación de
                Grado y Máster en Ingeniería. Ese criterio técnico se traduce en dossiers y flujos pensados
                para la obra real, la administración y la tranquilidad de tu cliente.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  {
                    title: "Revisión técnica",
                    desc: "Posibilidad de revisión de proyectos complejos cuando la instalación lo exige.",
                  },
                  {
                    title: "Asistencia normativa",
                    desc: "Soporte orientado al REBT y a la legalización de instalaciones de autoconsumo.",
                  },
                  {
                    title: "Garantía de firma",
                    desc: "Los documentos se diseñan siguiendo estándares alineados con la práctica colegial y el rigor de ingeniería.",
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="flex gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                    <div>
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-300/95">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/support"
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-yellow-300/50 bg-yellow-400/15 px-6 py-3.5 text-sm font-bold text-yellow-200 shadow-lg shadow-yellow-400/10 transition hover:-translate-y-0.5 hover:bg-yellow-400/25 hover:text-yellow-100 sm:w-auto"
              >
                Consultar Soporte Técnico
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-950/40 py-10 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wide text-yellow-200/90">
            Supervisado por Ingeniería Colegiada
          </p>
        </div>
      </section>
      </main>
    </LandingShell>
  );
}
