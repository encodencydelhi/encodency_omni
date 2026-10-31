/**
 * The integrations repository is the only boundary the UI talks to:
 *
 *   UI → IntegrationsRepository → Media360 integrations API
 *
 * Everything shown comes from the backend: connections with their real condition, the checks that were really run, the audit
 * trail, the company's settings and which providers can be connected. There is no sample data in this module. Wording that
 * the backend does not own (names of modules, what a scope means) lives in provider-catalogue.ts.
 */

import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import { clientsApi } from "../../projects/live/clients-api";
import { integrationsApi, type HubActivityItem, type HubCheck, type HubConnection, type HubDisconnectResult } from "../live/integrations-api";
import { RESOURCE_LABEL, MODULE_META } from "./config";
import { BACKEND_BY_PROVIDER_ID, BACKEND_BY_RESOURCE_TYPE, PROVIDER_ID_BY_BACKEND, RESOURCE_TYPE_BY_BACKEND, buildProviders } from "./provider-catalogue";
import { dependencyStatusFor } from "./selectors";
import type {
  ConnectionStatus,
  IntegrationActivity,
  IntegrationCheckRun,
  IntegrationClient,
  IntegrationConnection,
  IntegrationDependency,
  IntegrationPermission,
  IntegrationProvider,
  IntegrationResource,
  IntegrationSettings,
  IntegrationsSnapshot,
  ModuleKey,
  ProviderId,
  ResourceType,
} from "./types";

export type ServiceErrorCode = "service_unavailable" | "provider_error" | "forbidden" | "network" | "validation";

export class IntegrationServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly hint: string;
  constructor(code: ServiceErrorCode, message: string, hint: string) {
    super(message);
    this.name = "IntegrationServiceError";
    this.code = code;
    this.hint = hint;
  }
}

/** One account the provider says a login can reach. */
export interface DiscoveredResource {
  id: string;
  type: ResourceType;
  name: string;
  handle: string;
}

export interface MapOutcome {
  mapped: number;
  failed: { name: string; message: string }[];
}

export interface IntegrationsRepository {
  loadSnapshot(): Promise<IntegrationsSnapshot>;
  /** The provider's consent URL. `reconnectConnectionId` pre-selects an existing login. */
  authorize(providerId: ProviderId, options?: { reconnectConnectionId?: string }): Promise<{ authUrl: string }>;
  discoverResources(connectionId: string): Promise<DiscoveredResource[]>;
  mapResources(connectionId: string, items: { resource: DiscoveredResource; clientId: string }[]): Promise<MapOutcome>;
  check(connection: IntegrationConnection): Promise<IntegrationCheckRun>;
  disconnect(connectionId: string): Promise<HubDisconnectResult>;
  moveMapping(resourceId: string, clientId: string): Promise<void>;
  unmapResource(resourceId: string): Promise<void>;
  saveSettings(patch: Partial<IntegrationSettings>): Promise<IntegrationSettings>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLIENT_COLORS = ["#2563EB", "#7C3AED", "#0E9F6E", "#D97706", "#DB2777", "#0891B2"];

function activeCompanyId(): string {
  const companyId = getStoredCompanyId();
  if (!UUID_PATTERN.test(companyId)) {
    throw new IntegrationServiceError("validation", "Select a company to continue.", "A valid company selection is required to load integrations.");
  }
  return companyId;
}

/** Turns an API failure into a message a person can act on. The server's own sentence is kept: it already says what went wrong. */
export function toServiceError(error: unknown, fallback: string): IntegrationServiceError {
  if (error instanceof IntegrationServiceError) return error;
  if (ApiError.isApiError(error)) {
    if (error.status === 0) return new IntegrationServiceError("network", "Media360 could not be reached.", "Check your connection and try again.");
    if (error.status === 403) return new IntegrationServiceError("forbidden", "Your role can't do this.", "Only Owners and Admins can change integrations.");
    if (error.status >= 500) return new IntegrationServiceError("service_unavailable", fallback, "Something went wrong on our side. Nothing was changed. Try again in a moment.");
    return new IntegrationServiceError("provider_error", error.message || fallback, error.status === 409 ? "" : "Nothing was changed.");
  }
  return new IntegrationServiceError("network", fallback, "Check your connection and try again.");
}

/* ------------------------------------------------------------------ */
/* Mapping the API's shapes to the screens' shapes                      */
/* ------------------------------------------------------------------ */

const STATUS_BY_STATE: Record<HubConnection["state"], ConnectionStatus> = {
  connected: "connected",
  expiring: "expiring",
  needs_reconnect: "needs_reconnect",
  permission_missing: "permission_missing",
  check_failed: "sync_failed",
  rate_limited: "rate_limited",
  disconnected: "disconnected",
};

function reasonOf(connection: HubConnection): IntegrationConnection["statusReason"] {
  if (connection.state === "connected" || connection.state === "disconnected") return null;
  const detail = connection.stateReason ?? "";
  switch (connection.state) {
    case "needs_reconnect":
      return { code: connection.health === "revoked" ? "access_revoked" : "token_expired", detail };
    case "expiring":
      return { code: "expiring", detail };
    case "permission_missing":
      return { code: "permission_missing", detail };
    case "rate_limited":
      return { code: "rate_limit", detail };
    default:
      return { code: "sync_error", detail };
  }
}

const CHECK_HINT: Record<string, string> = {
  reconnect_required: "Reconnect the integration to renew access.",
  provider_rate_limited: "No action needed. Try again a little later.",
  provider_quota_exceeded: "No action needed. The provider quota resets on its own.",
  provider_permission_denied: "Reconnect and approve the permissions Media360 asks for.",
  provider_not_configured: "Ask your platform administrator to finish setting this provider up.",
  provider_maintenance: "Try again once the platform team has finished maintenance.",
};

function toCheckRun(check: HubCheck, connectionId: string, clientId: string | null): IntegrationCheckRun {
  const failed = check.status === "FAILED";
  return {
    id: check.id,
    connectionId,
    clientId,
    trigger: check.trigger === "MANUAL" ? "manual" : "scheduled",
    status: failed ? "failed" : "success",
    startedAt: check.startedAt,
    endedAt: new Date(new Date(check.startedAt).getTime() + check.durationMs).toISOString(),
    durationMs: check.durationMs,
    accountsFound: check.resourcesFound,
    error: failed ? { message: check.message ?? "The check did not complete.", hint: (check.reason && CHECK_HINT[check.reason]) || "Try again in a few minutes. If it keeps failing, reconnect the integration." } : null,
  };
}

/** The client most of a connection's accounts belong to: its "home". A login with nothing mapped has none. */
function homeClient(resources: { clientId: string }[]): string | null {
  const counts = new Map<string, number>();
  resources.forEach((resource) => counts.set(resource.clientId, (counts.get(resource.clientId) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function toConnection(hub: HubConnection, provider: IntegrationProvider | undefined): IntegrationConnection {
  const providerId = PROVIDER_ID_BY_BACKEND[hub.provider];
  const status = STATUS_BY_STATE[hub.state];
  const granted = hub.grantedScopes;
  const permissions: IntegrationPermission[] = (provider?.permissions ?? []).map((definition) => {
    if (granted === null) return { key: definition.key, status: "unknown" };
    if (granted.includes(definition.key)) return { key: definition.key, status: hub.health === "expired" || hub.health === "revoked" ? "expired" : "granted" };
    return { key: definition.key, status: definition.optional ? "optional" : "missing" };
  });
  const resources: IntegrationResource[] = hub.resources.map((resource) => {
    const type = RESOURCE_TYPE_BY_BACKEND[resource.type] ?? "facebook_page";
    return {
      id: resource.id,
      connectionId: hub.id,
      type,
      name: resource.name ?? `${RESOURCE_LABEL[type]} (name not captured yet)`,
      handle: resource.externalId ? `ID ${resource.externalId}` : "",
      externalId: resource.externalId,
      clientId: resource.clientId,
      status: "active",
      pendingPosts: resource.pendingPosts,
      hasPostHistory: resource.hasPostHistory,
    };
  });
  return {
    id: hub.id,
    providerId,
    clientId: homeClient(resources),
    accountName: hub.accountName ?? hub.accountEmail ?? provider?.name ?? hub.provider,
    status,
    statusReason: reasonOf(hub),
    connectedAt: hub.connectedAt,
    connectedBy: hub.connectedBy?.name?.trim() || hub.connectedBy?.email || "Not recorded",
    lastCheckedAt: hub.lastSuccessfulCheckAt,
    tokenExpiresAt: hub.tokenExpiresAt,
    autoRenews: hub.autoRenews,
    resources,
    permissions,
    pendingPosts: hub.pendingPosts,
    disconnectedAt: hub.state === "disconnected" ? hub.lastUpdatedAt : null,
  };
}

const ACCOUNTS_MODULE: Record<string, ModuleKey> = { meta: "content_studio", "google-business": "reviews", linkedin: "content_studio", youtube: "content_studio" };

/** What depends on a connection, counted from what really points at it: scheduled posts and mapped accounts. */
export function deriveDependencies(connections: IntegrationConnection[], providers: IntegrationProvider[]): IntegrationDependency[] {
  return connections
    .filter((connection) => connection.status !== "disconnected")
    .flatMap((connection) => {
      const name = providers.find((provider) => provider.id === connection.providerId)?.name ?? connection.providerId;
      const list: IntegrationDependency[] = [];
      if (connection.pendingPosts > 0) {
        list.push({
          id: `${connection.id}-posts`,
          connectionId: connection.id,
          clientId: connection.clientId,
          module: "content_studio",
          feature: `Posts waiting to go out through ${name}`,
          activeCount: connection.pendingPosts,
          unit: connection.pendingPosts === 1 ? "scheduled post" : "scheduled posts",
          critical: true,
          status: dependencyStatusFor(connection.status, true),
          href: MODULE_META.content_studio.href,
        });
      }
      if (connection.resources.length > 0) {
        const accountsModule = ACCOUNTS_MODULE[connection.providerId] ?? "content_studio";
        list.push({
          id: `${connection.id}-accounts`,
          connectionId: connection.id,
          clientId: connection.clientId,
          module: accountsModule,
          feature: `${name} accounts mapped to clients`,
          activeCount: connection.resources.length,
          unit: connection.resources.length === 1 ? "account" : "accounts",
          critical: false,
          status: dependencyStatusFor(connection.status, false),
          href: MODULE_META[accountsModule].href,
        });
      }
      return list;
    });
}

function toActivity(item: HubActivityItem): IntegrationActivity {
  return {
    id: item.id,
    connectionId: item.connectionId,
    providerId: item.providerId ? PROVIDER_ID_BY_BACKEND[item.providerId] : null,
    clientId: item.clientId,
    event: item.event,
    result: item.result,
    actor: item.actor,
    summary: item.summary,
    at: item.at,
  };
}

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

class LiveIntegrationsRepository implements IntegrationsRepository {
  async loadSnapshot(): Promise<IntegrationsSnapshot> {
    const companyId = activeCompanyId();
    try {
      const [clientRecords, hub, providerList, activity, settings] = await Promise.all([
        clientsApi.list(companyId),
        integrationsApi.getHubConnections(companyId),
        integrationsApi.getHubProviders(companyId),
        integrationsApi.getHubActivity(companyId),
        integrationsApi.getHubSettings(companyId),
      ]);
      const clients: IntegrationClient[] = clientRecords.map((client, index) => ({ id: client.id, name: client.displayName || client.name, color: CLIENT_COLORS[index % CLIENT_COLORS.length]! }));
      const providers = buildProviders(providerList.items);
      const connections = hub.items.map((item) => toConnection(item, providers.find((provider) => provider.id === PROVIDER_ID_BY_BACKEND[item.provider])));
      const checkRuns = hub.items.flatMap((item) => {
        const connection = connections.find((entry) => entry.id === item.id);
        return item.checks.map((check) => toCheckRun(check, item.id, connection?.clientId ?? null));
      });
      return {
        clients,
        providers,
        connections,
        checkRuns,
        dependencies: deriveDependencies(connections, providers),
        activity: activity.items.map(toActivity),
        settings,
        currentUser: { name: hub.viewer.name?.trim() || hub.viewer.email, email: hub.viewer.email, canManage: hub.viewer.canManage },
      };
    } catch (error) {
      throw toServiceError(error, "Unable to load integrations.");
    }
  }

  async authorize(providerId: ProviderId, options: { reconnectConnectionId?: string } = {}): Promise<{ authUrl: string }> {
    const provider = BACKEND_BY_PROVIDER_ID[providerId];
    if (!provider) throw new IntegrationServiceError("provider_error", "This integration cannot be connected from here.", "Set it up in its own module.");
    const companyId = activeCompanyId();
    try {
      return options.reconnectConnectionId ? await integrationsApi.initReconnect(companyId, provider, options.reconnectConnectionId) : await integrationsApi.initOAuth(companyId, provider);
    } catch (error) {
      throw toServiceError(error, "Authorization didn't start.");
    }
  }

  async discoverResources(connectionId: string): Promise<DiscoveredResource[]> {
    try {
      const found = await integrationsApi.discoverResources(activeCompanyId(), connectionId);
      return found.map((resource) => ({
        id: resource.externalResourceId,
        type: RESOURCE_TYPE_BY_BACKEND[resource.resourceType] ?? "facebook_page",
        name: resource.name,
        handle: "",
      }));
    } catch (error) {
      throw toServiceError(error, "Couldn't load accounts from the provider.");
    }
  }

  async mapResources(connectionId: string, items: { resource: DiscoveredResource; clientId: string }[]): Promise<MapOutcome> {
    const companyId = activeCompanyId();
    const outcome: MapOutcome = { mapped: 0, failed: [] };
    for (const { resource, clientId } of items) {
      const resourceType = BACKEND_BY_RESOURCE_TYPE[resource.type];
      if (!resourceType) {
        outcome.failed.push({ name: resource.name, message: "This kind of account can't be mapped yet." });
        continue;
      }
      try {
        await integrationsApi.mapResource(companyId, connectionId, { clientId, externalResourceId: resource.id, resourceType: resourceType as Parameters<typeof integrationsApi.mapResource>[2]["resourceType"] });
        outcome.mapped += 1;
      } catch (error) {
        outcome.failed.push({ name: resource.name, message: toServiceError(error, "It could not be mapped.").message });
      }
    }
    return outcome;
  }

  async check(connection: IntegrationConnection): Promise<IntegrationCheckRun> {
    try {
      return toCheckRun(await integrationsApi.checkConnection(activeCompanyId(), connection.id), connection.id, connection.clientId);
    } catch (error) {
      throw toServiceError(error, "The check couldn't start.");
    }
  }

  async disconnect(connectionId: string): Promise<HubDisconnectResult> {
    try {
      return await integrationsApi.disconnectConnection(activeCompanyId(), connectionId);
    } catch (error) {
      throw toServiceError(error, "Disconnect didn't complete.");
    }
  }

  async moveMapping(resourceId: string, clientId: string): Promise<void> {
    try {
      await integrationsApi.moveMapping(activeCompanyId(), resourceId, clientId);
    } catch (error) {
      throw toServiceError(error, "Couldn't change the mapping.");
    }
  }

  async unmapResource(resourceId: string): Promise<void> {
    try {
      await integrationsApi.unmapResource(activeCompanyId(), resourceId);
    } catch (error) {
      throw toServiceError(error, "Couldn't remove the account.");
    }
  }

  async saveSettings(patch: Partial<IntegrationSettings>): Promise<IntegrationSettings> {
    try {
      return await integrationsApi.saveHubSettings(activeCompanyId(), patch);
    } catch (error) {
      throw toServiceError(error, "Settings weren't saved.");
    }
  }
}

let instance: IntegrationsRepository | null = null;

export function getIntegrationsRepository(): IntegrationsRepository {
  instance ??= new LiveIntegrationsRepository();
  return instance;
}
