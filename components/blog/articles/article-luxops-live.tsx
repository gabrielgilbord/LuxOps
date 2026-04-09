import Link from "next/link";

export function ArticleLuxOpsLive() {
  return (
    <div className="space-y-8 text-base leading-relaxed text-slate-200 md:text-lg md:leading-relaxed">
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
    </div>
  );
}

