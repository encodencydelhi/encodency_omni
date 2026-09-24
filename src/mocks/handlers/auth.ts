import { ApiError } from "@/types/api";
import type { CurrentUserResponse, LoginChallengeResponse, LoginCredentials } from "@/types/domain/auth";
import { MOCK_ACCOUNTS } from "../data/internal-team";
import type { MockRoutes } from "../lib/router";

/**
 * DEMO MODE ONLY (NEXT_PUBLIC_DATA_SOURCE=mock).
 *
 * Mirrors the real backend's auth contract so the same frontend code runs in
 * both modes: POST /auth/login → challenge, POST /auth/verify-totp → session,
 * GET /users/me → profile. Any password of 8+ characters is accepted for a
 * known demo account and any six-digit code passes. The mock transport has no
 * cookies, so the "session" lives in memory and ends on a page reload.
 */
const MIN_PASSWORD_LENGTH = 8;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

let pendingChallenge: { userId: string; expiresAt: number } | null = null;
let signedInUserId: string | null = null;

function findAccountById(userId: string) {
  return [...MOCK_ACCOUNTS.values()].find((account) => account.id === userId);
}

function unauthorized(message: string): never {
  throw new ApiError({ code: "UNAUTHORIZED", status: 401, message });
}

function completeSecondFactor(): { status: "authenticated"; user: { id: string; email: string } } {
  if (!pendingChallenge || pendingChallenge.expiresAt < Date.now()) {
    pendingChallenge = null;
    unauthorized("This verification request has expired. Please sign in again.");
  }
  const account = findAccountById(pendingChallenge.userId);
  pendingChallenge = null;
  if (!account || account.status === "suspended") unauthorized("This account is no longer able to sign in.");
  signedInUserId = account.id;
  return { status: "authenticated", user: { id: account.id, email: account.email } };
}

export const authRoutes: MockRoutes = {
  "POST /auth/login": ({ body }) => {
    const { email, password } = (body ?? {}) as LoginCredentials;
    const account = MOCK_ACCOUNTS.get(email?.trim().toLowerCase() ?? "");

    if (!account || !password || password.length < MIN_PASSWORD_LENGTH) {
      unauthorized("Unable to sign in. Please check your credentials.");
    }

    if (account.status === "suspended") {
      throw new ApiError({
        code: "FORBIDDEN",
        status: 403,
        message: "This account has been suspended. Contact a platform administrator.",
      });
    }

    const expiresAt = Date.now() + CHALLENGE_TTL_MS;
    pendingChallenge = { userId: account.id, expiresAt };
    return {
      status: "challenge",
      challengeType: "totp",
      challengeToken: `demo-challenge.${account.id}`,
      expiresAt: new Date(expiresAt).toISOString(),
    } satisfies LoginChallengeResponse;
  },

  "POST /auth/verify-totp": ({ body }) => {
    const { code } = (body ?? {}) as { code?: string };
    if (!/^\d{6}$/.test(code ?? "")) unauthorized("Invalid authentication code. Please try again.");
    return completeSecondFactor();
  },

  "POST /auth/verify-recovery-code": ({ body }) => {
    const { code } = (body ?? {}) as { code?: string };
    if (!code || code.trim().length < 8) unauthorized("That recovery code was not accepted.");
    return completeSecondFactor();
  },

  "GET /users/me": () => {
    const account = signedInUserId ? findAccountById(signedInUserId) : undefined;
    if (!account || account.status === "suspended") unauthorized("Not authenticated");
    return {
      id: account.id,
      email: account.email,
      totpEnabled: true,
      platformRole: account.role === "super_admin" ? "SUPER_ADMIN" : null,
      memberships: [],
    } satisfies CurrentUserResponse;
  },

  "POST /auth/logout": () => {
    signedInUserId = null;
    return { status: "logged_out" };
  },

  "POST /auth/forgot-password": ({ body }) => {
    const { email } = (body ?? {}) as { email?: string };
    // Always succeeds: revealing whether an address exists is an enumeration risk.
    return { success: true, email: email ?? "" };
  },
};
