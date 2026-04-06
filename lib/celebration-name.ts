/** Primer nombre para mensajes de bienvenida (checkout, rescate, etc.). */
export function firstNameForWelcome(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const fromName = fullName?.trim().split(/\s+/).filter(Boolean)[0];
  if (fromName) return fromName;
  const local = email?.split("@")[0]?.trim();
  if (local) {
    const token = local.split(/[.+_-]/)[0];
    if (token && token.length >= 2) return token;
  }
  return "Instalador";
}
