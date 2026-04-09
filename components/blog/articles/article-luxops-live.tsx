import Link from "next/link";

export function ArticleLuxOpsLive() {
  return (
    <div className="space-y-6 text-base leading-relaxed text-slate-200 md:text-lg md:leading-relaxed">
      <p className="text-sm font-semibold uppercase tracking-wide text-yellow-300/90">
        Lanzamiento · LuxOps Live · 2026
      </p>

      <h1 className="text-balance text-3xl font-bold tracking-tight text-transparent md:text-4xl lg:text-[2.5rem] lg:leading-tight bg-gradient-to-r from-sky-200 via-sky-300 to-yellow-300 bg-clip-text">
        LuxOps Live: La nueva era de la certificación fotográfica
      </h1>

      <p className="text-lg text-slate-300 md:text-xl">
        Hoy abrimos{" "}
        <strong className="font-semibold text-white">LuxOps</strong> al público: un sistema operativo
        para instaladoras que convierte fotos, números de serie, firmas y geolocalización en un{" "}
        <strong className="font-semibold text-white">dossier institucional</strong> listo para
        auditoría, subvención y garantía de fabricante.
      </p>

      <h2 className="mt-10 scroll-mt-28 text-2xl font-bold tracking-tight text-white md:text-3xl">
        Trazabilidad <span className="text-yellow-300">Blockchain-Ready</span> (sin humo)
      </h2>
      <p>
        Cada evidencia capturada en campo queda vinculada al expediente con{" "}
        <strong className="text-white">coordenadas GPS</strong>, marca de tiempo y un{" "}
        <strong className="text-white">ID de transacción</strong> que acompaña al documento página
        a página. El resultado no es “más papeleo”, sino menos dudas: quién hizo qué, cuándo y dónde.
      </p>

      <h2 className="mt-10 scroll-mt-28 text-2xl font-bold tracking-tight text-white md:text-3xl">
        Normativa <span className="text-yellow-300">eIDAS</span> + REBT como estándar de salida
      </h2>
      <p>
        El dossier incorpora cláusulas de{" "}
        <strong className="text-white">integridad documental</strong> alineadas con el Reglamento
        (UE) Nº 910/2014 (eIDAS) y mantiene las menciones técnicas clave al{" "}
        <strong className="text-white">REBT</strong> (incluyendo ITC-BT-19 e ITC-BT-07). Esto te da
        un entregable defendible sin “inventarte” formatos distintos por cliente.
      </p>

      <h2 className="mt-10 scroll-mt-28 text-2xl font-bold tracking-tight text-white md:text-3xl">
        Un flujo pensado para oficina y campo
      </h2>
      <p>
        LuxOps unifica{" "}
        <strong className="text-white">checklist</strong>,{" "}
        <strong className="text-white">protocolo fotográfico</strong>,{" "}
        <strong className="text-white">esquema unifilar</strong>, anexos (p. ej. PVGIS) y firmas,
        incluso con sincronización offline. La oficina deja de perseguir “la foto que falta” y el
        operario sabe exactamente qué evidencia necesita antes de cerrar.
      </p>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-lg font-bold text-white">Call to Action</h3>
        <p className="mt-2 text-sm text-slate-300">
          Solo para los 5 primeros: Usa el código <strong className="text-white">FOUNDERS50</strong>{" "}
          y obtén un <strong className="text-white">50% de DESCUENTO DE POR VIDA</strong> en tu
          suscripción de LuxOps.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-200/90">
              Código promocional
            </p>
            <p className="mt-1 text-sm font-extrabold text-yellow-200">FOUNDERS50</p>
            <p className="mt-1 text-xs text-slate-300">
              Introdúcelo en el checkout al activar LuxOps.
            </p>
          </div>
          <Link
            href="/#precios"
            className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-yellow-950 shadow-lg shadow-yellow-400/20 transition hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            Ver precios y activar
          </Link>
        </div>
      </div>
    </div>
  );
}

