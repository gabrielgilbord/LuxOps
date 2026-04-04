import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getPublicAppUrl } from "@/lib/public-app-url";

/**
 * Intercambia el código de Supabase (confirmación de email, magic link, OAuth)
 * por sesión. Añade en Supabase → Auth → URL Configuration → Redirect URLs:
 * `${NEXT_PUBLIC_APP_URL}/auth/callback`
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";
  const base = getPublicAppUrl();

  if (code) {
    const cookieStore = await cookies();
    const { url, key } = getSupabaseEnv();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* set puede fallar en algunos contextos de RSC; el redirect igualmente intenta la sesión */
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, base));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", base));
}
