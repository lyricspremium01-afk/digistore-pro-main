import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/affiliate")({
  component: AdminAffiliate,
});

type Row = { inviter_id: string; total: number; count: number; profile: { full_name: string | null; email: string | null } | null };

function AdminAffiliate() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("referral_earnings")
        .select("inviter_id,amount,profile:profiles!referral_earnings_inviter_id_fkey(full_name,email)")
        .limit(1000);
      const map = new Map<string, Row>();
      let total = 0;
      (data ?? []).forEach((r: { inviter_id: string; amount: number; profile: Row["profile"] }) => {
        total += Number(r.amount);
        const ex = map.get(r.inviter_id);
        if (ex) { ex.total += Number(r.amount); ex.count += 1; }
        else map.set(r.inviter_id, { inviter_id: r.inviter_id, total: Number(r.amount), count: 1, profile: r.profile });
      });
      setRows([...map.values()].sort((a, b) => b.total - a.total));
      setTotalPaid(total);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Affiliate Board</h1>
        <p className="text-sm text-sidebar-foreground/60">Top inviters by referral commissions</p>
      </div>

      <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-5">
        <div className="text-xs text-sidebar-foreground/60 uppercase font-bold">Total paid out</div>
        <div className="font-display text-3xl font-extrabold text-success">{formatPrice(totalPaid, "XAF")}</div>
      </div>

      <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sidebar-foreground/60">No referral earnings yet</div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {rows.map((r, i) => (
              <div key={r.inviter_id} className="flex items-center gap-3 px-4 py-3">
                <div className="font-display font-extrabold text-lg w-8 text-center">
                  {i === 0 ? <Trophy className="h-5 w-5 text-warning inline" /> : `#${i + 1}`}
                </div>
                <div className="flex-1">
                  <div className="font-bold">{r.profile?.full_name ?? "—"}</div>
                  <div className="text-xs text-sidebar-foreground/60">{r.profile?.email}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-extrabold text-success">{formatPrice(r.total, "XAF")}</div>
                  <div className="text-xs text-sidebar-foreground/60">{r.count} payouts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
