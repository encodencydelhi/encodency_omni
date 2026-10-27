/**
 * Real HTTP provider for the Super Admin Integrations workspace.
 *
 * Wired in `repository.ts` when `NEXT_PUBLIC_DATA_SOURCE=api`. Reads:
 *
 *   GET /api/v1/super-admin/integrations/summary
 *     → which OAuth providers this server can connect, and live connection
 *       counts per provider (active, reconnect required, companies, mapped
 *       resources, last active) computed from the real database.
 *   GET /api/v1/super-admin/audit-logs
 *     → integration events for the activity feed.
 *
 * The provider catalogue (names, categories, descriptions, docs links, auth
 * method) is static product information and comes from the injected
 * `catalogue`; every number and health state on it is replaced with live
 * values. Nothing else from the demo workspace is ever shown: what the backend
 * does not serve yet (connections list, resources, issues, settings, config
 * edits…) reports "not connected" (503), so the UI says so instead of showing
 * sample data (owner rule, 2026-10-27: an empty production database showed a
 * full demo workspace).
 */
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { IntegrationsRepository } from "./repository";
import type { IntegrationActivity, IntegrationProvider, IntegrationsKpis, OperationalHealth } from "./types";

/* ------------------------------------------------------------------ */
/* Backend DTOs                                                        */
/* ------------------------------------------------------------------ */

export type BackendOAuthProvider = "META" | "GOOGLE_BUSINESS" | "LINKEDIN" | "YOUTUBE" | "X";

interface ProviderConnectionSummary {
  provider: BackendOAuthProvider;
  connections: number;
  active: number;
  reconnectRequired: number;
  companies: number;
  companiesNeedingReconnect: number;
  mappedResources: number;
  lastActiveAt: string | null;
}

interface IntegrationsSummaryResponse {
  generatedAt: string;
  configuredProviders: BackendOAuthProvider[];
  providers: ProviderConnectionSummary[];
  totals: { connections: number; active: number; reconnectRequired: number; companies: number; companiesNeedingReconnect: number };
}

/** Backend enum → Super Admin catalogue id (mock/dataset.ts). */
export function fromBackendProvider(provider: BackendOAuthProvider): string {
  switch (provider) {
    case "META":
      return "meta";
    case "GOOGLE_BUSINESS":
      return "google_business";
    case "LINKEDIN":
      return "linkedin";
    case "YOUTUBE":
      return "youtube";
    case "X":
      return "x_twitter";
  }
}

/** Super Admin catalogue id → backend enum, when the backend stores connections for it. */
export function toBackendProvider(providerId: string): BackendOAuthProvider | null {
  switch (providerId) {
    case "meta":
      return "META";
    case "google_business":
      return "GOOGLE_BUSINESS";
    case "linkedin":
      return "LINKEDIN";
    case "youtube":
      return "YOUTUBE";
    case "x_twitter":
      return "X";
    default:
      return null;
  }
}

/** Unreachable (0), missing (404) or broken (5xx) backend. */
export function shouldFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  return error.status === 0 || error.status === 404 || error.status >= 500;
}

function notConnected(): Promise<never> {
  return Promise.reject(
    new ApiError({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
      message: "This part of Integrations is not connected to the backend yet. No data is shown instead of sample data.",
    }),
  );
}

function fetchSummary(): Promise<IntegrationsSummaryResponse> {
  return apiClient.request<IntegrationsSummaryResponse>({ method: "GET", path: "/super-admin/integrations/summary" });
}

/** One catalogue entry with every count and health state taken from the live summary. */
function withLiveCounts(provider: IntegrationProvider, summary: IntegrationsSummaryResponse): IntegrationProvider {
  const backend = toBackendProvider(provider.id);
  const live = backend ? summary.providers.find((row) => row.provider === backend) : undefined;
  const health: OperationalHealth = !live || live.connections === 0 ? "unknown" : live.reconnectRequired > 0 ? "degraded" : "operational";
  return {
    ...provider,
    // An OAuth provider whose credentials are not set on this server cannot be connected.
    platformAvailability: backend && !summary.configuredProviders.includes(backend) ? "disabled" : provider.platformAvailability,
    operationalHealth: health,
    activeConnectionsCount: live?.active ?? 0,
    connectedResourcesCount: live?.mappedResources ?? 0,
    affectedCompaniesCount: live?.companiesNeedingReconnect ?? 0,
    healthyConnectionsCount: live?.active ?? 0,
    reconnectRequiredCount: live?.reconnectRequired ?? 0,
    recentFailuresCount: 0,
    lastSuccessfulOperationAt: live?.lastActiveAt ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

/** `catalogue` supplies only the static provider descriptions; its counters, states and other records are never used. */
export function createApiIntegrationsProvider(catalogue: IntegrationsRepository): IntegrationsRepository {
  const providers = async (): Promise<IntegrationProvider[]> => {
    const [summary, entries] = await Promise.all([fetchSummary(), catalogue.getProviders()]);
    return entries.map((entry) => withLiveCounts(entry, summary));
  };

  return {
    mode: "api",

    getProviders: providers,

    async getProviderById(id: string): Promise<IntegrationProvider | null> {
      return (await providers()).find((provider) => provider.id === id) ?? null;
    },

    async getOverviewKpis(): Promise<IntegrationsKpis> {
      const [summary, list] = await Promise.all([fetchSummary(), providers()]);
      return {
        totalProviders: list.length,
        liveProviders: list.filter((p) => p.platformAvailability === "live").length,
        approvalPendingProviders: list.filter((p) => p.externalApiAccess === "requested" || p.externalApiAccess === "pending_approval").length,
        activeConnections: summary.totals.active,
        healthyConnections: summary.totals.active,
        reconnectRequiredConnections: summary.totals.reconnectRequired,
        degradedProviders: list.filter((p) => p.operationalHealth !== "operational" && p.operationalHealth !== "unknown").length,
        affectedCompanies: summary.totals.companiesNeedingReconnect,
      };
    },

    /** Integration events from the platform audit log (connected logins, mapped resources); empty when there are none. */
    async getActivities(): Promise<IntegrationActivity[]> {
      const logs = await apiClient.request<{
        items: Array<{ id: string; action: string; resourceType: string; outcome: string; createdAt: string; userEmail?: string; userName?: string; metadata?: Record<string, unknown> | null }>;
      }>({ method: "GET", path: "/super-admin/audit-logs" });
      const items = Array.isArray(logs?.items) ? logs.items : [];
      return items
        .filter((log) => log.resourceType === "INTEGRATION" || log.action.startsWith("integration."))
        .slice(0, 50)
        .map((log) => {
          const provider = typeof log.metadata?.provider === "string" ? fromBackendProvider(log.metadata.provider as BackendOAuthProvider) ?? "system" : "system";
          const disconnected = log.metadata?.disconnected === true;
          return {
            id: log.id,
            timestamp: log.createdAt,
            actor: { id: log.id, name: log.userName ?? log.userEmail ?? "Platform user", email: log.userEmail ?? "", type: "super_admin" },
            eventType: log.action === "integration.resource.mapped" ? "resource_mapped" : disconnected ? "connection_disconnected" : "connection_authorized",
            providerId: provider,
            description: log.action === "integration.resource.mapped" ? "Resource mapped to a client" : disconnected ? "Connection removed" : "Account connected",
            result: log.outcome === "SUCCESS" || !log.outcome ? "success" : "warning",
          } as IntegrationActivity;
        });
    },

    // Not served by the backend yet: reported as "not connected", never answered with sample data.
    getProviderConfig: notConnected,
    getProviderCapabilities: notConnected,
    getAuthorizations: notConnected,
    getAuthorizationById: notConnected,
    getResources: notConnected,
    getMappings: notConnected,
    getIssues: notConnected,
    getIssueById: notConnected,
    getReauthorizationRequests: notConnected,
    getSettings: notConnected,
    updateProviderAvailability: notConnected,
    updateProviderOperationalControls: notConnected,
    updateProviderConfig: notConnected,
    toggleCapability: notConnected,
    createReauthorizationRequest: notConnected,
    updateIssueStatus: notConnected,
    assignIssueOwner: notConnected,
    addIssueNote: notConnected,
    updateSettings: notConnected,
    resetDemo: notConnected,
  };
}
