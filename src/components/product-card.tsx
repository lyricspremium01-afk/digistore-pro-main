import { Link } from "@tanstack/react-router";
import { Star, Flame } from "lucide-react";
import { formatPrice, levelLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  price: number;
  currency: string;
  cover_url: string | null;
  is_hot: boolean;
  is_featured: boolean;
  rating_avg: number;
  rating_count: number;
  sales_count: number;
  categories: { name: string; slug: string } | null;
  profiles: { full_name: string | null; level: number } | null;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const { t } = useI18n();
  return (
    <Link
      to="/p/$slug"
      params={{ slug: p.slug }}
      className="group block rounded-2xl bg-card shadow-card overflow-hidden hover:shadow-elegant transition-all hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] bg-gradient-hero overflow-hidden">
        {p.cover_url ? (
          <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">📦</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {p.is_hot && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-hot px-2.5 py-1 text-[11px] font-bold text-hot-foreground shadow-md">
              <Flame className="h-3 w-3" /> {t("hot")}
            </span>
          )}
          {p.is_featured && (
            <span className="rounded-full bg-primary/95 px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              ★ {t("featured")}
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="text-[11px] font-bold uppercase tracking-wide text-primary">
          {p.categories?.name ?? "—"}
        </div>
        <h3 className="mt-1 font-display font-bold leading-snug line-clamp-2">{p.title}</h3>
        {p.short_desc && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.short_desc}</p>
        )}
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="font-display text-xl font-extrabold">{formatPrice(Number(p.price), p.currency)}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {p.profiles?.full_name ?? "Seller"} · {levelLabel(p.profiles?.level ?? 1)}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            {p.rating_avg ? Number(p.rating_avg).toFixed(1) : "—"}
            <span className="text-muted-foreground">({p.rating_count})</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
