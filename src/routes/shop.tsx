import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { cn } from "@/lib/utils";

const search = z.object({
  cat: z.string().optional(),
  sort: z.enum(["popular", "new", "top"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: search,
  component: Shop,
});

type Cat = { id: string; slug: string; name: string; icon: string | null };

function Shop() {
  const { t } = useI18n();
  const sp = Route.useSearch();
  const nav = Route.useNavigate();
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(sp.q ?? "");

  const sort = sp.sort ?? "popular";
  const cat = sp.cat ?? "";

  useEffect(() => {
    supabase.from("categories").select("id,slug,name,icon").order("sort_order").then(({ data }) => setCats((data as Cat[]) ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("id,slug,title,short_desc,price,currency,cover_url,is_hot,is_featured,rating_avg,rating_count,sales_count,categories!inner(name,slug),profiles!products_seller_id_fkey(full_name,level)")
      .eq("status", "approved");

    if (cat) query = query.eq("categories.slug", cat);
    if (sp.q) query = query.ilike("title", `%${sp.q}%`);

    if (sort === "new") query = query.order("created_at", { ascending: false });
    else if (sort === "top") query = query.order("rating_avg", { ascending: false });
    else query = query.order("trending_score", { ascending: false });

    query.limit(60).then(({ data }) => {
      setProducts((data as unknown as ProductCardData[]) ?? []);
      setLoading(false);
    });
  }, [cat, sort, sp.q]);

  const sorts = useMemo(() => ([
    { k: "popular", l: t("sort_popular") },
    { k: "new", l: t("sort_new") },
    { k: "top", l: t("sort_top") },
  ] as const), [t]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") nav({ search: { ...sp, q: q || undefined } }); }}
            placeholder={t("search_ph")}
            className="w-full rounded-full bg-card border border-border pl-9 pr-4 py-2.5 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => nav({ search: { ...sp, cat: undefined } })}
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition",
            !cat ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
          )}
        >
          {t("all")}
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => nav({ search: { ...sp, cat: c.slug } })}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition",
              cat === c.slug ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            )}
          >
            <span className="mr-1.5">{c.icon}</span>{c.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {sorts.map((s) => (
          <button
            key={s.k}
            onClick={() => nav({ search: { ...sp, sort: s.k } })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold transition",
              sort === s.k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.l}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            {t("no_products")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
