/** URL pública de la app (sin barra final). Stripe, Supabase y redirecciones en servidor. */
export function getPublicAppUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  // Vercel expone el host en env; en producción preferimos HTTPS por defecto.
  const vercelHost = (process.env.VERCEL_URL ?? "").trim().replace(/\/$/, "");
  if (vercelHost) {
    const proto = process.env.VERCEL_ENV === "production" ? "https" : "https";
    return `${proto}://${vercelHost}`;
  }

  // Último fallback: desarrollo local.
  return "http://localhost:3000";
}
