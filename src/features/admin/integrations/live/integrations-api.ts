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
  connection: {
    integrationId: string;
    provider: "LINKEDIN";
    status: string;
    accountName: string | null;
    accountEmail: string | null;
    grantedScopes: string[];
  };
}

/* ------------------------------------------------------------------ */
/* Integrations hub (connections, checks, activity, settings)          */
/* ------------------------------------------------------------------ */

export type HubConnectionState = "connected" | "expiring" | "needs_reconnect" | "permission_missing" | "check_failed" | "rate_limited" | "disconnected";
export type HubConnectionHealth = "healthy" | "expiring_soon" | "expired" | "revoked" | "error" | "not_connected";

export interface HubCheck {
  id: string;
  trigger: "MANUAL" | "AUTOMATIC";
  status: "SUCCESS" | "FAILED";
  reason: string | null;
  message: string | null;
  startedAt: string;
  durationMs: number;
  resourcesFound: number | null;
}

export interface HubConnectionResource {
  id: string;
  type: BackendResourceType;
  name: string | null;
  externalId: string;
  clientId: string;
  clientName: string;
  pendingPosts: number;
  hasPostHistory: boolean;
  mappedAt: string;
}

export interface HubConnection {
  id: string;
  provider: BackendOAuthProvider;
  accountName: string | null;
  accountEmail: string | null;
  accountPictureUrl: string | null;
  state: HubConnectionState;
  health: HubConnectionHealth;
  stateReason: string | null;
  connectedAt: string;
  connectedBy: { name: string | null; email: string } | null;
  lastUpdatedAt: string;
  tokenExpiresAt: string | null;
  autoRenews: boolean;
  grantedScopes: string[] | null;
  requestedScopes: string[];
  requiredScopes: string[];
  missingScopes: string[];
  lastCheck: HubCheck | null;
  lastSuccessfulCheckAt: string | null;
  checks: HubCheck[];
  resources: HubConnectionResource[];
  pendingPosts: number;
}

export interface HubConnectionsResponse {
  viewer: { name: string | null; email: string; canManage: boolean };
  items: HubConnection[];
}

export type HubProviderState = "available" | "unsupported" | "not_configured" | "platform_disabled" | "maintenance" | "new_connections_paused";

export interface HubProvider {
  provider: BackendOAuthProvider;
  name: string;
  description: string;
  docsUrl: string;
  state: HubProviderState;
  connectable: boolean;
  note: string | null;
  requestedScopes: string[];
  requiredScopes: string[];
  autoRenews: boolean;
  capabilities: { id: string; name: string; requiredScopes: string[]; affectedModules: string[] }[];
}

export interface HubActivityItem {
  id: string;
  at: string;
  event: "connected" | "reconnected" | "disconnected" | "sync_completed" | "sync_failed" | "mapping_changed" | "resource_removed" | "settings_updated" | "reconnect_required";
  result: "success" | "failed" | "warning" | "info";
  actor: string;
  summary: string;
  connectionId: string | null;
  providerId: BackendOAuthProvider | null;
  clientId: string | null;
}

export interface HubSettings {
  autoRefresh: boolean;
  confirmBeforeDisconnect: boolean;
  blockDisconnectWithScheduledPosts: boolean;
  metaMaxDailyBudget: number;
}

export interface HubDisconnectResult {
  mode: "removed" | "kept_history" | "pages_moved";
  pendingPosts: number;
}

export const integrationsApi = {
  async getHubConnections(companyId: string, signal?: AbortSignal): Promise<HubConnectionsResponse> {
    return apiClient.request<HubConnectionsResponse>({ method: "GET", path: "/integrations/connections", headers: companyScopeHeaders(companyId), signal });
  },

  async getHubProviders(companyId: string, signal?: AbortSignal): Promise<{ items: HubProvider[] }> {
    return apiClient.request<{ items: HubProvider[] }>({ method: "GET", path: "/integrations/providers", headers: companyScopeHeaders(companyId), signal });
  },

  async getHubActivity(companyId: string, signal?: AbortSignal): Promise<{ items: HubActivityItem[] }> {
    return apiClient.request<{ items: HubActivityItem[] }>({ method: "GET", path: "/integrations/activity", query: { limit: "100" }, headers: companyScopeHeaders(companyId), signal });
  },

  async getHubSettings(companyId: string, signal?: AbortSignal): Promise<HubSettings> {
    return apiClient.request<HubSettings>({ method: "GET", path: "/integrations/settings", headers: companyScopeHeaders(companyId), signal });
  },

  async saveHubSettings(companyId: string, patch: Partial<HubSettings>, signal?: AbortSignal): Promise<HubSettings> {
    return apiClient.request<HubSettings>({ method: "PUT", path: "/integrations/settings", headers: companyScopeHeaders(companyId), body: patch, signal });
  },

  /** A real check: asks the provider what the login can reach. Answers 200 even when the check itself failed. */
  async checkConnection(companyId: string, integrationId: string, signal?: AbortSignal): Promise<HubCheck> {
    return apiClient.request<HubCheck>({ method: "POST", path: `/integrations/connections/${encodeURIComponent(integrationId)}/check`, headers: companyScopeHeaders(companyId), signal });
  },

  async disconnectConnection(companyId: string, integrationId: string, signal?: AbortSignal): Promise<HubDisconnectResult> {
    return apiClient.request<HubDisconnectResult>({ method: "DELETE", path: `/integrations/connections/${encodeURIComponent(integrationId)}`, headers: companyScopeHeaders(companyId), signal });
  },

  async moveMapping(companyId: string, mappingId: string, clientId: string, signal?: AbortSignal): Promise<{ moved: true }> {
    return apiClient.request<{ moved: true }>({ method: "PATCH", path: `/integrations/mappings/${encodeURIComponent(mappingId)}`, headers: companyScopeHeaders(companyId), body: { clientId }, signal });
  },

  async unmapResource(companyId: string, mappingId: string, signal?: AbortSignal): Promise<{ removed: true }> {
    return apiClient.request<{ removed: true }>({ method: "DELETE", path: `/integrations/mappings/${encodeURIComponent(mappingId)}`, headers: companyScopeHeaders(companyId), signal });
  },

  /** Starts a reconnect of one existing login: the provider's consent screen is pre-filled with that account. */
  async initReconnect(companyId: string, provider: BackendOAuthProvider, integrationId: string, signal?: AbortSignal): Promise<OAuthInitResponse> {
    return apiClient.request<OAuthInitResponse>({
      method: "POST",
      path: "/integrations/oauth/init",
      headers: companyScopeHeaders(companyId),
      body: { provider, integrationId },
      signal,
      skipSessionExpiry: false,
    });
  },

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

  async initLinkedInCommunityOAuth(companyId: string, signal?: AbortSignal): Promise<OAuthInitResponse> {
    return apiClient.request<OAuthInitResponse>({
      method: "POST",
      path: "/integrations/oauth/init",
      headers: companyScopeHeaders(companyId),
      body: { provider: "LINKEDIN", app: "community" },
      signal,
      skipSessionExpiry: false,
    });
  },

  /** DELETE /integrations/LINKEDIN?app=community: removes only the Community Management connection; its pages move back to the member login. */
  async disconnectLinkedInCommunity(companyId: string, signal?: AbortSignal): Promise<{ disconnected: number }> {
    return apiClient.request<{ disconnected: number }>({
      method: "DELETE",
      path: "/integrations/LINKEDIN",
      query: { app: "community" },
      headers: companyScopeHeaders(companyId),
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
