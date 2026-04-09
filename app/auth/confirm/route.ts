import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

const ALLOWED_TYPES = new Set(["magiclink", "signup", "recovery", "invite"]);

function safeInternalNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t;
}

/**
 * Valida el enlace del correo (token_hash + type) y crea sesión en cookies.
 * Sustituye abrir el action_link largo de Supabase en el cliente de correo.
 *
 * Auth → Redirect URLs: incluir `https://TU_DOMINIO/auth/confirm` si tu proyecto lo exige.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash") ?? "";
  const typeRaw = url.searchParams.get("type") ?? "";
  const isRecovery = typeRaw === "recovery";
  const defaultNext = isRecovery ? "/auth/reset-password" : "/dashboard";
  const next = safeInternalNext(url.searchParams.get("next"), defaultNext);

  const origin = url.origin;
  const failRedirect = NextResponse.redirect(new URL("/login?error=auth", origin));

  if (!tokenHash || !ALLOWED_TYPES.has(typeRaw)) {
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

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: typeRaw as "signup" | "magiclink" | "recovery" | "invite",
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp:", error.message);
    return failRedirect;
  }

  return successRedirect;
}
