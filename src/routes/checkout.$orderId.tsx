import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Upload, CheckCircle2, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/checkout/$orderId")({
  component: CheckoutPage,
});

type Order = {
  id: string; order_number: string; amount: number; currency: string;
  status: string; proof_url: string | null; buyer_name: string; buyer_phone: string;
  products: { title: string; cover_url: string | null } | null;
};

type PM = {
  id: string; name: string; kind: string; is_active: boolean;
  details: string | null; link: string | null; embed_html: string | null; instructions: string | null;
};

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [methods, setMethods] = useState<PM[]>([]);
  const [selectedPm, setSelectedPm] = useState<string>("");
  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: `/checkout/${orderId}` } });
  }, [loading, user, nav, orderId]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders")
      .select("id,order_number,amount,currency,status,proof_url,buyer_name,buyer_phone,products(title,cover_url)")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        const o = data as unknown as Order | null;
        setOrder(o);
        if (o) { setName(o.buyer_name ?? ""); setPhone(o.buyer_phone ?? ""); }
      });
    supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => {
        const list = (data as PM[]) ?? [];
        setMethods(list);
        if (list[0]) setSelectedPm(list[0].id);
      });
  }, [user, orderId]);

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">…</div>;
  if (!order) return <div className="p-10 text-center text-muted-foreground">Order not found</div>;

  const pm = methods.find((m) => m.id === selectedPm);

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied");
  };

  const submitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proof) { toast.error("Please upload your payment screenshot"); return; }
    setUploading(true);
    try {
      const path = `${user.id}/${order.id}-${Date.now()}-${proof.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proof);
      if (upErr) throw upErr;

      const { error } = await supabase.from("orders").update({
        proof_url: path,
        status: "pending_review",
        buyer_name: name,
        buyer_phone: phone,
      }).eq("id", order.id);
      if (error) throw error;

      toast.success("Proof uploaded! Admin will confirm shortly.");
      nav({ to: "/account/orders" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setUploading(false); }
  };

  if (order.status === "confirmed") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">Order confirmed!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Check your account to access the product.</p>
        <Link to="/account/orders" className="mt-5 inline-block rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          Go to My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <h1 className="font-display text-2xl font-extrabold">Checkout</h1>
      <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>

      <div className="mt-5 rounded-2xl bg-card p-4 shadow-card flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-hero overflow-hidden">
          {order.products?.cover_url ? <img src={order.products.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>}
        </div>
        <div className="flex-1">
          <div className="font-bold">{order.products?.title}</div>
          <div className="text-xs text-muted-foreground">Digital delivery via WhatsApp + your account</div>
        </div>
        <div className="font-display text-xl font-extrabold text-primary">{formatPrice(Number(order.amount), order.currency)}</div>
      </div>

      {/* Step 1 */}
      <Step n={1} title="Choose how to pay">
        {methods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment methods available. Contact support.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {methods.map((m) => (
                <button key={m.id} type="button" onClick={() => setSelectedPm(m.id)}
                  className={`rounded-xl border-2 p-3 text-left text-sm font-bold transition ${selectedPm === m.id ? "border-primary bg-primary/5" : "border-border bg-muted/40"}`}>
                  {m.name}
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{m.kind}</div>
                </button>
              ))}
            </div>

            {pm?.kind === "manual" && pm.details && (
              <div className="rounded-xl bg-muted p-3 space-y-2">
                <pre className="text-sm whitespace-pre-wrap font-mono">{pm.details}</pre>
                <button type="button" onClick={() => copy(pm.details!)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold">
                  <Copy className="h-3 w-3" /> Copy details
                </button>
              </div>
            )}
            {pm?.kind === "link" && pm.link && (
              <a href={pm.link} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-elegant">
                <ExternalLink className="h-4 w-4" /> Pay {formatPrice(Number(order.amount), order.currency)}
              </a>
            )}
            {pm?.kind === "embed" && pm.embed_html && (
              <div className="rounded-xl bg-card p-3 border border-border" dangerouslySetInnerHTML={{ __html: pm.embed_html }} />
            )}
            {pm?.instructions && (
              <p className="mt-3 text-xs text-muted-foreground whitespace-pre-line">{pm.instructions}</p>
            )}
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Encrypted · escrow protected
            </div>
          </>
        )}
      </Step>

      {/* Step 2 */}
      <Step n={2} title="Upload payment proof">
        <form onSubmit={submitProof} className="space-y-3">
          <Field label="Your full name" value={name} onChange={setName} required />
          <Field label="WhatsApp number" value={phone} onChange={setPhone} required placeholder="6XX XXX XXX" />
          <label className="block">
            <span className="text-sm font-bold">Payment screenshot *</span>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-sm font-semibold hover:bg-muted/70">
              <Upload className="h-4 w-4" /> {proof ? proof.name : "Tap to upload screenshot (JPG/PNG)"}
              <input required type="file" accept="image/*" className="hidden" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
            </label>
          </label>
          <button type="submit" disabled={uploading}
            className="w-full rounded-full bg-success px-6 py-3 text-sm font-bold text-success-foreground disabled:opacity-60">
            {uploading ? "Uploading…" : "Submit proof"}
          </button>
        </form>
      </Step>

      {/* Step 3 */}
      <Step n={3} title="Wait for confirmation">
        <p className="text-sm text-muted-foreground">
          Admin confirms within minutes. You'll receive your product link in <strong>My Orders</strong> + via WhatsApp on <strong>+237 651 010 478</strong>.
        </p>
      </Step>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-display font-bold">{n}</span>
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}
