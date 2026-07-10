/**
 * Auth store — ported from webapp/src/lib/auth.ts, rewritten on Zustand
 * instead of useSyncExternalStore (see architecture plan §6: Zustand owns
 * client/app state). Same RPC-gated login flow, same role model.
 */
import { create } from "zustand";
import { supabase } from "@/services/supabase/client";
import { getRememberMe, setRememberMe } from "@/utils/rememberMe";
import type { AuthSession, AuthUser, LoginInput, RegisterInput, Role } from "@/types/auth";

export interface AuthState {
  status: "loading" | "authenticated" | "anonymous";
  session: AuthSession | null;
  login: (input: LoginInput, remember?: boolean) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
}

async function loadProfileAndRoles(userId: string, email: string | null): Promise<AuthUser> {
  // get_my_profile() is the only path that returns the user's own telephone —
  // cross-user reads of email/telephone are blocked at the column level by RLS.
  // A transient RPC/RLS error must NOT flip the session to anonymous (that
  // would silently log the user out), so this never throws.
  let profile: { nom?: string; telephone?: string | null; caution_validee?: boolean; avatar_url?: string | null } | null = null;
  let roleList: Role[] = [];
  try {
    const [{ data: profileRows }, { data: roles }] = await Promise.all([
      supabase.rpc("get_my_profile"),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    profile = Array.isArray(profileRows) ? profileRows[0] : null;
    roleList = (roles ?? []).map((r) => (r as { role: Role }).role);
  } catch (e) {
    console.warn("[auth] profile/roles load failed; using fallbacks", e);
  }
  return {
    id: userId,
    nom: profile?.nom || (email ? email.split("@")[0] : "Utilisateur"),
    email: email ?? "",
    telephone: profile?.telephone ?? undefined,
    roles: roleList.length ? roleList : ["acheteur"],
    cautionValidee: !!profile?.caution_validee,
    avatarUrl: profile?.avatar_url ?? undefined,
  };
}

async function sessionFromSupabase(): Promise<AuthSession | null> {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return null;
  // Never surface a session for an account an admin hasn't activated yet.
  // Only an explicit `false` counts as "not active" — a transient network
  // error must not sign out an already-active user.
  const { data: activeData, error: activeErr } = await supabase.rpc("is_my_account_active");
  if (!activeErr && activeData === false) {
    await supabase.auth.signOut();
    return null;
  }
  const user = await loadProfileAndRoles(s.user.id, s.user.email ?? null);
  return {
    user,
    token: s.access_token,
    expiresAt: (s.expires_at ?? Math.floor(Date.now() / 1000) + 8 * 3600) * 1000,
  };
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("user already")) return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("email not confirmed")) return "Veuillez confirmer votre e-mail avant de vous connecter.";
  if (m.includes("password should")) return "Mot de passe trop court (min 6 caractères).";
  if (m.includes("failed to fetch") || m.includes("network")) return "Connexion au serveur impossible. Vérifiez votre réseau.";
  return msg;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,

  async login(input, remember = true) {
    const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) throw new Error(translateAuthError(error.message));

    const { data: activeData, error: activeErr } = await supabase.rpc("is_my_account_active");
    if (activeErr) {
      await supabase.auth.signOut();
      throw new Error("Impossible de vérifier votre compte. Réessayez.");
    }
    if (activeData !== true) {
      await supabase.auth.signOut();
      const err = new Error("PENDING_ACTIVATION") as Error & { code?: string };
      err.code = "PENDING_ACTIVATION";
      throw err;
    }

    const session = await sessionFromSupabase();
    if (!session) throw new Error("Connexion impossible.");
    await setRememberMe(remember);
    set({ status: "authenticated", session });
    return session;
  },

  async register(input) {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { nom: input.nom, telephone: input.telephone, role: input.role } },
    });
    if (error) throw new Error(translateAuthError(error.message));
    // Account is created inactive — admin must validate before login.
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    set({ status: "anonymous", session: null });
  },

  logout() {
    // Flip UI immediately for snappy UX; sign-out call is fire-and-forget.
    set({ status: "anonymous", session: null });
    // Stop pushing to this device once signed out (best-effort, before the
    // token's JWT is invalidated by signOut).
    void import("@/services/pushNotifications").then((m) => m.unregisterPushToken()).catch(() => {});
    void supabase.auth.signOut();
  },

  hasRole(role) {
    return get().session?.user.roles.includes(role) ?? false;
  },

  hasAnyRole(roles) {
    const userRoles = get().session?.user.roles ?? [];
    return roles.some((r) => userRoles.includes(r));
  },
}));

let initialized = false;
export function initAuth() {
  if (initialized) return;
  initialized = true;

  // React to identity transitions only. INITIAL_SESSION / TOKEN_REFRESHED fire
  // frequently (foreground, hourly refresh) — re-running the full profile
  // fetch on them and flipping to anonymous on any transient failure would
  // silently log users out mid-session.
  supabase.auth.onAuthStateChange((event, sbSession) => {
    if (event === "SIGNED_OUT") {
      useAuthStore.setState({ status: "anonymous", session: null });
      return;
    }
    if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;
    if (!sbSession) return;
    setTimeout(async () => {
      try {
        const session = await sessionFromSupabase();
        if (session) useAuthStore.setState({ status: "authenticated", session });
      } catch (e) {
        console.warn("[auth] refresh failed; keeping current session", e);
      }
    }, 0);
  });

  // Cold-start hydration only: respect "remember me" here (sign a
  // not-to-be-remembered session back out on a fresh app launch), but never
  // apply this check to the onAuthStateChange listener above, which also
  // fires right after a fresh login and would otherwise immediately undo it.
  void (async () => {
    try {
      const session = await sessionFromSupabase();
      if (session && !(await getRememberMe())) {
        await supabase.auth.signOut();
        useAuthStore.setState({ status: "anonymous", session: null });
        return;
      }
      useAuthStore.setState(session ? { status: "authenticated", session } : { status: "anonymous", session: null });
    } catch {
      useAuthStore.setState({ status: "anonymous", session: null });
    }
  })();
}

export const ROLE_HOME: Record<Role, "Acheteur" | "Vendeur" | null> = {
  acheteur: "Acheteur",
  vendeur: "Vendeur",
  expert: null,
  admin: null,
};
