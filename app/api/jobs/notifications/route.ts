import { NextResponse } from "next/server";
import { processPendingNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await processPendingNotifications(30);
  return NextResponse.json({ ok: true });
}
