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

export type BackendResourceType =
  | "FACEBOOK_PAGE"
  | "INSTAGRAM_ACCOUNT"
  | "GOOGLE_BUSINESS_LOCATION"
  | "LINKEDIN_ORGANIZATION";

export interface DiscoveredResource {
  externalResourceId: string;
  name: string;
  resourceType: BackendResourceType;
}

export interface MapResourcePayload {
  clientId: string;
  externalResourceId: string;
  resourceType: BackendResourceType;
}

export interface ResourceMappingResponse {
  id: string;
  integrationId: string;
  clientId: string;
  resourceType: BackendResourceType;
  externalResourceId: string;
  createdAt: string;
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

  /**
   * GET /integrations/:id/resources (TASK-10)
   * Business Purpose: Discover external resources reachable by this connection (Facebook Pages, GBP locations, etc.).
   * Auth: @CompanyContextRoute() + integrations:read
   */
  async discoverResources(
    companyId: string,
    integrationId: string,
    signal?: AbortSignal,
  ): Promise<DiscoveredResource[]> {
    return apiClient.request<DiscoveredResource[]>({
      method: "GET",
      path: `/integrations/${encodeURIComponent(integrationId)}/resources`,
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },

  /**
   * POST /integrations/:id/map (TASK-10)
   * Business Purpose: Map a discovered external resource to a specific Client of this Company.
   * Auth: @CompanyContextRoute() + integrations:write (OWNER, ADMIN)
   */
  async mapResource(
    companyId: string,
    integrationId: string,
    payload: MapResourcePayload,
    signal?: AbortSignal,
  ): Promise<ResourceMappingResponse> {
    return apiClient.request<ResourceMappingResponse>({
      method: "POST",
      path: `/integrations/${encodeURIComponent(integrationId)}/map`,
      headers: companyScopeHeaders(companyId),
      body: payload,
      signal,
    });
  },
};
