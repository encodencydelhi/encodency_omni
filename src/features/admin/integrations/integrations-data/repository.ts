/**
 * The integrations repository is the only boundary the UI talks to.
 *
 *   today:  UI → IntegrationsRepository → mock provider
 *   later:  UI → IntegrationsRepository → OmniPlatform integration service
 *
 * The backend service holds provider credentials and runs OAuth; this layer
 * only ever sees organization-level results (connections, resources,
 * granted permissions, sync outcomes). Swapping the implementation is the
 * whole integration — no component imports mock data.
 */

import { addDays, addMinutes } from "date-fns";
import { FREQUENCY_MINUTES, INTEGRATIONS_MOCK_MODE } from "./config";
import {
  discoverResources,
  mockActivity,
  mockClients,
  mockConnections,
  mockDependencies,
  mockProviders,
  mockSettings,
  mockSyncRuns,
  seeded,
} from "./mock-provider";
import {
  fromBackendProvider,
  integrationsApi,
  toBackendProvider,
  type BackendOAuthProvider,
  type BackendResourceType,
} from "../live/integrations-api";
import { clientsApi, type ClientRecord } from "../../projects/live/clients-api";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import type {
  ConnectionStatus,
  IntegrationClient,
  IntegrationConnection,
  IntegrationProvider,
  IntegrationResource,
  IntegrationSettings,
  IntegrationSyncRun,
  IntegrationsSnapshot,
  ProviderId,
  ResourceType,
  SyncFrequency,
  SyncTrigger,
} from "./types";

export type ServiceErrorCode = "service_unavailable" | "provider_error" | "authorization_cancelled" | "network" | "validation";

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

export interface DiscoveredResource {
  id?: string;
  type: ResourceType;
  name: string;
  handle: string;
}

export interface ConnectInput {
  providerId: ProviderId;
  /** `null` for organization-wide providers. */
  clientId: string | null;
  resources: DiscoveredResource[];
  primaryIndex: number;
  /** Optional permissions the admin chose to include. */
  optionalPermissions: string[];
  syncFrequency: SyncFrequency;
  actor: string;
  /** Reactivate this previously disconnected connection instead of creating one. */
  reuseConnectionId?: string;
}

export interface SyncOptions {
  trigger: SyncTrigger;
  onProgress: (progress: number, phase: string) => void;
  /** Mock-mode preview control: force this run to fail. */
  forceFail?: boolean;
}

export interface IntegrationsRepository {
  readonly mode: "mock" | "live";
  isAvailable(): boolean;
  loadSnapshot(): Promise<IntegrationsSnapshot>;
  /** Stands in for the provider's consent screen. Resolves once the admin approves. */
  authorize(providerId: ProviderId): Promise<{ authUrl?: string } | void>;
  discoverResources(providerId: ProviderId, clientName: string): Promise<DiscoveredResource[]>;
  connect(input: ConnectInput): Promise<IntegrationConnection>;
  reconnect(connection: IntegrationConnection): Promise<Partial<IntegrationConnection>>;
  disconnect(connection: IntegrationConnection): Promise<void>;
  runSync(connection: IntegrationConnection, options: SyncOptions): Promise<IntegrationSyncRun>;
  updateResourceMapping(connectionId: string, resourceId: string, clientId: string): Promise<void>;
  saveSettings(patch: Partial<IntegrationSettings>): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Mock                                                                */
/* ------------------------------------------------------------------ */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function activeCompanyId(): string {
  return getStoredCompanyId();
}

/**
 * Backend resource enum supported by POST /integrations/:id/map (Prisma ResourceType).
 * Returns undefined for provider types this backend version cannot store — those are
 * never sent, so the caller can keep the local flow instead of posting a 400.
 */
function toBackendResourceType(type: ResourceType | undefined): BackendResourceType | undefined {
  switch (type) {
    case "facebook_page":
      return "FACEBOOK_PAGE";
    case "instagram_account":
      return "INSTAGRAM_ACCOUNT";
    case "gbp_location":
      return "GOOGLE_BUSINESS_LOCATION";
    case "linkedin_page":
      return "LINKEDIN_ORGANIZATION";
    case "youtube_channel":
      return "YOUTUBE_CHANNEL";
    default:
      return undefined;
  }
}

function fromBackendResourceType(type: string | undefined): ResourceType {
  switch (type) {
    case "FACEBOOK_PAGE":
      return "facebook_page";
    case "INSTAGRAM_ACCOUNT":
      return "instagram_account";
    case "GOOGLE_BUSINESS_LOCATION":
      return "gbp_location";
    case "LINKEDIN_ORGANIZATION":
      return "linkedin_page";
    case "YOUTUBE_CHANNEL":
      return "youtube_channel";
    default:
      return "facebook_page";
  }
}

function fromBackendOverviewProvider(provider: string): ProviderId {
  switch (provider) {
    case "META":
      return "meta";
    case "INSTAGRAM":
      return "meta";
    case "LINKEDIN":
      return "linkedin";
    case "GOOGLE_BUSINESS":
      return "google-business";
    case "WHATSAPP":
      return "whatsapp";
    case "YOUTUBE":
      return "youtube";
    default:
      return "meta";
  }
}

function mapConnectionStatus(status: string, health: string, reconnectRequired: boolean): ConnectionStatus {
  if (reconnectRequired || status === "RECONNECT_REQUIRED" || health === "expired" || health === "revoked" || health === "error") {
    return "needs_reconnect";
  }
  if (health === "expiring_soon") {
    return "expiring";
  }
  if (status === "CONNECTED" || status === "MAPPED") {
    return "connected";
  }
  return "disconnected";
}

function hash(text: string) {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

class MockIntegrationsRepository implements IntegrationsRepository {
  readonly mode = "mock" as const;
  private runCounter = 0;

  isAvailable() {
    return true;
  }

  async loadSnapshot(): Promise<IntegrationsSnapshot> {
    await wait(550);
    return structuredClone({
      clients: mockClients,
      providers: mockProviders,
      connections: mockConnections,
      syncRuns: mockSyncRuns,
      dependencies: mockDependencies,
      activity: mockActivity,
      settings: mockSettings,
      currentUser: { name: "Manish Sirohi", role: "org_admin" as const },
    });
  }

  async authorize(providerId: ProviderId): Promise<{ authUrl?: string } | void> {
    const backendProvider = toBackendProvider(providerId);
    if (!backendProvider) {
      throw new IntegrationServiceError(
        "provider_error",
        `Provider "${providerId}" does not support OAuth connection in this version.`,
        "Only Meta, Google Business, and LinkedIn are supported by the platform backend.",
      );
    }
    const companyId = activeCompanyId();

    try {
      const response = await integrationsApi.initOAuth(companyId, backendProvider);
      return response;
    } catch (error) {
      if (ApiError.isApiError(error)) {
        throw new IntegrationServiceError(
          error.status === 403 ? "authorization_cancelled" : "provider_error",
          error.message,
          "Verify company membership and ensure your account holds the integrations:write capability.",
        );
      }
      throw error;
    }
  }

  /**
   * Finds the backend CompanyIntegration id for a provider: the id itself if it is
   * already a UUID, a UUID connection from the local snapshot, or — for connections
   * that only exist in the backend — the id reported by GET /integrations/overview.
   */
  private async resolveLiveIntegrationId(companyId: string, providerId: ProviderId): Promise<string | null> {
    if (UUID_PATTERN.test(providerId)) return providerId;
    const fromSnapshot = mockConnections.find((c) => c.providerId === providerId && UUID_PATTERN.test(c.id))?.id;
    if (fromSnapshot) return fromSnapshot;

    const backendProvider = toBackendProvider(providerId);
    const clientId = typeof window !== "undefined" ? getStoredClientId() : "";
    if (!backendProvider || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) return null;

    try {
      const overview = await integrationsApi.getOverview(companyId, clientId);
      return overview.providers.find((p) => p.provider === backendProvider)?.integrationId ?? null;
    } catch (err) {
      console.warn("Live integrationsApi.getOverview failed while resolving the integration id:", err);
      return null;
    }
  }

  async discoverResources(providerId: ProviderId, clientName: string) {
    const companyId = activeCompanyId();

    // Live first: only fall back to the local sample list when there is no backend
    // integration for this provider or the backend call fails.
    if (UUID_PATTERN.test(companyId)) {
      const targetIntegrationId = await this.resolveLiveIntegrationId(companyId, providerId);
      if (targetIntegrationId) {
        try {
          const liveResources = await integrationsApi.discoverResources(companyId, targetIntegrationId);
          if (Array.isArray(liveResources) && liveResources.length > 0) {
            return liveResources.map((r) => ({
              id: r.externalResourceId,
              name: r.name,
              handle: r.resourceType.toLowerCase(),
              type: r.resourceType.toLowerCase() as any,
            }));
          }
        } catch (err) {
          console.warn("Live integrationsApi.discoverResources failed, falling back to mock:", err);
        }
      }
    }

    await wait(700);
    return discoverResources(providerId, clientName);
  }

  async connect(input: ConnectInput): Promise<IntegrationConnection> {
    await wait(1100);
    const provider = mockProviders.find((item) => item.id === input.providerId) as IntegrationProvider;
    const id = input.reuseConnectionId ?? uid(input.providerId);
    const clientId = input.clientId ?? mockClients[0]!.id;
    const frequencyMinutes = FREQUENCY_MINUTES[input.syncFrequency];

    return {
      id,
      providerId: input.providerId,
      clientId: input.clientId,
      accountName: input.resources[input.primaryIndex]?.name ?? provider.name,
      status: "connected",
      statusReason: null,
      connectedAt: nowIso(),
      connectedBy: input.actor,
      lastSyncAt: nowIso(),
      nextSyncAt: frequencyMinutes ? addMinutes(new Date(), frequencyMinutes).toISOString() : null,
      tokenExpiresAt: addDays(new Date(), 60).toISOString(),
      rateLimitResetAt: null,
      syncFrequency: input.syncFrequency,
      resources: input.resources.map((resource, index) => ({
        id: `${id}-r${index + 1}-${Date.now().toString(36)}`,
        connectionId: id,
        type: resource.type,
        name: resource.name,
        handle: resource.handle,
        clientId,
        primary: index === input.primaryIndex,
        status: "active",
        lastSyncAt: nowIso(),
      })),
      permissions: provider.permissions.map((definition) => ({
        key: definition.key,
        status: definition.optional && !input.optionalPermissions.includes(definition.key) ? "optional" : "granted",
      })),
      disconnectedAt: null,
    };
  }

  async reconnect(connection: IntegrationConnection): Promise<Partial<IntegrationConnection>> {
    await wait(900);
    const frequencyMinutes = FREQUENCY_MINUTES[connection.syncFrequency];
    return {
      status: "connected",
      statusReason: null,
      tokenExpiresAt: addDays(new Date(), 60).toISOString(),
      rateLimitResetAt: null,
      nextSyncAt: frequencyMinutes ? addMinutes(new Date(), frequencyMinutes).toISOString() : null,
      // Re-consent restores everything that was required; declined optional ones stay optional.
      permissions: connection.permissions.map((permission) => ({
        ...permission,
        status: permission.status === "optional" ? "optional" : "granted",
      })),
      resources: connection.resources.map((resource) => ({ ...resource, status: resource.status === "removed" ? "removed" : "active" })),
      disconnectedAt: null,
    };
  }

  async disconnect() {
    await wait(900);
  }

  async runSync(connection: IntegrationConnection, options: SyncOptions): Promise<IntegrationSyncRun> {
    const provider = mockProviders.find((item) => item.id === connection.providerId) as IntegrationProvider;
    const startedAt = new Date();
    const phases = provider.dataTypes;
    const steps = Math.max(phases.length, 3);

    for (let step = 0; step < steps; step += 1) {
      await wait(380);
      const phase = phases[Math.min(step, phases.length - 1)] ?? "profile";
      options.onProgress(Math.round(((step + 1) / (steps + 1)) * 100), `Syncing ${phase.replace("_", " ")}`);
    }
    await wait(300);
    options.onProgress(100, "Finishing up");

    this.runCounter += 1;
    const rand = seeded(hash(connection.id) + this.runCounter);
    const revoked = connection.resources.some((resource) => resource.status !== "active");
    const missing = connection.permissions.some((permission) => permission.status === "missing" || permission.status === "expired");
    const failed = Boolean(options.forceFail);
    const partial = !failed && (revoked || missing);
    const records = Math.round(80 + rand() * 1_400);
    const endedAt = new Date();

    return {
      id: uid("run"),
      connectionId: connection.id,
      clientId: connection.clientId,
      trigger: options.trigger,
      status: failed ? "failed" : partial ? "partial" : "success",
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime(),
      recordsProcessed: failed ? 0 : records,
      failedRecords: failed ? 0 : partial ? Math.round(10 + rand() * 60) : 0,
      dataTypes: provider.dataTypes,
      error: failed
        ? { message: `${provider.name} didn't respond before the sync timed out.`, hint: "Usually temporary. Retry in a few minutes; if it keeps failing, reconnect the integration." }
        : partial
          ? {
              message: revoked ? "Some accounts are no longer accessible, so their data was skipped." : "Some data types were skipped because a permission isn't granted.",
              hint: "Reconnect and grant access to sync everything.",
            }
          : null,
    };
  }

  async updateResourceMapping(connectionId: string, resourceId: string, clientId: string) {
    const companyId = activeCompanyId();
    const connection = mockConnections.find((c) => c.id === connectionId);
    // Resource type comes from the resource itself; the backend rejects an unknown
    // enum value, so unsupported types never reach the network.
    const resourceType = toBackendResourceType(connection?.resources.find((r) => r.id === resourceId)?.type);

    if (UUID_PATTERN.test(companyId) && UUID_PATTERN.test(clientId) && resourceType) {
      const integrationId = UUID_PATTERN.test(connectionId)
        ? connectionId
        : connection
          ? await this.resolveLiveIntegrationId(companyId, connection.providerId)
          : null;

      if (integrationId) {
        try {
          await integrationsApi.mapResource(companyId, integrationId, {
            clientId,
            externalResourceId: resourceId,
            resourceType,
          });
          return;
        } catch (err) {
          console.warn("Live integrationsApi.mapResource failed, falling back to mock:", err);
        }
      }
    }

    await wait(450);
  }

  async saveSettings() {
    await wait(500);
  }
}

/* ------------------------------------------------------------------ */
/* Unavailable (mock mode off, no backend attached)                    */
/* ------------------------------------------------------------------ */

const unavailable = () =>
  new IntegrationServiceError(
    "service_unavailable",
    "The integration service isn't reachable right now.",
    "Mock mode is off and no integration backend is configured. Set NEXT_PUBLIC_INTEGRATIONS_MOCK_MODE=true to explore with sample data.",
  );

/* ------------------------------------------------------------------ */
/* Live Repository (production backend attached)                       */
/* ------------------------------------------------------------------ */

class LiveIntegrationsRepository implements IntegrationsRepository {
  readonly mode = "live" as const;

  isAvailable() {
    return true;
  }

  async loadSnapshot(): Promise<IntegrationsSnapshot> {
    const companyId = activeCompanyId();
    if (!UUID_PATTERN.test(companyId)) {
      throw new IntegrationServiceError(
        "validation",
        "Select a Company to continue.",
        "A valid company selection is required to load integrations.",
      );
    }

    const storedClientId = typeof window !== "undefined" ? getStoredClientId() : null;

    // Parallel fetch: clients list, registry of configured providers, and client overview
    const [realClients, registry, overview] = await Promise.all([
      clientsApi.list(companyId).catch(() => [] as ClientRecord[]),
      integrationsApi.getRegistry().catch(() => [] as BackendOAuthProvider[]),
      storedClientId && UUID_PATTERN.test(storedClientId)
        ? integrationsApi.getOverview(companyId, storedClientId).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Build real clients array for integration client switcher
    const clients: IntegrationClient[] = realClients.map((c) => ({
      id: c.id,
      name: c.name,
      color: "#2563EB",
    }));

    const clientsToUse = clients.length > 0 ? clients : mockClients;

    // Configured OAuth providers from /integrations/registry
    const configuredOAuthSet = new Set<ProviderId>(registry.map(fromBackendProvider));

    // Map provider catalogue with realistic availability and notes
    const providers: IntegrationProvider[] = mockProviders.map((p) => {
      // Future providers according to roadmap/backend
      if (
        p.id === "x" ||
        p.id === "tiktok" ||
        p.id === "hubspot" ||
        p.id === "mailchimp" ||
        p.id === "search-console" ||
        p.id === "ga4" ||
        p.id === "website-tracking"
      ) {
        return {
          ...p,
          availability: "coming_soon" as const,
          availabilityNote: "Provider backend integration is in development.",
        };
      }

      // WhatsApp uses the dedicated AiSensy module
      if (p.id === "whatsapp") {
        return {
          ...p,
          availability: "available" as const,
        };
      }

      // OAuth providers: check if configured in backend .env
      const isConfigured = configuredOAuthSet.has(p.id);
      return {
        ...p,
        availability: isConfigured ? ("available" as const) : ("platform_disabled" as const),
        availabilityNote: isConfigured
          ? undefined
          : "Server OAuth credentials missing in deployment environment (.env).",
      };
    });

    // Build live connections and resources from overview
    const liveConnections: IntegrationConnection[] = [];
    if (overview && Array.isArray(overview.providers)) {
      for (const prov of overview.providers) {
        const providerId = fromBackendOverviewProvider(prov.provider);

        // Map connection rows
        for (const conn of prov.connections) {
          const matchingResources: IntegrationResource[] = prov.resources
            .filter((r) => r.integrationId === conn.integrationId)
            .map((r, idx) => ({
              id: r.mappingId,
              connectionId: conn.integrationId,
              type: fromBackendResourceType(r.resourceType),
              name: `${conn.accountName ?? providerId} (${r.resourceType})`,
              handle: r.externalResourceId,
              clientId: overview.clientId,
              primary: idx === 0,
              status: "active" as const,
              lastSyncAt: conn.lastUpdatedAt,
            }));

          liveConnections.push({
            id: conn.integrationId,
            providerId,
            clientId: overview.clientId,
            accountName: conn.accountName ?? conn.accountEmail ?? `${prov.provider} Account`,
            status: mapConnectionStatus(conn.status, conn.health, prov.reconnectRequired),
            statusReason: prov.reconnectRequired
              ? { code: "token_expired", detail: prov.reason ?? "Authentication token requires refresh." }
              : null,
            connectedAt: conn.lastUpdatedAt,
            connectedBy: conn.accountEmail ?? "Organization Admin",
            lastSyncAt: conn.lastUpdatedAt,
            nextSyncAt: null,
            tokenExpiresAt: null,
            rateLimitResetAt: null,
            syncFrequency: "hourly",
            resources: matchingResources,
            permissions: [
              { key: "read", status: "granted" },
              { key: "write", status: "granted" },
            ],
            disconnectedAt: null,
          });
        }
      }
    }

    // Build recent sync runs from connections
    const syncRuns: IntegrationSyncRun[] = liveConnections.map((conn) => ({
      id: `sync-${conn.id}`,
      connectionId: conn.id,
      clientId: conn.clientId,
      trigger: "scheduled" as const,
      status: "success" as const,
      startedAt: conn.lastSyncAt ?? nowIso(),
      endedAt: conn.lastSyncAt ?? nowIso(),
      durationMs: 420,
      recordsProcessed: conn.resources.length,
      failedRecords: 0,
      dataTypes: ["posts", "analytics"],
      error: null,
    }));

    return {
      clients: clientsToUse,
      providers,
      connections: liveConnections,
      syncRuns,
      dependencies: mockDependencies.filter((d) => liveConnections.some((c) => c.id === d.connectionId)),
      activity: mockActivity.slice(0, 5),
      settings: mockSettings,
      currentUser: { name: "Organization Admin", role: "org_admin" },
    };
  }

  async authorize(providerId: ProviderId): Promise<{ authUrl?: string } | void> {
    const backendProvider = toBackendProvider(providerId);
    if (!backendProvider) {
      throw new IntegrationServiceError(
        "provider_error",
        `Provider "${providerId}" does not support OAuth connection in this version.`,
        "Only Meta, Google Business, LinkedIn, and YouTube are supported by the platform backend.",
      );
    }
    const companyId = activeCompanyId();

    try {
      return await integrationsApi.initOAuth(companyId, backendProvider);
    } catch (error) {
      if (ApiError.isApiError(error)) {
        throw new IntegrationServiceError(
          error.status === 403 ? "authorization_cancelled" : "provider_error",
          error.message,
          "Verify company membership and ensure your account holds the integrations:write capability.",
        );
      }
      throw error;
    }
  }

  private async resolveLiveIntegrationId(companyId: string, providerId: ProviderId): Promise<string | null> {
    if (UUID_PATTERN.test(providerId)) return providerId;

    const backendProvider = toBackendProvider(providerId);
    const clientId = typeof window !== "undefined" ? getStoredClientId() : "";
    if (!backendProvider || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) return null;

    try {
      const overview = await integrationsApi.getOverview(companyId, clientId);
      const found = overview.providers.find((p) => p.provider === backendProvider);
      return found?.integrationId ?? found?.connections[0]?.integrationId ?? null;
    } catch (err) {
      console.warn("Live integrationsApi.getOverview failed while resolving the integration id:", err);
      return null;
    }
  }

  async discoverResources(providerId: ProviderId, _clientName: string): Promise<DiscoveredResource[]> {
    const companyId = activeCompanyId();
    if (!UUID_PATTERN.test(companyId)) {
      throw new IntegrationServiceError("validation", "Valid company context required.", "Select an active company.");
    }

    const targetIntegrationId = await this.resolveLiveIntegrationId(companyId, providerId);
    if (!targetIntegrationId) {
      return [];
    }

    try {
      const liveResources = await integrationsApi.discoverResources(companyId, targetIntegrationId);
      if (Array.isArray(liveResources)) {
        return liveResources.map((r) => ({
          id: r.externalResourceId,
          name: r.name,
          handle: r.resourceType.toLowerCase(),
          type: fromBackendResourceType(r.resourceType) as any,
        }));
      }
      return [];
    } catch (err) {
      if (ApiError.isApiError(err)) {
        throw new IntegrationServiceError("provider_error", err.message, "Check provider permissions.");
      }
      throw err;
    }
  }

  async connect(input: ConnectInput): Promise<IntegrationConnection> {
    const companyId = activeCompanyId();
    const integrationId = input.reuseConnectionId ?? (await this.resolveLiveIntegrationId(companyId, input.providerId));

    if (!integrationId) {
      throw new IntegrationServiceError(
        "provider_error",
        "No active connection found for this provider.",
        "Please connect the account via OAuth first.",
      );
    }

    const targetClientId = input.clientId ?? (typeof window !== "undefined" ? getStoredClientId() : null);
    if (!targetClientId) {
      throw new IntegrationServiceError(
        "validation",
        "A client must be selected to map resources.",
        "Select an active client.",
      );
    }

    // Map each selected resource to the client
    for (const res of input.resources) {
      const backendType = toBackendResourceType(res.type);
      if (backendType) {
        await integrationsApi.mapResource(companyId, integrationId, {
          clientId: targetClientId,
          externalResourceId: res.id,
          resourceType: backendType,
        });
      }
    }

    return {
      id: integrationId,
      providerId: input.providerId,
      clientId: targetClientId,
      accountName: input.resources[input.primaryIndex]?.name ?? input.providerId,
      status: "connected",
      statusReason: null,
      connectedAt: nowIso(),
      connectedBy: input.actor,
      lastSyncAt: nowIso(),
      nextSyncAt: null,
      tokenExpiresAt: null,
      rateLimitResetAt: null,
      syncFrequency: input.syncFrequency,
      resources: input.resources.map((r, i) => ({
        id: `${integrationId}-${r.id}`,
        connectionId: integrationId,
        type: r.type,
        name: r.name,
        handle: r.handle,
        clientId: targetClientId,
        primary: i === input.primaryIndex,
        status: "active",
        lastSyncAt: nowIso(),
      })),
      permissions: input.optionalPermissions.map((p) => ({ key: p, status: "granted" as const })),
      disconnectedAt: null,
    };
  }

  async reconnect(connection: IntegrationConnection): Promise<Partial<IntegrationConnection>> {
    await this.authorize(connection.providerId);
    return { status: "connected", statusReason: null };
  }

  async disconnect(connection: IntegrationConnection): Promise<void> {
    const companyId = activeCompanyId();
    const backendProvider = toBackendProvider(connection.providerId);
    if (!backendProvider) {
      throw new IntegrationServiceError(
        "provider_error",
        `Cannot disconnect unsupported provider ${connection.providerId}`,
        "",
      );
    }

    try {
      await integrationsApi.disconnectProvider(companyId, backendProvider);
    } catch (err) {
      if (ApiError.isApiError(err)) {
        throw new IntegrationServiceError("provider_error", err.message, "Could not disconnect provider.");
      }
      throw err;
    }
  }

  async runSync(connection: IntegrationConnection, options: SyncOptions): Promise<IntegrationSyncRun> {
    const startedAt = new Date();
    options.onProgress(25, "Checking connection");
    await wait(200);
    options.onProgress(50, "Refreshing resources");
    await wait(200);
    options.onProgress(100, "Synchronized");

    return {
      id: uid("run"),
      connectionId: connection.id,
      clientId: connection.clientId,
      trigger: options.trigger,
      status: "success",
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 400,
      recordsProcessed: connection.resources.length,
      failedRecords: 0,
      dataTypes: ["posts", "analytics"],
      error: null,
    };
  }

  async updateResourceMapping(connectionId: string, resourceId: string, clientId: string): Promise<void> {
    const companyId = activeCompanyId();
    if (!UUID_PATTERN.test(companyId)) {
      throw new IntegrationServiceError("validation", "Valid company context required.", "");
    }
    await integrationsApi.mapResource(companyId, connectionId, {
      clientId,
      externalResourceId: resourceId,
      resourceType: "FACEBOOK_PAGE",
    });
  }

  async saveSettings(_patch: Partial<IntegrationSettings>): Promise<void> {
    await wait(300);
  }
}

let instance: IntegrationsRepository | null = null;

export function getIntegrationsRepository(): IntegrationsRepository {
  if (!instance) {
    instance = INTEGRATIONS_MOCK_MODE
      ? new MockIntegrationsRepository()
      : new LiveIntegrationsRepository();
  }
  return instance;
}
