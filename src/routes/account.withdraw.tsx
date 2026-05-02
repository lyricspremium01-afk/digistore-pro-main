import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Wallet, ArrowLeft, Loader2, CheckCircle2, Clock, XCircle, Banknote } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/account/withdraw")({
  component: Withdraw,
});

const schema = z.object({
  amount: z.coerce.number().positive("Enter a valid amount").max(10_000_000),
  method: z.enum(["mobile_money", "bank", "soleaspay", "other"]),
  account_name: z.string().trim().min(2).max(100),
  account_number: z.string().trim().min(4).max(60),
  account_details: z.string().trim().max(500).optional().or(z.literal("")),
});

type Row = {
  id: string;
  amount: number;
  method: string;
  account_name: string;
  account_number: string;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_note: string | null;
  created_at: string;
};

function Withdraw() {
  const { user, profile, refresh } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mobile_money" | "bank" | "soleaspay" | "other">("mobile_money");
  const [accountName, setAccountName] = useState(profile?.full_name ?? "");
  const [accountNumber, setAccountNumber] = useState(profile?.phone ?? "");
  const [details, setDetails] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("withdrawals")
      .select("id, amount, method, account_name, account_number, status, admin_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      amount, method, account_name: accountName, account_number: accountNumber, account_details: details,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (parsed.data.amount > Number(profile?.balance ?? 0)) {
      toast.error("Insufficient balance");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      _amount: parsed.data.amount,
      _method: parsed.data.method,
      _account_name: parsed.data.account_name,
      _account_number: parsed.data.account_number,
      _account_details: parsed.data.account_details || "",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal request submitted");
    setAmount(""); setDetails("");
    await Promise.all([load(), refresh()]);
  };

  const balance = Number(profile?.balance ?? 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-24">
      <div className="flex items-center gap-2">
        <Link to="/account" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl font-extrabold">Withdraw Earnings</h1>
      </div>

      <div className="mt-5 rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-90">
          <Wallet className="h-4 w-4" /> Available balance
        </div>
        <div className="mt-1 font-display text-3xl font-extrabold">{formatPrice(balance, "XAF")}</div>
        <p className="mt-1 text-xs opacity-90">Funds are held while a request is pending; rejected requests are refunded automatically.</p>
      </div>

      <form onSubmit={submit} className="mt-5 rounded-2xl bg-card p-5 shadow-card space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Amount (XAF)</label>
          <input
            type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5000" required
            className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payout method</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([
              { v: "mobile_money", l: "Mobile Money" },
              { v: "bank", l: "Bank Transfer" },
              { v: "soleaspay", l: "SoleasPay" },
              { v: "other", l: "Other" },
            ] as const).map((o) => (
              <button key={o.v} type="button" onClick={() => setMethod(o.v)}
                className={`rounded-xl px-3 py-2.5 text-sm font-bold border-2 transition ${
                  method === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
                }`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Account name</label>
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} required maxLength={100}
              className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {method === "mobile_money" ? "Phone number" : method === "bank" ? "Account number / IBAN" : "Account / ID"}
            </label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required maxLength={60}
              className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Additional details (optional)</label>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={500}
            placeholder="Bank name, branch, operator (MTN/Orange), etc."
            className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <button type="submit" disabled={submitting || balance <= 0}
          className="w-full rounded-xl bg-gradient-primary py-3 font-bold text-primary-foreground shadow-elegant disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          Request Withdrawal
        </button>
      </form>

      <h2 className="mt-7 font-display text-lg font-extrabold">History</h2>
      <div className="mt-2 space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            No withdrawal requests yet.
          </div>
        ) : rows.map((r) => (
          <div key={r.id} className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg font-extrabold">{formatPrice(Number(r.amount), "XAF")}</div>
                <div className="text-xs text-muted-foreground">
                  {r.method.replace("_", " ")} • {r.account_name} • {r.account_number}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <StatusPill status={r.status} />
            </div>
            {r.admin_note && (
              <div className="mt-2 text-xs rounded-lg bg-muted px-3 py-2">
                <span className="font-bold">Admin:</span> {r.admin_note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Row["status"] }) {
  const map = {
    pending: { c: "bg-warning/15 text-warning", I: Clock, l: "Pending" },
    approved: { c: "bg-primary/15 text-primary", I: CheckCircle2, l: "Approved" },
    paid: { c: "bg-success/15 text-success", I: CheckCircle2, l: "Paid" },
    rejected: { c: "bg-destructive/15 text-destructive", I: XCircle, l: "Rejected" },
  }[status];
  const I = map.I;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${map.c}`}>
      <I className="h-3 w-3" />{map.l}
    </span>
  );
}
