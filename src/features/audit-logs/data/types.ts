export type Environment = "development" | "staging" | "production";

export type AuditCategory =
  | "authentication"
  | "companies"
  | "users_access"
  | "internal_team"
  | "clients"
  | "plans_subscriptions"
  | "billing"
  | "usage_limits"
  | "integrations"
  | "feature_flags"
  | "global_settings"
  | "support_operations";

export type ActorType = "staff" | "company_user" | "system" | "external_provider" | "anonymous";

export type AuditOutcome = "success" | "failed" | "denied" | "pending" | "cancelled" | "partial";

export type ReviewPriority = "informational" | "review_recommended" | "high";

export type ScopeLevel = "platform" | "company" | "client";

export type SensitiveCategory =
  | "privileged_access"
  | "billing_financial"
  | "subscription_entitlements"
  | "integrations"
  | "feature_flags"
  | "platform_security"
  | "data_privacy"
  | "maintenance_availability";

export type WorkflowStage = "requested" | "approved" | "applied" | "rejected";

export type SecurityView = "authentication" | "user_access" | "staff" | "policies";

export interface ActorSnapshot {
  type: ActorType;
  id: string | null;
  displayName: string;
  email: string | null;
  roleAtEvent: string | null;
  scopeAtEvent: string | null;
  attemptedIdentifier: string | null;
  authContext: string | null;
}

export interface TargetSnapshot {
  type: string;
  id: string;
  displayName: string;
  parent: { type: string; id: string; name: string } | null;
  href: string | null;
}

export interface EventScope {
  level: ScopeLevel;
  companyId: string | null;
  companyName: string | null;
  clientId: string | null;
  clientName: string | null;
}

export interface FieldChange {
  key: string;
  label: string;
  kind: "changed" | "added" | "removed";
  before: string | null;
  after: string | null;
  redacted: boolean;
  added?: string[];
  removed?: string[];
  unchangedCount?: number;
}

export interface RelatedRef {
  type: string;
  id: string;
  label: string;
  href: string | null;
}

export interface TechnicalContext {
  ipAddress: string | null;
  userAgent: string | null;
  sessionRef: string | null;
  producerService: string;
  ingestion: string;
}

export type IntegrityStatus = "verified" | "failed" | "unavailable" | "demo_data";

export interface AuditEvent {
  id: string;
  schemaVersion: 1;
  occurredAt: string;
  recordedAt: string;
  category: AuditCategory;
  actionKey: string;
  actionLabel: string;
  actor: ActorSnapshot;
  target: TargetSnapshot;
  scope: EventScope;
  outcome: AuditOutcome;
  priority: ReviewPriority;
  sensitiveCategory: SensitiveCategory | null;
  changes: FieldChange[];
  summary: string;
  reason: string | null;
  environment: Environment;
  sourceModule: string;
  producer: string;
  requestId: string | null;
  correlationId: string | null;
  workflowStage: WorkflowStage | null;
  securityView: SecurityView | null;
  related: RelatedRef[];
  technical: TechnicalContext | null;
  integrity: { status: IntegrityStatus; note: string };
  followUp: string | null;
}
export type RangeKey = "24h" | "7d" | "30d" | "custom";

export interface DateWindow {
  from: string;
  to: string;
}

export interface EventQuery {
  window: DateWindow;
  search?: string;
  category?: string;
  outcome?: string;
  actorType?: string;
  companyId?: string;
  clientId?: string;
  quick?: string;
  actionKey?: string;
  priority?: string;
  actorId?: string;
  resourceType?: string;
  environment?: string;
  sourceModule?: string;
  correlationId?: string;
  requestId?: string;
  /** Exact event id, for exporting one event. */
  eventId?: string;
  /** Search actor emails only when the viewer may see them. */
  searchEmail?: boolean;
  sensitiveOnly?: boolean;
  sensitiveCategory?: string;
  workflowStage?: string;
  securityView?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface EventPage {
  rows: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EventFacets {
  actors: Array<{ id: string; name: string; type: ActorType }>;
  companies: Array<{ id: string; name: string }>;
  actions: Array<{ key: string; label: string }>;
  resourceTypes: string[];
  sourceModules: string[];
}
export interface OverviewKpis {
  total: number;
  sensitive: number;
  failedDenied: number;
  accessChanges: number;
  authFailures: number;
  configChanges: number;
  openInvestigations: number;
  collectionIssues: number;
}

export interface ActivityPoint {
  at: string;
  label: string;
  value: number;
}

export interface AttentionItem {
  id: string;
  eventId: string | null;
  label: "Review Recommended" | "Failed" | "Pending Review" | "Collection Issue";
  title: string;
  detail: string;
  at: string;
  href: string;
}

export interface AuditOverview {
  window: DateWindow;
  environment: Environment | "all";
  kpis: OverviewKpis;
  categories: Array<{ category: AuditCategory; count: number }>;
  attention: AttentionItem[];
  recentSensitive: AuditEvent[];
  lastRecordedAt: string | null;
  source: AuditSourceStatus;
}

export type CollectionState = "configured" | "partially_instrumented" | "not_implemented" | "verification_pending" | "unknown";

export interface CoverageRow {
  module: string;
  category: AuditCategory | null;
  expectedEvents: string[];
  collection: CollectionState;
  verification: "not_verified" | "pending" | "verified";
  lastRecordedAt: string | null;
  recordedCount: number;
  note: string;
  href: string | null;
}

export interface CollectionGap {
  id: string;
  module: string;
  summary: string;
  since: string;
}

export interface RetentionPolicyRef {
  retentionDays: number;
  effectiveSince: string | null;
  owner: string;
  archiveBehavior: string;
  expiryPolicy: string;
  legalHold: string;
  policyHref: string;
}

export interface ExportGovernance {
  requiredCapability: string;
  allowedScope: string;
  reasonRequired: boolean;
  maxRangeDays: number;
  redaction: string;
  approval: string;
  loggingPolicy: string;
  loggedExports: number;
}

export interface AuditSourceStatus {
  dataSource: string;
  ingestion: string;
  collection: string;
  lastReceivedAt: string | null;
  knownGaps: number;
  storageVerification: string;
  integrity: string;
  retentionExecution: string;
  productionCoverage: string;
}

export interface SettingsData {
  coverage: CoverageRow[];
  gaps: CollectionGap[];
  retention: RetentionPolicyRef;
  exportGovernance: ExportGovernance;
  status: AuditSourceStatus;
}
export interface EventDetail {
  event: AuditEvent;
  workflow: AuditEvent[];
  linkedInvestigations: Array<{ id: string; title: string; status: InvestigationStatus }>;
  sameRequest: AuditEvent[];
}
export type InvestigationStatus = "open" | "in_review" | "awaiting_information" | "closed";
export type InvestigationPriority = "normal" | "elevated" | "high";

export interface InvestigationLink {
  eventId: string;
  linkedBy: string;
  linkedAt: string;
  note: string;
}

export interface InvestigationNote {
  id: string;
  author: string;
  authorId: string;
  at: string;
  type: "note" | "correction";
  text: string;
  correctsNoteId: string | null;
}

export type InvestigationActivityKind = "created" | "event_linked" | "event_unlinked" | "note_added" | "owner_changed" | "status_changed" | "priority_changed" | "closed" | "reopened" | "relevance_edited";

export interface InvestigationActivity {
  id: string;
  at: string;
  actor: string;
  kind: InvestigationActivityKind;
  summary: string;
  context: string | null;
}

export interface Investigation {
  id: string;
  title: string;
  description: string;
  scope: EventScope;
  ownerId: string;
  ownerName: string;
  priority: InvestigationPriority;
  status: InvestigationStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  closure: { reason: string; conclusion: string; closedBy: string } | null;
  links: InvestigationLink[];
  notes: InvestigationNote[];
  activity: InvestigationActivity[];
  relatedReference: string | null;
}

export interface InvestigationQuery {
  search?: string;
  status?: string;
  priority?: string;
  ownerId?: string;
  companyId?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sort?: string;
}

export interface InvestigationRow {
  investigation: Investigation;
  linkedEvents: number;
}

export interface InvestigationList {
  rows: InvestigationRow[];
  counts: { open: number; inReview: number; awaiting: number; closed: number; highOpen: number; total: number };
  owners: Array<{ id: string; name: string }>;
  companies: Array<{ id: string; name: string }>;
}

export interface InvestigationDetail {
  investigation: Investigation;
  events: Array<{ link: InvestigationLink; event: AuditEvent | null }>;
  related: RelatedRef[];
}

export interface CreateInvestigationInput {
  title: string;
  description: string;
  scope: { level: ScopeLevel; companyId: string | null; clientId: string | null };
  ownerId: string;
  priority: InvestigationPriority;
  eventIds: string[];
  note: string;
}

export interface MutationActor {
  id: string;
  name: string;
}

export interface OwnerOption {
  id: string;
  name: string;
  role: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
}
export type ExportFormat = "csv" | "json";

export interface ExportRequest {
  query: EventQuery;
  format: ExportFormat;
  reason: string;
  includeSensitive: boolean;
}

export interface ExportResult {
  filename: string;
  format: ExportFormat;
  content: string;
  count: number;
  redactedFields: string[];
  exportEventId: string;
}
