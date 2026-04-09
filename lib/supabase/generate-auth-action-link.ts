import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Tipos de enlace que enviamos por correo y verificamos en `/auth/confirm`. */
export type AuthEmailVerificationType = "magiclink" | "signup" | "recovery" | "invite";

export type GenerateAuthActionLinkInput =
  | {
      type: "magiclink";
      email: string;
      redirectTo: string;
      data?: Record<string, unknown>;
    }
  | {
      type: "recovery";
      email: string;
      redirectTo: string;
    }
  | {
      type: "signup";
      email: string;
      password: string;
      redirectTo: string;
      data?: Record<string, unknown>;
    }
  | {
      type: "invite";
      email: string;
      redirectTo: string;
      data?: Record<string, unknown>;
    };

function parseVerificationType(raw: string | undefined): AuthEmailVerificationType | null {
  if (raw === "magiclink" || raw === "signup" || raw === "recovery" || raw === "invite") return raw;
  return null;
}

export type GenerateAuthActionLinkResult =
  | {
      tokenHash: string;
      verificationType: AuthEmailVerificationType;
    }
  | { error: string };

/**
 * Genera token de verificación en Supabase (sin enviar correo).
 * El correo debe enlazar a `/auth/confirm` con `token_hash` + `type`, no a `action_link`.
 */
export async function generateAuthActionLink(
  input: GenerateAuthActionLinkInput,
): Promise<GenerateAuthActionLinkResult> {
  const admin = createSupabaseAdminClient();

  const { data, error } =
    input.type === "signup"
      ? await admin.auth.admin.generateLink({
          type: "signup",
          email: input.email,
          password: input.password,
          options: {
            redirectTo: input.redirectTo,
            data: input.data,
          },
        })
      : input.type === "recovery"
        ? await admin.auth.admin.generateLink({
            type: "recovery",
            email: input.email,
            options: { redirectTo: input.redirectTo },
          })
        : input.type === "invite"
          ? await admin.auth.admin.generateLink({
              type: "invite",
              email: input.email,
              options: {
                redirectTo: input.redirectTo,
                data: input.data,
              },
            })
          : await admin.auth.admin.generateLink({
              type: "magiclink",
              email: input.email,
              options: {
                redirectTo: input.redirectTo,
                data: input.data,
              },
            });

  const tokenHash = data?.properties?.hashed_token?.trim();
  const verificationType =
    parseVerificationType(data?.properties?.verification_type) ?? (input.type as AuthEmailVerificationType);

  if (error || !tokenHash) {
    return { error: error?.message ?? "No se pudo generar el enlace de acceso." };
  }
  return { tokenHash, verificationType };
}
