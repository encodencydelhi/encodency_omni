/**
 * Real HTTP provider for the Super Admin Integrations workspace.
 *
 * Wired in `repository.ts` when `NEXT_PUBLIC_DATA_SOURCE=api`. Everything on screen is read from, or saved to, the backend:
 *
 *   GET   /super-admin/integrations/providers          providers with the platform's own controls, live counts and health
 *   PATCH /super-admin/integrations/providers/:slug/config
 *   GET   /super-admin/integrations/connections        every company's logins and the accounts mapped through them
 *   GET   /super-admin/integrations/issues             issues derived from live connections, with triage state
 *   PATCH /super-admin/integrations/issues/:key        status and owner; POST .../notes adds an investigation note
 *   POST  /super-admin/integrations/connections/:id/reauthorization-request   asks a company's admins to reconnect
 *   GET   /super-admin/integrations/reauthorization-requests
 *   GET   /super-admin/integrations/activity           the audit trail of integration events
 *   GET/PUT /super-admin/integrations/settings         the platform policy the server applies
 *
 * There is no sample data here: a part that cannot be loaded surfaces as an error, never as made-up rows.
 */
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { IntegrationsRepository } from "./repository";
import type {
  ClientResourceMapping,
  ConnectionHealthStatus,
  ExternalApiAccess,
  ExternalResource,
  IntegrationActivity,
  IntegrationIssue,
  IntegrationProvider,
  IntegrationSettings,
  IntegrationsKpis,
  IssueStatus,
  OperationalHealth,
  PlatformAvailability,
  ProviderAuthorization,
  ProviderCapability,
  ProviderConfiguration,
  ReauthorizationRequest,
  ResourceType,
} from "./types";

/* ------------------------------------------------------------------ */
/* Backend DTOs                                                        */
/* ------------------------------------------------------------------ */

type ConnectionState = "connected" | "expiring" | "needs_reconnect" | "permission_missing" | "check_failed" | "rate_limited" | "disconnected";

interface ApiCheck {
  id: string;
  status: "SUCCESS" | "FAILED";
  trigger: "MANUAL" | "AUTOMATIC";
  reason: string | null;
  startedAt: string;
  durationMs: number;
  resourcesFound: number | null;
}

export interface ApiProvider {
  provider: string;
  slug: string;
  name: string;
  category: "social" | "local" | "video";
  shortDescription: string;
  description: string;
  websiteUrl: string;
  docsUrl: string;
  implemented: boolean;
  authMethod: "oauth2";
  configured: boolean;
  redirectUri: string | null;
  requestedScopes: string[];
  requiredScopes: string[];
  config: {
    availability: "live" | "disabled";
    apiAccess: string;
    allowNewConnections: boolean;
    maintenanceMode: boolean;
    maintenanceNote: string | null;
    internalNotes: string | null;
    appReviewNotes: string | null;
    updatedAt: string | null;
    updatedBy: { name: string | null; email: string } | null;
  };
  counts: { connections: number; active: number; needsReconnect: number; permissionMissing: number; checkFailed: number; expiring: number; disconnected: number; companies: number; companiesNeedingAttention: number; mappedResources: number };
  checks24h: { total: number; failed: number };
  rateLimited: boolean;
  lastCheckAt: string | null;
  lastSuccessfulCheckAt: string | null;
  lastActiveAt: string | null;
  health: OperationalHealth;
  capabilities: { id: string; name: string; description: string; category: ProviderCapability["category"]; requiredScopes: string[]; affectedModules: string[]; knownRestrictions?: string; providerSupported: boolean; platformEnabled: boolean }[];
}

export interface ApiConnection {
  id: string;
  provider: string;
  providerSlug: string;
  companyId: string;
  companyName: string;
  accountName: string | null;
  accountEmail: string | null;
  status: string;
  state: ConnectionState;
  stateReason: string | null;
  connectedAt: string;
  connectedBy: { name: string | null; email: string } | null;
  tokenExpiresAt: string | null;
  grantedScopes: string[] | null;
  requiredScopes: string[];
  missingScopes: string[];
  lastCheck: ApiCheck | null;
  lastSuccessfulCheckAt: string | null;
  checks24h: { total: number; failed: number };
  resources: { id: string; type: string; name: string | null; externalId: string; clientId: string; clientName: string; mappedAt: string }[];
}

export interface ApiIssue {
  key: string;
  number: string;
  severity: IntegrationIssue["severity"];
  scope: IntegrationIssue["scope"];
  providerSlug: string;
  title: string;
  summary: string;
  status: IssueStatus;
  detectedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  companyIds: string[];
  companyNames: string[];
  connectionIds: string[];
  resourceIds: string[];
  capabilities: string[];
  owner: { id: string; name: string | null; email: string } | null;
  notes: { id: string; authorName: string; authorEmail: string; content: string; createdAt: string }[];
  timeline: { id: string; timestamp: string; actor: string; details: string; fromStatus: IssueStatus | null; toStatus: IssueStatus | null }[];
}

interface ApiActivity {
  id: string;
  timestamp: string;
  actor: IntegrationActivity["actor"];
  eventType: IntegrationActivity["eventType"];
  providerSlug: string | null;
  companyId: string | null;
  companyName: string | null;
  clientId: string | null;
  clientName: string | null;
  entityId: string | null;
  description: string;
  result: IntegrationActivity["result"];
  auditLogId: string;
}

interface ApiReauthorization {
  id: string;
  providerSlug: string;
  connectionId: string | null;
  companyId: string | null;
  companyName: string;
  affectedAccount: string;
  affectedClients: string[];
  missingScopes: string[];
  requestedBy: { id: string; name: string | null; email: string } | null;
  requestedAt: string;
  targetRole: "owner" | "admin";
  reason: string;
  status: ReauthorizationRequest["status"];
}

const BASE = "/super-admin/integrations";

const get = <T>(path: string) => apiClient.request<T>({ method: "GET", path: `${BASE}${path}` });
const send = <T>(method: "PATCH" | "POST" | "PUT", path: string, body: unknown) => apiClient.request<T>({ method, path: `${BASE}${path}`, body });
const key = (value: string) => encodeURIComponent(value);

/* ------------------------------------------------------------------ */
/* Mapping to the console's shapes                                     */
/* ------------------------------------------------------------------ */

const RESOURCE_TYPES: Record<string, ResourceType> = {
  FACEBOOK_PAGE: "facebook_page",
  INSTAGRAM_ACCOUNT: "instagram_account",
  GOOGLE_BUSINESS_LOCATION: "google_business_location",
  LINKEDIN_ORGANIZATION: "linkedin_page",
  YOUTUBE_CHANNEL: "youtube_channel",
};

const PROVIDER_RESOURCE_TYPES: Record<string, ResourceType[]> = {
  meta: ["facebook_page", "instagram_account"],
  google_business: ["google_business_location"],
  linkedin: ["linkedin_page"],
  youtube: ["youtube_channel"],
  x_twitter: ["x_account"],
};

export function availabilityOf(provider: ApiProvider): PlatformAvailability {
  if (!provider.implemented) return "draft";
  if (provider.config.availability === "disabled" || !provider.configured) return "disabled";
  return provider.config.maintenanceMode ? "restricted" : "live";
}

const apiAccessOf = (value: string): ExternalApiAccess => value.toLowerCase() as ExternalApiAccess;

export function toProvider(provider: ApiProvider, generatedAt: string): IntegrationProvider {
  const stamp = provider.config.updatedAt ?? generatedAt;
  return {
    id: provider.slug,
    name: provider.name,
    category: provider.category,
    shortDescription: provider.shortDescription,
    description: provider.description,
    websiteUrl: provider.websiteUrl,
    docsUrl: provider.docsUrl,
    authMethod: provider.authMethod,
    platformAvailability: availabilityOf(provider),
    externalApiAccess: apiAccessOf(provider.config.apiAccess),
    operationalHealth: provider.health,
    supportedResourceTypes: PROVIDER_RESOURCE_TYPES[provider.slug] ?? [],
    ...(provider.config.appReviewNotes ? { appReviewNotes: provider.config.appReviewNotes } : {}),
    createdAt: stamp,
    updatedAt: stamp,
    activeConnectionsCount: provider.counts.active,
    connectedResourcesCount: provider.counts.mappedResources,
    affectedCompaniesCount: provider.counts.companiesNeedingAttention,
    healthyConnectionsCount: Math.max(provider.counts.active - provider.counts.expiring, 0),
    reconnectRequiredCount: provider.counts.needsReconnect,
    recentFailuresCount: provider.checks24h.failed,
    lastSuccessfulOperationAt: provider.lastSuccessfulCheckAt,
    rateLimited: provider.rateLimited,
    credentialsConfigured: provider.configured,
    checksLast24h: provider.checks24h.total,
  };
}

export function toConfiguration(provider: ApiProvider): ProviderConfiguration {
  const availability = availabilityOf(provider);
  return {
    providerId: provider.slug,
    providerCode: provider.slug,
    category: provider.category,
    platformAvailability: availability,
    description: provider.description,
    supportedResourceTypes: PROVIDER_RESOURCE_TYPES[provider.slug] ?? [],
    internalNotes: provider.config.internalNotes ?? "",
    authMethod: provider.authMethod,
    redirectUri: provider.redirectUri ?? "",
    requiredScopes: provider.requestedScopes,
    externalApiApprovalStatus: apiAccessOf(provider.config.apiAccess),
    appReviewNotes: provider.config.appReviewNotes ?? "",
    credentialConfigured: provider.configured,
    allowNewConnections: provider.config.allowNewConnections,
    maintenanceMode: provider.config.maintenanceMode,
    maintenanceNote: provider.config.maintenanceNote ?? "",
  };
}

function toCapabilities(provider: ApiProvider): ProviderCapability[] {
  return provider.capabilities.map((capability) => ({
    id: capability.id,
    providerId: provider.slug,
    name: capability.name,
    description: capability.description,
    category: capability.category,
    providerSupported: capability.providerSupported,
    externalApprovalRequired: false,
    externalApprovalStatus: apiAccessOf(provider.config.apiAccess),
    connectorStatus: "implemented",
    platformEnabled: capability.platformEnabled,
    requiredScopes: capability.requiredScopes,
    affectedModules: capability.affectedModules,
    ...(capability.knownRestrictions ? { knownRestrictions: capability.knownRestrictions } : {}),
    docsUrl: provider.docsUrl,
  }));
}

const HEALTH_BY_STATE: Record<ConnectionState, ConnectionHealthStatus> = {
  connected: "healthy",
  expiring: "healthy",
  needs_reconnect: "needs_reconnect",
  permission_missing: "permission_issue",
  check_failed: "sync_failure",
  rate_limited: "rate_limited",
  disconnected: "disconnected",
};

export function toAuthorization(connection: ApiConnection, providerName: string): ProviderAuthorization {
  const who = connection.connectedBy;
  const account = connection.accountName ?? connection.accountEmail ?? providerName;
  return {
    id: connection.id,
    providerId: connection.providerSlug,
    companyId: connection.companyId,
    companyName: connection.companyName,
    authorizationLabel: `${connection.companyName} · ${account}`,
    authMethod: "oauth2",
    status: connection.state === "disconnected" || connection.status === "REVOKED" ? "revoked" : connection.status === "EXPIRED" || connection.status === "ERROR" ? "expired" : "active",
    grantedScopes: connection.grantedScopes ?? [],
    requiredScopes: connection.requiredScopes,
    missingScopes: connection.missingScopes,
    tokenExpiresAt: connection.tokenExpiresAt,
    lastVerifiedAt: connection.lastSuccessfulCheckAt ?? connection.connectedAt,
    connectedBy: { id: "", name: who?.name?.trim() || who?.email || "Not recorded", email: who?.email ?? "", role: "" },
    connectedAt: connection.connectedAt,
    healthStatus: HEALTH_BY_STATE[connection.state],
    lastSuccessfulSyncAt: connection.lastSuccessfulCheckAt,
    lastAttemptedSyncAt: connection.lastCheck?.startedAt ?? null,
    recentFailureCount: connection.checks24h.failed,
    rateLimitResetAt: null,
    ...(connection.state !== "connected" && connection.stateReason ? { latestErrorMessage: connection.stateReason } : {}),
  };
}

function toResources(connection: ApiConnection): ExternalResource[] {
  return connection.resources.map((resource) => ({
    id: resource.id,
    authorizationId: connection.id,
    providerId: connection.providerSlug,
    companyId: connection.companyId,
    resourceName: resource.name ?? "Name not captured yet",
    resourceType: RESOURCE_TYPES[resource.type] ?? "facebook_page",
    externalResourceId: resource.externalId,
    status: "active",
    mappedClientId: resource.clientId,
    mappedClientName: resource.clientName,
    mappingStatus: "active",
    dependentModules: [],
    lastSyncAt: null,
    createdAt: resource.mappedAt,
  }));
}

function toMappings(connection: ApiConnection): ClientResourceMapping[] {
  return connection.resources.map((resource) => ({
    id: resource.id,
    resourceId: resource.id,
    authorizationId: connection.id,
    companyId: connection.companyId,
    clientId: resource.clientId,
    clientName: resource.clientName,
    status: "active",
    mappedAt: resource.mappedAt,
    mappedBy: "Not recorded",
  }));
}

export function toIssue(issue: ApiIssue): IntegrationIssue {
  return {
    id: issue.key,
    issueNumber: issue.number,
    severity: issue.severity,
    scope: issue.scope,
    providerId: issue.providerSlug,
    title: issue.title,
    summary: issue.summary,
    status: issue.status,
    detectedAt: issue.detectedAt,
    updatedAt: issue.updatedAt,
    ...(issue.resolvedAt ? { resolvedAt: issue.resolvedAt } : {}),
    affectedCompanyIds: issue.companyIds,
    affectedCompanyNames: issue.companyNames,
    affectedConnectionIds: issue.connectionIds,
    affectedResourceIds: issue.resourceIds,
    affectedCapabilities: issue.capabilities,
    internalOwner: issue.owner ? { id: issue.owner.id, name: issue.owner.name?.trim() || issue.owner.email, email: issue.owner.email } : null,
    investigationNotes: issue.notes.map((note) => ({ id: note.id, authorName: note.authorName, authorEmail: note.authorEmail, createdAt: note.createdAt, content: note.content, isInternal: true })),
    timeline: [
      { id: `${issue.key}-detected`, timestamp: issue.detectedAt, actor: "System", action: "Detected", details: issue.summary },
      ...issue.timeline.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        actor: event.actor,
        action: event.details,
        details: event.details,
        ...(event.fromStatus ? { fromStatus: event.fromStatus } : {}),
        ...(event.toStatus ? { toStatus: event.toStatus } : {}),
      })),
    ],
    relatedJobIds: [],
    relatedApiEventIds: [],
  };
}

function toActivity(item: ApiActivity): IntegrationActivity {
  return {
    id: item.id,
    timestamp: item.timestamp,
    actor: item.actor,
    eventType: item.eventType,
    providerId: item.providerSlug ?? "system",
    ...(item.companyId ? { companyId: item.companyId } : {}),
    ...(item.companyName ? { companyName: item.companyName } : {}),
    ...(item.clientId ? { clientId: item.clientId } : {}),
    ...(item.clientName ? { clientName: item.clientName } : {}),
    ...(item.entityId ? { entityId: item.entityId } : {}),
    description: item.description,
    result: item.result,
    auditLogId: item.auditLogId,
  };
}

function toReauthorization(item: ApiReauthorization): ReauthorizationRequest {
  return {
    id: item.id,
    providerId: item.providerSlug,
    authorizationId: item.connectionId ?? "",
    companyId: item.companyId ?? "",
    companyName: item.companyName,
    affectedAccount: item.affectedAccount,
    affectedClients: item.affectedClients,
    missingScopes: item.missingScopes,
    requestedBy: item.requestedBy ? { id: item.requestedBy.id, name: item.requestedBy.name?.trim() || item.requestedBy.email, email: item.requestedBy.email } : { id: "", name: "Platform team", email: "" },
    requestedAt: item.requestedAt,
    targetRole: item.targetRole,
    reason: item.reason,
    status: item.status,
  };
}

/** The server's enum for the console's availability value. Only live and disabled are real states. */
export function availabilityPatch(value: PlatformAvailability): Record<string, unknown> {
  if (value === "disabled") return { availability: "DISABLED" };
  if (value === "live") return { availability: "LIVE", maintenanceMode: false };
  if (value === "restricted") return { maintenanceMode: true };
  throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "A provider can be live, in maintenance or disabled. Other states do not exist." });
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function createApiIntegrationsProvider(): IntegrationsRepository {
  const providerRows = async () => get<{ generatedAt: string; items: ApiProvider[] }>("/providers");
  const connectionRows = async () => (await get<{ items: ApiConnection[] }>("/connections")).items;
  const nameOf = (rows: ApiProvider[], slug: string) => rows.find((provider) => provider.slug === slug)?.name ?? slug;

  const providers = async (): Promise<IntegrationProvider[]> => {
    const { generatedAt, items } = await providerRows();
    return items.map((item) => toProvider(item, generatedAt));
  };

  const patchProvider = async (providerId: string, body: Record<string, unknown>) => {
    await send("PATCH", `/providers/${key(providerId)}/config`, body);
    return true;
  };

  return {
    mode: "api",

    getProviders: providers,

    async getProviderById(id: string) {
      return (await providers()).find((provider) => provider.id === id) ?? null;
    },

    async getProviderConfig(providerId: string) {
      const row = (await providerRows()).items.find((item) => item.slug === providerId);
      return row ? toConfiguration(row) : null;
    },

    async getProviderCapabilities(providerId?: string) {
      const { items } = await providerRows();
      return items.filter((item) => !providerId || item.slug === providerId).flatMap(toCapabilities);
    },

    async getAuthorizations(providerId?: string) {
      const [{ items }, connections] = await Promise.all([providerRows(), connectionRows()]);
      return connections.filter((connection) => !providerId || connection.providerSlug === providerId).map((connection) => toAuthorization(connection, nameOf(items, connection.providerSlug)));
    },

    async getAuthorizationById(id: string) {
      const [{ items }, connections] = await Promise.all([providerRows(), connectionRows()]);
      const connection = connections.find((item) => item.id === id);
      return connection ? toAuthorization(connection, nameOf(items, connection.providerSlug)) : null;
    },

    async getResources(authorizationId?: string) {
      return (await connectionRows()).filter((connection) => !authorizationId || connection.id === authorizationId).flatMap(toResources);
    },

    async getMappings(authorizationId?: string) {
      return (await connectionRows()).filter((connection) => !authorizationId || connection.id === authorizationId).flatMap(toMappings);
    },

    async getIssues() {
      return (await get<{ items: ApiIssue[] }>("/issues")).items.map(toIssue);
    },

    async getIssueById(id: string) {
      const issue = (await get<{ items: ApiIssue[] }>("/issues")).items.find((item) => item.key === id);
      return issue ? toIssue(issue) : null;
    },

    async getActivities() {
      return (await get<{ items: ApiActivity[] }>("/activity")).items.map(toActivity);
    },

    async getReauthorizationRequests() {
      return (await get<{ items: ApiReauthorization[] }>("/reauthorization-requests")).items.map(toReauthorization);
    },

    async getSettings() {
      return get<IntegrationSettings>("/settings");
    },

    async getIssueOwners() {
      return (await get<{ items: { id: string; name: string | null; email: string }[] }>("/issues/owners")).items.map((owner) => ({ id: owner.id, name: owner.name?.trim() || owner.email, email: owner.email }));
    },

    /** Counts come from the same rows the tables show, so a card and its list can never disagree. */
    async getOverviewKpis(): Promise<IntegrationsKpis> {
      const [{ items }, connections] = await Promise.all([providerRows(), connectionRows()]);
      const live = connections.filter((connection) => connection.state !== "disconnected");
      const attention = live.filter((connection) => connection.state !== "connected" && connection.state !== "expiring");
      return {
        totalProviders: items.length,
        liveProviders: items.filter((provider) => availabilityOf(provider) === "live").length,
        approvalPendingProviders: items.filter((provider) => provider.config.apiAccess === "REQUESTED" || provider.config.apiAccess === "PENDING_APPROVAL").length,
        activeConnections: live.filter((connection) => connection.state === "connected" || connection.state === "expiring").length,
        healthyConnections: live.filter((connection) => connection.state === "connected").length,
        reconnectRequiredConnections: live.filter((connection) => connection.state === "needs_reconnect").length,
        degradedProviders: items.filter((provider) => provider.health === "degraded" || provider.health === "partial_outage" || provider.health === "major_outage").length,
        affectedCompanies: new Set(attention.map((connection) => connection.companyId)).size,
      };
    },

    updateProviderAvailability(providerId, newAvailability, reason) {
      return patchProvider(providerId, { ...availabilityPatch(newAvailability), ...(reason.trim() ? { reason: reason.trim().slice(0, 200) } : {}) });
    },

    updateProviderOperationalControls(providerId, controls) {
      return patchProvider(providerId, controls);
    },

    updateProviderConfig(providerId, updates) {
      const body: Record<string, unknown> = {};
      if (updates.platformAvailability !== undefined) Object.assign(body, updates.platformAvailability === "disabled" ? { availability: "DISABLED" } : { availability: "LIVE" });
      if (updates.allowNewConnections !== undefined) body.allowNewConnections = updates.allowNewConnections;
      if (updates.maintenanceMode !== undefined) body.maintenanceMode = updates.maintenanceMode;
      if (updates.maintenanceNote !== undefined) body.maintenanceNote = updates.maintenanceNote;
      if (updates.internalNotes !== undefined) body.internalNotes = updates.internalNotes;
      if (updates.appReviewNotes !== undefined) body.appReviewNotes = updates.appReviewNotes;
      if (updates.externalApiApprovalStatus !== undefined) body.apiAccess = updates.externalApiApprovalStatus.toUpperCase();
      return patchProvider(providerId, body);
    },

    async createReauthorizationRequest(params) {
      await send("POST", `/connections/${key(params.authorizationId)}/reauthorization-request`, { targetRole: params.targetRole, reason: params.reason.trim().slice(0, 200) });
      const created = (await get<{ items: ApiReauthorization[] }>("/reauthorization-requests")).items.find((item) => item.connectionId === params.authorizationId);
      if (created) return toReauthorization(created);
      return {
        id: `request-${params.authorizationId}`,
        providerId: params.providerId,
        authorizationId: params.authorizationId,
        companyId: params.companyId,
        companyName: params.companyName,
        affectedAccount: params.affectedAccount,
        affectedClients: params.affectedClients,
        missingScopes: params.missingScopes,
        requestedBy: { id: "", name: "You", email: "" },
        requestedAt: new Date().toISOString(),
        targetRole: params.targetRole,
        reason: params.reason,
        status: "pending",
      };
    },

    async updateIssueStatus(issueId, newStatus, noteContent) {
      await send("PATCH", `/issues/${key(issueId)}`, { status: newStatus });
      if (noteContent?.trim()) await send("POST", `/issues/${key(issueId)}/notes`, { content: noteContent.trim() });
      return true;
    },

    async assignIssueOwner(issueId, owner) {
      await send("PATCH", `/issues/${key(issueId)}`, { ownerUserId: owner?.id ?? null });
      return true;
    },

    async addIssueNote(issueId, content) {
      await send("POST", `/issues/${key(issueId)}/notes`, { content });
      return true;
    },

    async updateSettings(newSettings) {
      return send<IntegrationSettings>("PUT", "/settings", newSettings);
    },

    // There is no demo workspace in live data, so there is nothing to reset.
    async resetDemo() {},
  };
}
