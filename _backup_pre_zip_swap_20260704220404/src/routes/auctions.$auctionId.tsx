import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getCarExpertise } from "@/lib/supabaseApi";
import type { CarExpertise } from "@/types/expert";
import { subscribeToAuction } from "@/lib/realtime";
import type { Auction, Bid } from "@/types/auction";
import { formatMad, formatDateTime, listingPriceTier, priceTierTextClass, priceTierGradientClass } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { CarGallery } from "@/components/CarGallery";
import { SealedBidPanel } from "@/components/SealedBidPanel";
import { useAuth } from "@/lib/auth";

import { requireRole } from "@/lib/routeGuard";

export const Route = createFileRoute("/auctions/$auctionId")({
  beforeLoad: ({ location }) => requireRole(["acheteur", "admin", "vendeur"], location.href),
  loader: async ({ params }) => {
    const [auction, bids] = await Promise.all([
      api.getAuction(params.auctionId),
      api.listBids(params.auctionId),
    ]);
    const expertise = await getCarExpertise(auction.car.id).catch(() => null);
    return { auction, bids, expertise };
  },
  head: ({ loaderData }) => {
    const car = loaderData?.auction.car;
    const title = car ? `${car.marque} ${car.modele} (${car.annee}) — Bidlik` : "Enchère — Bidlik";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: car
            ? `Enchère en cours sur ${car.marque} ${car.modele} ${car.annee}. ${car.kilometrage.toLocaleString("fr-MA")} km.`
            : "Enchère automobile en direct sur Bidlik.",
        },
        { property: "og:title", content: title },
      ],
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Réessayer
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Enchère introuvable</h1>
      <Link to="/auctions" className="mt-4 inline-block text-accent hover:underline">
        ← Retour aux enchères
      </Link>
    </div>
  ),
  component: AuctionDetailPage,
});

function AuctionDetailPage() {
  const initial = Route.useLoaderData();
  const { user, isAuthenticated, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [auction, setAuction] = useState<Auction>(initial.auction);
  const [bids, setBids] = useState<Bid[]>(initial.bids);
  const [pulseKey, setPulseKey] = useState(0);
  const [autoBid, setAutoBidLocal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [maxBid, setMaxBid] = useState<string>("");

  const isAcheteur = hasRole("acheteur");
  const isVendeur = hasRole("vendeur");
  const userHasBid = !!user && bids.some((b) => b.bidderId === user.id);
  const isLeading = !!user && auction.topBidderId === user.id;
  const cautionOk = user?.cautionValidee ?? false;
  const canBid = isAuthenticated && isAcheteur && cautionOk;

  useEffect(() => {
    const unsub = subscribeToAuction(auction.id, ({ bid }) => {
      setBids((prev) => {
        if (prev.some((b) => b.id === bid.id)) return prev;
        return [bid, ...prev.filter((b) => !b.id.startsWith("optimistic-"))].slice(0, 50);
      });
      setAuction((prev) => {
        if (bid.amount <= prev.currentPrice && prev.topBidderId === bid.bidderId) return prev;
        const msLeft = new Date(prev.endsAt).getTime() - Date.now();
        return {
          ...prev,
          currentPrice: Math.max(prev.currentPrice, bid.amount),
          bidCount: prev.bidCount + 1,
          topBidderId: bid.bidderId,
          endsAt: msLeft <= 120_000
            ? new Date(Date.now() + 120_000).toISOString()
            : prev.endsAt,
        };
      });
      setPulseKey((k) => k + 1);
    });
    return unsub;
  }, [auction.id]);

  const isLive = auction.status === "live";
  const car = auction.car;
  const currentTier = listingPriceTier(auction.currentPrice, car);
  const currentGradientClass = priceTierGradientClass(currentTier);
  const bidAmountClass = (amount: number) =>
    priceTierTextClass(listingPriceTier(amount, car));

  async function placeBid(amount: number, isAuto = false) {
    if (submitting) return;
    if (!canBid) {
      toast.error("Action non autorisée", {
        description: !isAuthenticated
          ? "Connectez-vous pour enchérir."
          : !isAcheteur
            ? "Seuls les acheteurs peuvent placer des enchères."
            : "Votre caution doit être validée avant d'enchérir.",
      });
      return;
    }
    // Optimistic update — UI reacts instantly, server reconciles on response.
    const prevAuction = auction;
    const prevBids = bids;
    const optimisticId = `optimistic-${Date.now()}`;
    setAuction((a) => ({
      ...a,
      currentPrice: amount,
      bidCount: a.bidCount + 1,
      topBidderId: user?.id ?? a.topBidderId,
    }));
    setBids((b) => [
      {
        id: optimisticId,
        auctionId: auction.id,
        carId: auction.car.id,
        bidderId: user?.id ?? "",
        bidderName: user?.nom ?? "Vous",
        amount,
        isAuto,
        createdAt: new Date().toISOString(),
      },
      ...b,
    ].slice(0, 50));
    setPulseKey((k) => k + 1);
    setSubmitting(true);
    try {
      await api.placeBid({ auctionId: auction.id, amount, isAuto });
      toast.success("Offre placée", {
        description: `Votre offre de ${formatMad(amount)} a été enregistrée.`,
      });
    } catch (e) {
      // Roll back optimistic update on failure.
      setAuction(prevAuction);
      setBids(prevBids);
      toast.error("Offre refusée", {
        description: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function placeCustom() {
    const n = Number(customAmount.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Montant invalide");
      return;
    }
    await placeBid(auction.currentPrice + n);
    setCustomAmount("");
  }

  function toggleAutoBid() {
    const next = !autoBid;
    if (next) {
      const max = Number(maxBid.replace(/\s/g, ""));
      if (!Number.isFinite(max) || max <= auction.currentPrice) {
        toast.error("Montant max invalide", {
          description: "Définissez un montant max supérieur à l'offre actuelle.",
        });
        return;
      }
    }
    setAutoBidLocal(next);
    api.setAutoBid(auction.id, next).catch(() => setAutoBidLocal(!next));
    toast(next ? "Auto-enchère activée" : "Auto-enchère désactivée", {
      description: next ? `+1 000 DH automatiquement jusqu'à ${formatMad(Number(maxBid.replace(/\s/g, "")))}.` : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/auctions" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour aux enchères
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT: Vehicle + history */}
        <div className="order-2 lg:order-none">
          <CarGallery images={car.images} marque={car.marque} modele={car.modele} />

          <div className="mt-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                <span className="font-mono text-primary">#{car.id}</span> — {car.marque} {car.modele}
              </h1>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(car.id)
                    .then(() => toast.success(`ID #${car.id} copié`))
                    .catch(() => toast.error("Impossible de copier l'ID"));
                }}
                title="Copier l'ID de la voiture"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
              >
                #{car.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {car.finition} · {car.annee} · vendu par {car.vendeurNom}
            </p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Spec label="MEC (Mise En Circulation)" value={String(car.annee)} />
            <Spec label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
            <Spec label="Carburant" value={car.carburant} cap />
            <Spec label="Transmission" value={car.transmission} cap />
            <Spec label="Puissance fiscale" value={`${car.puissanceFiscale} CV`} />
            {hasRole("admin") && <Spec label="Couleur" value={car.couleurExterieur} />}
            <Spec label="Note expert" value={car.noteExpert ? `${car.noteExpert}/10` : "—"} />
            <Spec label="Nombre de clés" value={String(car.nombreCles)} />
            <Spec label="Type" value={car.type} cap />
            <Spec label="Opposition" value={car.opposition ? "Oui" : "Non"} />
            <Spec label="Main levée" value={car.mainLevee ? "Oui" : "Non"} />
            <Spec label="Carte grise barrée" value={car.carteGriseBarree ? "Oui" : "Non"} />
          </dl>

          {initial.expertise && (
            <ExpertiseSection expertise={initial.expertise} canPreviewPhotos={isAdmin || isAcheteur} />
          )}


          {auction.auctionType === "fermee" ? (
            <section className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-6 text-sm text-foreground">
              <p className="font-semibold">🔒 Enchère à enveloppe fermée</p>
              <p className="mt-1 text-muted-foreground">
                L'historique et les offres concurrentes sont confidentiels. Vous ne verrez que vos propres offres dans le panneau de droite.
              </p>
            </section>
          ) : (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-foreground">Historique des offres</h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                {bids.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Aucune offre pour l'instant. Soyez le premier à enchérir !
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {bids.map((b, i) => (
                      <li key={b.id} className={["flex items-center justify-between gap-3 px-4 py-3 text-sm", i === 0 ? "bg-accent/5" : ""].join(" ")}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                            {b.bidderName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{b.bidderName}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {b.isAuto && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">AUTO</span>
                          )}
                          <span className={`font-bold ${bidAmountClass(b.amount)}`}>{formatMad(b.amount)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT: Bidding panel (sticky on desktop) */}
        <aside className="order-1 lg:order-none lg:sticky lg:top-24 lg:self-start">
          {auction.auctionType === "fermee" ? (
            <SealedBidPanel auction={auction} />
          ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
            <div
              key={pulseKey}
              className={[
                "p-5",
                currentGradientClass,
                "animate-pulse-bid",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/85">
                    Offre actuelle
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {formatMad(auction.currentPrice)}
                  </p>
                  <p className="mt-1 text-xs text-white/85">
                    {auction.bidCount} {auction.bidCount > 1 ? "offres" : "offre"}
                  </p>
                </div>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    EN DIRECT
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3 text-sm text-white/85">
                <span>Temps restant</span>
                <span className="font-mono text-base font-bold text-white">
                  <Countdown endsAt={auction.endsAt} className="!text-white" />
                </span>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {!isLive ? (
                <div className="rounded-lg bg-secondary p-4 text-center text-sm text-secondary-foreground">
                  Cette enchère est terminée.
                </div>
              ) : (isVendeur || isAdmin) && !isAcheteur ? (
                <div className="rounded-md border border-border bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                  👁️ Mode observateur — {isAdmin ? "en tant qu'administrateur, vous pouvez suivre l'enchère en direct" : "en tant que vendeur, vous pouvez suivre l'enchère de votre véhicule en direct"}, mais vous ne pouvez pas y participer.
                </div>
              ) : (
                <>
                  {isAcheteur && cautionOk && userHasBid && (
                    <div
                      className={[
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold",
                        isLeading
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                          isLeading ? "bg-emerald-500 animate-pulse" : "bg-red-500",
                        ].join(" ")}
                      />
                      {isLeading
                        ? "🏆 Vous êtes en tête de l'enchère"
                        : "⚠️ Vous avez été surenchéri"}
                    </div>
                  )}
                  {isAcheteur && cautionOk && !userHasBid && isLive && (
                    <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
                      Vous n'avez pas encore enchéri sur ce lot.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <BidBtn
                      onClick={() => placeBid(auction.currentPrice + 1000)}
                      disabled={submitting}
                    >
                      +1 000 DH
                    </BidBtn>
                    <BidBtn
                      onClick={() => placeBid(auction.currentPrice + 5000)}
                      disabled={submitting}
                    >
                      +5 000 DH
                    </BidBtn>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="Montant à ajouter"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <button
                      onClick={placeCustom}
                      disabled={submitting || !customAmount}
                      className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Enchérir
                    </button>
                  </div>

                  <button
                    onClick={toggleAutoBid}
                    className={[
                      "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                      autoBid
                        ? "border-accent bg-accent/10 text-accent-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={[
                          "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                          autoBid ? "bg-accent" : "bg-muted",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-4 w-4 rounded-full bg-white shadow transition-transform",
                            autoBid ? "translate-x-4" : "translate-x-0",
                          ].join(" ")}
                        />
                      </span>
                      Auto-enchère
                    </span>
                    <span className="text-xs text-muted-foreground">+1 000 DH auto</span>
                  </button>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Montant max (auto-enchère)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxBid}
                      onChange={(e) => setMaxBid(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="ex. 150 000"
                      disabled={autoBid}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      L'auto-enchère placera +1 000 DH jusqu'à ce montant.
                    </p>
                  </div>

                  {!isAuthenticated ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                      🔒 <Link to="/login" className="font-semibold underline">Connectez-vous</Link> pour participer à cette enchère.
                    </div>
                  ) : !isAcheteur ? (
                    <div className="rounded-md border border-border bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                      Seuls les comptes acheteurs peuvent placer des enchères.
                    </div>
                  ) : !cautionOk ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
                      ⚠️ Votre caution n'est pas validée.{" "}
                      <Link to="/acheteur/caution" className="font-semibold underline">
                        Régulariser
                      </Link>
                    </div>
                  ) : (
                    <p className="rounded-md bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                      ✓ Caution validée. Toutes les offres sont fermes et engageantes.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Spec({ label, value, cap }: { label: string; value: string; cap?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={["mt-0.5 text-sm font-semibold text-foreground", cap ? "capitalize" : ""].join(" ")}>
        {value}
      </dd>
    </div>
  );
}

function BidBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-accent px-4 py-3 text-base font-bold text-accent-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ExpertiseSection({
  expertise,
  canPreviewPhotos,
}: {
  expertise: CarExpertise;
  canPreviewPhotos: boolean;
}) {
  const c = expertise.checklist;
  const criteria: { key: keyof NonNullable<CarExpertise["checklist"]>; label: string }[] = [
    { key: "carrosserie", label: "Carrosserie" },
    { key: "moteur", label: "Moteur & boîte" },
    { key: "interieur", label: "Intérieur" },
    { key: "pneus", label: "Pneus & freins" },
    { key: "electronique", label: "Électronique" },
  ];
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-foreground">Rapport d'expertise</h2>
          {expertise.rapportRecuLe && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reçu le {new Date(expertise.rapportRecuLe).toLocaleDateString("fr-MA")}
            </p>
          )}
        </div>
        {expertise.noteFinale != null && (
          <div className="shrink-0 rounded-lg bg-accent/10 px-3 py-1.5 text-base font-bold text-accent">
            ★ {expertise.noteFinale}/10
          </div>
        )}
      </div>

      {c && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {criteria.map(({ key, label }) => {
            const v = Number(c[key] ?? 0);
            return (
              <div key={String(key)}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground">{v}/10</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={[
                      "h-full",
                      v >= 7 ? "bg-emerald-500" : v >= 5 ? "bg-amber-500" : "bg-destructive",
                    ].join(" ")}
                    style={{ width: `${Math.max(0, Math.min(100, v * 10))}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="sm:col-span-2 flex items-center gap-2 text-xs">
            <span
              className={[
                "inline-flex h-2 w-2 rounded-full",
                c.documents ? "bg-emerald-500" : "bg-destructive",
              ].join(" ")}
            />
            <span className="text-muted-foreground">
              Documents complets — {c.documents ? "oui" : "non"}
            </span>
          </div>
        </div>
      )}

      {expertise.commentaire && (
        <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Commentaire de l'expert
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{expertise.commentaire}</p>
        </div>
      )}

      {expertise.rapportUrl && (
        <a
          href={expertise.rapportUrl}
          download={expertise.rapportName ?? "rapport-expertise.pdf"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
        >
          📄 Télécharger le rapport {expertise.rapportName ? `(${expertise.rapportName})` : ""}
        </a>
      )}

      {canPreviewPhotos && expertise.expertImages && expertise.expertImages.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Photos d'expertise ({expertise.expertImages.length})
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {expertise.expertImages.map((src, i) => (
              <a
                key={i}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden rounded-md border border-border"
              >
                <img src={src} alt={`Photo expertise ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {!canPreviewPhotos && (
        <p className="mt-4 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          🔒 Les photos d'expertise sont réservées aux acheteurs et administrateurs.
        </p>
      )}
    </section>
  );
}
