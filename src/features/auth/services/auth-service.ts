import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type {
  AuthSession,
  LoginCredentials,
  LoginResult,
  TotpVerification,
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
  login(credentials: LoginCredentials): Promise<LoginResult> {
    return apiClient.request<LoginResult>({
      method: "POST",
      path: "/auth/login",
      body: credentials,
    });
  },

  async verifyTotp(verification: TotpVerification): Promise<AuthSession> {
    const session = await apiClient.request<AuthSession>({
      method: "POST",
      path: "/auth/verify-totp",
      body: verification,
    });

    sessionStore.persist(session.accessToken, { remember: verification.rememberMe });
    return session;
  },

  /**
   * Rehydrates the session on a cold load. Returns null rather than throwing
   * when there is simply nobody signed in.
   */
  async restore(): Promise<AuthSession | null> {
    const token = sessionStore.read();
    if (!token) return null;

    try {
      return await apiClient.request<AuthSession>({
        method: "GET",
        path: "/auth/session",
        query: { token },
      });
    } catch (error) {
      if (ApiError.isApiError(error) && error.isAuthError) {
        sessionStore.clear();
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
