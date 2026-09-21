/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Status registries, labels, reference definitions and demo constants.
 *
 * Each state vocabulary has its own registry. They are intentionally not merged.
 */

import { ROUTES } from "@/config/routes";
import type { StatusRegistry } from "@/types/common";
import type {
  AccountMappingState,
  AttemptResult,
  CheckResult,
  DedupResult,
  DeliveryState,
  EndpointState,
  EventAudience,
  EventAvailability,
  EventCategory,
  FailureClass,
  ImplementationReadiness,
  IncomingProcessingState,
  PayloadClassification,
  ReceiverStatus,
  RecoveryKind,
  RecoveryState,
  ResourceUpdateResult,
  RetryPolicyDefinition,
  SchemaLifecycle,
  SecurityReviewStatus,
  SigningState,
  SourceConfigurationState,
  SubscriptionState,
  UrlValidationState,
  VerificationMethod,
  VerificationState,
  WebhookEnvironment,
  WebhookSettings,
  WebhookTimeRange,
} from "./types";

export const WEBHOOKS_BASE = ROUTES.superAdmin.webhooks;

export const WEBHOOK_ROUTES = {
  overview: WEBHOOKS_BASE,
  incoming: `${WEBHOOKS_BASE}/incoming`,
  incomingEvents: `${WEBHOOKS_BASE}/incoming/events`,
  incomingSource: (id: string) => `${WEBHOOKS_BASE}/incoming/${id}`,
  incomingEvent: (id: string) => `${WEBHOOKS_BASE}/incoming/events/${id}`,
  outgoing: `${WEBHOOKS_BASE}/outgoing`,
  outgoingConfiguration: `${WEBHOOKS_BASE}/outgoing/configuration`,
  endpoint: (id: string) => `${WEBHOOKS_BASE}/outgoing/${id}`,
  events: `${WEBHOOKS_BASE}/events`,
  subscriptions: `${WEBHOOKS_BASE}/events/subscriptions`,
  eventType: (key: string) => `${WEBHOOKS_BASE}/events/${encodeURIComponent(key)}`,
  deliveries: `${WEBHOOKS_BASE}/deliveries`,
  delivery: (id: string) => `${WEBHOOKS_BASE}/deliveries/${id}`,
  failures: `${WEBHOOKS_BASE}/failures`,
  security: `${WEBHOOKS_BASE}/security`,
  activity: `${WEBHOOKS_BASE}/activity`,
} as const;

export const WEBHOOK_TABS = [
  { label: "Overview", href: WEBHOOK_ROUTES.overview, match: "exact" },
  { label: "Incoming Webhooks", href: WEBHOOK_ROUTES.incoming, match: "prefix" },
  { label: "Outgoing Webhooks", href: WEBHOOK_ROUTES.outgoing, match: "prefix" },
  { label: "Events & Subscriptions", href: WEBHOOK_ROUTES.events, match: "prefix" },
  { label: "Deliveries & Attempts", href: WEBHOOK_ROUTES.deliveries, match: "prefix" },
  { label: "Failures & Retries", href: WEBHOOK_ROUTES.failures, match: "prefix" },
  { label: "Security & Verification", href: WEBHOOK_ROUTES.security, match: "prefix" },
  { label: "Activity & Settings", href: WEBHOOK_ROUTES.activity, match: "prefix" },
] as const;

/** Cross-module destinations that exist in the app today. */
export const MODULE_LINKS = {
  integrations: ROUTES.superAdmin.integrations,
  provider: (id: string) => ROUTES.superAdmin.integrationsProvider(id),
  connections: ROUTES.superAdmin.integrationsConnections,
  company: (id: string) => ROUTES.superAdmin.company(id),
  apiMonitoring: ROUTES.superAdmin.apiMonitoring,
  apiRequests: `${ROUTES.superAdmin.apiMonitoring}/requests`,
  systemHealth: ROUTES.superAdmin.systemHealth,
  auditSensitive: `${ROUTES.superAdmin.auditLogs}/sensitive`,
  globalSettings: ROUTES.superAdmin.settings,
} as const;

/**
 * Jobs & Queues owns worker attempts, but that route is not built yet. Job references are shown
 * as read-only references instead of links that would 404.
 */
export const JOBS_ROUTE_AVAILABLE = false;

/* ------------------------------------------------------------------ */
/* Demo constants                                                      */
/* ------------------------------------------------------------------ */

export const DEMO_CLOCK_ANCHOR = "2026-09-21T07:30:00.000Z";
export const DEMO_TIMEZONE = "Asia/Kolkata";
export const DEMO_ACTOR = { id: "stf_001", name: "Super Admin (Demo)" } as const;

export const DEMO_DATA_LABEL = "Demo Webhook Data";
export const DEMO_DATA_NOTICE = "Real Ingestion & Delivery Not Connected";

export const ENVIRONMENT_OPTIONS: Array<{ value: WebhookEnvironment; label: string }> = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

export const RANGE_OPTIONS: Array<{ value: WebhookTimeRange; label: string; hours: number | null }> = [
  { value: "1h", label: "Last 1 Hour", hours: 1 },
  { value: "24h", label: "Last 24 Hours", hours: 24 },
  { value: "7d", label: "Last 7 Days", hours: 168 },
  { value: "30d", label: "Last 30 Days", hours: 720 },
  { value: "custom", label: "Custom", hours: null },
];

export const ENVIRONMENT_LABEL: Record<WebhookEnvironment, string> = {
  development: "Development",
  staging: "Staging",
  production: "Production",
};

/* ------------------------------------------------------------------ */
/* Status registries — one per vocabulary                              */
/* ------------------------------------------------------------------ */

export const VERIFICATION_STATE: StatusRegistry<VerificationState> = {
  pending: { label: "Pending", tone: "info", description: "Verification has not completed." },
  verified: {
    label: "Verified (Demo Record)",
    tone: "neutral",
    description: "A demo fixture. No cryptographic verification occurred in this frontend.",
  },
  rejected: { label: "Rejected", tone: "danger", description: "The demo record says verification failed." },
  unavailable: { label: "Not Verified", tone: "warning", description: "Verification was unavailable or not defined." },
};

export const PROCESSING_STATE: StatusRegistry<IncomingProcessingState> = {
  received: { label: "Received", tone: "info" },
  queued: { label: "Queued", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  processed: { label: "Processed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  ignored_duplicate: { label: "Ignored Duplicate", tone: "neutral" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const ENDPOINT_STATE: StatusRegistry<EndpointState> = {
  draft: { label: "Draft", tone: "neutral" },
  enabled: { label: "Enabled", tone: "success", description: "Configured to receive events. Not evidence of healthy delivery." },
  disabled: { label: "Disabled", tone: "neutral" },
  suspended: { label: "Suspended", tone: "warning" },
};

export const DELIVERY_STATE: StatusRegistry<DeliveryState> = {
  pending: { label: "Pending", tone: "info" },
  attempting: { label: "Attempting", tone: "info" },
  retry_scheduled: { label: "Retry Scheduled", tone: "warning" },
  delivered: {
    label: "Delivered / Accepted",
    tone: "success",
    description: "The endpoint accepted the delivery. This is not proof of downstream processing.",
  },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const ATTEMPT_RESULT: StatusRegistry<AttemptResult> = {
  succeeded: { label: "Accepted", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  timed_out: { label: "Timed Out", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const RECOVERY_STATE: StatusRegistry<RecoveryState> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "Pending Review (Demo)", tone: "warning" },
  approved: { label: "Approved", tone: "success", description: "Only through a supported approval workflow." },
  accepted_by_backend: { label: "Accepted by Backend", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  executed: { label: "Executed", tone: "success", description: "Only with execution evidence." },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const RECOVERY_KIND: Record<RecoveryKind, { label: string; definition: string }> = {
  retry: { label: "Retry", definition: "Another attempt of the same delivery under its established retry policy." },
  redelivery: {
    label: "Redelivery",
    definition: "An authorised additional delivery of an existing outgoing event to a destination.",
  },
  reprocess: {
    label: "Replay / Reprocess",
    definition: "Reprocessing an existing incoming event. It never bypasses original authenticity checks.",
  },
};

export const SOURCE_CONFIGURATION_STATE: StatusRegistry<SourceConfigurationState> = {
  draft: { label: "Draft", tone: "neutral" },
  configured: { label: "Configured", tone: "info", description: "Configuration exists. It does not imply a live receiver." },
  disabled: { label: "Disabled", tone: "neutral" },
};

export const RECEIVER_STATUS: StatusRegistry<ReceiverStatus> = {
  not_connected: { label: "Receiver Not Connected", tone: "neutral" },
  connected: { label: "Receiver Connected", tone: "success" },
};

export const READINESS: StatusRegistry<ImplementationReadiness> = {
  not_implemented: { label: "Not Implemented", tone: "neutral" },
  contract_defined: { label: "Contract Defined", tone: "info" },
  demo_only: { label: "Demo Only", tone: "brand" },
};

export const SUBSCRIPTION_STATE: StatusRegistry<SubscriptionState> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "neutral" },
  pending_review: { label: "Pending Review", tone: "warning" },
};

export const SIGNING_STATE: StatusRegistry<SigningState> = {
  not_configured: { label: "Signing Not Configured", tone: "warning" },
  demo_reference: { label: "Demo Reference Only", tone: "brand", description: "No real signing implementation exists yet." },
  configured_reference: { label: "Configured (Reference)", tone: "info" },
};

export const SECURITY_REVIEW: StatusRegistry<SecurityReviewStatus> = {
  not_reviewed: { label: "Not Reviewed", tone: "neutral" },
  review_due: { label: "Review Due", tone: "warning" },
  reviewed: { label: "Reviewed", tone: "success" },
  action_required: { label: "Action Required", tone: "danger" },
};

export const URL_VALIDATION: StatusRegistry<UrlValidationState> = {
  not_validated: { label: "Not Validated", tone: "neutral" },
  passed_preliminary: {
    label: "Preliminary Check Passed",
    tone: "info",
    description: "Frontend validation is preliminary. Backend SSRF protection is required.",
  },
  warnings: { label: "Warnings", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

export const EVENT_AVAILABILITY: StatusRegistry<EventAvailability> = {
  available: { label: "Available", tone: "success" },
  deprecated: { label: "Deprecated", tone: "warning" },
};

export const SCHEMA_LIFECYCLE: StatusRegistry<SchemaLifecycle> = {
  current: { label: "Current", tone: "success" },
  supported: { label: "Supported", tone: "info" },
  deprecated: { label: "Deprecated", tone: "warning" },
};

export const RESOURCE_UPDATE: StatusRegistry<ResourceUpdateResult> = {
  applied: { label: "Applied", tone: "success" },
  not_applied: { label: "Not Applied", tone: "danger" },
  partial: { label: "Partially Applied", tone: "warning" },
  not_attempted: { label: "Not Attempted", tone: "neutral" },
};

export const CHECK_RESULT: StatusRegistry<CheckResult> = {
  passed: { label: "Passed (Demo Record)", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  not_applicable: { label: "Not Applicable", tone: "neutral" },
  not_recorded: { label: "Not Recorded", tone: "neutral" },
};

export const ACCOUNT_MAPPING: StatusRegistry<AccountMappingState> = {
  mapped: { label: "Mapped", tone: "success" },
  unmapped: { label: "Unmapped", tone: "warning" },
  ambiguous: { label: "Ambiguous", tone: "warning" },
  not_applicable: { label: "Not Applicable", tone: "neutral" },
};

export const DEDUP_RESULT: StatusRegistry<DedupResult> = {
  unique: { label: "Unique Event", tone: "success" },
  duplicate_http_delivery: { label: "Duplicate HTTP Delivery", tone: "neutral" },
  similar_new_event: { label: "New Event, Similar Payload", tone: "info" },
};

export const VERIFICATION_METHOD_LABEL: Record<VerificationMethod, string> = {
  hmac_signature: "HMAC Signature",
  provider_signature: "Provider-Specific Signature",
  shared_token: "Shared Verification Token",
  not_defined: "Not Defined",
};

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  publishing: "Publishing",
  campaigns: "Campaigns",
  seo_audits: "SEO Audits",
  reports: "Reports",
  billing: "Billing",
  integrations: "Integrations",
};

export const AUDIENCE_LABEL: Record<EventAudience, string> = {
  company: "Company-Scoped",
  platform: "Platform-Only",
};

export const PRIVACY_LABEL: Record<PayloadClassification, string> = {
  operational: "Operational",
  business_confidential: "Business Confidential",
  restricted: "Restricted",
};

export const FAILURE_CLASS: Record<
  FailureClass,
  { label: string; retryable: "yes" | "conditional" | "no"; note: string }
> = {
  connection_failure: { label: "Connection Failure", retryable: "yes", note: "The connection could not be established." },
  dns_tls_failure: { label: "DNS / TLS Failure", retryable: "conditional", note: "May be a persistent misconfiguration. Review the endpoint first." },
  timeout: {
    label: "Timeout",
    retryable: "conditional",
    note: "The recipient may have accepted the event after the timeout. Blind redelivery can duplicate side effects.",
  },
  http_429: { label: "HTTP 429 Rate Limited", retryable: "yes", note: "Retry after the destination's Retry-After window." },
  http_5xx: { label: "HTTP 5xx", retryable: "yes", note: "Transient destination error under the retry policy." },
  http_4xx_permanent: { label: "HTTP 4xx Permanent Rejection", retryable: "no", note: "The destination rejected the request. Retrying unchanged is unlikely to succeed." },
  endpoint_gone: { label: "Endpoint Gone (HTTP 410)", retryable: "no", note: "The destination reports the resource is permanently gone." },
  invalid_endpoint_configuration: { label: "Invalid Endpoint Configuration", retryable: "no", note: "Fix the endpoint configuration before any further delivery." },
  unknown_external_outcome: {
    label: "Unknown External Outcome",
    retryable: "conditional",
    note: "It is not known whether the recipient accepted the event.",
  },
  attempts_exhausted: { label: "Attempts Exhausted", retryable: "no", note: "The retry policy has no remaining attempts." },
};

export const RETRY_POLICIES: RetryPolicyDefinition[] = [
  {
    ref: "retry-policy/standard-v1",
    name: "Standard Exponential (Reference)",
    maxAttempts: 5,
    backoff: "Exponential: 1m, 5m, 30m, 2h",
    retryableClasses: ["connection_failure", "http_429", "http_5xx"],
    notes: "Timeouts and DNS/TLS failures require review because the outcome may be uncertain or persistent.",
  },
  {
    ref: "retry-policy/conservative-v1",
    name: "Conservative (Reference)",
    maxAttempts: 3,
    backoff: "Fixed: 10m, 60m",
    retryableClasses: ["http_429", "http_5xx"],
    notes: "For destinations that are known to be sensitive to duplicate deliveries.",
  },
  {
    ref: "retry-policy/no-retry-v1",
    name: "No Automatic Retry (Reference)",
    maxAttempts: 1,
    backoff: "None",
    retryableClasses: [],
    notes: "Manual review only.",
  },
];

export const DEFAULT_SETTINGS: WebhookSettings = {
  defaultTimeoutMs: 10_000,
  defaultMaxAttempts: 5,
  defaultRetryPolicyRef: "retry-policy/standard-v1",
  stalenessWarningMinutes: 60,
  requireHttpsOutsideDevelopment: true,
  payloadPreviewEnabled: true,
};

export const SECURITY_REFERENCES = {
  privateNetworkPolicy: "egress-policy/block-private-ranges (reference, backend enforcement pending)",
  redirectPolicy: "egress-policy/no-cross-host-redirects (reference, backend enforcement pending)",
  dnsPolicy: "egress-policy/resolve-and-pin (reference, backend enforcement pending)",
  egressPolicy: "egress-policy/allowlisted-proxy (reference, backend enforcement pending)",
} as const;

export const HTTP_STATUS_FILTER_OPTIONS = [
  { value: "2xx", label: "2xx" },
  { value: "4xx", label: "4xx" },
  { value: "429", label: "429" },
  { value: "5xx", label: "5xx" },
  { value: "none", label: "No response" },
];

export const NOT_LIVE_NOTICE =
  "Frontend-only demo. No request was sent to a backend, no webhook was delivered, retried or replayed.";
