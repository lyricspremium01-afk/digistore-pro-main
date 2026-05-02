import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, CheckCircle2, XCircle, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string; order_number: string; amount: number; currency: string;
  status: string; created_at: string; proof_url: string | null;
  buyer_name: string; buyer_email: string; buyer_phone: string;
  buyer_id: string | null; seller_id: string;
  products: { title: string; cover_url: string | null } | null;
  seller: { full_name: string | null; email: string | null } | null;
};

const FILTERS = ["all", "pending_review", "awaiting_proof", "confirmed", "rejected"] as const;

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("pending_review");
  const [busy, setBusy] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("orders")
      .select("id,order_number,amount,currency,status,created_at,proof_url,buyer_name,buyer_email,buyer_phone,buyer_id,seller_id,products(title,cover_url),seller:profiles!orders_seller_id_fkey(full_name,email)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q.limit(100);
    setOrders((data as unknown as Order[]) ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const viewProof = async (o: Order) => {
    if (!o.proof_url) { toast.error("No proof uploaded"); return; }
    if (proofUrls[o.id]) { window.open(proofUrls[o.id], "_blank"); return; }
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(o.proof_url, 600);
    if (error || !data) { toast.error("Cannot load proof"); return; }
    setProofUrls((p) => ({ ...p, [o.id]: data.signedUrl }));
    window.open(data.signedUrl, "_blank");
  };

  const confirmOrder = async (o: Order) => {
    if (!confirm(`Confirm order ${o.order_number}? Seller will be credited 85%.`)) return;
    setBusy(o.id);
    const { error } = await supabase.rpc("admin_confirm_order", { _order_id: o.id });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Confirmed! Seller credited."); load(); }
  };

  const rejectOrder = async (o: Order) => {
    const reason = prompt("Reason for rejection?");
    if (!reason) return;
    setBusy(o.id);
    const { error } = await supabase.rpc("admin_reject_order", { _order_id: o.id, _reason: reason });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Order rejected"); load(); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Orders & Transactions</h1>
        <p className="text-sm text-sidebar-foreground/60">Confirm payments to credit sellers 85% automatically</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${filter === f ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent text-sidebar-foreground/70 hover:bg-sidebar-accent/70"}`}>
            {f.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-10 text-center text-sidebar-foreground/60">
          No orders in this view
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-sidebar/60 overflow-hidden">
                  {o.products?.cover_url ? <img src={o.products.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl">📦</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{o.products?.title ?? "—"}</div>
                  <div className="text-xs text-sidebar-foreground/60">
                    #{o.order_number} · {new Date(o.created_at).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-sidebar-foreground/70">
                    Buyer: <strong>{o.buyer_name || o.buyer_email}</strong> · {o.buyer_phone} · Seller: <strong>{o.seller?.full_name ?? o.seller?.email}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-extrabold">{formatPrice(Number(o.amount), o.currency)}</div>
                  <div className="text-[10px] uppercase font-bold text-sidebar-foreground/60">{o.status.replace("_", " ")}</div>
                  <div className="text-[10px] text-success">Seller gets {formatPrice(Number(o.amount) * 0.85, o.currency)}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {o.proof_url ? (
                  <button onClick={() => viewProof(o)} className="inline-flex items-center gap-1.5 rounded-full bg-sidebar/60 px-3 py-1.5 text-xs font-bold hover:bg-sidebar">
                    <Eye className="h-3.5 w-3.5" /> View proof
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar/40 px-3 py-1.5 text-xs text-sidebar-foreground/60">
                    <ImageIcon className="h-3.5 w-3.5" /> No proof yet
                  </span>
                )}
                {o.status !== "confirmed" && (
                  <>
                    <button disabled={busy === o.id} onClick={() => confirmOrder(o)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-success px-4 py-1.5 text-xs font-bold text-success-foreground disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & credit 85%
                    </button>
                    <button disabled={busy === o.id} onClick={() => rejectOrder(o)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-4 py-1.5 text-xs font-bold text-destructive-foreground disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
