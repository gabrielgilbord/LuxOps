"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderX,
  HelpCircle,
  ShieldCheck,
  TriangleAlert,
  UserRoundCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createCheckoutSessionAction } from "@/app/actions/checkout";
import { LuxOpsLogo as BrandLogo } from "@/components/brand/luxops-logo";

function LuxOpsLogo() {
  return <BrandLogo darkBackground className="h-10 w-auto" />;
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,0.16),transparent_30%)]" />
      <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rotate-12 rounded-3xl border border-white/10 bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute right-0 top-72 h-56 w-56 -rotate-12 rounded-full border border-yellow-300/20 bg-yellow-300/10 blur-2xl" />

      <header
        className={`sticky top-0 z-30 transition-all duration-500 ${
          scrolled
            ? "border-b border-white/15 bg-slate-900/55 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <LuxOpsLogo />
          <nav className="flex items-center gap-2 text-yellow-300">
            <Link
              href="#precios"
              className="rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-yellow-400/15 hover:text-yellow-200"
            >
              Precios
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-yellow-400/15 hover:text-yellow-200"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-yellow-300/60 bg-yellow-400 px-4 py-2 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-300/20 transition hover:-translate-y-0.5 hover:bg-yellow-300"
            >
              Empezar
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
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

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
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

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
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

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
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

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
        <div className="animate-fade-in-up rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-5 backdrop-blur-md">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
            <ShieldCheck className="h-5 w-5" />
            Datos cifrados y almacenados de forma segura. Cumple con la LOPD y
            normativas de industria.
          </p>
        </div>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
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

      <section id="precios" className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6">
        <div className="animate-fade-in-up rounded-3xl border border-white/15 bg-white/10 p-9 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300/15 px-3 py-1 text-xs font-bold text-yellow-200">
            <CheckCircle2 className="h-4 w-4" />
            Plan profesional
          </div>
          <p className="text-6xl font-bold text-yellow-300">150€/mes + IVA</p>
          <p className="mt-3 text-sm text-slate-200/85">
            Incluye autenticacion, multiorganizacion y dashboard operativo.
          </p>
          <ul className="mx-auto mt-4 w-fit space-y-1 text-left text-sm text-slate-100">
            {[
              "Proyectos ilimitados",
              "Sincronización Offline",
              "Soporte 24/7 de campo",
              "Multitenancy activa",
            ].map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-300" />
                {item}
              </li>
            ))}
          </ul>
          <form action={createCheckoutSessionAction}>
            <button
              type="submit"
              className="mt-7 inline-flex rounded-xl bg-white px-7 py-3 text-sm font-bold text-slate-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Activar LuxOps
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-28 sm:px-6">
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
    </main>
  );
}
