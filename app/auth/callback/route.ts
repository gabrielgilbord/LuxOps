import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Intercambia el `code` PKCE de Supabase (magic link, confirmación email, OAuth)
 * por sesión y escribe las cookies **en la misma respuesta de redirect**.
 *
 * Importante: en Route Handlers, si solo usas `cookies()` de `next/headers`, las
 * cookies de sesión pueden no viajar con `NextResponse.redirect` y el usuario
 * acaba “sin sesión” en la siguiente petición (p. ej. landing en `/`).
 *
 * Supabase → Auth → URL Configuration → Redirect URLs:
 * `https://TU_DOMINIO/auth/callback`
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
