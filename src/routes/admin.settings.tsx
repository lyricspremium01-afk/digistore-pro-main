import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

const KEYS = [
  { key: "site_name", label: "Site name", type: "text" },
  { key: "whatsapp_number", label: "WhatsApp support number", type: "text", placeholder: "237651010478" },
  { key: "support_email", label: "Support email", type: "email" },
  { key: "soleaspay_link", label: "SoleasPay payment link", type: "url" },
  { key: "seller_commission_pct", label: "Seller commission %", type: "number" },
  { key: "referral_first_pct", label: "Referral first sale %", type: "number" },
  { key: "referral_recurring_pct", label: "Referral recurring %", type: "number" },
] as const;

function AdminSettings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("key,value").then(({ data }) => {
      const m: Record<string, string> = {};
      (data ?? []).forEach((r: { key: string; value: unknown }) => {
        m[r.key] = typeof r.value === "string" ? r.value : JSON.stringify(r.value);
      });
      setVals(m);
    });
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      for (const { key, type } of KEYS) {
        const raw = vals[key] ?? "";
        const value = type === "number" ? Number(raw) : raw;
        const { error } = await supabase.from("app_settings").upsert({ key, value });
        if (error) throw error;
      }
      toast.success("Settings saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Settings</h1>
        <p className="text-sm text-sidebar-foreground/60">System-wide configuration</p>
      </div>

      <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-5 space-y-4">
        {KEYS.map((k) => (
          <label key={k.key} className="block">
            <span className="text-sm font-bold">{k.label}</span>
            <input type={k.type} value={vals[k.key] ?? ""}
              onChange={(e) => setVals({ ...vals, [k.key]: e.target.value })}
              placeholder={(k as { placeholder?: string }).placeholder}
              className="mt-1 w-full rounded-xl bg-sidebar/60 border border-sidebar-border px-4 py-2.5 text-sm focus:outline-none focus:border-sidebar-primary" />
          </label>
        ))}
        <button onClick={save} disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-sidebar-primary px-5 py-2.5 text-sm font-bold text-sidebar-primary-foreground disabled:opacity-60">
          <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
