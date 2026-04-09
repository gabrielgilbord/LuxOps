import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/authz";

function sanitizePlainText(input: string): string {
  const trimmed = input.trim();
  const withoutNulls = trimmed.replace(/\u0000/g, "");
  const withoutTags = withoutNulls.replace(/<[^>]*>/g, "");
  return withoutTags;
}

function sanitizeName(input: string): string {
  const cleaned = sanitizePlainText(input)
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
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
      authorName: true,
      content: true,
      createdAt: true,
      postId: true,
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      postId: r.postId,
    })),
    nextOffset: offset + rows.length,
  });
}

export async function POST(request: NextRequest) {
  const dbUser = await getCurrentDbUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const postId =
    typeof (body as any)?.postId === "string" ? String((body as any).postId).trim() : "";
  const rawAuthorName =
    typeof (body as any)?.authorName === "string" ? String((body as any).authorName) : "";
  const rawContent =
    typeof (body as any)?.content === "string" ? String((body as any).content) : "";
  const honey =
    typeof (body as any)?.website === "string" ? String((body as any).website).trim() : "";

  if (!postId) {
    return NextResponse.json({ error: "Falta postId." }, { status: 400 });
  }

  // Honeypot: if filled, silently accept but don't store (basic bot mitigation).
  if (honey) {
    return NextResponse.json({ ok: true });
  }

  const authorName = sanitizeName(rawAuthorName);
  if (authorName.length < 2) {
    return NextResponse.json({ error: "Introduce tu nombre (mín. 2 caracteres)." }, { status: 400 });
  }
  if (authorName.length > 60) {
    return NextResponse.json({ error: "Nombre demasiado largo (máx. 60)." }, { status: 400 });
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
      authorName,
      content,
      userId: dbUser?.id ?? null,
    },
    select: {
      id: true,
      authorName: true,
      content: true,
      createdAt: true,
      postId: true,
    },
  });

  return NextResponse.json({
    item: {
      id: created.id,
      authorName: created.authorName,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      postId: created.postId,
    },
  });
}

