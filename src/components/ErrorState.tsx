import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorStateProps {
  error?: Error;
  reset?: () => void;
  title?: string;
  description?: string;
  code?: string;
}

export function ErrorState({
  error,
  reset,
  title = "Une erreur est survenue",
  description = "Quelque chose s'est mal passé. Veuillez réessayer ou revenir à l'accueil.",
  code = "500",
}: ErrorStateProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Erreur {code}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        {import.meta.env.DEV && error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          {reset && (
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
