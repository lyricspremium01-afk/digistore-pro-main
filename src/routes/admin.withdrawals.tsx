import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Banknote, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/withdrawals")({
  component: AdminWithdrawals,
});

type Row = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  account_name: string;
  account_number: string;
  account_details: string | null;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_note: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string | null };
};

function AdminWithdrawals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter === "pending") q = q.in("status", ["pending", "approved"]);
    const { data: ws } = await q;
    const list = (ws ?? []) as Row[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((r) => { r.user = map.get(r.user_id) as any; });
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const act = async (id: string, action: "approve" | "paid" | "reject") => {
    let note: string | null = null;
    if (action === "reject") {
      note = window.prompt("Reason for rejection?") || "";
      if (!note) return;
    } else if (action === "paid") {
      note = window.prompt("Reference / transaction ID (optional):") || "";
    }
    setBusy(id);
    const { error } = await supabase.rpc("admin_process_withdrawal", {
      _withdrawal_id: id, _action: action, _note: note ?? undefined,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Withdrawal ${action}`);
    load();
  };

  return (
    <div className="text-foreground bg-background -m-4 md:-m-6 p-4 md:p-6 min-h-[calc(100vh-60px)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Payouts
          </h1>
          <p className="text-sm text-muted-foreground">Review and process seller withdrawal requests.</p>
        </div>
        <div className="inline-flex rounded-full bg-muted p-0.5 text-xs font-bold">
          {(["pending", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full ${filter === f ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {f === "pending" ? "Active" : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
            No withdrawals.
          </div>
        ) : rows.map((r) => (
          <div key={r.id} className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-display text-xl font-extrabold">{formatPrice(Number(r.amount), r.currency)}</div>
                <div className="text-sm font-semibold">{r.user?.full_name ?? r.user?.email ?? r.user_id}</div>
                <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                <div className="mt-2 text-xs">
                  <span className="font-bold uppercase tracking-wide">{r.method.replace("_", " ")}</span> · {r.account_name} · <span className="font-mono">{r.account_number}</span>
                </div>
                {r.account_details && <div className="mt-1 text-xs text-muted-foreground">{r.account_details}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
                {r.admin_note && <div className="mt-2 text-xs rounded-lg bg-muted px-2 py-1.5"><b>Note:</b> {r.admin_note}</div>}
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                r.status === "pending" ? "bg-warning/15 text-warning" :
                r.status === "approved" ? "bg-primary/15 text-primary" :
                r.status === "paid" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}>{r.status.toUpperCase()}</span>
            </div>

            {(r.status === "pending" || r.status === "approved") && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {r.status === "pending" && (
                  <button onClick={() => act(r.id, "approve")} disabled={busy === r.id}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                <button onClick={() => act(r.id, "paid")} disabled={busy === r.id}
                  className="inline-flex items-center gap-1 rounded-xl bg-success/10 text-success px-3 py-1.5 text-xs font-bold">
                  {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />} Mark Paid
                </button>
                <button onClick={() => act(r.id, "reject")} disabled={busy === r.id}
                  className="inline-flex items-center gap-1 rounded-xl bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-bold">
                  <XCircle className="h-3.5 w-3.5" /> Reject & Refund
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
