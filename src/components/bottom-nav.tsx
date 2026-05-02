import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Store, Package, PlusCircle, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, key: "home" as const },
  { to: "/shop", icon: Store, key: "shop" as const },
  { to: "/account/orders", icon: Package, key: "orders" as const },
  { to: "/account/sell", icon: PlusCircle, key: "sell" as const, accent: true },
  { to: "/account", icon: User, key: "account" as const },
];

export function BottomNav() {
  const { t } = useI18n();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string) => to === "/" ? path === "/" : path.startsWith(to);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-bottom">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {items.map((it) => {
          const active = isActive(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {it.accent ? (
                  <span className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full -mt-3 shadow-elegant",
                    "bg-gradient-primary text-primary-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </span>
                ) : (
                  <Icon className={cn("h-5 w-5", active && "scale-110")} />
                )}
                <span>{t(it.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
