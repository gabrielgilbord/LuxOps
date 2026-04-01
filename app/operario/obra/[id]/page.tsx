import { requireOperarioUser } from "@/lib/authz";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OperarioObraPage({ params }: Props) {
  await requireOperarioUser();
  const { id } = await params;
  redirect(`/mobile-dashboard/obra/${id}`);
}
