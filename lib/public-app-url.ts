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

/**
 * Enlace del botón en correos Auth: nuestra app valida el token y crea sesión.
 * Evita URLs largas de Supabase que Gmail trunca o altera.
 */
export function getAuthConfirmUrl(params: {
  tokenHash: string;
  type: string;
  nextPath?: string;
}): string {
  const base = getPublicAppUrl().trim().replace(/\/$/, "");
  const u = new URL(`${base}/auth/confirm`);
  u.searchParams.set("token_hash", params.tokenHash);
  u.searchParams.set("type", params.type);
  if (
    params.nextPath?.trim().startsWith("/") &&
    !params.nextPath.trim().startsWith("//") &&
    !params.nextPath.includes("://")
  ) {
    u.searchParams.set("next", params.nextPath.trim());
  }
  return u.toString();
}

/**
 * URL absoluta del callback PKCE de Supabase (magic link, confirmación, OAuth).
 * Supabase + SMTP externo (Resend) requieren siempre URL absoluta, nunca `/auth/callback` solo.
 */
export function getSupabaseAuthCallbackUrl(nextPath = "/dashboard"): string {
  const base = getPublicAppUrl().trim().replace(/\/$/, "");
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("://")
      ? nextPath
      : "/dashboard";
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** URL absoluta donde aterriza el recovery (debe coincidir con Redirect URLs en Supabase). */
export function getSupabaseAuthResetPasswordUrl(): string {
  const base = getPublicAppUrl().trim().replace(/\/$/, "");
  return `${base}/auth/reset-password`;
}

/** Invitación operario: destino tras auth (URL absoluta). */
export function getOperarioInviteCompleteUrl(token: string): string {
  const base = getPublicAppUrl().trim().replace(/\/$/, "");
  return `${base}/invite/complete?token=${encodeURIComponent(token)}`;
}
