import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authStore, DEMO_ACCOUNTS, ROLE_HOME, useAuth } from "@/lib/auth";
import type { Role } from "@/types/auth";


export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connexion — Bidlik" },
      { name: "description", content: "Connectez-vous à votre compte Bidlik pour enchérir." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const auth = useAuth();

  const goAfterAuth = (roles: Role[]) => {
    if (redirect) {
      // redirect may include query string (e.g. "/acheteur?foo=bar").
      // TanStack navigate({ to }) expects a pathname only, so split it.
      const [pathname, queryString] = redirect.split("?");
      const search = queryString
        ? Object.fromEntries(new URLSearchParams(queryString))
        : undefined;
      navigate({ to: pathname as never, search: search as never });
      return;
    }
    const home = ROLE_HOME[roles[0]] ?? "/";
    navigate({ to: home as never });
  };

  if (auth.isAuthenticated && auth.user) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">Vous êtes connecté</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connecté en tant que <strong>{auth.user.nom}</strong> ({auth.user.roles.join(", ")}).
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to={ROLE_HOME[auth.user.roles[0]] as never}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            >
              Accéder à mon espace
            </Link>
            <button
              onClick={() => auth.logout()}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      if (mode === "login") {
        const identifier = String(fd.get("phone")).trim();
        const email = identifier.includes("@")
          ? identifier
          : `${identifier.replace(/\D/g, "")}@bidlik.local`;
        const session = await authStore.login({
          email,
          password: String(fd.get("password")),
        });
        toast.success(`Bienvenue ${session.user.nom}`);
        goAfterAuth(session.user.roles);
      } else {
        const phone = String(fd.get("phone"));
        const password = String(fd.get("password"));
        const confirm = String(fd.get("password_confirm"));
        if (password !== confirm) {
          toast.error("Les mots de passe ne correspondent pas.");
          setLoading(false);
          return;
        }
        await authStore.register({
          nom: String(fd.get("name")),
          email: `${phone.replace(/\D/g, "")}@bidlik.local`,
          telephone: phone,
          password,
          role: "acheteur",
        });
        toast.success("Compte créé — en attente de validation par un administrateur.");
        navigate({ to: "/inscription-en-attente" });
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "PENDING_ACTIVATION") {
        toast.info("Votre compte n'est pas encore validé par un administrateur.");
        navigate({ to: "/inscription-en-attente" });
      } else {
        toast.error(err instanceof Error ? err.message : "Erreur d'authentification");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = async (email: string, password: string) => {
    const form = document.querySelector<HTMLFormElement>("#auth-form");
    if (!form) return;
    (form.elements.namedItem("phone") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = password;
    // Ensure the demo accounts exist (idempotent seed).
    try {
      await fetch("/api/public/seed-demo", { method: "POST" });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        <div className="mb-6 flex rounded-lg border border-border bg-secondary p-1">
          <Tab active={mode === "login"} onClick={() => setMode("login")}>Connexion</Tab>
          <Tab active={mode === "register"} onClick={() => setMode("register")}>Inscription</Tab>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === "login" ? "Bon retour 👋" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Connectez-vous pour suivre vos enchères et placer des offres."
            : "Rejoignez Bidlik en quelques secondes."}
        </p>

        <form id="auth-form" className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <Field label="Nom complet" type="text" name="name" placeholder="Karim Bennani" required />
          )}
          <Field label="Téléphone" type="tel" name="phone" placeholder="+212 6 00 00 00 00" required />

          <Field label="Mot de passe" type="password" name="password" placeholder="••••••••" required />
          {mode === "register" && (
            <Field label="Confirmer le mot de passe" type="password" name="password_confirm" placeholder="••••••••" required />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {mode === "login" && (
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comptes de démonstration
            </p>
            <div className="mt-2 grid gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fillDemo(a.email, a.password)}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-xs hover:bg-secondary"
                >
                  <span className="font-medium text-foreground">
                    {a.role}
                    <span className="ml-2 font-normal text-muted-foreground">{a.phone}</span>
                  </span>
                  <span className="text-muted-foreground">mdp: {a.password}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          En continuant, vous acceptez les conditions générales d'utilisation de Bidlik.
        </p>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
