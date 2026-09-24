import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type { ProviderId } from "../integrations-data/types";

export type BackendOAuthProvider = "META" | "GOOGLE_BUSINESS" | "LINKEDIN";

export const SUPPORTED_BACKEND_PROVIDERS: readonly BackendOAuthProvider[] = [
  "META",
  "GOOGLE_BUSINESS",
  "LINKEDIN",
] as const;

export function toBackendProvider(providerId: ProviderId | string): BackendOAuthProvider | null {
  const normalized = providerId.toLowerCase().replace(/_/g, "-");
  switch (normalized) {
    case "meta":
    case "facebook":
    case "instagram":
      return "META";
    case "google-business":
    case "google":
      return "GOOGLE_BUSINESS";
    case "linkedin":
      return "LINKEDIN";
    default:
      return null;
  }
}

export function fromBackendProvider(provider: BackendOAuthProvider): ProviderId {
  switch (provider) {
    case "META":
      return "meta";
    case "GOOGLE_BUSINESS":
      return "google-business";
    case "LINKEDIN":
      return "linkedin";
  }
}

export interface OAuthInitResponse {
  authUrl: string;
}

export interface OAuthInitPayload {
  provider: BackendOAuthProvider;
}

export const integrationsApi = {
  /**
   * GET /integrations/registry
   * Business Purpose: The providers this deployment can actually connect.
   * Auth: @AccountRoute() — any fully authenticated session.
   */
  async getRegistry(signal?: AbortSignal): Promise<BackendOAuthProvider[]> {
    return apiClient.request<BackendOAuthProvider[]>({
      method: "GET",
      path: "/integrations/registry",
      signal,
    });
  },

  /**
   * POST /integrations/oauth/init
   * Business Purpose: Start connecting a provider login to the caller's Company.
   * Auth: @CompanyContextRoute() (x-company-id verified against ACTIVE Company)
   * Capability: integrations:write (OWNER, ADMIN).
   *
   * Response: { authUrl: string } — Provider authorization URL with state & PKCE challenge.
   */
  async initOAuth(
    companyId: string,
    provider: BackendOAuthProvider,
    signal?: AbortSignal,
  ): Promise<OAuthInitResponse> {
    return apiClient.request<OAuthInitResponse>({
      method: "POST",
      path: "/integrations/oauth/init",
      headers: companyScopeHeaders(companyId),
      body: { provider } satisfies OAuthInitPayload,
      signal,
      skipSessionExpiry: false,
    });
  },
};
