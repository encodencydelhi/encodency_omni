import { ApiError } from "@/types/api";
import type {
  AuthSession,
  LoginCredentials,
  LoginResult,
  TotpVerification,
} from "@/types/domain/auth";
import { MOCK_ACCOUNTS } from "../data/internal-team";
import type { MockRoutes } from "../lib/router";

/**
 * Any password of sufficient length is accepted for a known internal account,
 * and any six-digit code passes the second factor. The fixture exists to
 * exercise the real flow — success, failure, suspension, session restore — not
 * to model a credential store.
 */
const MIN_PASSWORD_LENGTH = 8;
const TOTP_LENGTH = 6;

const SESSION_TTL_MS = 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function issueToken(prefix: string, userId: string, expiresAt: number): string {
  return `${prefix}.${userId}.${expiresAt}`;
}

function parseToken(prefix: string, token: string): { userId: string; expiresAt: number } | null {
  const [tokenPrefix, userId, expiry] = token.split(".");
  if (tokenPrefix !== prefix || !userId || !expiry) return null;
  const expiresAt = Number(expiry);
  return Number.isFinite(expiresAt) ? { userId, expiresAt } : null;
}

function findAccountById(userId: string) {
  return [...MOCK_ACCOUNTS.values()].find((account) => account.id === userId);
}

/** "aditya.raghunath@encodency.com" -> "a•••••••••••••h@encodency.com" */
function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (local.length <= 2) return email;
  return `${local[0]}${"•".repeat(Math.max(local.length - 2, 3))}${local.at(-1)}@${domain}`;
}

function buildSession(userId: string, rememberMe: boolean): AuthSession {
  const account = findAccountById(userId);

  if (!account || account.status === "suspended") {
    throw new ApiError({
      code: "UNAUTHORIZED",
      status: 401,
      message: "This account is no longer able to sign in.",
    });
  }

  const expiresAt = Date.now() + SESSION_TTL_MS * (rememberMe ? 24 * 14 : 1);
  return { user: account, accessToken: issueToken("mock", account.id, expiresAt), expiresAt };
}

export const authRoutes: MockRoutes = {
  "POST /auth/login": ({ body }) => {
    const { email, password } = (body ?? {}) as LoginCredentials;
    const account = MOCK_ACCOUNTS.get(email?.trim().toLowerCase() ?? "");

    if (!account || !password || password.length < MIN_PASSWORD_LENGTH) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        status: 401,
        message: "Unable to sign in. Please check your credentials.",
      });
    }

    if (account.status === "suspended") {
      throw new ApiError({
        code: "FORBIDDEN",
        status: 403,
        message: "This account has been suspended. Contact a platform administrator.",
      });
    }

    const expiresAt = Date.now() + CHALLENGE_TTL_MS;

    return {
      status: "challenge",
      challenge: {
        type: "totp",
        challengeToken: issueToken("challenge", account.id, expiresAt),
        maskedEmail: maskEmail(account.email),
        expiresAt,
      },
    } satisfies LoginResult;
  },

  "POST /auth/verify-totp": ({ body }) => {
    const { challengeToken, code, rememberMe } = (body ?? {}) as TotpVerification;
    const parsed = parseToken("challenge", challengeToken ?? "");

    if (!parsed || parsed.expiresAt < Date.now()) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        status: 401,
        message: "This verification request has expired. Please sign in again.",
      });
    }

    if (!/^\d{6}$/.test(code ?? "") || code.length !== TOTP_LENGTH) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        status: 401,
        message: "Invalid authentication code. Please try again.",
      });
    }

    return buildSession(parsed.userId, Boolean(rememberMe));
  },

  "GET /auth/session": ({ query }) => {
    const parsed = parseToken("mock", String(query.token ?? ""));

    if (!parsed || parsed.expiresAt < Date.now()) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        status: 401,
        message: "Your session has expired. Please sign in again.",
      });
    }

    const account = findAccountById(parsed.userId);
    if (!account || account.status === "suspended") {
      throw new ApiError({ code: "UNAUTHORIZED", status: 401, message: "This session is no longer valid." });
    }

    return { user: account, accessToken: String(query.token), expiresAt: parsed.expiresAt } satisfies AuthSession;
  },

  "POST /auth/logout": () => ({ success: true }),

  "POST /auth/forgot-password": ({ body }) => {
    const { email } = (body ?? {}) as { email?: string };
    // Always succeeds: revealing whether an address exists is an enumeration risk.
    return { success: true, email: email ?? "" };
  },
};
