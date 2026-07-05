import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Car, Users, ClipboardCheck, ShieldCheck, BarChart3, Gavel, ChevronDown, Wallet, UserCheck, Coins } from "lucide-react";

import { requireRole } from "@/lib/routeGuard";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => requireRole(["admin"], location.href),
  head: () => ({
    meta: [
      { title: "Administration — Bidlik" },
      { name: "description", content: "Panneau d'administration Bidlik." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/admin/voitures", label: "Voitures", icon: Car, exact: false },
  { to: "/admin/encheres", label: "Créer enchère", icon: Gavel, exact: false },
  { to: "/admin/experts", label: "Experts", icon: ShieldCheck, exact: false },
  { to: "/admin/validations", label: "Validations", icon: ClipboardCheck, exact: false },
  { to: "/admin/paiements", label: "Paiements", icon: Wallet, exact: false },
  { to: "/admin/cautions", label: "Cautions", icon: Coins, exact: false },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, exact: false },
  { to: "/admin/verifications", label: "Validation comptes", icon: UserCheck, exact: false },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
] as const;

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = NAV.find((item) => (item.exact ? path === item.to : path.startsWith(item.to))) ?? NAV[0];
  const CurrentIcon = current.icon;

  // Close the mobile dropdown on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:py-10">
      <div className="mb-4 border-b border-border pb-3 sm:mb-6 sm:pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent sm:text-xs">
          Espace administrateur
        </p>
      </div>

      {/* Mobile collapsible nav */}
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-nav"
          className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-sm"
        >
          <span className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4 text-accent" />
            {current.label}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <nav
            id="admin-mobile-nav"
            className="mt-2 grid gap-1 rounded-md border border-border bg-card p-1 shadow-sm"
          >
            {NAV.map((item) => {
              const active = item.exact ? path === item.to : path.startsWith(item.to);
              const Icon = item.icon;
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
                  <span>{item.label}</span>
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
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
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
