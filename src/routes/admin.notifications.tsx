import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminBroadcast,
});

type N = { id: string; title: string; body: string | null; kind: string; created_at: string };

function AdminBroadcast() {
  const { user } = useAuth();
  const [list, setList] = useState<N[]>([]);
  const [form, setForm] = useState({ title: "", body: "", kind: "promo" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("notifications").select("id,title,body,kind,created_at").eq("is_public", true).order("created_at", { ascending: false }).limit(20);
    setList((data as N[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("notifications").insert({
      title: form.title, body: form.body || null,
      kind: form.kind as "promo" | "update" | "maintenance" | "system",
      is_public: true, created_by: user.id,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Broadcast sent"); setForm({ title: "", body: "", kind: "promo" }); load(); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Broadcast Notifications</h1>
        <p className="text-sm text-sidebar-foreground/60">Send public announcements to all users</p>
      </div>

      <form onSubmit={send} className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-5 space-y-3">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="rounded-xl bg-sidebar/60 border border-sidebar-border px-4 py-2.5 text-sm">
          <option value="promo">📢 Promo</option>
          <option value="update">✨ Update</option>
          <option value="maintenance">🔧 Maintenance</option>
          <option value="system">ℹ System</option>
        </select>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title" className="w-full rounded-xl bg-sidebar/60 border border-sidebar-border px-4 py-2.5 text-sm" />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Body (optional)" rows={3}
          className="w-full rounded-xl bg-sidebar/60 border border-sidebar-border px-4 py-2.5 text-sm" />
        <button disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-sidebar-primary px-5 py-2.5 text-sm font-bold text-sidebar-primary-foreground disabled:opacity-60">
          <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send broadcast"}
        </button>
      </form>

      <div>
        <h2 className="font-display font-bold mb-2">Recent broadcasts</h2>
        <div className="space-y-2">
          {list.map((n) => (
            <div key={n.id} className="rounded-xl bg-sidebar-accent border border-sidebar-border p-3">
              <div className="text-xs uppercase font-bold text-sidebar-foreground/60">{n.kind} · {new Date(n.created_at).toLocaleString()}</div>
              <div className="font-bold">{n.title}</div>
              {n.body && <div className="text-sm text-sidebar-foreground/80">{n.body}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
