import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    };

/**
 * Genera el enlace de verificación de Supabase (sin enviar correo).
 * Requiere SUPABASE_SERVICE_ROLE_KEY en el servidor.
 */
export async function generateAuthActionLink(
  input: GenerateAuthActionLinkInput,
): Promise<{ actionLink: string } | { error: string }> {
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
        : await admin.auth.admin.generateLink({
            type: "magiclink",
            email: input.email,
            options: {
              redirectTo: input.redirectTo,
              data: input.data,
            },
          });

  const actionLink = data?.properties?.action_link?.trim();
  if (error || !actionLink) {
    return { error: error?.message ?? "No se pudo generar el enlace de acceso." };
  }
  return { actionLink };
}
