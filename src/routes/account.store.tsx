import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store as StoreIcon, Upload, ExternalLink, ArrowLeft, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account/store")({
  component: MyStorePage,
});

type Store = {
  id: string;
  user_id: string;
  store_name: string;
  description: string | null;
  profile_image_url: string | null;
  store_link: string;
};

function MyStorePage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth", search: { redirect: "/account/store" } });
  }, [authLoading, user, nav]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: s }, { count }] = await Promise.all([
      supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "approved"),
    ]);
    setStore((s as Store) ?? null);
    setApprovedCount(count ?? 0);
    if (s) {
      setStoreName(s.store_name);
      setDescription(s.description ?? "");
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const save = async () => {
    if (!store) return;
    setSaving(true);
    const { error } = await supabase.from("stores")
      .update({ store_name: storeName, description })
      .eq("id", store.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Store updated");
    load();
  };

  const uploadImage = async (file: File) => {
    if (!user || !store) return;
    setUploading(true);
    try {
      const path = `${user.id}/store-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("stores").update({ profile_image_url: url }).eq("id", store.id);
      if (error) throw error;
      toast.success("Image updated");
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  };

  if (authLoading || loading) return <div className="p-10 text-center text-muted-foreground">…</div>;

  const storeUrl = store ? `${window.location.origin}/store/${store.store_link}` : "";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-24">
      <div className="flex items-center gap-2">
        <Link to="/account" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl font-extrabold">My Store</h1>
      </div>

      {!store ? (
        <div className="mt-8 rounded-2xl bg-card p-8 text-center shadow-card">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <StoreIcon className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-xl font-extrabold">Unlock your store</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Get <strong>3 approved products</strong> and your personal store opens automatically with its own shareable link.
          </p>
          <div className="mt-4 mx-auto max-w-xs">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all" style={{ width: `${Math.min(100, (approvedCount / 3) * 100)}%` }} />
            </div>
            <div className="mt-2 text-xs font-bold">{approvedCount} / 3 approved products</div>
          </div>
          <Link to="/account/sell" className="mt-5 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-elegant">
            Upload products →
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase text-muted-foreground">Public store link</div>
                <a href={storeUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold truncate block hover:underline">
                  {storeUrl}
                </a>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(storeUrl); toast.success("Copied"); }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/70">
                  <Copy className="h-4 w-4" />
                </button>
                <Link to="/store/$link" params={{ link: store.store_link }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-primary overflow-hidden flex items-center justify-center">
                {store.profile_image_url ? (
                  <img src={store.profile_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <StoreIcon className="h-8 w-8 text-primary-foreground" />
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Change image"}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Store name</span>
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={80}
                className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={500}
                placeholder="Tell buyers about your store, expertise and what makes you unique…"
                className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>

            <button onClick={save} disabled={saving}
              className="w-full rounded-full bg-gradient-primary py-3 font-bold text-primary-foreground shadow-elegant disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
