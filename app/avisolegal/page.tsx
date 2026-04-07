import { redirect } from "next/navigation";

export default function AvisoLegalAliasPage() {
  // Typed routes en Next pueden no incluir aliases; forzamos route string estable.
  redirect("/aviso-legal" as never);
}

