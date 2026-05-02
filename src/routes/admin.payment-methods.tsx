import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/payment-methods")({
  component: AdminPaymentMethods,
});

type PM = {
  id: string; name: string; kind: string; is_active: boolean;
  details: string | null; link: string | null; embed_html: string | null;
  instructions: string | null; sort_order: number;
};

const EMPTY: Omit<PM, "id"> = {
  name: "", kind: "manual", is_active: true,
  details: "", link: "", embed_html: "", instructions: "", sort_order: 0,
};

function AdminPaymentMethods() {
  const [list, setList] = useState<PM[]>([]);
  const [editing, setEditing] = useState<(Partial<PM> & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("sort_order");
    setList((data as PM[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name || !editing.kind) { toast.error("Name and kind required"); return; }
    setBusy(true);
    const payload = {
      name: editing.name, kind: editing.kind, is_active: editing.is_active ?? true,
      details: editing.details || null, link: editing.link || null,
      embed_html: editing.embed_html || null, instructions: editing.instructions || null,
      sort_order: editing.sort_order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("payment_methods").update(payload).eq("id", editing.id)
      : await supabase.from("payment_methods").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const toggle = async (pm: PM) => {
    const { error } = await supabase.from("payment_methods").update({ is_active: !pm.is_active }).eq("id", pm.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Payment Methods
          </h1>
          <p className="text-sm text-sidebar-foreground/60">Manual accounts, external links, or embed scripts</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-primary px-4 py-2 text-sm font-bold text-sidebar-primary-foreground">
          <Plus className="h-4 w-4" /> Add method
        </button>
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-10 text-center text-sidebar-foreground/60">
            No payment methods yet.
          </div>
        ) : list.map((pm) => (
          <div key={pm.id} className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-4">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold">{pm.name}</div>
                  <span className="text-[10px] uppercase font-bold rounded-full bg-sidebar/60 px-2 py-0.5">{pm.kind}</span>
                  <span className={`text-[10px] uppercase font-bold rounded-full px-2 py-0.5 ${pm.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                    {pm.is_active ? "Active" : "Off"}
                  </span>
                </div>
                {pm.details && <div className="text-xs text-sidebar-foreground/70 mt-1 whitespace-pre-line">{pm.details}</div>}
                {pm.link && <div className="text-xs text-sidebar-primary mt-1 truncate">{pm.link}</div>}
                {pm.embed_html && <div className="text-xs text-sidebar-foreground/60 mt-1">Embed configured ({pm.embed_html.length} chars)</div>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => toggle(pm)} className="rounded-lg bg-sidebar/60 px-3 py-1.5 text-xs font-bold">
                  {pm.is_active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => setEditing(pm)} className="rounded-lg bg-sidebar/60 p-2"><Edit3 className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(pm.id)} className="rounded-lg bg-destructive/20 text-destructive p-2"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-sidebar-accent border border-sidebar-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3">
            <h2 className="font-display font-bold text-lg">{editing.id ? "Edit method" : "New payment method"}</h2>

            <label className="block">
              <span className="text-xs font-bold">Type</span>
              <select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}
                className="mt-1 w-full rounded-xl bg-sidebar/60 border border-sidebar-border px-3 py-2 text-sm">
                <option value="manual">Manual (account number)</option>
                <option value="link">External link</option>
                <option value="embed">Embed script / widget</option>
              </select>
            </label>

            <Inp label="Display name" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="MTN Mobile Money" />

            {editing.kind === "manual" && (
              <Txt label="Account details (name + number, instructions)" value={editing.details ?? ""}
                onChange={(v) => setEditing({ ...editing, details: v })}
                placeholder={"Account name: John Doe\nNumber: 6XX XXX XXX\nNote: include order number"} />
            )}
            {editing.kind === "link" && (
              <Inp label="Payment URL" value={editing.link ?? ""} onChange={(v) => setEditing({ ...editing, link: v })} placeholder="https://pay.example.com/..." />
            )}
            {editing.kind === "embed" && (
              <Txt label="Embed HTML / script" value={editing.embed_html ?? ""}
                onChange={(v) => setEditing({ ...editing, embed_html: v })}
                placeholder="<script>...</script> or <iframe>" />
            )}

            <Txt label="Buyer instructions (optional)" value={editing.instructions ?? ""}
              onChange={(v) => setEditing({ ...editing, instructions: v })}
              placeholder="After payment, upload your screenshot below." />

            <Inp label="Sort order" value={String(editing.sort_order ?? 0)} type="number"
              onChange={(v) => setEditing({ ...editing, sort_order: Number(v) })} />

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-full bg-sidebar/60 py-2 text-sm font-bold">Cancel</button>
              <button onClick={save} disabled={busy} className="flex-1 rounded-full bg-sidebar-primary text-sidebar-primary-foreground py-2 text-sm font-bold disabled:opacity-60">
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-xl bg-sidebar/60 border border-sidebar-border px-3 py-2 text-sm" />
    </label>
  );
}
function Txt({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4}
        className="mt-1 w-full rounded-xl bg-sidebar/60 border border-sidebar-border px-3 py-2 text-sm font-mono" />
    </label>
  );
}
