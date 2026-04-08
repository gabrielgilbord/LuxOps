import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Intercambia el `code` PKCE de Supabase (magic link, confirmación email, OAuth)
 * por sesión y escribe las cookies **en la misma respuesta de redirect**.
 *
 * Si Auth envía el correo por **SMTP propio (p. ej. Resend)**, el remitente cambia
 * pero el enlace sigue apuntando a `*.supabase.co/auth/v1/verify` y el flujo PKCE
 * termina aquí igual: este handler solo necesita `code` + claves de Supabase.
 *
 * Importante: en Route Handlers, si solo usas `cookies()` de `next/headers`, las
 * cookies de sesión pueden no viajar con `NextResponse.redirect` y el usuario
 * acaba “sin sesión” en la siguiente petición (p. ej. landing en `/`).
 *
 * Supabase → Auth → URL Configuration → Redirect URLs:
 * `https://TU_DOMINIO/auth/callback`
 *
 * Correos transaccionales (Resend) usan `/auth/confirm` + `verifyOtp` con `token_hash`;
 * este handler sigue siendo necesario para OAuth y enlaces que traen `?code=`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/dashboard";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.includes("://")
      ? nextRaw
      : "/dashboard";

  const origin = url.origin;
  const failRedirect = NextResponse.redirect(new URL("/login?error=auth", origin));

  if (!code) {
    return failRedirect;
  }

  const successRedirect = NextResponse.redirect(new URL(next, origin));
  const { url: supabaseUrl, key } = getSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successRedirect.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return failRedirect;
  }

  return successRedirect;
}
