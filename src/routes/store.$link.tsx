import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store as StoreIcon, Package, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/product-card";
import { levelLabel } from "@/lib/format";

export const Route = createFileRoute("/store/$link")({
  component: StorePage,
});

type Store = {
  id: string;
  user_id: string;
  store_name: string;
  description: string | null;
  profile_image_url: string | null;
  store_link: string;
};

function StorePage() {
  const { link } = Route.useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("stores").select("*").eq("store_link", link).maybeSingle();
      if (!s) { setLoading(false); return; }
      setStore(s as Store);
      const [{ data: prods }, { data: prof }] = await Promise.all([
        supabase.from("products")
          .select("id,slug,title,price,currency,cover_url,is_hot,is_featured,rating_avg,rating_count,sales_count,short_desc,categories(name)")
          .eq("seller_id", s.user_id).eq("status", "approved")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name,level,total_sales,avatar_url").eq("id", s.user_id).maybeSingle(),
      ]);
      setProducts(prods ?? []);
      setProfile(prof);
      setLoading(false);
    })();
  }, [link]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading store…</div>;
  if (!store) return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Store not found</h1>
      <Link to="/shop" className="mt-4 inline-block text-primary font-semibold">← Back to shop</Link>
    </div>
  );

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground px-4 pt-8 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-2xl bg-card overflow-hidden shadow-elegant flex items-center justify-center">
              {store.profile_image_url ? (
                <img src={store.profile_image_url} alt={store.store_name} className="h-full w-full object-cover" />
              ) : (
                <StoreIcon className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-extrabold">{store.store_name}</h1>
              <div className="mt-1 text-sm opacity-90">by {profile?.full_name ?? "Seller"}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-card/20 px-2.5 py-0.5 text-xs font-bold backdrop-blur">
                  <Award className="h-3 w-3" /> {levelLabel(profile?.level ?? 1)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-card/20 px-2.5 py-0.5 text-xs font-bold backdrop-blur">
                  <Package className="h-3 w-3" /> {products.length} products
                </span>
              </div>
            </div>
          </div>
          {store.description && (
            <p className="mt-4 text-sm opacity-95 leading-relaxed">{store.description}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 -mt-8">
        <h2 className="font-display text-lg font-extrabold mb-3 text-foreground">Products</h2>
        {products.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center text-muted-foreground shadow-card">
            No approved products yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map((prod) => <ProductCard key={prod.id} p={{ ...prod, profiles: { full_name: profile?.full_name ?? null, level: profile?.level ?? 1 } }} />)}
          </div>
        )}
      </div>
    </div>
  );
}
