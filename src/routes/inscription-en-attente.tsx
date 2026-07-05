import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, CheckCircle2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/inscription-en-attente")({
  head: () => ({
    meta: [
      { title: "Inscription en attente — Bidlik" },
      {
        name: "description",
        content: "Votre compte Bidlik est créé et en attente de validation par un administrateur.",
      },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-elevated)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Clock className="h-8 w-8 text-accent" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Votre compte est en attente de validation
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Merci pour votre inscription sur <strong>Bidlik</strong>. Votre compte a bien été créé,
          mais il doit d'abord être <strong>vérifié par un administrateur</strong> avant que vous
          puissiez vous connecter et participer aux enchères.
        </p>

        <div className="mt-6 space-y-3 rounded-lg border border-border bg-secondary/40 p-4 text-left">
          <Step
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            title="Compte créé"
            text="Vos informations ont été enregistrées avec succès."
          />
          <Step
            icon={<Clock className="h-5 w-5 text-accent" />}
            title="Validation en cours"
            text="Un administrateur examine votre demande (généralement sous 24h)."
          />
          <Step
            icon={<ShieldCheck className="h-5 w-5 text-muted-foreground" />}
            title="Accès activé"
            text="Vous recevrez un e-mail dès que votre compte sera approuvé."
          />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Retour à l'accueil
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
