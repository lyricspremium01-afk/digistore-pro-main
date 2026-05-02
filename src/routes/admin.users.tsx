import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Plus, Minus, ShieldOff, Snowflake, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, levelLabel } from "@/lib/format";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type U = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  balance: number; level: number; status: string; total_sales: number; created_at: string;
  referral_code: string;
};

function AdminUsers() {
  const [users, setUsers] = useState<U[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    let query = supabase.from("profiles")
      .select("id,full_name,email,phone,balance,level,status,total_sales,created_at,referral_code")
      .order("created_at", { ascending: false }).limit(200);
    if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data } = await query;
    setUsers((data as U[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const adjust = async (u: U, sign: 1 | -1) => {
    const raw = prompt(`${sign > 0 ? "Add to" : "Deduct from"} ${u.email}'s balance (F CFA):`);
    if (!raw) return;
    const amt = Math.abs(Number(raw)) * sign;
    if (!Number.isFinite(amt) || amt === 0) return;
    const note = prompt("Note?") ?? "";
    const { error } = await supabase.rpc("admin_adjust_balance", { _user: u.id, _amount: amt, _note: note });
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  const setLevel = async (u: U) => {
    const lvl = Number(prompt(`New level (1-7) for ${u.email}:`, String(u.level)) ?? "");
    if (!lvl || lvl < 1 || lvl > 7) return;
    const { error } = await supabase.rpc("admin_set_user", { _user: u.id, _level: lvl });
    if (error) toast.error(error.message); else { toast.success("Level updated"); load(); }
  };

  const setStatus = async (u: U, status: "active" | "suspended" | "frozen") => {
    if (!confirm(`Set ${u.email} to ${status}?`)) return;
    const { error } = await supabase.rpc("admin_set_user", { _user: u.id, _status: status });
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Users</h1>
        <p className="text-sm text-sidebar-foreground/60">Manage balances, levels, suspensions</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search email, name, phone…"
            className="w-full rounded-full bg-sidebar-accent border border-sidebar-border pl-9 pr-4 py-2 text-sm" />
        </div>
        <button onClick={load} className="rounded-full bg-sidebar-primary px-4 py-2 text-sm font-bold text-sidebar-primary-foreground">Search</button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                {(u.full_name ?? u.email ?? "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{u.full_name ?? "—"}</div>
                <div className="text-xs text-sidebar-foreground/60 truncate">{u.email} · {u.phone ?? "no phone"}</div>
                <div className="text-[11px] mt-1">
                  <span className="rounded bg-sidebar/60 px-2 py-0.5">{levelLabel(u.level)}</span>{" "}
                  <span className={`rounded px-2 py-0.5 ${u.status === "active" ? "bg-success/20 text-success" : u.status === "frozen" ? "bg-primary/20 text-sidebar-primary" : "bg-destructive/20 text-destructive"}`}>{u.status}</span>{" "}
                  <span className="text-sidebar-foreground/60">ref: <code className="text-sidebar-primary">{u.referral_code}</code></span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-sidebar-foreground/60">Balance</div>
                <div className="font-display font-extrabold text-success">{formatPrice(Number(u.balance), "XAF")}</div>
                <div className="text-[10px] text-sidebar-foreground/60">{u.total_sales} sales</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => adjust(u, 1)} className="inline-flex items-center gap-1 rounded-full bg-success/80 px-3 py-1 text-xs font-bold text-success-foreground"><Plus className="h-3 w-3" />Credit</button>
              <button onClick={() => adjust(u, -1)} className="inline-flex items-center gap-1 rounded-full bg-destructive/80 px-3 py-1 text-xs font-bold text-destructive-foreground"><Minus className="h-3 w-3" />Debit</button>
              <button onClick={() => setLevel(u)} className="rounded-full bg-sidebar/60 px-3 py-1 text-xs font-bold">Set level</button>
              {u.status !== "active" && <button onClick={() => setStatus(u, "active")} className="inline-flex items-center gap-1 rounded-full bg-success/80 px-3 py-1 text-xs font-bold text-success-foreground"><Check className="h-3 w-3" />Activate</button>}
              {u.status !== "suspended" && <button onClick={() => setStatus(u, "suspended")} className="inline-flex items-center gap-1 rounded-full bg-destructive/80 px-3 py-1 text-xs font-bold text-destructive-foreground"><ShieldOff className="h-3 w-3" />Suspend</button>}
              {u.status !== "frozen" && <button onClick={() => setStatus(u, "frozen")} className="inline-flex items-center gap-1 rounded-full bg-primary/80 px-3 py-1 text-xs font-bold text-primary-foreground"><Snowflake className="h-3 w-3" />Freeze</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
