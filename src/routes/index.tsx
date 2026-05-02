import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, ShieldCheck, Zap, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ProductCard, type ProductCardData } from "@/components/product-card";

export const Route = createFileRoute("/")({
  component: Index,
});

type Cat = { id: string; slug: string; name: string; icon: string | null };

function Index() {
  const { t } = useI18n();
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    supabase.from("categories").select("id,slug,name,icon").order("sort_order").then(({ data }) => {
      setCats((data as Cat[]) ?? []);
    });
    supabase
      .from("products")
      .select("id,slug,title,short_desc,price,currency,cover_url,is_hot,is_featured,rating_avg,rating_count,sales_count,categories(name,slug),profiles!products_seller_id_fkey(full_name,level)")
      .eq("status", "approved")
      .order("trending_score", { ascending: false })
      .limit(8)
      .then(({ data }) => setProducts((data as unknown as ProductCardData[]) ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl mt-4 bg-gradient-hero p-6 md:p-12">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-primary-glow/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-semibold text-primary shadow-card">
            <Sparkles className="h-3.5 w-3.5" /> {t("trending")} now
          </span>
          <h1 className="mt-4 font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {t("welcome")}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground md:text-lg">{t("hero_sub")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-95 transition">
              {t("explore")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/account/sell" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-muted transition">
              {t("become_seller")}
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Secure" />
            <Stat icon={<Zap className="h-4 w-4" />} label="24h delivery" />
            <Stat icon={<Flame className="h-4 w-4" />} label="Hot deals" />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mt-8">
        <h2 className="px-1 mb-3 font-display text-lg font-bold">{t("categories")}</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {cats.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ cat: c.slug }}
              className="snap-start shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
            >
              <span className="mr-1.5">{c.icon}</span>{c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mt-8">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-lg font-bold">{t("trending")}</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary hover:underline">
            {t("see_all")} →
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            {t("no_products")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-card/70 backdrop-blur px-3 py-2 text-xs font-semibold shadow-card">
      <span className="text-primary">{icon}</span>{label}
    </div>
  );
}
