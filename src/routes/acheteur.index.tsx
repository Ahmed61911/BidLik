import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, Gavel, Trophy, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatMad, buyerPriceTier, buyerPriceTierTextClass } from "@/lib/format";
import { useMesEncheres, useMesNotifications } from "@/lib/supabaseAcheteurStore";

export const Route = createFileRoute("/acheteur/")({
  component: AcheteurOverview,
});

function AcheteurOverview() {
  const { user } = useAuth();
  const cautionOk = user?.cautionValidee ?? false;
  const encheres = useMesEncheres();
  const notifs = useMesNotifications();

  const actives = encheres.filter((e) => e.status === "active").length;
  const enLeader = encheres.filter((e) => e.status === "active" && e.jeSuisLeader).length;
  const gagnees = encheres.filter(
    (e) => e.status === "gagnee" || e.status === "en_attente_validation",
  ).length;
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm text-muted-foreground">Bienvenue</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{user?.nom}</h2>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi
          label="Enchères actives"
          value={String(actives)}
          icon={<Gavel className="h-4 w-4" />}
          hint={enLeader > 0 ? `${enLeader} en tête` : "Aucune en tête"}
          tone={enLeader > 0 ? "ok" : undefined}
        />
        <Kpi
          label="Remportées"
          value={String(gagnees)}
          icon={<Trophy className="h-4 w-4" />}
        />
        <Kpi
          label="Caution"
          value={cautionOk ? formatMad(5000) : "Non validée"}
          icon={<Wallet className="h-4 w-4" />}
          tone={cautionOk ? "ok" : "warn"}
        />
        <Kpi
          label="Notifications"
          value={unread > 0 ? `${unread} non lues` : "À jour"}
          icon={<Bell className="h-4 w-4" />}
          tone={unread > 0 ? "warn" : undefined}
        />
      </div>

      {!cautionOk && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive sm:p-4 sm:text-sm">
          Votre caution n'est pas encore validée. Vous ne pouvez pas placer d'enchères.{" "}
          <Link to="/acheteur/caution" className="font-semibold underline">
            Régulariser
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Mes enchères en cours</h3>
            <Link to="/acheteur/encheres" className="shrink-0 text-xs font-semibold text-accent hover:underline">
              Voir tout →
            </Link>
          </div>
          {encheres.filter((e) => e.status === "active").length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune enchère active. Parcourez les{" "}
              <Link to="/auctions" className="font-semibold text-accent hover:underline">
                enchères en direct
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {encheres
                .filter((e) => e.status === "active")
                .slice(0, 4)
                .map((e) => (
                  <li key={e.auctionId} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        <span className="font-mono text-primary">#{e.carId}</span> — {e.marque} {e.modele}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.jeSuisLeader ? (
                          <span className="text-emerald-600">Vous êtes en tête</span>
                        ) : (
                          <span className="text-destructive">Surenchéri</span>
                        )}
                      </p>
                    </div>
                    <span className={`shrink-0 whitespace-nowrap text-right font-bold ${buyerPriceTierTextClass(buyerPriceTier(e.prixActuel, e.prixAttendu))}`}>{formatMad(e.prixActuel)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications récentes</h3>
            <Link to="/acheteur/notifications" className="shrink-0 text-xs font-semibold text-accent hover:underline">
              Voir tout →
            </Link>
          </div>
          {notifs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Aucune notification.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {notifs.slice(0, 4).map((n) => (
                <li key={n.id} className="py-3 text-sm">
                  <p className="font-semibold text-foreground">{n.titre}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p
        className={[
          "mt-1.5 text-lg font-bold leading-tight break-words sm:mt-2 sm:text-2xl",
          tone === "warn" ? "text-destructive" : tone === "ok" ? "text-emerald-600" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{hint}</p>}
    </div>
  );
}
