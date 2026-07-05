import { Link } from "@tanstack/react-router";
import { Home, Search } from "lucide-react";

interface NotFoundStateProps {
  title?: string;
  description?: string;
}

export function NotFoundState({
  title = "Page introuvable",
  description = "La page que vous cherchez n'existe pas ou a été déplacée.",
}: NotFoundStateProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
          <Link
            to="/vehicules"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Search className="h-4 w-4" />
            Voir les véhicules
          </Link>
        </div>
      </div>
    </div>
  );
}
