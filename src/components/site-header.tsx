import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const onAuthPage = path.startsWith("/auth");

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 h-14">
        {onAuthPage ? (
          <Link to="/" className="text-primary font-semibold flex items-center gap-1">
            ← {t("back_home")}
          </Link>
        ) : (
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Digi<span className="text-primary">store</span>
            </span>
          </Link>
        )}

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-muted p-0.5 text-xs font-semibold">
            {(["en", "fr"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "px-3 py-1 rounded-full transition-all",
                  lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
                aria-label={`Switch to ${l.toUpperCase()}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {!user && !onAuthPage && (
            <Link
              to="/auth"
              className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            >
              {t("sign_in")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
