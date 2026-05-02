import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Upload, Package, TrendingUp, DollarSign, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice, slugify, levelLabel } from "@/lib/format";

export const Route = createFileRoute("/account/sell")({
  component: SellPage,
});

type Cat = { id: string; name: string; slug: string };
type SellerProduct = {
  id: string; slug: string; title: string; price: number; currency: string;
  status: string; cover_url: string | null; views: number; sales_count: number;
};

const ACCOUNT_SLUGS = ["social-accounts", "channels", "gaming-accounts"];

function SellPage() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"list" | "new">("list");
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account/sell" } });
  }, [loading, user, nav]);

  const refresh = () => {
    if (!user) return;
    supabase.from("products")
      .select("id,slug,title,price,currency,status,cover_url,views,sales_count")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data as SellerProduct[]) ?? []));

    supabase.from("ledger").select("amount").eq("user_id", user.id).eq("kind", "sale_credit")
      .then(({ data }) => {
        const total = (data ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0);
        setRevenue(total);
      });
  };
  useEffect(refresh, [user]);

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">…</div>;

  const totalSales = products.reduce((s, p) => s + p.sales_count, 0);
  const totalViews = products.reduce((s, p) => s + p.views, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground">{levelLabel(profile?.level ?? 1)} · {profile?.total_sales ?? 0} confirmed sales</p>
        </div>
        <button onClick={() => setTab(tab === "new" ? "list" : "new")}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-elegant">
          <Plus className="h-4 w-4" /> {tab === "new" ? "Cancel" : "New listing"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Package className="h-4 w-4" />} label="Listings" value={String(products.length)} color="text-primary" />
        <Stat icon={<Eye className="h-4 w-4" />} label="Views" value={String(totalViews)} color="text-warning" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Sales" value={String(totalSales)} color="text-success" />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={formatPrice(revenue, "XAF")} color="text-success" small />
      </div>

      {tab === "new" ? (
        <NewProductForm onCreated={() => { setTab("list"); refresh(); }} />
      ) : (
        <div className="mt-6">
          <h2 className="font-display font-bold mb-3">Your listings</h2>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              No listings yet. Click "New listing" to upload.
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => <ProductRow key={p.id} p={p} onChange={refresh} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color, small }: { icon: React.ReactNode; label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${color}`}>{icon}{label}</div>
      <div className={`mt-1 font-display font-extrabold ${small ? "text-base" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function statusColor(s: string) {
  return s === "approved" ? "bg-success/15 text-success"
    : s === "pending" ? "bg-warning/15 text-warning"
    : s === "rejected" ? "bg-destructive/15 text-destructive"
    : "bg-muted text-muted-foreground";
}

function ProductRow({ p, onChange }: { p: SellerProduct; onChange: () => void }) {
  const remove = async () => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
      <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-hero overflow-hidden">
        {p.cover_url ? <img src={p.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to="/p/$slug" params={{ slug: p.slug }} className="font-bold truncate hover:text-primary">{p.title}</Link>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(p.status)}`}>{p.status}</span>
        </div>
        <div className="text-xs text-muted-foreground">{formatPrice(Number(p.price), p.currency)} · {p.sales_count} sales · {p.views} views</div>
      </div>
      <button onClick={remove} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function NewProductForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", category_id: "", price: "", stock: "", short_desc: "", description: "",
    what_youll_learn: "", who_its_for: "", delivery_link: "",
    // account-specific
    platform: "", followers_count: "", engagement_rate: "", niche: "",
    monetized: "", account_age: "", country: "", delivery_method: "credentials",
  });

  useEffect(() => { supabase.from("categories").select("id,name,slug").order("sort_order").then(({ data }) => setCats((data as Cat[]) ?? [])); }, []);

  const selectedCat = cats.find((c) => c.id === form.category_id);
  const isAccount = selectedCat ? ACCOUNT_SLUGS.includes(selectedCat.slug) : false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.delivery_link) { toast.error("Delivery link or instructions required"); return; }
    setBusy(true);
    try {
      let cover_url: string | null = null;
      if (cover) {
        const path = `${user.id}/${Date.now()}-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("product-covers").upload(path, cover, { upsert: false });
        if (upErr) throw upErr;
        cover_url = supabase.storage.from("product-covers").getPublicUrl(path).data.publicUrl;
      }
      const baseSlug = slugify(form.title);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        title: form.title,
        slug,
        category_id: form.category_id || null,
        price: Number(form.price),
        currency: "XAF",
        stock: form.stock ? Number(form.stock) : null,
        short_desc: form.short_desc || null,
        description: form.description || null,
        what_youll_learn: form.what_youll_learn || null,
        who_its_for: form.who_its_for || null,
        delivery_link: form.delivery_link,
        cover_url,
        status: "pending",
        product_type: isAccount ? "account" : "digital",
        platform: form.platform || null,
        followers_count: form.followers_count ? Number(form.followers_count) : null,
        engagement_rate: form.engagement_rate ? Number(form.engagement_rate) : null,
        niche: form.niche || null,
        monetized: form.monetized === "" ? null : form.monetized === "yes",
        account_age: form.account_age || null,
        country: form.country || null,
        delivery_method: form.delivery_method || null,
      });
      if (error) throw error;
      toast.success("Submitted! Awaiting admin approval.");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-card p-5 shadow-card">
      <h2 className="font-display font-bold">Upload a listing</h2>

      <Field label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required placeholder="e.g. Aged 50K IG Finance Page" />

      <label className="block">
        <span className="text-sm font-bold">Category *</span>
        <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm">
          <option value="">Select category…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (F CFA) *" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required placeholder="5000" />
        <Field label="Stock (leave empty = unlimited)" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} placeholder="1" />
      </div>

      {isAccount && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Account details</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform *" value={form.platform} onChange={(v) => setForm({ ...form, platform: v })} required placeholder="Instagram, TikTok, YouTube…" />
            <Field label="Niche" value={form.niche} onChange={(v) => setForm({ ...form, niche: v })} placeholder="Finance, Lifestyle…" />
            <Field label="Followers / Subs" type="number" value={form.followers_count} onChange={(v) => setForm({ ...form, followers_count: v })} placeholder="50000" />
            <Field label="Engagement %" type="number" value={form.engagement_rate} onChange={(v) => setForm({ ...form, engagement_rate: v })} placeholder="3.5" />
            <Field label="Account age" value={form.account_age} onChange={(v) => setForm({ ...form, account_age: v })} placeholder="2 years" />
            <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} placeholder="US, FR, CM…" />
            <label className="block">
              <span className="text-sm font-bold">Monetized?</span>
              <select value={form.monetized} onChange={(e) => setForm({ ...form, monetized: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm">
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold">Delivery method</span>
              <select value={form.delivery_method} onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm">
                <option value="credentials">Login credentials</option>
                <option value="email_transfer">Email transfer</option>
                <option value="recovery_setup">Recovery setup</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <Field label="Short description" value={form.short_desc} onChange={(v) => setForm({ ...form, short_desc: v })} placeholder="One catchy line" />
      <TextArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Full description…" />
      {!isAccount && (
        <>
          <TextArea label="What you'll learn / get" value={form.what_youll_learn} onChange={(v) => setForm({ ...form, what_youll_learn: v })} placeholder="One per line…" />
          <TextArea label="Who it's for" value={form.who_its_for} onChange={(v) => setForm({ ...form, who_its_for: v })} placeholder="Beginners, traders…" />
        </>
      )}

      <Field label={isAccount ? "Delivery link / credentials note *" : "Delivery link * (Drive / Mega / file URL)"}
        value={form.delivery_link} onChange={(v) => setForm({ ...form, delivery_link: v })} required
        placeholder={isAccount ? "How buyer receives the account (paste link or instructions)" : "https://drive.google.com/…"} />

      <label className="block">
        <span className="text-sm font-bold">Cover image</span>
        <div className="mt-1 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-muted px-4 py-3 text-sm font-semibold hover:bg-muted/70">
            <Upload className="h-4 w-4" /> {cover ? cover.name : "Choose image"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </label>

      <button disabled={busy} type="submit"
        className="w-full rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60">
        {busy ? "Uploading…" : "Submit for review"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4}
        className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}
