import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Gavel, Trophy, Wallet, Bell, Receipt, ChevronDown } from "lucide-react";
import { requireRole } from "@/lib/routeGuard";
import { useMesNotifications } from "@/lib/supabaseAcheteurStore";

export const Route = createFileRoute("/acheteur")({
  beforeLoad: ({ location }) => requireRole(["acheteur"], location.href),
  head: () => ({
    meta: [
      { title: "Espace acheteur — Bidlik" },
      { name: "description", content: "Suivez vos enchères, votre caution et vos paiements." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AcheteurLayout,
});

const NAV = [
  { to: "/acheteur", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/acheteur/encheres", label: "Mes enchères", icon: Gavel, exact: false },
  { to: "/acheteur/gagnees", label: "Voitures gagnées", icon: Trophy, exact: false },
  { to: "/acheteur/paiements", label: "Paiements", icon: Receipt, exact: false },
  { to: "/acheteur/caution", label: "Caution", icon: Wallet, exact: false },
  { to: "/acheteur/notifications", label: "Notifications", icon: Bell, exact: false, badge: true },
] as const;

function AcheteurLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const notifs = useMesNotifications();
  const unread = notifs.filter((n) => !n.read).length;
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = NAV.find((item) => (item.exact ? path === item.to : path.startsWith(item.to))) ?? NAV[0];
  const CurrentIcon = current.icon;
  const currentBadge = "badge" in current && current.badge && unread > 0;

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:py-10">
      <div className="mb-4 border-b border-border pb-3 sm:mb-6 sm:pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent sm:text-xs">
          Espace acheteur
        </p>
      </div>

      {/* Mobile collapsible nav */}
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="acheteur-mobile-nav"
          className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-sm"
        >
          <span className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4 text-accent" />
            {current.label}
            {currentBadge && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {unread}
              </span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <nav
            id="acheteur-mobile-nav"
            className="mt-2 grid gap-1 rounded-md border border-border bg-card p-1 shadow-sm"
          >
            {NAV.map((item) => {
              const active = item.exact ? path === item.to : path.startsWith(item.to);
              const Icon = item.icon;
              const showBadge = "badge" in item && item.badge && unread > 0;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = item.exact ? path === item.to : path.startsWith(item.to);
              const Icon = item.icon;
              const showBadge = "badge" in item && item.badge && unread > 0;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {showBadge && (
                    <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
