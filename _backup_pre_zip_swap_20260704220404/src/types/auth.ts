/**
 * Auth domain types.
 * Roles match the backend RBAC contract.
 */

export type Role = "acheteur" | "vendeur" | "expert" | "admin";

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
  /** JWT access token from backend. Stored in memory + localStorage for now. */
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
  role: Extract<Role, "acheteur" | "vendeur">;
}
