/**
 * Auth domain types — ported from webapp/src/types/auth.ts.
 * Roles match the backend RBAC contract (Supabase `user_roles` table).
 */

export type Role = "acheteur" | "vendeur" | "expert" | "admin";

/** Roles the mobile app actually presents UI for. */
export type MobileRole = Extract<Role, "acheteur" | "vendeur">;

export interface AuthUser {
  id: string;
  nom: string;
  email: string;
  telephone?: string;
  roles: Role[];
  /** Acheteurs must have caution validée to bid. */
  cautionValidee?: boolean;
  avatarUrl?: string;
}

export interface AuthSession {
  user: AuthUser;
  /** Supabase JWT access token. */
  token: string;
  /** Unix ms expiry. */
  expiresAt: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  nom: string;
  email: string;
  telephone: string;
  password: string;
  role: MobileRole;
}
