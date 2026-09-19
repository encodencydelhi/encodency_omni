/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Domain Types and Contracts
 */

export type PlatformAvailability =
  | "draft"
  | "testing"
  | "live"
  | "restricted"
  | "disabled"
  | "retired";

export type ExternalApiAccess =
  | "not_requested"
  | "requested"
  | "pending_approval"
  | "approved"
  | "limited_access"
  | "rejected"
  | "not_applicable";

export type OperationalHealth =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "unknown";

export type ProviderCategory =
  | "social"
  | "local"
  | "messaging"
  | "video"
  | "seo"
  | "analytics"
  | "media";

export type AuthorizationMethod =
  | "oauth2"
  | "api_key"
  | "partner_integration"
  | "service_account";

export type CapabilityCategory =
  | "connection"
  | "publishing"
  | "engagement"
  | "analytics"
  | "synchronization"
  | "webhooks"
  | "security";

export type CapabilityStatus =
  | "available"
  | "limited"
  | "requires_approval"
  | "requires_reauthorization"
  | "disabled_by_platform"
  | "not_included_in_plan"
  | "not_implemented"
  | "unavailable";

export type ConnectionHealthStatus =
  | "healthy"
  | "needs_reconnect"
  | "permission_issue"
  | "sync_failure"
  | "rate_limited"
  | "disconnected";

export type IssueSeverity = "critical" | "warning" | "info";

export type IssueScope =
  | "provider_incident"
  | "authorization"
  | "connection"
  | "resource"
  | "sync_job";

export type IssueStatus = "open" | "investigating" | "mitigated" | "resolved";

export type ResourceType =
  | "facebook_page"
  | "instagram_account"
  | "linkedin_page"
  | "google_business_location"
  | "youtube_channel"
  | "x_account"
  | "whatsapp_number"
  | "ga4_property"
  | "gsc_site"
  | "cloudinary_cloud";

export interface IntegrationProvider {
  id: string; // e.g. "meta", "linkedin"
  name: string; // e.g. "Meta (Facebook & Instagram)"
  category: ProviderCategory;
  shortDescription: string;
  description: string;
  websiteUrl: string;
  docsUrl: string;
  authMethod: AuthorizationMethod;
  platformAvailability: PlatformAvailability;
  externalApiAccess: ExternalApiAccess;
  operationalHealth: OperationalHealth;
  supportedResourceTypes: ResourceType[];
  appReviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Aggregate cached counters
  activeConnectionsCount: number;
  connectedResourcesCount: number;
  affectedCompaniesCount: number;
  healthyConnectionsCount: number;
  reconnectRequiredCount: number;
  recentFailuresCount: number;
  lastSuccessfulOperationAt: string | null;
}

export interface ProviderConfiguration {
  providerId: string;
  providerCode: string; // internal read-only key e.g. "meta"
  category: ProviderCategory;
  environment: "production" | "sandbox";
  platformAvailability: PlatformAvailability;
  description: string;
  supportedResourceTypes: ResourceType[];
  internalNotes: string;
  
  // Authorization setup
  authMethod: AuthorizationMethod;
  redirectUri: string;
  requiredScopes: string[];
  supportedAccountTypes: string[];
  externalApiApprovalStatus: ExternalApiAccess;
  appReviewNotes: string;
  
  // Secure Credential Safe Status (NO RAW SECRETS)
  credentialConfigured: boolean;
  credentialEnv: "production" | "sandbox";
  lastRotatedAt: string | null;
  secretReferenceStatus: "active_in_vault" | "missing" | "expired";
  publicAppId: string; // Safe public client ID only
  
  // Operational controls
  allowNewConnections: boolean;
  allowExistingPublishing: boolean;
  allowExistingSync: boolean;
  enableWebhooks: boolean;
  maintenanceMode: boolean;
  visibilityInCompanyAdmin: boolean;
}

export interface ProviderCapability {
  id: string; // e.g. "meta_publish_image"
  providerId: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  providerSupported: boolean;
  externalApprovalRequired: boolean;
  externalApprovalStatus: ExternalApiAccess;
  connectorStatus: "implemented" | "in_progress" | "planned";
  platformEnabled: boolean;
  requiredScopes: string[];
  affectedModules: string[];
  knownRestrictions?: string;
  docsUrl?: string;
}

export interface ProviderAuthorization {
  id: string; // auth_meta_namo_gange
  providerId: string;
  companyId: string;
  companyName: string;
  authorizationLabel: string; // e.g. "Namo Gange Trust Meta OAuth Authorization"
  authMethod: AuthorizationMethod;
  status: "active" | "expired" | "revoked" | "pending";
  grantedScopes: string[];
  requiredScopes: string[];
  missingScopes: string[];
  tokenExpiresAt: string | null;
  lastVerifiedAt: string;
  connectedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  connectedAt: string;
  // Computed connection health
  healthStatus: ConnectionHealthStatus;
  lastSuccessfulSyncAt: string | null;
  lastAttemptedSyncAt: string | null;
  recentFailureCount: number;
  rateLimitResetAt: string | null;
  latestErrorMessage?: string;
}

export interface ExternalResource {
  id: string; // res_fb_mokshasewa
  authorizationId: string;
  providerId: string;
  companyId: string;
  resourceName: string; // e.g. "Moksha Sewa Facebook Page"
  resourceType: ResourceType;
  externalResourceId: string; // safely truncated e.g. "act_92384***"
  status: "active" | "disconnected" | "sync_failed" | "restricted";
  mappedClientId: string | null;
  mappedClientName: string | null;
  mappingStatus: "active" | "unmapped" | "conflict" | "pending_review";
  dependentModules: string[];
  lastSyncAt: string | null;
  createdAt: string;
}

export interface ClientResourceMapping {
  id: string;
  resourceId: string;
  authorizationId: string;
  companyId: string;
  clientId: string;
  clientName: string;
  status: "active" | "conflict" | "pending_review";
  mappedAt: string;
  mappedBy: string;
  notes?: string;
}

export interface IntegrationIssue {
  id: string; // iss_meta_2026_09_01
  issueNumber: string; // e.g. "ISS-1042"
  severity: IssueSeverity;
  scope: IssueScope;
  providerId: string;
  title: string;
  summary: string;
  status: IssueStatus;
  detectedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  affectedCompanyIds: string[];
  affectedCompanyNames: string[];
  affectedConnectionIds: string[];
  affectedResourceIds: string[];
  affectedCapabilities: string[];
  internalOwner: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  investigationNotes: IssueNote[];
  timeline: IssueTimelineEvent[];
  relatedJobIds: string[];
  relatedApiEventIds: string[];
}

export interface IssueNote {
  id: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  content: string;
  isInternal: boolean;
}

export interface IssueTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  fromStatus?: IssueStatus;
  toStatus?: IssueStatus;
}

export interface IntegrationActivity {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    type: "super_admin" | "company_admin" | "system";
  };
  eventType:
    | "provider_enabled"
    | "provider_disabled"
    | "provider_availability_changed"
    | "provider_config_updated"
    | "provider_capability_changed"
    | "provider_incident_opened"
    | "provider_incident_updated"
    | "provider_incident_resolved"
    | "connection_authorized"
    | "connection_disconnected"
    | "connection_disabled"
    | "connection_reenabled"
    | "resource_discovered"
    | "resource_mapped"
    | "resource_unmapped"
    | "permission_verified"
    | "permission_issue_detected"
    | "reauthorization_requested"
    | "sync_succeeded"
    | "sync_failed"
    | "settings_updated";
  providerId: string;
  companyId?: string;
  companyName?: string;
  clientId?: string;
  clientName?: string;
  entityId?: string;
  description: string;
  result: "success" | "warning" | "failure" | "info";
  auditLogId?: string;
}

export interface ReauthorizationRequest {
  id: string;
  providerId: string;
  authorizationId: string;
  companyId: string;
  companyName: string;
  affectedAccount: string;
  affectedClients: string[];
  missingScopes: string[];
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  requestedAt: string;
  targetRole: "owner" | "admin";
  reason: string;
  status: "pending" | "acknowledged" | "completed" | "cancelled";
}

export interface IntegrationSettings {
  newConnectionApprovalPolicy: "automatic" | "admin_review" | "restricted_tier";
  inactiveConnectionReviewDays: number;
  reauthorizationRequestDefaults: {
    reminderDays: number;
    escalateToOwner: boolean;
    autoPauseAfterDays: number;
  };
  connectionOwnershipPolicy: "strict_company_silo" | "agency_delegated";
  tokenExpiryWarningDays: number;
  connectionHealthCheckIntervalMinutes: number;
  providerIncidentAlertThreshold: "any_degradation" | "major_outage_only";
  repeatedFailureThreshold: number;
  defaultSyncIntervalMinutes: number;
  retryPolicy: "exponential_backoff" | "fixed_interval";
  backoffMaxRetries: number;
  failureEscalationPolicy: "alert_admin" | "flag_connection" | "auto_pause";
  notificationPolicies: {
    providerOutageAlerts: boolean;
    connectionExpiryAlerts: boolean;
    permissionRevocationAlerts: boolean;
    integrationFailureEscalation: boolean;
  };
  accessAndSecurity: {
    whoCanEditConfig: "super_admin_only" | "tech_lead";
    whoCanChangeAvailability: "super_admin_only";
    whoCanPauseOperations: "super_admin_only" | "tech_lead";
    requireTwoFactorForSensitiveActions: boolean;
  };
}

export interface IntegrationsKpis {
  totalProviders: number;
  liveProviders: number;
  approvalPendingProviders: number;
  activeConnections: number;
  healthyConnections: number;
  reconnectRequiredConnections: number;
  degradedProviders: number;
  affectedCompanies: number;
}
