import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type { ProviderId } from "../integrations-data/types";

export type BackendOAuthProvider = "META" | "GOOGLE_BUSINESS" | "LINKEDIN" | "YOUTUBE";

export const SUPPORTED_BACKEND_PROVIDERS: readonly BackendOAuthProvider[] = [
  "META",
  "GOOGLE_BUSINESS",
  "LINKEDIN",
  "YOUTUBE",
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
    case "youtube":
      return "YOUTUBE";
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
    case "YOUTUBE":
      return "youtube";
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
  | "LINKEDIN_ORGANIZATION"
  | "YOUTUBE_CHANNEL";

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

export type OverviewProvider = "META" | "INSTAGRAM" | "LINKEDIN" | "GOOGLE_BUSINESS" | "WHATSAPP" | "YOUTUBE";
export type ConnectionStatus = "NOT_CONNECTED" | "CONNECTED" | "MAPPED" | "RECONNECT_REQUIRED";
export type ConnectionHealth = "healthy" | "expiring_soon" | "expired" | "revoked" | "error" | "not_connected";
export type ProviderSupportState = "connected" | "disconnected" | "setup_required" | "unsupported" | "coming_soon" | "permission_required" | "degraded";

export interface OverviewResource {
  mappingId: string;
  resourceType: BackendResourceType;
  externalResourceId: string;
  integrationId: string;
}

export interface OverviewConnection {
  integrationId: string;
  provider: BackendOAuthProvider;
  accountType: "LOGIN" | "LINKEDIN_MEMBER";
  externalAccountId: string;
  accountName: string | null;
  accountEmail: string | null;
  accountPictureUrl: string | null;
  accountProfile: Record<string, unknown> | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "ERROR";
  health: ConnectionHealth;
  lastUpdatedAt: string;
}

export interface ProviderOverview {
  provider: OverviewProvider;
  status: ConnectionStatus;
  health: ConnectionHealth;
  reconnectRequired: boolean;
  integrationId: string | null;
  companyConnectionAvailable: boolean;
  connections: OverviewConnection[];
  mappedResourceCount: number;
  resources: OverviewResource[];
  lastUpdatedAt: string | null;
  publishingSupported: boolean;
  state: ProviderSupportState;
  availableActions: string[];
  reason: string | null;
}

export interface ClientChannelOverview {
  clientId: string;
  providers: ProviderOverview[];
}

export type LinkedInDatasetState = "live" | "empty" | "permission_required" | "reconnect_required" | "rate_limited" | "unavailable";

export interface LinkedInDataset<T> {
  state: LinkedInDatasetState;
  data: T;
  reason: string | null;
}

export interface LinkedInDashboardResponse {
  organizationUrn: string;
  mappingId: string;
  syncedAt: string;
  organization: LinkedInDataset<Record<string, unknown>>;
  networkSize: LinkedInDataset<Record<string, unknown>>;
  posts: LinkedInDataset<Record<string, unknown>[]>;
  followers: LinkedInDataset<Record<string, unknown>[]>;
  pageStatistics: LinkedInDataset<Record<string, unknown>[]>;
  shareStatistics: LinkedInDataset<Record<string, unknown>[]>;
  social: LinkedInDataset<Record<string, unknown>[]>;
  campaigns: LinkedInDataset<Record<string, unknown>[]>;
  leads: LinkedInDataset<Record<string, unknown>[]>;
  inbox: LinkedInDataset<Record<string, unknown>[]>;
}

export const integrationsApi = {
  async getLinkedInDashboard(
    companyId: string,
    clientId: string,
    signal?: AbortSignal,
  ): Promise<LinkedInDashboardResponse> {
    return apiClient.request<LinkedInDashboardResponse>({
      method: "GET",
      path: "/integrations/linkedin/dashboard",
      headers: companyScopeHeaders(companyId, { "x-client-id": clientId }),
      signal,
    });
  },
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

  async disconnectProvider(
    companyId: string,
    provider: BackendOAuthProvider,
    signal?: AbortSignal,
  ): Promise<{ disconnected: number }> {
    return apiClient.request<{ disconnected: number }>({
      method: "DELETE",
      path: `/integrations/${encodeURIComponent(provider)}`,
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },

  /**
   * GET /integrations/overview (Phase A3)
   * Consolidated read-only channel overview for the Client named by x-client-id (Company via x-company-id).
   * Auth: @CompanyContextRoute({ client: 'required' }) + integrations:read
   */
  async getOverview(
    companyId: string,
    clientId: string,
    signal?: AbortSignal,
  ): Promise<ClientChannelOverview> {
    return apiClient.request<ClientChannelOverview>({
      method: "GET",
      path: "/integrations/overview",
      headers: companyScopeHeaders(companyId, { "x-client-id": clientId }),
      signal,
    });
  },
};
