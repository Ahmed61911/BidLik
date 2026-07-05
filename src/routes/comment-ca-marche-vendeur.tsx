import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PhoneCall,
  ClipboardCheck,
  Search,
  Camera,
  Megaphone,
  Gavel,
  CheckCircle2,
  CreditCard,
  Banknote,
  FileText,
  Wrench,
  Car,
  Sofa,
  ShieldCheck,
  Star,
  ListChecks,
  Volume2,
  Eye,
  Users,
  Lock,
  Headset,
  Globe2,
  Activity,
  Sparkles,
  FolderCheck,
  CalendarClock,
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  HandshakeIcon,
  PenTool,
} from "lucide-react";

export const Route = createFileRoute("/comment-ca-marche-vendeur")({
  head: () => ({
    meta: [
      { title: "Comment vendre sur Bidlik — Guide vendeur" },
      {
        name: "description",
        content:
          "Guide complet du vendeur Bidlik : nous prenons en charge l'expertise, la création de l'annonce et l'organisation des enchères pour une vente transparente et sécurisée.",
      },
      { property: "og:title", content: "Comment vendre sur Bidlik ?" },
      {
        property: "og:description",
        content:
          "Confiez votre véhicule à Bidlik. Nous gérons l'expertise, l'annonce et les enchères — vous suivez la vente depuis votre espace vendeur.",
      },
    ],
  }),
  component: SellerGuide,
});

function SellerGuide() {
  return (
    <div className="font-sans">
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,oklch(0.66_0.21_35_/_0.35),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            <BadgeCheck className="h-3.5 w-3.5" /> Guide vendeur officiel
          </span>
          <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Comment vendre votre véhicule sur{" "}
            <span className="text-accent">Bidlik</span> ?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
            Confiez votre véhicule à Bidlik. Nous prenons en charge l'expertise,
            la création de l'annonce et l'organisation des enchères afin de vous
            offrir une vente transparente, sécurisée et professionnelle.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
            >
              <PhoneCall className="h-4 w-4" /> Nous contacter
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 0 — Modèle géré */}
      <section className="border-b border-border bg-accent/5 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-start gap-6 rounded-2xl border border-accent/30 bg-card p-8 shadow-[var(--shadow-card)] md:flex-row md:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <HandshakeIcon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                Une vente entièrement gérée par Bidlik
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Vous n'avez ni annonce à créer, ni photos à téléverser, ni fiche
                à remplir. Notre équipe s'occupe de tout : validation du
                dossier, organisation de l'expertise, création de l'annonce et
                mise aux enchères. Vous suivez simplement l'évolution de votre
                vente depuis votre espace vendeur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Parcours vendeur */}
      <Section eyebrow="De A à Z" title="Votre parcours vendeur">
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
                  {s.bullets && (
                    <ul className="mt-3 space-y-1.5">
                      {s.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* SECTION 2 — Conditions */}
      <Section alt eyebrow="Prérequis" title="Conditions pour vendre">
        <p className="mt-6 max-w-3xl text-muted-foreground">
          Pour que Bidlik puisse intégrer votre véhicule à une session
          d'enchères, quelques informations et documents sont indispensables.
          Notre équipe vous guide à chaque étape.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={<FileText className="h-5 w-5" />}
            title="Documents de propriété"
            text="La carte grise originale ou tout document officiel prouvant que vous êtes le propriétaire du véhicule."
          />
          <InfoCard
            icon={<ListChecks className="h-5 w-5" />}
            title="Informations exactes"
            text="Communiquez avec précision la marque, le modèle, l'année, l'état général et l'historique du véhicule."
          />
          <InfoCard
            icon={<Activity className="h-5 w-5" />}
            title="Kilométrage réel"
            text="Le kilométrage exact affiché au compteur doit être déclaré, sans arrondi ni approximation."
          />
          <InfoCard
            icon={<FolderCheck className="h-5 w-5" />}
            title="Documents administratifs"
            text="Rassemblez les documents nécessaires à la mutation et à la sortie du véhicule."
          />
          <InfoCard
            icon={<CalendarClock className="h-5 w-5" />}
            title="Disponibilité pour l'expertise"
            text="Le véhicule doit être accessible pour que l'expert indépendant mandaté par Bidlik puisse l'inspecter."
          />
          <InfoCard
            icon={<PenTool className="h-5 w-5" />}
            title="Mandat de vente"
            text="Un mandat clair est signé avec Bidlik afin d'encadrer l'ensemble de la vente aux enchères."
          />
        </div>

        <Callout tone="warning" icon={<AlertTriangle className="h-5 w-5" />}>
          <strong>Attention :</strong> toute information inexacte ou incomplète
          peut entraîner un report de la mise en vente, une décote significative,
          voire un refus d'intégration à une session d'enchères.
        </Callout>
      </Section>

      {/* SECTION 3 — Expertise */}
      <Section
        eyebrow="Transparence garantie"
        title="Une expertise indépendante pour une vente en toute transparence"
      >
        <p className="mt-6 max-w-3xl text-muted-foreground">
          Chaque véhicule confié à Bidlik est inspecté par un expert automobile
          indépendant. Le rapport complet est ensuite rendu accessible aux
          acheteurs pour garantir une transparence totale.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard icon={<Wrench className="h-5 w-5" />} title="Inspection mécanique" text="Analyse du moteur, de la transmission et des organes de sécurité." />
          <InfoCard icon={<Car className="h-5 w-5" />} title="Contrôle carrosserie" text="Vérification de la structure, de la peinture et des éléments extérieurs." />
          <InfoCard icon={<Sofa className="h-5 w-5" />} title="Contrôle intérieur" text="Évaluation de l'habitacle, des équipements et des finitions." />
          <InfoCard icon={<ShieldCheck className="h-5 w-5" />} title="Vérification administrative" text="Contrôle de la conformité et de la validité des documents." />
          <InfoCard icon={<ListChecks className="h-5 w-5" />} title="+ de 200 points de contrôle" text="Un référentiel d'expertise exhaustif et standardisé." />
          <InfoCard icon={<FileText className="h-5 w-5" />} title="Rapport détaillé" text="Un document complet remis au format PDF, accessible aux acheteurs." />
          <InfoCard icon={<Star className="h-5 w-5" />} title="Note globale sur 10" text="Une notation synthétique reflétant l'état général du véhicule." />
          <InfoCard icon={<Camera className="h-5 w-5" />} title="Photos professionnelles" text="Reportage photo HD réalisé par notre équipe sous tous les angles." />
          <InfoCard icon={<Volume2 className="h-5 w-5" />} title="Enregistrements audio" text="Captation sonore du démarrage à froid et du moteur lorsque nécessaire." />
        </div>
      </Section>

      {/* SECTION 4 — Déroulement de la vente */}
      <Section alt eyebrow="Déroulement" title="Déroulement de la vente">
        <p className="mt-6 max-w-3xl text-muted-foreground">
          Une fois votre véhicule prêt, Bidlik le publie dans une session
          d'enchères. Vous n'avez rien à gérer : vous suivez simplement les
          offres depuis votre espace vendeur.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <FlowStep n={1} title="Publication en session" text="Votre véhicule est intégré à la prochaine session d'enchères adaptée." />
          <FlowStep n={2} title="Consultation du dossier" text="Les acheteurs consultent photos, rapport d'expertise et documents." />
          <FlowStep n={3} title="Enchères en temps réel" text="Les offres sont visibles en direct pendant toute la session." />
          <FlowStep n={4} title="Suivi depuis votre espace" text="Vous suivez l'évolution de la vente en direct depuis votre tableau de bord." />
          <FlowStep n={5} title="Validation de l'offre" text="La meilleure offre est validée conformément aux règles Bidlik." />
        </div>
      </Section>

      {/* SECTION 5 — Après la vente */}
      <Section eyebrow="Après la vente" title="Après la vente">
        <div className="mt-12 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {AFTER_CLOSE.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* SECTION 6 — Paiement */}
      <Section alt eyebrow="Modalités financières" title="Paiement">
        <p className="mt-6 max-w-3xl text-muted-foreground">
          Le paiement du vendeur intervient uniquement après réception effective
          des fonds de l'acheteur. La commission Bidlik est déduite avant le
          versement du montant net.
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <PaymentCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Après réception effective des fonds"
            text="Le versement au vendeur est déclenché uniquement après l'encaissement complet du paiement de l'acheteur, garantissant une sécurité totale."
          />
          <PaymentCard
            icon={<Banknote className="h-5 w-5" />}
            title="Commission déduite avant versement"
            text="La commission Bidlik est prélevée automatiquement avant transfert. Vous recevez le montant net, sans démarche supplémentaire de votre part."
          />
          <PaymentCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Montant net garanti"
            text="Le solde net vous est viré directement sur le compte bancaire renseigné dans votre espace vendeur."
          />
          <PaymentCard
            icon={<Activity className="h-5 w-5" />}
            title="Suivi depuis votre espace"
            text="Consultez à tout moment le statut du paiement et l'historique complet depuis votre espace vendeur."
          />
        </div>
      </Section>

      {/* SECTION 7 — Pourquoi vendre */}
      <Section eyebrow="Vos avantages" title="Pourquoi vendre avec Bidlik ?">
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Advantage icon={<Search />} title="Expertise indépendante" text="Un expert tiers évalue objectivement votre véhicule." />
          <Advantage icon={<Headset />} title="Accompagnement complet" text="Un interlocuteur Bidlik vous suit à chaque étape." />
          <Advantage icon={<Sparkles />} title="Aucune annonce à gérer" text="Bidlik crée l'intégralité de la fiche de votre véhicule." />
          <Advantage icon={<Camera />} title="Photos professionnelles" text="Un reportage photo HD réalisé par notre équipe." />
          <Advantage icon={<Eye />} title="Vente transparente" text="Toutes les offres sont visibles en temps réel." />
          <Advantage icon={<Users />} title="Acheteurs qualifiés" text="Uniquement des professionnels référencés et vérifiés." />
          <Advantage icon={<Lock />} title="Paiement sécurisé" text="Versement uniquement après encaissement effectif." />
          <Advantage icon={<FolderCheck />} title="Accompagnement administratif" text="Nous vous guidons dans les formalités liées à la vente." />
          <Advantage icon={<Globe2 />} title="Visibilité nationale" text="Un réseau d'acheteurs actifs partout au Maroc." />
          <Advantage icon={<Activity />} title="Suivi en temps réel" text="Un tableau de bord clair et instantané." />
        </div>
      </Section>

      {/* SECTION 8 — Bonnes pratiques */}
      <Section alt eyebrow="Facilitez votre vente" title="Conseils pour faciliter votre vente">
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PracticeCard icon={<ListChecks />} title="Fournir des informations précises" text="Des données exactes accélèrent la validation et rassurent les acheteurs." />
          <PracticeCard icon={<FolderCheck />} title="Préparer les documents administratifs" text="Un dossier complet évite tout retard dans la mise en vente." />
          <PracticeCard icon={<CalendarClock />} title="Rendre le véhicule disponible pour l'expertise" text="Une disponibilité rapide permet d'intégrer la prochaine session d'enchères." />
          <PracticeCard icon={<PhoneCall />} title="Rester joignable pendant la vente" text="Une réactivité constante fluidifie l'ensemble du processus." />
          <PracticeCard icon={<Activity />} title="Suivre régulièrement votre espace vendeur" text="Consultez les offres et notifications pour ne rien manquer." />
          <PracticeCard icon={<Sparkles />} title="Présenter un véhicule propre" text="Un véhicule soigné met en valeur son état réel lors de l'expertise." />
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="Questions fréquentes" title="FAQ">
        <Accordion type="single" collapsible className="mx-auto mt-10 max-w-3xl">
          <Faq
            q="Comment proposer mon véhicule à Bidlik ?"
            a="Contactez simplement notre équipe via le formulaire de contact ou par téléphone. Vous nous communiquez les informations principales de votre véhicule et nous revenons vers vous rapidement pour valider votre dossier."
          />
          <Faq
            q="Qui crée l'annonce de mon véhicule ?"
            a="C'est l'équipe Bidlik qui prend en charge la création complète de la fiche du véhicule, à partir des informations validées et du rapport d'expertise. Vous n'avez aucune annonce à rédiger, aucune photo à téléverser, aucun formulaire à remplir sur la plateforme."
          />
          <Faq
            q="Qui réalise l'expertise ?"
            a="L'expertise est confiée à un expert automobile indépendant mandaté par Bidlik, sans lien avec le vendeur ni les acheteurs. Cela garantit une évaluation totalement objective et transparente."
          />
          <Faq
            q="Puis-je suivre les enchères ?"
            a="Oui. Depuis votre espace vendeur, vous suivez en temps réel l'évolution des offres, le nombre d'enchérisseurs et l'état de la session."
          />
          <Faq
            q="Quand serai-je payé ?"
            a="Le versement est effectué après réception effective des fonds de l'acheteur (règlement à effectuer sous 48 heures). Bidlik déduit sa commission puis vous verse le montant net sur votre compte bancaire."
          />
          <Faq
            q="Puis-je retirer mon véhicule avant la mise aux enchères ?"
            a="Le retrait est possible tant que le véhicule n'a pas été intégré à une session active. Une fois la session ouverte, un retrait ne peut être envisagé qu'à titre exceptionnel et sur validation de Bidlik."
          />
          <Faq
            q="Que se passe-t-il si la meilleure offre n'est pas validée ?"
            a="Si l'offre finale n'est pas confirmée, le véhicule peut être reproposé lors d'une session ultérieure. Vous êtes informé par notification depuis votre espace vendeur."
          />
        </Accordion>
      </Section>

      {/* CTA final */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-accent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(1_0_0_/_0.15),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <h2 className="font-display max-w-3xl text-3xl font-extrabold tracking-tight text-brand-orange sm:text-4xl md:text-5xl">
            Prêt à vendre votre véhicule ?
          </h2>
          <p className="max-w-2xl text-base text-primary/90">
            Contactez l'équipe Bidlik. Nous nous chargeons de l'expertise, de la
            création de l'annonce et de toute l'organisation de la vente afin de
            vous offrir une expérience simple, sécurisée et transparente.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <PhoneCall className="h-4 w-4" /> Nous contacter
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-transparent px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Créer un compte vendeur <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------- Data -------------------- */

const JOURNEY: {
  icon: React.ReactNode;
  title: string;
  text: string;
  bullets?: string[];
}[] = [
  {
    icon: <PhoneCall className="h-5 w-5" />,
    title: "Contactez Bidlik",
    text: "Le vendeur contacte notre équipe et transmet les informations principales concernant son véhicule (marque, modèle, année, kilométrage, état général, etc.).",
  },
  {
    icon: <ClipboardCheck className="h-5 w-5" />,
    title: "Validation du dossier",
    text: "Notre équipe vérifie les informations et confirme que le véhicule peut être intégré à une prochaine session d'enchères.",
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Expertise indépendante",
    text: "Un expert mandaté par Bidlik inspecte le véhicule et réalise notamment :",
    bullets: [
      "plus de 200 points de contrôle",
      "les photos commerciales",
      "les enregistrements nécessaires",
      "le rapport d'expertise",
      "une note globale sur 10",
    ],
  },
  {
    icon: <PenTool className="h-5 w-5" />,
    title: "Création de l'annonce",
    text: "L'équipe Bidlik crée entièrement la fiche du véhicule à partir des informations validées et du rapport d'expertise. Le vendeur n'a aucune annonce à créer lui-même.",
  },
  {
    icon: <Megaphone className="h-5 w-5" />,
    title: "Mise aux enchères",
    text: "Le véhicule est intégré à une session. Les acheteurs consultent les photos, le rapport et les documents disponibles, puis enchérissent en temps réel. Le vendeur suit l'évolution directement depuis son espace vendeur.",
  },
  {
    icon: <Gavel className="h-5 w-5" />,
    title: "Validation de la meilleure offre",
    text: "À la fin de la session, Bidlik procède à la validation de l'enchère conformément aux règles de la plateforme.",
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Paiement de l'acheteur",
    text: "L'acheteur dispose de 48 heures pour effectuer le règlement intégral du véhicule.",
  },
  {
    icon: <Banknote className="h-5 w-5" />,
    title: "Versement au vendeur",
    text: "Après réception effective des fonds, Bidlik déduit sa commission puis procède au versement du montant net au vendeur avant la remise du véhicule.",
  },
];

const AFTER_CLOSE = [
  { title: "Fin des enchères", text: "Clôture officielle de la session." },
  { title: "Validation de l'adjudication", text: "Contrôle et confirmation de la meilleure offre." },
  { title: "Paiement de l'acheteur", text: "Règlement effectué sous 48 heures." },
  { title: "Confirmation du règlement", text: "Encaissement effectif validé par Bidlik." },
  { title: "Versement du montant net", text: "Virement au vendeur après commission." },
  { title: "Remise du véhicule", text: "Organisation de la remise à l'acheteur." },
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
        <div className="max-w-3xl">
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

function FlowStep({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
        {n}
      </div>
      <h4 className="font-display mt-4 text-base font-bold text-foreground">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PaymentCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </div>
      <div>
        <h4 className="font-display text-lg font-bold text-foreground">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Advantage({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-elevated)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h3 className="font-display mt-5 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PracticeCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border-l-4 border-l-accent border-y border-r border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
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
