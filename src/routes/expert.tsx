import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireRole } from "@/lib/routeGuard";

export const Route = createFileRoute("/expert")({
  beforeLoad: ({ location }) => requireRole(["expert", "admin"], location.href),
  head: () => ({
    meta: [
      { title: "Espace expert — Bidlik" },
      { name: "description", content: "Gérez vos inspections et soumettez vos rapports." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ExpertLayout,
});

function ExpertLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Espace expert</p>
      </div>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
