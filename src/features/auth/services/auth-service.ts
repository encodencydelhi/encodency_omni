import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type {
  AuthSession,
  LoginCredentials,
  LoginResult,
  TotpVerification,
  TotpSetupResponse,
} from "@/types/domain/auth";
import { sessionStore } from "./session-store";

/**
 * The only module that knows how a session is created, restored or destroyed.
 *
 * Sign-in is two steps by design: credentials produce a short-lived challenge,
 * and only a verified second factor produces a session. Components depend on
 * this interface, never on the transport, so moving to real access/refresh
 * tokens is contained to this file.
 */
export const authService = {
  async login({ rememberMe, ...credentials }: LoginCredentials): Promise<LoginResult> {
    const response = await apiClient.request<any>({
      method: "POST",
      path: "/auth/login",
      body: credentials,
    });

    if (response.status === "challenge") {
      return {
        status: "challenge",
        challenge: {
          type: response.challengeType || "totp",
          challengeToken: response.challengeToken,
          maskedEmail: credentials.email,
          expiresAt: response.expiresAt,
        },
      };
    }
    return response;
  },

  async verifyTotp({ rememberMe, ...verification }: TotpVerification): Promise<AuthSession> {
    const session = await apiClient.request<AuthSession>({
      method: "POST",
      path: "/auth/verify-totp",
      body: { code: verification.code },
      headers: {
        Authorization: `Bearer ${verification.challengeToken}`,
      },
    });

    sessionStore.persist(session.accessToken, { remember: rememberMe });
    return session;
  },

  async setupTotp(challengeToken: string): Promise<TotpSetupResponse> {
    return apiClient.request<TotpSetupResponse>({
      method: "POST",
      path: "/auth/totp/setup",
      headers: {
        Authorization: `Bearer ${challengeToken}`,
      },
    });
  },

  async verifyTotpSetup({ rememberMe, ...verification }: TotpVerification): Promise<AuthSession> {
    // The backend returns { status: 'authenticated', user, recoveryCodes } but we only care about
    // the fact that it sets the httpOnly cookie.
    const response = await apiClient.request<AuthSession>({
      method: "POST",
      path: "/auth/totp/verify-setup",
      body: { code: verification.code },
      headers: {
        Authorization: `Bearer ${verification.challengeToken}`,
      },
    });

    sessionStore.persist(response.accessToken, { remember: rememberMe });
    return response;
  },

  /**
   * Rehydrates the session on a cold load. Returns null rather than throwing
   * when there is simply nobody signed in.
   */
  async restore(): Promise<AuthSession | null> {
    try {
      return await apiClient.request<AuthSession>({
        method: "GET",
        path: "/auth/me",
      });
    } catch (error) {
      if (ApiError.isApiError(error) && error.isAuthError) {
        return null;
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.request({ method: "POST", path: "/auth/logout" });
    } finally {
      // The local session is cleared even if the server call fails, so a user
      // is never left appearing signed in.
      sessionStore.clear();
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.request({ method: "POST", path: "/auth/forgot-password", body: { email } });
  },
};
