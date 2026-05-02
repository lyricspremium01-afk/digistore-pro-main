import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/account/orders")({
  component: OrdersPage,
});

type Order = {
  id: string; order_number: string; amount: number; currency: string;
  status: string; created_at: string; delivered_link: string | null;
  admin_note: string | null;
  products: { title: string; slug: string; cover_url: string | null } | null;
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account/orders" } });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders")
      .select("id,order_number,amount,currency,status,created_at,delivered_link,admin_note,products(title,slug,cover_url)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as unknown as Order[]) ?? []));
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      <h1 className="font-display text-2xl font-extrabold">My Orders</h1>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No orders yet</p>
          <Link to="/shop" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((o) => <OrderCard key={o.id} o={o} />)}
        </div>
      )}
    </div>
  );
}

function OrderCard({ o }: { o: Order }) {
  const isPending = o.status === "awaiting_proof" || o.status === "pending_review";
  const isConfirmed = o.status === "confirmed";
  const isRejected = o.status === "rejected";

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-hero overflow-hidden">
          {o.products?.cover_url ? <img src={o.products.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{o.products?.title ?? "Product"}</div>
          <div className="text-xs text-muted-foreground">#{o.order_number} · {new Date(o.created_at).toLocaleDateString()}</div>
        </div>
        <div className="text-right">
          <div className="font-display font-extrabold text-primary">{formatPrice(Number(o.amount), o.currency)}</div>
          <StatusBadge status={o.status} />
        </div>
      </div>

      {isPending && (
        <Link to="/checkout/$orderId" params={{ orderId: o.id }}
          className="mt-3 block w-full rounded-full bg-gradient-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground">
          Complete payment
        </Link>
      )}

      {isConfirmed && o.delivered_link && (
        <a href={o.delivered_link} target="_blank" rel="noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-success px-4 py-2 text-sm font-bold text-success-foreground">
          <ExternalLink className="h-4 w-4" /> Access your product
        </a>
      )}

      {isRejected && o.admin_note && (
        <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <strong>Reason:</strong> {o.admin_note}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === "confirmed" ? { c: "bg-success/15 text-success", i: <CheckCircle2 className="h-3 w-3" />, l: "Confirmed" }
    : status === "rejected" ? { c: "bg-destructive/15 text-destructive", i: <XCircle className="h-3 w-3" />, l: "Rejected" }
    : status === "pending_review" ? { c: "bg-warning/15 text-warning", i: <Clock className="h-3 w-3" />, l: "Reviewing" }
    : { c: "bg-muted text-muted-foreground", i: <Clock className="h-3 w-3" />, l: "Awaiting payment" };
  return <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.c}`}>{cfg.i}{cfg.l}</span>;
}
