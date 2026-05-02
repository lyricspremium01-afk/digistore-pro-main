import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { WhatsAppBubble } from "@/components/whatsapp-bubble";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { title: "Digistore — Buy & Sell Premium Digital Products" },
      { name: "description", content: "Digistore is a marketplace for premium digital products. Pay via SoleasPay, get delivery within 24h. Become a seller and earn." },
      { name: "theme-color", content: "#2563EB" },
      { property: "og:title", content: "Digistore — Buy & Sell Premium Digital Products" },
      { property: "og:description", content: "Digistore is a marketplace for premium digital products. Pay via SoleasPay, get delivery within 24h. Become a seller and earn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Digistore — Buy & Sell Premium Digital Products" },
      { name: "twitter:description", content: "Digistore is a marketplace for premium digital products. Pay via SoleasPay, get delivery within 24h. Become a seller and earn." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/gkW5lCHglOd1Ukh5E2nihPXEc3n2/social-images/social-1777480822764-file_0000000057587246a7fb8a90006bf752.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/gkW5lCHglOd1Ukh5E2nihPXEc3n2/social-images/social-1777480822764-file_0000000057587246a7fb8a90006bf752.webp" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ReferralCapture />
        <AppShell />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </I18nProvider>
  );
}

function ReferralCapture() {
  // Persist ?ref=CODE in localStorage so it survives navigation until the user signs up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      try {
        localStorage.setItem("digistore_ref", ref.toUpperCase());
        localStorage.setItem("digistore_ref_at", String(Date.now()));
      } catch {}
    }
  }, []);
  return null;
}

function AppShell() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isAdmin = path.startsWith("/admin");

  if (isAdmin) {
    // Admin gets its own dark shell from /admin layout
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-6">
        <Outlet />
      </main>
      <WhatsAppBubble />
      <BottomNav />
    </div>
  );
}
