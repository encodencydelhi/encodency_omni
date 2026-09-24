import { ApiError } from "@/types/api";
import type {
  CurrentUserResponse,
  LoginChallengeResponse,
  LoginCredentials,
  TotpReplacementCompletedResponse,
  TotpReplacementPendingResponse,
} from "@/types/domain/auth";
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
let pendingReplacement: { userId: string; challengeToken: string; expiresAt: number } | null = null;

/** Stand-in QR for demo mode — a data URL so the enroll step renders the same shape as the API. */
const DEMO_REPLACEMENT_SECRET = "DEMOREPLACEMENTSECRET234567";
const DEMO_QR_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#fff"/><rect x="12" y="12" width="48" height="48" fill="#0f172a"/><rect x="22" y="22" width="28" height="28" fill="#fff"/><rect x="120" y="12" width="48" height="48" fill="#0f172a"/><rect x="130" y="22" width="28" height="28" fill="#fff"/><rect x="12" y="120" width="48" height="48" fill="#0f172a"/><rect x="22" y="130" width="28" height="28" fill="#fff"/><text x="90" y="100" text-anchor="middle" font-family="monospace" font-size="11" fill="#334155">DEMO REPLACEMENT QR</text></svg>',
)}`;
const DEMO_RECOVERY_CODES = [
  "a1b2-c3d4-e5f6-7890-abcd",
  "b2c3-d4e5-f678-9012-bcde",
  "c3d4-e5f6-7890-1234-cdef",
  "d4e5-f678-9012-3456-def0",
  "e5f6-7890-1234-5678-ef01",
  "f678-9012-3456-7890-f012",
  "0987-6543-2109-8765-0987",
  "9876-5432-1098-7654-9876",
  "8765-4321-0987-6543-8765",
  "7654-3210-9876-5432-7654",
];

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

  "POST /auth/totp/replace": ({ body }) => {
    if (!signedInUserId) unauthorized("Not authenticated");
    const { code, recoveryCode } = (body ?? {}) as { code?: string; recoveryCode?: string };
    if (code !== undefined && !/^\d{6}$/.test(code)) unauthorized("That code was not accepted.");
    if (recoveryCode !== undefined && recoveryCode.trim().length < 8) unauthorized("That recovery code was not accepted.");
    if (code === undefined && recoveryCode === undefined) unauthorized("That code was not accepted.");

    const expiresAt = Date.now() + CHALLENGE_TTL_MS;
    const challengeToken = `demo-replacement.${signedInUserId}.${expiresAt}`;
    pendingReplacement = { userId: signedInUserId, challengeToken, expiresAt };
    return {
      status: "replacement_pending",
      challengeToken,
      otpauthUri: `otpauth://totp/Encodency%20OmniPlatform:demo-replacement?secret=${DEMO_REPLACEMENT_SECRET}&issuer=Encodency%20OmniPlatform`,
      qrDataUrl: DEMO_QR_DATA_URL,
      expiresAt: new Date(expiresAt).toISOString(),
    } satisfies TotpReplacementPendingResponse;
  },

  "POST /auth/totp/verify-replacement": ({ body }) => {
    const { code } = (body ?? {}) as { code?: string };
    if (!signedInUserId) unauthorized("Not authenticated");
    if (!pendingReplacement || pendingReplacement.expiresAt < Date.now() || pendingReplacement.userId !== signedInUserId) {
      pendingReplacement = null;
      unauthorized("This replacement request has expired. Start again.");
    }
    if (!/^\d{6}$/.test(code ?? "")) unauthorized("That code was not accepted. Use a code from the NEW authenticator entry.");
    pendingReplacement = null;
    return {
      status: "replacement_completed",
      recoveryCodes: [...DEMO_RECOVERY_CODES],
    } satisfies TotpReplacementCompletedResponse;
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

  "GET /auth/me": () => {
    if (!signedInUserId) unauthorized("Not authenticated");
    return { userId: signedInUserId };
  },

  "POST /auth/logout": () => {
    signedInUserId = null;
    pendingReplacement = null;
    return { status: "logged_out" };
  },

  "POST /auth/forgot-password": ({ body }) => {
    const { email } = (body ?? {}) as { email?: string };
    // Always succeeds: revealing whether an address exists is an enumeration risk.
    return { success: true, email: email ?? "" };
  },
};
