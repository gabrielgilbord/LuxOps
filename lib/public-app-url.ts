/** URL pública de la app (sin barra final). Stripe, Supabase y redirecciones en servidor. */
export function getPublicAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  return raw || "http://localhost:3000";
}
