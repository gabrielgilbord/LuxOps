import { redirect } from "next/navigation";

export default function OpsPage() {
  redirect("/dashboard/settings?tab=ops");
}
