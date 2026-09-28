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
import { integrationsApi, toBackendProvider } from "../live/integrations-api";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import type {
  IntegrationConnection,
  IntegrationProvider,
  IntegrationSettings,
  IntegrationSyncRun,
  IntegrationsSnapshot,
  ProviderId,
  ResourceType,
  SyncFrequency,
  SyncTrigger,
} from "./types";

export type ServiceErrorCode = "service_unavailable" | "provider_error" | "authorization_cancelled" | "network";

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
function toBackendResourceType(type: ResourceType | undefined) {
  switch (type) {
    case "facebook_page":
      return "FACEBOOK_PAGE" as const;
    case "instagram_account":
      return "INSTAGRAM_ACCOUNT" as const;
    case "gbp_location":
      return "GOOGLE_BUSINESS_LOCATION" as const;
    case "linkedin_page":
      return "LINKEDIN_ORGANIZATION" as const;
    default:
      return undefined;
  }
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

class UnavailableIntegrationsRepository implements IntegrationsRepository {
  readonly mode = "live" as const;
  isAvailable() {
    return false;
  }
  async loadSnapshot(): Promise<IntegrationsSnapshot> {
    throw unavailable();
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
  async discoverResources(providerId: ProviderId, clientName: string): Promise<DiscoveredResource[]> {
    const companyId = activeCompanyId();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(providerId) && uuidPattern.test(companyId)) {
      return (await integrationsApi.discoverResources(companyId, providerId)) as any;
    }
    throw unavailable();
  }
  async connect(): Promise<IntegrationConnection> {
    throw unavailable();
  }
  async reconnect(): Promise<Partial<IntegrationConnection>> {
    throw unavailable();
  }
  async disconnect(): Promise<void> {
    throw unavailable();
  }
  async runSync(): Promise<IntegrationSyncRun> {
    throw unavailable();
  }
  async updateResourceMapping(connectionId: string, resourceId: string, clientId: string): Promise<void> {
    const companyId = activeCompanyId();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(connectionId) && uuidPattern.test(companyId)) {
      await integrationsApi.mapResource(companyId, connectionId, {
        clientId,
        externalResourceId: resourceId,
        resourceType: "FACEBOOK_PAGE",
      });
      return;
    }
    throw unavailable();
  }
  async saveSettings(): Promise<void> {
    throw unavailable();
  }
}

let instance: IntegrationsRepository | null = null;

export function getIntegrationsRepository(): IntegrationsRepository {
  if (!instance) instance = INTEGRATIONS_MOCK_MODE ? new MockIntegrationsRepository() : new UnavailableIntegrationsRepository();
  return instance;
}
