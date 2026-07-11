import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/types/auth";

/**
 * Closes two gaps `beforeLoad` guards (routeGuard.ts) leave open:
 *
 * 1. SSR has no session, so `requireAuth`/`requireRole` no-op on the server
 *    and ship the FULL protected page in the initial HTML.
 * 2. TanStack Router only re-runs `beforeLoad` on client-side navigations
 *    (clicking a `<Link>`) — for a route hydrated straight from an SSR'd
 *    direct load (typed URL, bookmark, refresh), `beforeLoad` never runs on
 *    the client at all, so its redirect never fires either.
 *
 * Together these meant an anonymous/wrong-role visitor could load a
 * protected URL directly and see (and on a slow connection, click through)
 * real content indefinitely — `beforeLoad`'s redirect only ever protected
 * in-app navigations, not direct loads.
 *
 * This renders a neutral placeholder instead of `children` until the client
 * confirms the visitor is authorized, AND actively navigates away itself the
 * moment it confirms they aren't — so a direct load is protected exactly the
 * same as an in-app navigation, not just content-blocked with no way out.
 */
export function AuthGate({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();

  const unauthorized = auth.status !== "loading" && (!auth.isAuthenticated || (roles && !auth.hasAnyRole(roles)));

  useEffect(() => {
    if (!unauthorized) return;
    if (!auth.isAuthenticated) {
      const redirect = `${window.location.pathname}${window.location.search}`;
      void navigate({ to: "/login", search: { redirect } });
    } else {
      void navigate({ to: "/unauthorized" });
    }
  }, [unauthorized, auth.isAuthenticated, navigate]);

  if (auth.status === "loading") return <GateShell />;
  if (unauthorized) return null;
  return <>{children}</>;
}

function GateShell() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
