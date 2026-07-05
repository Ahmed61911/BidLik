import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/routeGuard";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/vendeur/voitures": { title: "Mes voitures", description: "Tous vos véhicules soumis et leur statut." },
  "/vendeur/encheres": { title: "Mes enchères", description: "Suivez uniquement les enchères qui contiennent vos véhicules." },
  "/vendeur/historique": { title: "Historique", description: "Toutes vos ventes finalisées et voitures retirées." },
  "/vendeur/paiements": { title: "Paiements", description: "Historique des virements et commissions Bidlik." },
};

export const Route = createFileRoute("/vendeur")({
  beforeLoad: ({ location }) => requireRole(["vendeur", "admin"], location.href),
  head: () => ({
    meta: [
      { title: "Espace vendeur — Bidlik" },
      { name: "description", content: "Gérez vos véhicules, suivez vos enchères et vos paiements." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VendeurLayout,
});

function VendeurLayout() {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, "") || "/vendeur";
  const isOverview = path === "/vendeur";
  const meta = PAGE_META[path];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:py-10">
      <div className="mb-5 flex flex-col gap-2 border-b border-border pb-4 sm:mb-6">
        {isOverview ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Espace vendeur</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Link
                to="/vendeur"
                aria-label="Retour à la vue d'ensemble"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:h-9 sm:w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="min-w-0 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                {meta?.title ?? "Tableau de bord vendeur"}
              </h1>
            </div>
            {meta?.description && (
              <p className="text-xs text-muted-foreground sm:text-sm">{meta.description}</p>
            )}
          </>
        )}
      </div>

      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
