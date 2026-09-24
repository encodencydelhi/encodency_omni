import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type {
  AuthenticatedUser,
  ChallengeVerification,
  CurrentUserResponse,
  EnrollmentResult,
  EnrollmentVerifiedResponse,
  LoginChallengeResponse,
  LoginCredentials,
  LoginResult,
  TotpSetupResponse,
} from "@/types/domain/auth";
import { toAuthenticatedUser, toChallenge } from "./auth-mapping";

/**
 * The only module that knows how a session is created, restored or destroyed.
 *
 * The session itself is the backend's HttpOnly `omni_session` cookie — this
 * code never sees or stores it. Signing in is always two steps (mandatory
 * MFA): credentials produce a challenge, and only a verified second factor
 * makes the server set the cookie. Who the user is — and what they may open —
 * is then read from GET /users/me, never inferred locally.
 */
const bearer = (challengeToken: string) => ({ Authorization: `Bearer ${challengeToken}` });

async function fetchCurrentUser(): Promise<AuthenticatedUser> {
  const profile = await apiClient.request<CurrentUserResponse>({
    method: "GET",
    path: "/users/me",
    skipSessionExpiry: true,
  });
  return toAuthenticatedUser(profile);
}

export const authService = {
  async login({ email, password }: LoginCredentials): Promise<LoginResult> {
    const response = await apiClient.request<LoginChallengeResponse>({
      method: "POST",
      path: "/auth/login",
      body: { email, password },
      skipSessionExpiry: true,
    });
    return { status: "challenge", challenge: toChallenge(response, email) };
  },

  async setupTotp(challengeToken: string): Promise<TotpSetupResponse> {
    return apiClient.request<TotpSetupResponse>({
      method: "POST",
      path: "/auth/totp/setup",
      headers: bearer(challengeToken),
      skipSessionExpiry: true,
    });
  },

  /** First-time enrollment. Returns the one-time recovery codes; they are never stored anywhere. */
  async verifyTotpSetup({ challengeToken, code }: ChallengeVerification): Promise<EnrollmentResult> {
    const response = await apiClient.request<EnrollmentVerifiedResponse>({
      method: "POST",
      path: "/auth/totp/verify-setup",
      body: { code },
      headers: bearer(challengeToken),
      skipSessionExpiry: true,
    });
    return { user: await fetchCurrentUser(), recoveryCodes: response.recoveryCodes ?? [] };
  },

  async verifyTotp({ challengeToken, code }: ChallengeVerification): Promise<AuthenticatedUser> {
    await apiClient.request({
      method: "POST",
      path: "/auth/verify-totp",
      body: { code },
      headers: bearer(challengeToken),
      skipSessionExpiry: true,
    });
    return fetchCurrentUser();
  },

  async verifyRecoveryCode({ challengeToken, code }: ChallengeVerification): Promise<AuthenticatedUser> {
    await apiClient.request({
      method: "POST",
      path: "/auth/verify-recovery-code",
      body: { code },
      headers: bearer(challengeToken),
      skipSessionExpiry: true,
    });
    return fetchCurrentUser();
  },

  /** Re-reads the signed-in user (e.g. after memberships change). */
  fetchCurrentUser,

  /**
   * Rehydrates the session on a cold load. Returns null rather than throwing
   * when there is simply nobody signed in.
   */
  async restore(): Promise<AuthenticatedUser | null> {
    try {
      return await fetchCurrentUser();
    } catch (error) {
      if (ApiError.isApiError(error) && error.status === 401) return null;
      throw error;
    }
  },

  /** Revokes the backend session. Callers clear local state whether or not this succeeds. */
  async logout(): Promise<void> {
    await apiClient.request({ method: "POST", path: "/auth/logout", skipSessionExpiry: true });
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.request({ method: "POST", path: "/auth/forgot-password", body: { email }, skipSessionExpiry: true });
  },
};
