/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Backend-ready data contracts.
 *
 * Incoming events, incoming processing records, outgoing events, deliveries and
 * delivery attempts are deliberately separate entities with separate state
 * vocabularies. There is no generic "webhookStatus".
 */

export type WebhookEnvironment = "development" | "staging" | "production";
export type WebhookTimeRange = "1h" | "24h" | "7d" | "30d" | "custom";
export type WebhookDirection = "incoming" | "outgoing";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export interface ResourceRef {
  type: string;
  id: string;
  label: string;
}

export interface CompanyOption {
  id: string;
  name: string;
}

/** Every record in this module carries its evidence class. Fixtures are never "live". */
export type DataEvidence = "demo_fixture" | "backend_record";

/* ------------------------------------------------------------------ */
/* Incoming                                                            */
/* ------------------------------------------------------------------ */

export type VerificationMethod =
  | "hmac_signature"
  | "provider_signature"
  | "shared_token"
  | "not_defined";

export type ReceiverStatus = "not_connected" | "connected";
export type ImplementationReadiness = "not_implemented" | "contract_defined" | "demo_only";
export type SourceConfigurationState = "draft" | "configured" | "disabled";
export type AccountMappingState = "mapped" | "unmapped" | "ambiguous" | "not_applicable";

export interface IncomingSource {
  id: string;
  name: string;
  /** Integrations provider id — the single provider registry. */
  providerId: string;
  providerName: string;
  environment: WebhookEnvironment;
  receiverId: string;
  receiverName: string;
  receiverStatus: ReceiverStatus;
  readiness: ImplementationReadiness;
  configurationState: SourceConfigurationState;
  verificationMethod: VerificationMethod;
  verificationPolicyRef: string;
  verificationConfigured: boolean;
  supportedEventTypes: string[];
  accountMappingStrategy: string;
  dedupStrategyRef: string;
  queueRef: string;
  integrationHref: string;
  notes: string;
}

export type VerificationState = "pending" | "verified" | "rejected" | "unavailable";
export type CheckResult = "passed" | "failed" | "not_applicable" | "not_recorded";

export interface IncomingVerification {
  state: VerificationState;
  method: VerificationMethod;
  recordedAt: string | null;
  /** Safe, sanitized reason. Never a signature, secret or token. */
  failureReason: string | null;
  signatureHeaderPresent: boolean | null;
  timestampCheck: CheckResult;
  replayWindowCheck: CheckResult;
  policyRef: string;
  evidence: DataEvidence;
}

export type IncomingProcessingState =
  | "received"
  | "queued"
  | "processing"
  | "processed"
  | "failed"
  | "ignored_duplicate"
  | "rejected";

export type ResourceUpdateResult = "applied" | "not_applied" | "partial" | "not_attempted";

export interface IncomingProcessing {
  recordId: string;
  state: IncomingProcessingState;
  queueRef: string;
  jobId: string | null;
  attemptsUsed: number;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  resourceUpdate: ResourceUpdateResult;
  /** The receiver's HTTP response is recorded separately: it never proves downstream success. */
  receiptHttpStatus: number;
}

export type DedupResult = "unique" | "duplicate_http_delivery" | "similar_new_event";

export interface IncomingDedup {
  providerEventId: string;
  keyRef: string;
  firstSeenAt: string;
  occurrenceCount: number;
  originalEventId: string | null;
  result: DedupResult;
  note: string;
}

export interface IncomingEvent {
  id: string;
  environment: WebhookEnvironment;
  sourceId: string;
  providerId: string;
  providerName: string;
  providerEventRef: string;
  eventType: string;
  receivedAt: string;
  companyId: string | null;
  companyName: string | null;
  /** Provider-side account, resolved through Integrations mapping — never from the payload alone. */
  accountRef: string | null;
  accountMapping: AccountMappingState;
  verification: IncomingVerification;
  processing: IncomingProcessing;
  dedup: IncomingDedup;
  relatedResource: ResourceRef | null;
  technical: {
    receiverId: string;
    requestId: string;
    correlationId: string | null;
    safeHeaders: Record<string, string>;
    sanitizedPayloadSummary: Record<string, string | number | boolean>;
    payloadSchemaVersion: string;
  };
}

/* ------------------------------------------------------------------ */
/* Event catalogue                                                     */
/* ------------------------------------------------------------------ */

export type EventCategory =
  | "publishing"
  | "campaigns"
  | "seo_audits"
  | "reports"
  | "billing"
  | "integrations";

export type EventAvailability = "available" | "deprecated";
export type EventAudience = "company" | "platform";
export type SchemaLifecycle = "current" | "supported" | "deprecated";
export type PayloadClassification = "operational" | "business_confidential" | "restricted";

export interface EventSchemaVersion {
  version: string;
  lifecycle: SchemaLifecycle;
  /** Endpoint subscriptions pinned to an older version stay valid while this is true. */
  backwardCompatible: boolean;
  changeNote: string;
}

export interface OutgoingEventType {
  key: string;
  name: string;
  description: string;
  category: EventCategory;
  schemaVersion: string;
  versions: EventSchemaVersion[];
  producer: string;
  relatedModule: string;
  audience: EventAudience;
  /** Whether customer-configured (company) endpoints may subscribe. */
  customerSubscribable: boolean;
  availability: EventAvailability;
  requiredFields: string[];
  optionalFields: string[];
  deprecatedFields: string[];
  sensitiveFields: Array<{ field: string; classification: PayloadClassification; handling: string }>;
  lastProducedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Outgoing endpoints & subscriptions                                  */
/* ------------------------------------------------------------------ */

export type EndpointOwnerScope = "platform" | "company";
export type EndpointState = "draft" | "enabled" | "disabled" | "suspended";
export type SigningMethod = "hmac_sha256" | "none";
export type SigningState = "not_configured" | "demo_reference" | "configured_reference";
export type SecurityReviewStatus = "not_reviewed" | "review_due" | "reviewed" | "action_required";
export type UrlValidationState = "not_validated" | "passed_preliminary" | "warnings" | "failed";

export interface EndpointSigning {
  method: SigningMethod;
  state: SigningState;
  /** Reference into a future key-management service — never a secret value. */
  secretVersionRef: string | null;
  lastRotationAt: string | null;
  reviewStatus: SecurityReviewStatus;
}

export interface EndpointDeliveryPolicy {
  timeoutMs: number;
  retryPolicyRef: string;
  maxAttempts: number;
  schemaVersion: string;
  payloadPrivacy: PayloadClassification;
}

export interface OutgoingEndpoint {
  id: string;
  name: string;
  description: string;
  environment: WebhookEnvironment;
  ownerScope: EndpointOwnerScope;
  companyId: string | null;
  companyName: string | null;
  /** Sanitized: scheme + host + path, no credentials, query or fragment. */
  destinationUrl: string;
  destinationHost: string;
  hadQueryString: boolean;
  state: EndpointState;
  signing: EndpointSigning;
  policy: EndpointDeliveryPolicy;
  allowedAudience: string;
  contactRef: string | null;
  security: {
    httpsState: "https" | "http" | "unknown";
    urlValidationState: UrlValidationState;
    lastSecurityReviewAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
  demoCreated: boolean;
}

export type SubscriptionState = "active" | "paused" | "pending_review";

export interface EventSubscription {
  id: string;
  endpointId: string;
  eventKey: string;
  schemaVersion: string;
  state: SubscriptionState;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Outgoing events, deliveries, attempts                               */
/* ------------------------------------------------------------------ */

export interface OutgoingEvent {
  id: string;
  environment: WebhookEnvironment;
  eventKey: string;
  schemaVersion: string;
  occurredAt: string;
  companyId: string | null;
  companyName: string | null;
  scope: EventAudience;
  payloadSummary: string;
  resourceRefs: ResourceRef[];
  redactedFields: string[];
  payloadSizeBytes: number | null;
  sanitizedPreview: Record<string, string | number | boolean | null>;
}

export type DeliveryState = "pending" | "attempting" | "retry_scheduled" | "delivered" | "failed" | "cancelled";
export type AttemptResult = "succeeded" | "failed" | "timed_out" | "rejected";

export type FailureClass =
  | "connection_failure"
  | "dns_tls_failure"
  | "timeout"
  | "http_429"
  | "http_5xx"
  | "http_4xx_permanent"
  | "endpoint_gone"
  | "invalid_endpoint_configuration"
  | "unknown_external_outcome"
  | "attempts_exhausted";

export interface Delivery {
  id: string;
  environment: WebhookEnvironment;
  eventId: string;
  eventKey: string;
  endpointId: string;
  companyId: string | null;
  companyName: string | null;
  state: DeliveryState;
  createdAt: string;
  attemptsUsed: number;
  maxAttempts: number;
  latestAttemptAt: string | null;
  nextRetryAt: string | null;
  latestHttpStatus: number | null;
  latestResult: AttemptResult | null;
  latestFailureClass: FailureClass | null;
  failureSummary: string | null;
  /** True when the recipient may have accepted the event even though no success was observed. */
  unknownOutcome: boolean;
  retryPolicyRef: string;
  signingVersionRef: string | null;
  relatedJobId: string | null;
  relatedApiRequestRef: string | null;
  requestId: string;
  correlationId: string | null;
  /** Idempotency reference sent to the recipient. Stable across attempts. */
  idempotencyRef: string;
}

export interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  number: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  httpMethod: "POST";
  destinationHost: string;
  httpStatus: number | null;
  /** Null while the attempt is still in flight. */
  result: AttemptResult | null;
  failureClass: FailureClass | null;
  responseSummary: string;
  retryAfterSeconds: number | null;
  workerJobRef: string | null;
  apiRequestRef: string | null;
}

/* ------------------------------------------------------------------ */
/* Recovery requests                                                   */
/* ------------------------------------------------------------------ */

export type RecoveryKind = "retry" | "redelivery" | "reprocess";
export type RecoveryState =
  | "draft"
  | "pending_review"
  | "approved"
  | "accepted_by_backend"
  | "rejected"
  | "executed"
  | "cancelled";

export interface RecoveryRequest {
  id: string;
  direction: WebhookDirection;
  kind: RecoveryKind;
  /** Delivery id (outgoing) or incoming event id (incoming). */
  targetId: string;
  targetLabel: string;
  counterpartLabel: string;
  companyName: string | null;
  state: RecoveryState;
  reason: string;
  duplicateRiskAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** Present only when a backend reports actual execution. Always null in frontend-only mode. */
  executionEvidence: null;
  demo: true;
}

/* ------------------------------------------------------------------ */
/* Activity, monitoring, config                                        */
/* ------------------------------------------------------------------ */

export type ActivityType =
  | "endpoint_created"
  | "endpoint_updated"
  | "destination_changed"
  | "subscription_added"
  | "subscription_removed"
  | "endpoint_enabled"
  | "endpoint_disabled"
  | "security_policy_updated"
  | "secret_rotation_requested"
  | "delivery_policy_updated"
  | "recovery_request_created"
  | "recovery_request_updated"
  | "settings_updated"
  | "monitoring_gap"
  | "source_observed";

export interface WebhookActivity {
  id: string;
  at: string;
  type: ActivityType;
  actorName: string;
  actorType: "staff" | "system";
  entityType: "endpoint" | "source" | "delivery" | "incoming_event" | "settings" | "recovery_request";
  entityId: string | null;
  endpointId: string | null;
  message: string;
  /** Sensitive administrative changes are recorded centrally in Audit Logs once a backend exists. */
  auditReferenced: boolean;
  evidence: DataEvidence;
}

export interface MonitoringSource {
  id: string;
  name: string;
  freshnessThresholdMinutes: number;
  backendConnected: boolean;
  lastObservedAt: string | null;
}

export interface WebhookSettings {
  defaultTimeoutMs: number;
  defaultMaxAttempts: number;
  defaultRetryPolicyRef: string;
  stalenessWarningMinutes: number;
  requireHttpsOutsideDevelopment: boolean;
  payloadPreviewEnabled: boolean;
}

export interface RetryPolicyDefinition {
  ref: string;
  name: string;
  maxAttempts: number;
  backoff: string;
  retryableClasses: FailureClass[];
  notes: string;
}

export interface WebhooksSnapshot {
  environment: WebhookEnvironment;
  /** The demo clock. All relative ranges are computed against this, not the wall clock. */
  generatedAt: string;
  timezone: string;
  evidence: DataEvidence;
  companies: CompanyOption[];
  sources: IncomingSource[];
  incomingEvents: IncomingEvent[];
  eventTypes: OutgoingEventType[];
  endpoints: OutgoingEndpoint[];
  subscriptions: EventSubscription[];
  outgoingEvents: OutgoingEvent[];
  deliveries: Delivery[];
  attempts: DeliveryAttempt[];
  recoveryRequests: RecoveryRequest[];
  activity: WebhookActivity[];
  monitoring: MonitoringSource[];
  retryPolicies: RetryPolicyDefinition[];
  settings: WebhookSettings;
}

/* ------------------------------------------------------------------ */
/* Mutation inputs                                                     */
/* ------------------------------------------------------------------ */

export interface CreateEndpointInput {
  name: string;
  description: string;
  environment: WebhookEnvironment;
  ownerScope: EndpointOwnerScope;
  companyId: string | null;
  destinationUrl: string;
  allowedAudience: string;
  contactRef: string | null;
  eventKeys: string[];
  timeoutMs: number;
  retryPolicyRef: string;
  payloadPrivacy: PayloadClassification;
  /** Requested initial state. A demo endpoint is never "delivering". */
  state: "draft" | "enabled";
}

export interface UpdateEndpointInput {
  endpointId: string;
  name?: string;
  description?: string;
  destinationUrl?: string;
  allowedAudience?: string;
  contactRef?: string | null;
  timeoutMs?: number;
  retryPolicyRef?: string;
  reason?: string;
}

export interface CreateRecoveryInput {
  direction: WebhookDirection;
  kind: RecoveryKind;
  targetId: string;
  reason: string;
  duplicateRiskAcknowledged: boolean;
  submit: boolean;
}

export interface MutationResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
