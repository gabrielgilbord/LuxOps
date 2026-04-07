import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LandingPage } from "@/app/components/landing-page";
import { getAllBlogPosts } from "@/lib/blog/registry";

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Si Supabase no puede usar `emailRedirectTo` completo (p. ej. falta en Redirect URLs),
 * el magic link acaba en `https://luxops.es/?code=...` en lugar de `/auth/callback`.
 * Sin este paso nunca se intercambia el código y el usuario ve solo la landing.
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = await searchParams;
  const code = firstString(sp.code);
  const authError = firstString(sp.error);

  if (authError) {
    const desc = firstString(sp.error_description);
    const qs = new URLSearchParams({ error: "auth" });
    if (desc) qs.set("detail", desc.slice(0, 200));
    redirect(`/login?${qs.toString()}`);
  }

  if (code) {
    const nextRaw = firstString(sp.next) ?? "/dashboard";
    const next =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.includes("://")
        ? nextRaw
        : "/dashboard";
    const forward = new URLSearchParams();
    forward.set("code", code);
    forward.set("next", next);
    redirect(`/auth/callback?${forward.toString()}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const latestBlogPosts = getAllBlogPosts().slice(0, 3).map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    publishedAt: p.publishedAt,
  }));

  return <LandingPage latestBlogPosts={latestBlogPosts} />;
}
