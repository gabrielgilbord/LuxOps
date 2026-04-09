import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/authz";

function sanitizePlainText(input: string): string {
  const trimmed = input.trim();
  const withoutNulls = trimmed.replace(/\u0000/g, "");
  const withoutTags = withoutNulls.replace(/<[^>]*>/g, "");
  return withoutTags;
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const postId = (url.searchParams.get("postId") ?? "").trim();
  if (!postId) {
    return NextResponse.json({ error: "Falta postId." }, { status: 400 });
  }

  const order = (url.searchParams.get("order") ?? "new").toLowerCase();
  const sort = order === "old" ? "asc" : "desc";
  const limit = clampInt(url.searchParams.get("limit"), 20, 1, 50);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 5000);
  const q = (url.searchParams.get("q") ?? "").trim();

  const rows = await prisma.comment.findMany({
    where: {
      postId,
      ...(q
        ? {
            content: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { createdAt: sort },
    take: limit,
    skip: offset,
    select: {
      id: true,
      content: true,
      createdAt: true,
      postId: true,
      user: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      postId: r.postId,
      user: { id: r.user.id, name: r.user.name ?? "Usuario" },
    })),
    nextOffset: offset + rows.length,
  });
}

export async function POST(request: NextRequest) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const postId =
    typeof (body as any)?.postId === "string" ? String((body as any).postId).trim() : "";
  const rawContent =
    typeof (body as any)?.content === "string" ? String((body as any).content) : "";

  if (!postId) {
    return NextResponse.json({ error: "Falta postId." }, { status: 400 });
  }

  const cleaned = sanitizePlainText(rawContent);
  const content = cleaned.replace(/\s+\n/g, "\n").trim();

  if (content.length < 2) {
    return NextResponse.json({ error: "El comentario es demasiado corto." }, { status: 400 });
  }
  if (content.length > 1200) {
    return NextResponse.json({ error: "El comentario es demasiado largo (máx. 1200)." }, { status: 400 });
  }

  const created = await prisma.comment.create({
    data: {
      postId,
      content,
      userId: dbUser.id,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      postId: true,
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    item: {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      postId: created.postId,
      user: { id: created.user.id, name: created.user.name ?? "Usuario" },
    },
  });
}

