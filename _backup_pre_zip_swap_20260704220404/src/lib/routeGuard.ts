/**
 * Reusable beforeLoad guards for TanStack Router.
 *
 * Auth hydrates asynchronously from Supabase (reads localStorage + verifies
 * the session). On the client we MUST wait for that hydration to finish
 * before deciding to redirect — otherwise protected pages flash and data
 * queries fire without a session (401 / empty results / 404).
 *
 * On the server we skip the guard: SSR has no localStorage, so auth is
 * permanently "loading" there. The client guard re-runs on hydration and
 * performs the real check.
 */

import { redirect } from "@tanstack/react-router";
import { authStore } from "./auth";
import type { Role } from "@/types/auth";

function waitForAuthReady(): Promise<void> {
  return new Promise((resolve) => {
    if (authStore.getState().status !== "loading") {
      resolve();
      return;
    }
    const unsub = authStore.subscribe(() => {
      if (authStore.getState().status !== "loading") {
        unsub();
        resolve();
      }
    });
    // Safety timeout — never block routing indefinitely.
    setTimeout(() => {
      unsub();
      resolve();
    }, 4000);
  });
}

export async function requireAuth(currentHref: string) {
  // Skip on server — no session is available there.
  if (typeof window === "undefined") return;
  await waitForAuthReady();
  const { session } = authStore.getState();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: currentHref } });
  }
}

export async function requireRole(roles: Role[], currentHref: string) {
  if (typeof window === "undefined") return;
  await waitForAuthReady();
  const { session } = authStore.getState();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: currentHref } });
  }
  const userRoles = session.user.roles;
  const ok = roles.some((r) => userRoles.includes(r));
  if (!ok) {
    throw redirect({ to: "/unauthorized" });
  }
}

/** Redirect vendeur (not admin) away from buyer-facing pages. */
export function blockVendeur() {
  const roles = authStore.getState().session?.user.roles ?? [];
  if (roles.includes("vendeur") && !roles.includes("admin")) {
    throw redirect({ to: "/vendeur" });
  }
}
