import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LandingPage } from "@/app/components/landing-page";
import { getAllBlogPosts } from "@/lib/blog/registry";

export default async function HomePage() {
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
