import { requireOperarioUser } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function OperarioDashboardPage() {
  await requireOperarioUser();
  redirect("/mobile-dashboard");
}
