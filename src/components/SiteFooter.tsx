import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-base font-bold text-foreground">Bidlik</p>
            <p className="mt-2 text-sm text-muted-foreground">
              La plateforme d'enchères automobiles au Maroc. Sécurisée, transparente, en temps réel.
            </p>
          </div>
          <FooterCol title="Plateforme">
            <Link to="/auctions" className="footer-link">Enchères en cours</Link>
            <Link to="/auctions" className="footer-link" search={{ filter: "closed" }}>Enchères terminées</Link>
            <Link to="/comment-ca-marche" className="footer-link">Comment ça marche</Link>
          </FooterCol>
          <FooterCol title="Compte">
            <Link to="/login" className="footer-link">Connexion</Link>
            <Link to="/login" className="footer-link">Inscription</Link>
          </FooterCol>
          <FooterCol title="Légal">
            <span className="footer-link">Conditions générales</span>
            <Link to="/trust" className="footer-link">Confidentialité</Link>
            <span className="footer-link">Contact</span>
          </FooterCol>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bidlik. Tous droits réservés. Prix en Dirhams marocains (MAD).
        </div>
      </div>

      <style>{`.footer-link { display: block; font-size: 0.875rem; color: var(--color-muted-foreground); padding: 0.25rem 0; transition: color 200ms; } .footer-link:hover { color: var(--color-foreground); }`}</style>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 space-y-1">{children}</div>
    </div>
  );
}
