/** Identidad legal publicada vía NEXT_PUBLIC_* (build-time en cliente; disponible en servidor). */
export function getPublicLegalIdentity() {
  return {
    name: (process.env.NEXT_PUBLIC_LEGAL_NAME ?? "").trim(),
    dni: (process.env.NEXT_PUBLIC_LEGAL_DNI ?? "").trim(),
    address: (process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "").trim(),
    email: (process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "").trim(),
  };
}

export function formatLegalPlaceholder(value: string, label: string) {
  return value || `[Rellenar ${label} en .env.local]`;
}
