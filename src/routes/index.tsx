import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck,
  Smartphone,
  TrendingUp,
  HandshakeIcon,
  CheckCircle2,
  ArrowRight,
  Gavel,
  Car,
} from "lucide-react";
import heroCarsRow from "@/assets/hero-car-lot.png";
import { NextAuctionCountdown } from "@/components/NextAuctionCountdown";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bidlik — Enchères automobiles professionnelles au Maroc" },
      {
        name: "description",
        content:
          "BIDLIK organise des enchères en ligne entre entreprises, loueurs et marchands automobiles référencés au Maroc. Transparent, sécurisé, sans tracas.",
      },
      { property: "og:title", content: "Bidlik — Accueil" },
      {
        property: "og:description",
        content:
          "Vendez vos véhicules en fin de vie au juste prix. Achetez en toute confiance.",
      },
    ],
  }),
  component: HomeV3,
});

function HomeV3() {
  return (
    <div className="font-sans">
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,oklch(0.66_0.21_35_/_0.35),transparent_60%)]" />
        <div className="absolute right-0 top-[10%] z-0 hidden h-[80%] w-[40%] overflow-hidden border border-white/10 shadow-2xl md:block">
          <img
            src={heroCarsRow}
            alt="Rangée de véhicules professionnels en vente sur Bidlik"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              LA PREMIÈRE PLATEFORME D'ENCHÈRES EN LIGNE AU MAROC
            </span>
            <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Vendez vos véhicules en fin de vie{" "}
              <span className="text-accent">au juste prix.</span>
              <br />
              Achetez en toute confiance.
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/75 sm:text-lg">
              BIDLIK organise des enchères en ligne entre particuliers et
              professionnels de l'automobile référencés au Maroc.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/auctions"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
              >
                <Gavel className="h-4 w-4" />
                Je veux acheter
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
              >
                <Car className="h-4 w-4" />
                Je veux vendre mon parc
              </Link>
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
      </section>

      <NextAuctionCountdown />

      {/* 4 PILIERS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Nos engagements
          </p>
          <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Quatre piliers, une seule promesse.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Pillar
            icon={<ShieldCheck className="h-5 w-5" />}
            title="La confiance"
            text="Chaque véhicule est expertisé, chaque acheteur est vérifié et caution déposée."
          />
          <Pillar
            icon={<Smartphone className="h-5 w-5" />}
            title="La simplicité"
            text="Enchérissez où vous voulez, quand vous voulez, depuis votre téléphone."
          />
          <Pillar
            icon={<TrendingUp className="h-5 w-5" />}
            title="La performance"
            text="Un marché ouvert entre professionnels pour le meilleur prix, sans intermédiaire inutile."
          />
          <Pillar
            icon={<HandshakeIcon className="h-5 w-5" />}
            title="L'accompagnement"
            text="Une équipe BIDLIK vous suit du dépôt du dossier jusqu'à la sortie du véhicule."
          />
        </div>
      </section>

      {/* SECTION ACHETEURS */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Pour les acheteurs
            </p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Achetez des véhicules professionnels, en toute transparence
            </h2>
            <p className="mt-5 text-muted-foreground">
              BIDLIK donne accès aux marchands et revendeurs référencés à des
              véhicules issus de flottes et de particuliers — avec un rapport
              d'expertise complet et des photos détaillées pour chaque véhicule.
              Vous enchérissez en ligne, à votre rythme, avec la possibilité de
              voir les véhicules physiquement avant le démarrage effectif des
              enchères. Une fois l'enchère gagnée, le paiement et la sortie du
              véhicule sont encadrés étape par étape par notre équipe.
            </p>
            <ul className="mt-6 space-y-3">
              <Bullet>Véhicules expertisés avant chaque session</Bullet>
              <Bullet>Enchères 100% en ligne, accessibles depuis votre mobile</Bullet>
              <Bullet>Caution sécurisée, règles claires, aucune mauvaise surprise</Bullet>
              <Bullet>Un interlocuteur dédié pour vous accompagner</Bullet>
            </ul>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Devenir acheteur référencé
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Caution standard" value="5 000" suffix="MAD / session" />
            <StatCard label="CATALOGUE DISPONIBLE" value="72h" suffix="avant session" />
            <StatCard label="Points d'expertise" value="200+" suffix="par véhicule" />
            <StatCard label="Identité" value="100%" suffix="confidentielle" />
          </div>
        </div>
      </section>

      {/* SECTION VENDEURS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 shadow-[var(--shadow-card)]">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
              <Car className="h-10 w-10 text-accent" />
              <p className="mt-6 text-2xl font-bold leading-tight text-foreground">
                "Un canal de revente structuré pour vos véhicules en fin de
                vie."
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Flottes d'entreprises, loueurs longue durée, particuliers — un
                process unique, lisible et tracé.
              </p>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Pour les vendeurs
            </p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Cédez votre parc en fin de vie à sa juste valeur
            </h2>
            <p className="mt-5 text-muted-foreground">
              Entreprises, loueurs ou particuliers : BIDLIK prend en charge la
              mise en vente de vos véhicules en fin de vie auprès d'un réseau
              de marchands actifs et solvables. Vous fixez votre prix de
              réserve, nous nous occupons du reste — expertise, mise en
              concurrence, sécurisation du paiement et suivi administratif.
            </p>
            <ul className="mt-6 space-y-3">
              <Bullet>Vous gardez le contrôle du prix minimum</Bullet>
              <Bullet>Paiement sécurisé et tracé</Bullet>
              <Bullet>Aucune négociation directe à gérer</Bullet>
              <Bullet>Process pensé pour les flottes récurrentes</Bullet>
            </ul>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Vendre mon parc avec BIDLIK
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PARTENAIRES */}
      <section className="border-y border-border bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Réseau & partenaires
          </p>
          <h2 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Ils nous font confiance
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Zone réservée aux logos clients — à activer dès les premiers
            partenariats signés.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border bg-background text-xs uppercase tracking-widest text-muted-foreground"
              >
                Logo
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-accent">
            Questions fréquentes
          </p>
          <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Ce qu'il faut savoir avant de commencer
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          <FaqItem
            value="q1"
            question="Qui peut acheter sur BIDLIK ?"
            answer="Les marchands et revendeurs automobiles professionnels, après validation de leur dossier d'inscription."
          />
          <FaqItem
            value="q2"
            question="Quels véhicules trouve-t-on sur BIDLIK ?"
            answer="Des véhicules issus de flottes d'entreprises, de loueurs et de particuliers — jamais de véhicules saisis ou judiciaires."
          />
          <FaqItem
            value="q3"
            question="Y a-t-il des frais ?"
            answer="Oui, des frais de dossier fixes sont appliqués à chaque achat. Le détail est précisé dans nos conditions générales."
          />
          <FaqItem
            value="q4"
            question="Comment se déroule une enchère ?"
            answer="Vous consultez le catalogue, vous enchérissez en ligne avant la clôture de la session, et vous êtes informé immédiatement en cas d'adjudication."
          />
        </Accordion>
      </section>

      {/* CLOSING CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-accent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(1_0_0_/_0.15),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <h2 className="font-display max-w-3xl text-3xl font-extrabold tracking-tight text-brand-orange sm:text-4xl md:text-5xl">
            Rejoignez une plateforme pensée pour le marché marocain de
            l'automobile professionnelle.
          </h2>
          <Link
            to="/login"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Créer mon compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Pillar({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        {icon}
      </div>
      <h3 className="font-display mt-5 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-foreground">
      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
      <span>{children}</span>
    </li>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-sans mt-3 text-3xl font-extrabold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{suffix}</p>
    </div>
  );
}

function FaqItem({
  value,
  question,
  answer,
}: {
  value: string;
  question: string;
  answer: string;
}) {
  return (
    <AccordionItem value={value} className="border-border">
      <AccordionTrigger className="text-left text-lg font-semibold text-foreground hover:no-underline">
        {question}
      </AccordionTrigger>
      <AccordionContent className="text-base text-muted-foreground">
        {answer}
      </AccordionContent>
    </AccordionItem>
  );
}
