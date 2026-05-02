import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account/notifications")({
  component: NotificationsPage,
});

type N = {
  id: string; title: string; body: string | null; kind: string;
  created_at: string; is_public: boolean; target_user_id: string | null;
};

function NotificationsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<N[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account/notifications" } });
  }, [loading, user, nav]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,kind,created_at,is_public,target_user_id")
      .or(`is_public.eq.true,target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as N[]) ?? []);

    const { data: r } = await supabase
      .from("notification_reads").select("notification_id").eq("user_id", user.id);
    setReads(new Set((r ?? []).map((x: { notification_id: string }) => x.notification_id)));
  };
  useEffect(() => { load(); }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((n) => !reads.has(n.id));
    if (!unread.length) return;
    await supabase.from("notification_reads").upsert(
      unread.map((n) => ({ user_id: user.id, notification_id: n.id })),
      { onConflict: "user_id,notification_id" }
    );
    setReads(new Set([...reads, ...unread.map((n) => n.id)]));
  };

  const markRead = async (id: string) => {
    if (!user || reads.has(id)) return;
    await supabase.from("notification_reads").upsert(
      { user_id: user.id, notification_id: id },
      { onConflict: "user_id,notification_id" }
    );
    setReads(new Set([...reads, id]));
  };

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">…</div>;

  const kindIcon = (k: string) => k === "promo" ? "📢" : k === "update" ? "✨" : k === "maintenance" ? "🔧" : "🔔";
  const unreadCount = items.filter((n) => !reads.has(n.id)).length;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
            No notifications yet.
          </div>
        ) : items.map((n) => {
          const isRead = reads.has(n.id);
          return (
            <button key={n.id} onClick={() => markRead(n.id)}
              className={`w-full text-left rounded-2xl p-4 shadow-card transition ${isRead ? "bg-card" : "bg-primary/5 border border-primary/20"}`}>
              <div className="flex items-start gap-3">
                <div className="text-xl">{kindIcon(n.kind)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold">{n.title}</div>
                    {!isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
