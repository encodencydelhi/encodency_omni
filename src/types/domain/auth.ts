import type { InternalRole, Permission } from "./team";

/** The authenticated principal. Mirrors the future JWT payload plus profile. */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: InternalRole;
  permissions: readonly Permission[];
  status: "active" | "suspended";
  department: string;
  lastLoginAt: string | null;
}

export interface AuthSession {
  user: AuthenticatedUser;
  /** Opaque to the frontend. Replaced by a real access token later. */
  accessToken: string;
  /** Epoch milliseconds. Drives silent-refresh scheduling once implemented. */
  expiresAt: number;
}

/**
 * The finite states the shell can be in. Keeping this explicit avoids the
 * classic "flash of login page" bug while the session is being restored.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Second factor.
 *
 * Correct credentials do not produce a session on their own — they produce a
 * short-lived challenge that must be exchanged for one. Modelling it this way
 * means the real backend can enforce MFA without the UI changing.
 */
export interface TotpChallenge {
  type: "totp";
  challengeToken: string;
  /** Shown on the verification step, e.g. "a•••a@encodency.com". */
  maskedEmail: string;
  expiresAt: number;
}

export type LoginResult =
  | { status: "challenge"; challenge: TotpChallenge }
  | { status: "authenticated"; session: AuthSession };

export interface TotpVerification {
  challengeToken: string;
  code: string;
  rememberMe: boolean;
}
