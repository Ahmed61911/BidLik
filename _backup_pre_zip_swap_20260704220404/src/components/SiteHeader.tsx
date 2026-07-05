import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import logo from "@/assets/bidlik-logo.svg";
import logoDark from "@/assets/bidlik-logo-dark.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth, ROLE_HOME } from "@/lib/auth";

import type { Role } from "@/types/auth";

const ROLE_NAV: Record<Role, { to: string; label: string }> = {
  admin: { to: "/admin", label: "Espace Admin" },
  expert: { to: "/expert", label: "Expert" },
  vendeur: { to: "/vendeur", label: "Vendeur" },
  acheteur: { to: "/acheteur", label: "Mon espace" },
};

export function SiteHeader() {
  const auth = useAuth();
  const navigate = useNavigate();
  const userRoles = auth.user?.roles ?? [];
  const isAdmin = userRoles.includes("admin");
  const isExpertOnly = userRoles.includes("expert") && !userRoles.some((r) => r === "admin" || r === "acheteur" || r === "vendeur");
  const isVendeur = userRoles.includes("vendeur") && !userRoles.includes("admin");
  const isAcheteurOnly = userRoles.includes("acheteur") && !userRoles.includes("admin") && !userRoles.includes("vendeur") && !userRoles.includes("expert");
  const showHomeAndVehicules = !isExpertOnly && !isVendeur;




  const handleLogout = () => {
    auth.logout();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-16">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Bidlik" className="h-12 w-auto md:h-14 dark:hidden" />
          <img src={logoDark} alt="Bidlik" className="hidden h-12 w-auto md:h-14 dark:block" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {showHomeAndVehicules && !isAcheteurOnly && <NavLink to="/">Accueil</NavLink>}
          {!auth.isAuthenticated && <NavLink to="/comment-ca-marche-acheteur">Acheteur</NavLink>}
          {!auth.isAuthenticated && <NavLink to="/comment-ca-marche-vendeur">Vendeur</NavLink>}
          {showHomeAndVehicules && <NavLink to="/auctions">Enchères</NavLink>}
          {showHomeAndVehicules && auth.isAuthenticated && <NavLink to="/vehicules">Véhicules</NavLink>}
          {auth.isAuthenticated && !isExpertOnly && !isAdmin && (
            <NavLink to={isAcheteurOnly ? "/comment-ca-marche-acheteur" : "/comment-ca-marche"}>
              Comment ça marche
            </NavLink>
          )}
          {isExpertOnly && (
            <>
              <NavLink to="/expert">Vue d'ensemble</NavLink>
              <NavLink to="/expert/inspections">Inspections</NavLink>
              <NavLink to="/expert/historique">Historique</NavLink>
            </>
          )}
          {isVendeur && (
            <>
              <NavLink to="/vendeur/voitures">Mes voitures</NavLink>
              <NavLink to="/vendeur/encheres">Mes enchères</NavLink>
              <NavLink to="/vendeur/historique">Historique</NavLink>
              <NavLink to="/vendeur/paiements">Paiements</NavLink>
            </>
          )}
          {!isExpertOnly && !isVendeur && userRoles.map((role) => (
            <NavLink key={role} to={ROLE_NAV[role].to}>
              {ROLE_NAV[role].label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {auth.isAuthenticated && auth.user ? (
            <UserMenu name={auth.user.nom} role={userRoles[0]} roles={userRoles} onLogout={handleLogout} />
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary sm:inline-flex"
              >
                Connexion
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-base font-semibold text-accent-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 sm:px-4 sm:py-2 sm:text-sm"
              >
                <span className="sm:hidden">Se connecter</span>
                <span className="hidden sm:inline">S'inscrire</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="scrollbar-none flex items-center gap-6 overflow-x-auto overflow-y-hidden border-t border-border px-4 pb-3.5 pt-2.5 md:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {showHomeAndVehicules && !isAcheteurOnly && <NavLink to="/" mobile>Accueil</NavLink>}
        {!auth.isAuthenticated && <RoleDropdown mobile />}
        {showHomeAndVehicules && <NavLink to="/auctions" mobile>Enchères</NavLink>}
        {showHomeAndVehicules && auth.isAuthenticated && <NavLink to="/vehicules" mobile>Véhicules</NavLink>}
        {isExpertOnly && (
          <>
            <NavLink to="/expert" mobile>Vue d'ensemble</NavLink>
            <NavLink to="/expert/inspections" mobile>Inspections</NavLink>
            <NavLink to="/expert/historique" mobile>Historique</NavLink>
          </>
        )}
        {isVendeur && (
          <>
            <NavLink to="/vendeur/voitures" mobile>Voitures</NavLink>
            <NavLink to="/vendeur/encheres" mobile>Enchères</NavLink>
            <NavLink to="/vendeur/historique" mobile>Historique</NavLink>
            <NavLink to="/vendeur/paiements" mobile>Paiements</NavLink>
          </>
        )}
        {!isExpertOnly && !isVendeur && userRoles.map((role) => (
          <NavLink key={role} to={ROLE_NAV[role].to} mobile>
            {ROLE_NAV[role].label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function UserMenu({ name, role, roles, onLogout }: { name: string; role: Role; roles?: Role[]; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const hideMonEspace = roles?.some((r) => r === "vendeur" || r === "expert") ?? false;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm hover:bg-secondary sm:py-1.5"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:h-7 sm:w-7 sm:text-xs">
          {initials}
        </span>
        <span className="hidden sm:inline text-sm font-medium text-foreground">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Connecté en tant que</p>
            <p className="text-sm font-semibold text-foreground capitalize">{role}</p>
          </div>
          {!hideMonEspace && (
            <Link
              to={ROLE_HOME[role] as never}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <User className="h-4 w-4" />
              Mon espace
            </Link>
          )}
          <Link
            to="/mon-compte"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            <Settings className="h-4 w-4" />
            Mon compte
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

function NavLink({ to, children, badge, compact, mobile }: { to: string; children: React.ReactNode; badge?: number; compact?: boolean; mobile?: boolean }) {
  const base = mobile
    ? "relative shrink-0 whitespace-nowrap pb-1.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
    : compact
    ? "relative shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    : "relative shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  const active = mobile
    ? "relative shrink-0 whitespace-nowrap pb-1.5 text-base font-semibold text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-accent"
    : compact
    ? "relative shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-foreground bg-secondary"
    : "relative shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-foreground bg-secondary";
  return (
    <Link
      to={to as never}
      className={base}
      activeProps={{ className: active }}
      activeOptions={{ exact: to === "/" || ["/expert", "/admin", "/vendeur", "/acheteur"].includes(to) }}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-accent-foreground shadow-sm ring-2 ring-background">
          <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
          <span className="relative">{badge}</span>
        </span>
      ) : null}
    </Link>
  );
}

function RoleDropdown({ mobile }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open || !mobile || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, mobile]);

  const triggerCls = mobile
    ? "inline-flex shrink-0 items-center gap-1 whitespace-nowrap pb-1.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
    : "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

  const menuCls = mobile
    ? "fixed z-[60] w-56 rounded-lg border border-border bg-popover p-1 shadow-lg"
    : "absolute left-0 z-[60] mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg";

  const menuStyle = mobile && pos ? { top: pos.top, left: pos.left } : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerCls}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Vous êtes ?
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={menuCls} style={menuStyle} role="menu">
          <Link
            to="/comment-ca-marche-acheteur"
            onClick={() => setOpen(false)}
            className="flex flex-col rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
            role="menuitem"
          >
            <span className="font-semibold">Acheteur</span>
            <span className="text-xs text-muted-foreground">Comment ça marche acheteur</span>
          </Link>
          <Link
            to="/comment-ca-marche-vendeur"
            onClick={() => setOpen(false)}
            className="flex flex-col rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
            role="menuitem"
          >
            <span className="font-semibold">Vendeur</span>
            <span className="text-xs text-muted-foreground">Comment ça marche vendeur</span>
          </Link>
        </div>
      )}
    </div>
  );
}
