import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/comment-ca-marche")({
  head: () => ({
    meta: [
      { title: "Comment ça marche — Bidlik" },
      {
        name: "description",
        content:
          "Découvrez le fonctionnement des enchères automobiles Bidlik : inspection, enchère 24h, paiement sécurisé.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const BUYER_STEPS = [
  {
    n: "01",
    title: "Inscrivez-vous et déposez votre caution",
    text: "Créez votre compte en quelques secondes. Une caution est nécessaire avant de pouvoir enchérir.",
  },
  {
    n: "02",
    title: "Parcourez les voitures expertisées",
    text: "Toutes les voitures sont inspectées par un expert indépendant et notées sur 10. Tout est transparent.",
  },
  {
    n: "03",
    title: "Enchérissez en temps réel",
    text: "Placez vos offres en un clic (+1 000 DH, +5 000 DH ou montant libre). Activez l'auto-enchère pour ne jamais perdre de vue.",
  },
  {
    n: "04",
    title: "Validation et paiement",
    text: "L'enchère dure 24h. Après validation par l'administrateur, vous avez 48h pour régler votre achat.",
  },
];

const SELLER_STEPS = [
  {
    n: "01",
    title: "Soumettez votre voiture",
    text: "Depuis votre espace vendeur, renseignez les informations de votre véhicule (marque, modèle, kilométrage, prix attendu) et envoyez votre demande à l'administrateur.",
  },
  {
    n: "02",
    title: "Validation et inspection par un expert",
    text: "L'administrateur valide la soumission puis assigne un expert indépendant. L'expert se déplace, inspecte le véhicule, prend les photos commerciales et rédige un rapport noté sur 10.",
  },
  {
    n: "03",
    title: "Mise en enchère",
    text: "Une fois le rapport reçu, votre voiture est intégrée à un événement d'enchère. Vous suivez en direct les offres des acheteurs depuis « Mes enchères ».",
  },
  {
    n: "04",
    title: "Clôture et validation de la vente",
    text: "À la fin des 24h, l'administrateur valide la meilleure offre. L'acheteur dispose alors de 48h pour régler le montant final.",
  },
  {
    n: "05",
    title: "Paiement et livraison",
    text: "Après réception du paiement, la commission Bidlik est déduite et le montant net vous est viré. Vous suivez le statut depuis « Paiements ».",
  },
];

function HowItWorksPage() {
  const { hasRole } = useAuth();
  const isVendeur = hasRole("vendeur") && !hasRole("admin");

  const steps = isVendeur ? SELLER_STEPS : BUYER_STEPS;
  const title = isVendeur ? "Comment vendre sur Bidlik ?" : "Comment fonctionne Bidlik ?";
  const subtitle = isVendeur
    ? "Le parcours complet de la soumission de votre voiture jusqu'au virement de votre paiement."
    : "Une plateforme d'enchères automobiles transparente, en temps réel, sécurisée — au Maroc.";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
      </header>

      <ol className="mt-10 space-y-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="flex gap-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <span className="accent-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white">
              {s.n}
            </span>
            <div>
              <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="hero-gradient mt-12 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold">
          {isVendeur ? "Prêt à vendre votre voiture ?" : "Prêt à enchérir ?"}
        </h2>
        <p className="mt-2 text-sm text-white/80">
          {isVendeur
            ? "Soumettez votre véhicule depuis votre espace vendeur."
            : "Découvrez les enchères en cours dès maintenant."}
        </p>
        <Link
          to={isVendeur ? "/vendeur/voitures" : "/auctions"}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
        >
          {isVendeur ? "Soumettre ma voiture" : "Voir les enchères"}
        </Link>
      </div>
    </div>
  );
}
