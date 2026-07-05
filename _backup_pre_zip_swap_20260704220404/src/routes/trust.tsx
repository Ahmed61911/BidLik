import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Sécurité & confiance — Bidlik" },
      {
        name: "description",
        content:
          "Comment Bidlik protège vos données : authentification, accès, conservation et contacts sécurité.",
      },
    ],
  }),
  component: TrustPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}

function TrustPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sécurité & confiance</h1>
          <p className="text-sm text-muted-foreground">
            Cette page est maintenue par l'équipe Bidlik pour répondre aux questions courantes
            sur la sécurité et la confidentialité de la plateforme. Elle ne constitue pas une
            certification indépendante.
          </p>
        </header>

        <Section title="Authentification & accès">
          <p>
            L'accès aux espaces acheteur, vendeur, expert et administrateur requiert une
            authentification par e-mail et mot de passe. Les mots de passe sont vérifiés
            contre la base publique des fuites connues (Have I Been Pwned) au moment de la
            création du compte.
          </p>
          <p>
            Les rôles utilisateurs sont stockés côté serveur et appliqués via des règles de
            sécurité au niveau base de données (Row-Level Security), pas uniquement côté
            client.
          </p>
        </Section>

        <Section title="Données affichées publiquement">
          <p>
            Les visiteurs non connectés voient uniquement les informations descriptives des
            véhicules (marque, modèle, kilométrage, photos, prix de mise à prix, prix
            courant). Les identités des vendeurs et des enchérisseurs, les prix planchers
            et minimums, ainsi que les statuts internes (paiement, livraison, validations)
            ne sont jamais exposés publiquement.
          </p>
          <p>
            L'historique des enchères affiche les montants sans révéler l'identité des
            autres enchérisseurs.
          </p>
        </Section>

        <Section title="Justificatifs de paiement & documents">
          <p>
            Les justificatifs de paiement sont stockés dans des bucket privés. Seul
            l'acheteur qui a déposé le fichier et les administrateurs peuvent y accéder.
            Les liens sont signés et de courte durée.
          </p>
        </Section>

        <Section title="Hébergement & infrastructure">
          <p>
            Bidlik s'appuie sur l'infrastructure Supabase auto-hébergée locale pour la base de
            données, l'authentification et le stockage. Les communications avec
            l'application sont chiffrées en transit (HTTPS).
          </p>
        </Section>

        <Section title="Conservation & suppression">
          <p>
            Les données de compte, enchères et paiements sont conservées tant que le
            compte est actif. Pour toute demande de suppression ou d'export, contactez
            l'équipe support.
          </p>
        </Section>

        <Section title="Signaler une vulnérabilité">
          <p>
            Si vous découvrez une faille de sécurité, contactez-nous à l'adresse de
            support indiquée dans le pied de page. Merci de ne pas divulguer publiquement
            les détails avant qu'un correctif ne soit en place.
          </p>
        </Section>
    </div>
  );
}
