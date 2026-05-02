import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export const Route = createFileRoute("/account/affiliate")({
  component: Affiliate,
});

function Affiliate() {
  const { profile } = useAuth();
  const link = typeof window !== "undefined" && profile ? `${window.location.origin}/?ref=${profile.referral_code}` : "";
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      <h1 className="font-display text-2xl font-extrabold">Affiliate Board</h1>
      <p className="mt-2 text-muted-foreground">Invite friends and earn 5% of their first sale + 1% of every future sale, for life.</p>
      {profile && (
        <div className="mt-5 rounded-2xl bg-card p-4 shadow-card">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your invite link</div>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={link} className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm" />
            <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied!"); }}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-3 py-2 text-sm font-bold text-primary-foreground">
              <Copy className="h-4 w-4" />Copy
            </button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Your code: <span className="font-mono font-bold text-primary">{profile.referral_code}</span></div>
        </div>
      )}
    </div>
  );
}
