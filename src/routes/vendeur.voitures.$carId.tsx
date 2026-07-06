import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import { getCarExpertise } from "@/lib/supabaseApi";
import { resolveCarImageUrl } from "@/lib/carImages";
import { formatMad } from "@/lib/format";
import type { Car, CarStatus } from "@/types/auction";
import type { CarExpertise } from "@/types/expert";
import { ExpertiseSection } from "./auctions.$auctionId";

export const Route = createFileRoute("/vendeur/voitures/$carId")({
  component: VendeurCarDetailPage,
});

const STATUS_LABEL: Record<CarStatus, { label: string; cls: string }> = {
  open: { label: "Ouverte", cls: "bg-secondary text-secondary-foreground" },
  en_cours: { label: "En cours", cls: "bg-accent/15 text-accent" },
  en_attente_validation: { label: "À valider", cls: "bg-warning/20 text-warning-foreground" },
  expertise: { label: "Expertisé", cls: "bg-primary/15 text-primary" },
  vendu_validee: { label: "Vendue", cls: "bg-success/15 text-success" },
  vendu_annulee: { label: "Annulée", cls: "bg-destructive/15 text-destructive" },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground break-words">{value ?? "—"}</span>
    </div>
  );
}

function VendeurCarDetailPage() {
  const { carId } = Route.useParams();
  const [car, setCar] = useState<Car | null>(null);
  const [expertise, setExpertise] = useState<CarExpertise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      supabaseVendeurApi.getCar(carId),
      getCarExpertise(carId).catch(() => null),
    ])
      .then(([c, ex]) => {
        if (cancelled) return;
        setCar(c);
        setExpertise(ex);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "Impossible de charger cette voiture");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [carId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (error || !car) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{error ?? "Voiture introuvable."}</p>
        </div>
      </div>
    );
  }

  const images = (car.images.length > 0 ? car.images : []).map(resolveCarImageUrl);
  const status = STATUS_LABEL[car.status];

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">#{car.id}</span>
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {car.marque} {car.modele} {car.finition && <span className="text-muted-foreground">· {car.finition}</span>}
          </h2>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
            {images.length > 0 ? (
              <>
                <img
                  src={images[imgIdx]}
                  alt={`${car.marque} ${car.modele} ${imgIdx + 1}/${images.length}`}
                  className="h-full w-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                      aria-label="Précédent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                      aria-label="Suivant"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      {imgIdx + 1} / {images.length}
                    </span>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {images.slice(0, 10).map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${i === imgIdx ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Véhicule</h4>
            <InfoRow label="Marque" value={car.marque} />
            <InfoRow label="Modèle" value={car.modele} />
            <InfoRow label="Finition" value={car.finition || "—"} />
            <InfoRow label="Carrosserie" value={car.bodyType || "—"} />
            <InfoRow label="MEC" value={car.annee} />
            <InfoRow label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
            <InfoRow label="Transmission" value={car.transmission} />
            <InfoRow label="Carburant" value={car.carburant} />
            <InfoRow label="Puissance fiscale" value={`${car.puissanceFiscale} CV`} />
            <InfoRow label="Couleur ext." value={car.couleurExterieur} />
            <InfoRow label="Couleur int." value={car.couleurInterieur} />
          </section>

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administratif</h4>
            <InfoRow label="Nombre de clés" value={car.nombreCles} />
            <InfoRow label="Opposition" value={car.opposition ? "Oui" : "Non"} />
            <InfoRow label="Main levée" value={car.mainLevee ? "Oui" : "Non"} />
            <InfoRow label="Carte grise barrée" value={car.carteGriseBarree ? "Oui" : "Non"} />
            <InfoRow label="Procuration" value={car.procuration} />
          </section>

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prix</h4>
            <InfoRow label="Prix plancher" value={formatMad(car.prixPlancher)} />
            <InfoRow label="Prix minimum" value={car.prixMinimum != null ? formatMad(car.prixMinimum) : "—"} />
          </section>
        </div>
      </div>

      {expertise && <ExpertiseSection expertise={expertise} canPreviewPhotos={expertise.expertImages !== null} />}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/vendeur/voitures"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Retour à mes voitures
    </Link>
  );
}
