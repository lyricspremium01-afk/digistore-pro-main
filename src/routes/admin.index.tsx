import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Users, Package, DollarSign, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, pending: 0, users: 0, products: 0, revenue: 0 });
  const [recent, setRecent] = useState<Array<{ id: string; order_number: string; amount: number; currency: string; status: string; created_at: string; products: { title: string } | null }>>([]);

  useEffect(() => {
    (async () => {
      const [ord, pend, usr, pr, conf, rec] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("amount").eq("status", "confirmed"),
        supabase.from("orders").select("id,order_number,amount,currency,status,created_at,products(title)").order("created_at", { ascending: false }).limit(8),
      ]);
      const revenue = (conf.data ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0);
      setStats({
        orders: ord.count ?? 0,
        pending: pend.count ?? 0,
        users: usr.count ?? 0,
        products: pr.count ?? 0,
        revenue,
      });
      setRecent((rec.data as typeof recent) ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Dashboard</h1>
        <p className="text-sm text-sidebar-foreground/60">Live overview of your marketplace</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={formatPrice(stats.revenue, "XAF")} accent="from-success/20 to-success/5" />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Orders" value={String(stats.orders)} accent="from-primary/30 to-primary/5" />
        <Stat icon={<Clock className="h-4 w-4" />} label="Pending" value={String(stats.pending)} accent="from-warning/20 to-warning/5" highlight={stats.pending > 0} />
        <Stat icon={<Users className="h-4 w-4" />} label="Users" value={String(stats.users)} accent="from-primary/30 to-primary/5" />
        <Stat icon={<Package className="h-4 w-4" />} label="Products" value={String(stats.products)} accent="from-primary/30 to-primary/5" />
      </div>

      {stats.pending > 0 && (
        <Link to="/admin/orders" className="block rounded-2xl bg-warning/10 border border-warning/30 p-4 text-warning hover:bg-warning/20 transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">⚠ {stats.pending} order{stats.pending > 1 ? "s" : ""} awaiting your confirmation</div>
              <div className="text-xs opacity-80">Review payment proofs and credit sellers</div>
            </div>
            <ExternalLink className="h-4 w-4" />
          </div>
        </Link>
      )}

      <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-5">
        <h2 className="font-display font-bold mb-3">Recent orders</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-sidebar-foreground/60">No orders yet</p>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {recent.map((o) => (
              <Link key={o.id} to="/admin/orders" className="flex items-center justify-between gap-3 py-3 hover:bg-sidebar/40 -mx-2 px-2 rounded-lg transition">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{o.products?.title ?? "—"}</div>
                  <div className="text-xs text-sidebar-foreground/60">#{o.order_number} · {new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{formatPrice(Number(o.amount), o.currency)}</div>
                  <div className="text-[10px] uppercase font-bold text-sidebar-foreground/60">{o.status.replace("_", " ")}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent, highlight }: { icon: React.ReactNode; label: string; value: string; accent: string; highlight?: boolean }) {
  return (
    <div className={`relative rounded-2xl bg-sidebar-accent border border-sidebar-border p-4 overflow-hidden ${highlight ? "ring-2 ring-warning/50" : ""}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-50 pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs font-bold text-sidebar-foreground/70">{icon}{label}</div>
        <div className="mt-1 font-display text-xl font-extrabold">{value}</div>
      </div>
    </div>
  );
}
