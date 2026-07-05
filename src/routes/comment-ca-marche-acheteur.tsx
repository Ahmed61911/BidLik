import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  UserPlus,
  Wallet,
  BookOpen,
  FileSearch,
  Gavel,
  CreditCard,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  BadgeCheck,
  Users,
  Clock,
  Headphones,
  Camera,
  FileText,
  Star,
  Volume2,
  FileCheck,
  Car,
  AlertTriangle,
  Ban,
  Handshake,
  Eye,
  MessageSquare,
  Mail,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Building2,
  Landmark,
  ScrollText,
  Timer,
  ListChecks,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/comment-ca-marche-acheteur")({
  head: () => ({
    meta: [
      { title: "Comment acheter sur Bidlik — Guide acheteur" },
      {
        name: "description",
        content:
          "Guide complet de l'acheteur Bidlik : parcours d'achat, conditions de participation, règles d'enchères, paiement, retrait, sanctions et droits.",
      },
      { property: "og:title", content: "Comment acheter sur Bidlik ?" },
      {
        property: "og:description",
        content:
          "Achetez des véhicules aux enchères en toute transparence : processus sécurisé, expertise indépendante, règles claires.",
      },
    ],
  }),
  component: BuyerGuide,
});

function BuyerGuide() {
  return (
    <div className="font-sans">
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,oklch(0.66_0.21_35_/_0.35),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            <ShieldCheck className="h-3.5 w-3.5" /> Guide acheteur officiel
          </span>
          <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Comment acheter sur <span className="text-accent">Bidlik</span> ?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
            Achetez des véhicules aux enchères en toute transparence grâce à un
            processus sécurisé, des expertises indépendantes et des règles
            claires pour tous les participants.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/auctions"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
            >
              <Gavel className="h-4 w-4" /> Voir les enchères
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Parcours d'achat */}
      <Section eyebrow="Étape par étape" title="Le parcours d'achat">
        <ol className="relative mt-12 space-y-4 border-l border-border pl-6 sm:pl-8">
          {JOURNEY.map((s, i) => (
            <li
              key={s.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <span className="absolute -left-[42px] top-6 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground shadow-md sm:-left-[50px]">
                {i + 1}
              </span>
              <div className="flex items-start gap-4">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent sm:flex">
                  {s.icon}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* SECTION 2 — Conditions de participation */}
      <Section
        alt
        eyebrow="Qui peut enchérir ?"
        title="Conditions de participation"
      >
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={<FileCheck className="h-5 w-5" />}
            title="Dossier validé"
            text="Votre compte doit être vérifié et approuvé par l'équipe Bidlik avant tout accès aux enchères."
          />
          <InfoCard
            icon={<BadgeCheck className="h-5 w-5" />}
            title="Aucune suspension"
            text="Aucune sanction ou suspension active ne doit peser sur votre compte au moment de la session."
          />
          <InfoCard
            icon={<Wallet className="h-5 w-5" />}
            title="Caution obligatoire"
            text="Une caution doit être déposée avant chaque session pour garantir vos engagements."
          />
          <InfoCard
            icon={<Handshake className="h-5 w-5" />}
            title="Statut conventionné"
            text="Les acheteurs récurrents peuvent obtenir un statut conventionné avec caution permanente."
          />
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Caution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-6 py-4 font-semibold text-foreground">Standard</td>
                <td className="px-6 py-4 text-muted-foreground">5 000 MAD par session</td>
              </tr>
              <tr className="bg-accent/5">
                <td className="px-6 py-4 font-semibold text-foreground">
                  Conventionné
                </td>
                <td className="px-6 py-4 text-muted-foreground">Garantie permanente</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION 3 — Déroulement des enchères */}
      <Section eyebrow="Session en direct" title="Déroulement des enchères">
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeaturePoint icon={<Clock />} title="Catalogue 24h avant" text="Le catalogue est publié au minimum 24h avant l'ouverture de la session." />
          <FeaturePoint icon={<Star />} title="Consultation des favoris" text="Constituez votre liste de véhicules favoris pour un suivi rapide." />
          <FeaturePoint icon={<FileText />} title="Rapport PDF" text="Rapport d'expertise détaillé téléchargeable au format PDF." />
          <FeaturePoint icon={<Camera />} title="Photos HD" text="Photos professionnelles haute définition sous tous les angles." />
          <FeaturePoint icon={<Headphones />} title="Audio moteur" text="Écoutez le démarrage et l'accélération du véhicule." />
          <FeaturePoint icon={<Gavel />} title="Proxy Bid" text="Fixez votre offre maximale, le système enchérit à votre place." />
          <FeaturePoint icon={<Timer />} title="Auto-enchère" text="Restez dans la course automatiquement jusqu'à votre plafond." />
          <FeaturePoint icon={<CreditCard />} title="Montants libres" text="Enchérissez au montant exact de votre choix." />
          <FeaturePoint icon={<ArrowRight />} title="Paliers rapides" text="Enchérissez en un clic : +1 000 DH ou +5 000 DH." />
          <FeaturePoint icon={<Lock />} title="Anonymat garanti" text="L'identité des acheteurs reste strictement confidentielle." />
          <FeaturePoint icon={<Volume2 />} title="Flux audio en direct" text="Suivez la session avec le commentaire audio en direct." />
          <FeaturePoint icon={<Eye />} title="Transparence totale" text="Toutes les offres sont visibles en temps réel." />
        </div>
      </Section>

      {/* SECTION 4 — Informations sur chaque véhicule */}
      <Section
        alt
        eyebrow="Fiche véhicule"
        title="Les informations disponibles sur chaque véhicule"
      >
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard icon={<ListChecks className="h-5 w-5" />} title="Fiche technique complète" text="Toutes les caractéristiques mécaniques et administratives du véhicule." />
          <InfoCard icon={<Camera className="h-5 w-5" />} title="Photos professionnelles" text="Vues intérieures, extérieures et détails techniques." />
          <InfoCard icon={<FileText className="h-5 w-5" />} title="Rapport d'expertise" text="Plus de 200 points de contrôle réalisés par un expert indépendant." />
          <InfoCard icon={<Star className="h-5 w-5" />} title="Note sur 10" text="Une note globale synthétique de l'état du véhicule." />
          <InfoCard icon={<Headphones className="h-5 w-5" />} title="Audio démarrage" text="Enregistrement sonore du démarrage à froid." />
          <InfoCard icon={<Volume2 className="h-5 w-5" />} title="Audio accélération" text="Enregistrement du comportement moteur en accélération." />
          <InfoCard icon={<ScrollText className="h-5 w-5" />} title="Documents administratifs" text="Carte grise, historique, contrôle technique le cas échéant." />
          <InfoCard icon={<FileCheck className="h-5 w-5" />} title="Type de mutation" text="Nature exacte de la mutation à effectuer après achat." />
          <InfoCard icon={<Users className="h-5 w-5" />} title="Informations de propriété" text="Historique de propriété et statut administratif du véhicule." />
        </div>

        <Callout tone="warning" icon={<AlertTriangle className="h-5 w-5" />}>
          <strong>Véhicules sans clé :</strong> certains véhicules peuvent être
          proposés sans clé. Les risques associés à ce type de véhicule sont
          clairement indiqués dans la fiche et le rapport d'expertise.
        </Callout>
      </Section>

      {/* SECTION 5 — Règles pendant les enchères */}
      <Section eyebrow="À respecter impérativement" title="Règles pendant les enchères">
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RuleCard title="Toute offre est ferme" text="Une enchère placée engage définitivement l'acheteur." />
          <RuleCard title="Aucun retrait possible" text="Il est impossible de retirer ou annuler une enchère émise." />
          <RuleCard title="Pas de contact vendeur" text="Il est interdit de contacter directement le vendeur du véhicule." />
          <RuleCard title="Pas de contact acheteurs" text="Toute prise de contact entre acheteurs est strictement interdite." />
          <RuleCard title="Aucune collusion" text="Toute entente sur les prix entraîne des sanctions immédiates." />
        </div>
      </Section>

      {/* SECTION 6 — Après avoir remporté */}
      <Section alt eyebrow="Après la victoire" title="Après avoir remporté une enchère">
        <div className="mt-12 grid gap-3 md:grid-cols-6">
          {AFTER_WIN.map((s, i) => (
            <div
              key={s}
              className="relative rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)]"
            >
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{s}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Signification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <StatusRow status="Validé" color="text-emerald-600" text="Véhicule adjugé et vente confirmée" />
              <StatusRow status="En validation" color="text-amber-600" text="En attente de la réponse du vendeur" />
              <StatusRow status="Rejeté" color="text-red-600" text="Vente non conclue" />
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION 7 — Paiement */}
      <Section eyebrow="Modalités financières" title="Paiement">
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                Paiement intégral sous 48h ouvrées
              </h3>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Le règlement complet doit être effectué dans les 48 heures ouvrées
              suivant la confirmation de l'adjudication.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Virement bancaire</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                <Landmark className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Chèque certifié</span>
              </div>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Les coordonnées bancaires sont communiquées après validation de
              l'adjudication.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Frais</th>
                  <th className="px-6 py-4">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-6 py-4 font-semibold text-foreground">Frais de dossier</td>
                  <td className="px-6 py-4 text-muted-foreground">1 000 DH TTC</td>
                </tr>
                <tr className="bg-accent/5">
                  <td className="px-6 py-4 font-semibold text-foreground">Gestion Bidlik</td>
                  <td className="px-6 py-4 text-muted-foreground">+ 1 000 DH TTC</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* SECTION 8 — Désistement */}
      <Section alt eyebrow="Cas exceptionnels" title="Cas autorisés de désistement">
        <p className="mt-6 max-w-3xl text-muted-foreground">
          La vente est réalisée sur la base du rapport d'expertise. L'acheteur
          ne peut se désister que si l'une des situations suivantes est
          formellement constatée :
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WITHDRAWAL.map((w) => (
            <div
              key={w}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span className="text-sm font-medium text-foreground">{w}</span>
            </div>
          ))}
        </div>

        <Callout tone="danger" icon={<AlertTriangle className="h-5 w-5" />}>
          <strong>En dehors de ces cas :</strong> la caution peut être retenue
          intégralement et des sanctions supplémentaires peuvent être appliquées.
        </Callout>
      </Section>

      {/* SECTION 9 — Retrait du véhicule */}
      <Section eyebrow="Sortie du véhicule" title="Retrait du véhicule">
        <p className="mt-6 max-w-3xl text-muted-foreground">
          Aucun véhicule ne peut quitter les locaux Bidlik sans la réunion des
          trois conditions suivantes :
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <RequirementCard icon={<FileCheck />} title="Bon de sortie Bidlik" text="Document officiel remis après validation complète du dossier." />
          <RequirementCard icon={<CreditCard />} title="Paiement reçu" text="Encaissement effectif du règlement intégral." />
          <RequirementCard icon={<ScrollText />} title="Documents signés" text="Ensemble des documents administratifs signés par l'acheteur." />
        </div>
      </Section>

      {/* SECTION 10 — Sanctions */}
      <Section alt eyebrow="Cadre disciplinaire" title="Sanctions">
        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Manquement</th>
                <th className="px-6 py-4">Sanction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <SanctionRow fault="Refus de caution" sanction="Suspension" tone="warn" />
              <SanctionRow fault="Non-paiement" sanction="Exclusion" tone="danger" />
              <SanctionRow fault="Récidive" sanction="Exclusion définitive" tone="danger" />
              <SanctionRow fault="Désistement injustifié" sanction="Rétention caution + suspension" tone="warn" />
              <SanctionRow fault="Contact vendeur" sanction="Suspension" tone="warn" />
              <SanctionRow fault="Retrait sans bon" sanction="Exclusion" tone="danger" />
              <SanctionRow fault="Collusion" sanction="Exclusion définitive" tone="danger" />
              <SanctionRow fault="Fraude" sanction="Exclusion + poursuites" tone="danger" />
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION 11 — Droits */}
      <Section eyebrow="Ce que Bidlik vous garantit" title="Vos droits">
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <RightCard icon={<BookOpen />} title="Consultation du catalogue" text="Accès complet au catalogue avant chaque session." />
          <RightCard icon={<FileText />} title="Rapport complet" text="Rapport d'expertise détaillé pour chaque véhicule." />
          <RightCard icon={<Eye />} title="Inspection avant vente" text="Possibilité de voir physiquement les véhicules avant la session." />
          <RightCard icon={<ShieldCheck />} title="Expert indépendant" text="Recours à un expert indépendant avant paiement." />
          <RightCard icon={<FileCheck />} title="Reçu de caution" text="Reçu officiel émis pour chaque caution déposée." />
          <RightCard icon={<Mail />} title="Notification écrite" text="Toutes les décisions vous sont notifiées par écrit." />
          <RightCard icon={<MessageSquare />} title="Réclamation 48h" text="Vous disposez de 48h pour émettre une réclamation écrite." />
          <RightCard icon={<Clock />} title="Réponse sous 48h" text="Bidlik s'engage à répondre à toute réclamation sous 48h." />
        </div>
      </Section>

      {/* FAQ */}
      <Section alt eyebrow="Questions fréquentes" title="FAQ">
        <Accordion type="single" collapsible className="mx-auto mt-10 max-w-3xl">
          <Faq q="Pourquoi une caution est-elle demandée ?" a="La caution garantit le sérieux de votre engagement et protège les vendeurs contre les enchères non honorées. Elle est restituée intégralement en l'absence d'achat." />
          <Faq q="Puis-je annuler une enchère ?" a="Non. Toute enchère placée est ferme et définitive. Il est impossible de la retirer ou de la modifier après émission." />
          <Faq q="Comment fonctionne le Proxy Bid ?" a="Le Proxy Bid vous permet de fixer un montant maximum. Le système enchérit automatiquement à votre place, palier par palier, jusqu'à ce que votre plafond soit atteint." />
          <Faq q="Quand dois-je payer ?" a="Le paiement intégral doit être effectué sous 48 heures ouvrées après la confirmation de l'adjudication." />
          <Faq q="Comment récupérer mon véhicule ?" a="Le retrait s'effectue sur présentation du bon de sortie Bidlik, après réception du paiement complet et signature de l'ensemble des documents administratifs." />
          <Faq q="Puis-je faire inspecter le véhicule ?" a="Oui. Vous pouvez inspecter physiquement les véhicules avant la session et solliciter un expert indépendant avant le paiement final." />
        </Accordion>
      </Section>

      {/* CTA final */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-accent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(1_0_0_/_0.15),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <h2 className="font-display max-w-3xl text-3xl font-extrabold tracking-tight text-brand-orange sm:text-4xl md:text-5xl">
            Prêt à participer aux enchères ?
          </h2>
          <p className="max-w-2xl text-base text-primary/90">
            Rejoignez les acheteurs professionnels de Bidlik et accédez à des
            ventes automobiles transparentes, sécurisées et en temps réel.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link
              to="/auctions"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Gavel className="h-4 w-4" /> Voir les enchères
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-transparent px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Créer un compte <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------- Data -------------------- */

const JOURNEY = [
  { icon: <UserPlus className="h-5 w-5" />, title: "Créez votre compte", text: "Inscrivez-vous en quelques minutes et transmettez les justificatifs nécessaires à la validation de votre dossier acheteur." },
  { icon: <Wallet className="h-5 w-5" />, title: "Déposez votre caution", text: "Une caution de 5 000 MAD par session (ou permanente pour les conventionnés) est requise avant toute participation." },
  { icon: <BookOpen className="h-5 w-5" />, title: "Consultez le catalogue", text: "Le catalogue est publié 24h avant chaque session. Ajoutez vos véhicules favoris pour un suivi personnalisé." },
  { icon: <FileSearch className="h-5 w-5" />, title: "Analysez le rapport d'expertise", text: "Rapport de plus de 200 points de contrôle, photos HD, audio moteur et documents administratifs sont à votre disposition." },
  { icon: <Gavel className="h-5 w-5" />, title: "Enchérissez en direct", text: "Enchères en temps réel, paliers rapides, Proxy Bid et auto-enchère : tous les outils pour maîtriser votre stratégie." },
  { icon: <CreditCard className="h-5 w-5" />, title: "Paiement sous 48h", text: "Réglez votre achat par virement ou chèque certifié dans les 48 heures ouvrées suivant l'adjudication." },
  { icon: <KeyRound className="h-5 w-5" />, title: "Récupération du véhicule", text: "Sur présentation du bon de sortie Bidlik, après paiement complet et signature des documents administratifs." },
];

const AFTER_WIN = ["Victoire", "Validation", "Paiement sous 48h", "Confirmation", "Bon de sortie", "Retrait"];

const WITHDRAWAL = [
  "Accident non visible dans le rapport",
  "Défaut moteur majeur non déclaré",
  "Opposition administrative non signalée",
  "Pièce importante manquante",
  "Châssis déformé",
];

/* -------------------- Building blocks -------------------- */

function Section({
  children,
  eyebrow,
  title,
  alt = false,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  alt?: boolean;
}) {
  return (
    <section className={alt ? "bg-secondary/40 py-20" : "py-20"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            {eyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        {icon}
      </div>
      <h3 className="font-display mt-5 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function FeaturePoint({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <div>
        <h4 className="font-display text-base font-bold text-foreground">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function RuleCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border-l-4 border-l-red-500 border-y border-r border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div>
          <h4 className="font-display text-base font-bold text-foreground">{title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}

function RequirementCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h3 className="font-display mt-5 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function RightCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-accent/50">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h3 className="font-display mt-5 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusRow({ status, color, text }: { status: string; color: string; text: string }) {
  return (
    <tr>
      <td className="px-6 py-4">
        <span className={`font-semibold ${color}`}>{status}</span>
      </td>
      <td className="px-6 py-4 text-muted-foreground">{text}</td>
    </tr>
  );
}

function SanctionRow({ fault, sanction, tone }: { fault: string; sanction: string; tone: "warn" | "danger" }) {
  const badge =
    tone === "danger"
      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return (
    <tr>
      <td className="px-6 py-4 font-semibold text-foreground">{fault}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
          {tone === "danger" ? <XCircle className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {sanction}
        </span>
      </td>
    </tr>
  );
}

function Callout({
  children,
  icon,
  tone = "warning",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  tone?: "warning" | "danger";
}) {
  const styles =
    tone === "danger"
      ? "border-l-red-500 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-100"
      : "border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100";
  return (
    <div className={`mt-10 flex items-start gap-4 rounded-2xl border-l-4 border-y border-r border-border p-5 shadow-[var(--shadow-card)] ${styles}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <AccordionItem value={q} className="border-border">
      <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">
        {q}
      </AccordionTrigger>
      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
        {a}
      </AccordionContent>
    </AccordionItem>
  );
}
