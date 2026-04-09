"use client";

import { useEffect, useMemo, useState } from "react";

type CommentItem = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

function formatCommentDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function BlogComments(props: { postId: string }) {
  const postId = props.postId;
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");

  const [order, setOrder] = useState<"new" | "old">("new");
  const [q, setQ] = useState("");

  const queryKey = useMemo(() => `${postId}|${order}|${q}`, [postId, order, q]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          postId,
          order,
          limit: "50",
        });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/blog/comments?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar los comentarios.");
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error cargando comentarios.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [queryKey, order, postId, q]);

  async function publish() {
    if (posting) return;
    setSuccess(null);
    const name = authorName.trim();
    const text = content.trim();
    if (name.length < 2) {
      setError("Introduce tu nombre (mín. 2 caracteres).");
      return;
    }
    if (text.length < 2) {
      setError("Escribe un comentario (mín. 2 caracteres).");
      return;
    }

    setPosting(true);
    setError(null);
    try {
      const optimistic: CommentItem = {
        id: `tmp_${Date.now()}`,
        authorName: name,
        content: text,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => (order === "new" ? [optimistic, ...prev] : [...prev, optimistic]));

      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, authorName: name, content: text, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo publicar el comentario.");
      }
      setContent("");
      setWebsite("");
      setSuccess("¡Gracias por tu comentario!");
      setItems((prev) => {
        const cleaned = prev.filter((c) => c.id !== optimistic.id);
        if (data?.item) {
          return order === "new" ? [data.item as CommentItem, ...cleaned] : [...cleaned, data.item as CommentItem];
        }
        // Honeypot path: API returns ok without storing; just remove optimistic item.
        return cleaned;
      });
    } catch (e) {
      setItems((prev) => prev.filter((c) => !c.id.startsWith("tmp_")));
      setError(e instanceof Error ? e.message : "No se pudo publicar el comentario.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="mt-12 rounded-3xl border border-[#FBBF24]/25 bg-[#0B0E14]/70 p-6 shadow-[0_20px_80px_-36px_rgba(251,191,36,0.25)] md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white md:text-2xl">Comentarios</h2>
          <p className="mt-1 text-sm text-slate-300">
            Compartimos feedback real para mejorar el flujo de instaladoras.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar…"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#FBBF24]/60 sm:w-52"
          />
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value === "old" ? "old" : "new")}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-100 outline-none focus:border-[#FBBF24]/60"
          >
            <option value="new">Más recientes</option>
            <option value="old">Más antiguos</option>
          </select>
        </div>
      </header>

      <div className="mt-6 rounded-2xl border border-[#FBBF24]/20 bg-[#161B22] p-5">
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-200/90">
          Publica un comentario
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Tu nombre"
            className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#FBBF24]/60"
          />
          {/* Honeypot (hidden for humans) */}
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Sé directo: qué funciona, qué falta, qué mejorarías."
          className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#FBBF24]/60"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Publicamos como texto plano (sin HTML) para evitar XSS.
          </p>
          <button
            type="button"
            onClick={publish}
            disabled={posting}
            className="inline-flex items-center justify-center rounded-xl bg-[#FBBF24] px-5 py-2.5 text-sm font-bold text-[#0B0E14] shadow-lg shadow-yellow-400/20 transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-60"
          >
            {posting ? "Publicando…" : "Publicar comentario"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-300/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-100">
          {success}
        </p>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-300">Cargando comentarios…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-300">Todavía no hay comentarios. Sé el primero.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-white">{c.authorName}</p>
                  <p className="text-xs text-slate-400">{formatCommentDate(c.createdAt)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {c.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

