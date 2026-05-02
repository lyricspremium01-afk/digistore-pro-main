import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard, Users, Package, ShoppingBag, Bell, Settings as SettingsIcon,
  TrendingUp, ArrowLeft, Crown, Wallet, CreditCard,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const nav = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/withdrawals", icon: Wallet, label: "Payouts" },
  { to: "/admin/products", icon: Package, label: "Products" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/payment-methods", icon: CreditCard, label: "Payments" },
  { to: "/admin/affiliate", icon: TrendingUp, label: "Affiliate" },
  { to: "/admin/notifications", icon: Bell, label: "Broadcast" },
  { to: "/admin/settings", icon: SettingsIcon, label: "Settings" },
];

function AdminLayout() {
  const { isAdmin, profile, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/" }); }, [isAdmin, loading, navigate]);

  if (loading) return <div className="min-h-screen bg-sidebar text-sidebar-foreground p-10">…</div>;
  if (!isAdmin) return null;

  const isActive = (to: string, exact?: boolean) => exact ? path === to : path.startsWith(to);

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="md:w-64 md:min-h-screen border-b md:border-b-0 md:border-r border-sidebar-border bg-sidebar">
          <div className="p-5 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><Crown className="h-4 w-4" /></span>
            <div>
              <div className="font-display font-extrabold leading-tight">Digistore</div>
              <div className="text-[11px] text-sidebar-foreground/60">Admin Console</div>
            </div>
          </div>
          <nav className="px-3 pb-4 grid grid-cols-3 md:grid-cols-1 gap-1">
            {nav.map((n) => {
              const active = isActive(n.to, n.exact);
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to}
                  className={cn(
                    "flex md:flex-row flex-col items-center md:items-center md:justify-start gap-2 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold transition",
                    active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                  )}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:block px-5 mt-auto absolute bottom-4">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-primary">
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 bg-sidebar/95 backdrop-blur border-b border-sidebar-border px-5 py-3 flex items-center justify-between">
            <Link to="/" className="md:hidden inline-flex items-center gap-1.5 text-xs text-sidebar-foreground/70">
              <ArrowLeft className="h-3 w-3" /> Site
            </Link>
            <div className="text-sm">Hello, <strong>{profile?.full_name ?? "Admin"}</strong></div>
          </header>
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
