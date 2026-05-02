import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const sp = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });

  const ref = (() => {
    if (typeof window === "undefined") return undefined;
    const url = new URLSearchParams(window.location.search).get("ref");
    if (url) return url.toUpperCase();
    try { return localStorage.getItem("digistore_ref") ?? undefined; } catch { return undefined; }
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: form.full_name, phone: form.phone, ref },
          },
        });
        if (error) throw error;
        try { localStorage.removeItem("digistore_ref"); localStorage.removeItem("digistore_ref_at"); } catch {}
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      nav({ to: sp.redirect ?? "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Google sign-in failed");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-3xl bg-card p-6 shadow-card">
        <div className="text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="mt-2 font-display text-xl font-extrabold">Digi<span className="text-primary">store</span></div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-bold">
          {(["in", "up"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("rounded-full py-2 transition", mode === m ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {m === "in" ? t("sign_in") : t("sign_up")}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "up" && (
            <>
              <Field label={t("full_name")} value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Jean Dupont" required />
              <Field label={t("phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="6XX XXX XXX" />
            </>
          )}
          <Field type="email" label={t("email")} value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" required />
          <Field type="password" label={t("password")} value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 6 characters" required />

          {mode === "in" && (
            <div className="text-right">
              <Link to="/auth" className="text-sm font-semibold text-primary">{t("forgot_password")}</Link>
            </div>
          )}

          <button disabled={loading} type="submit"
            className="w-full rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60">
            {loading ? "…" : mode === "up" ? t("create_account") : t("sign_in")}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <button onClick={google} className="w-full rounded-full border border-border bg-card px-6 py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-muted">
          <svg className="h-5 w-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 18.9 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.9 29.1 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-5c-1.9 1.4-4.3 2.3-6.9 2.3-5.3 0-9.7-3.4-11.3-8.2l-6.6 5C9.3 38.5 16 43 24 43z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.1-2.2 4-4 5.3l6 5C40.5 35 43.5 30 43.5 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
          {t("continue_google")}
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to our <span className="text-primary font-semibold">Terms</span> and <span className="text-primary font-semibold">Privacy Policy</span>.
        </p>
      </div>
    </div>
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
