import type { IntegrationProvider } from "@/types/domain/integration";
import type { Permission } from "@/types/domain/team";

export type Environment = "development" | "staging" | "production";

export type FlagType = "release" | "operational";

export type LifecycleStatus = "draft" | "active" | "deprecated" | "archived";

export type ImplementationStatus = "not_implemented" | "in_development" | "testing" | "ready" | "deprecated";

export type Protection = "standard" | "sensitive" | "protected";

export type RolloutStrategy = "disabled" | "internal" | "selected" | "percentage" | "all";

export type OperationalState = "enabled" | "disabled" | "emergency_off";

export type FeatureCategory = "AI & Content" | "Automation" | "Channels" | "Website & SEO" | "Analytics" | "Workspace" | "Agency" | "Platform" | "Security" | "Billing";

export interface EnvironmentConfig {
  enabled: boolean;
  strategy: RolloutStrategy;
  percentage: number;
  selectedCompanyIds: string[];
  emergencyOff: boolean;
  emergencyReason: string | null;
  emergencyAt: string | null;
  emergencyBy: string | null;
  salt: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  category: FeatureCategory;
  ownerTeam: string;
  relatedModule: string;
  documentation: string;
  type: FlagType;
  lifecycle: LifecycleStatus;
  protection: Protection;
  implementation: ImplementationStatus;
  knownLimitations: string[];
  entitlement: string | null;
  requiredCapability: Permission | null;
  integrations: IntegrationProvider[];
  usageResource: string | null;
  prerequisites: string[];
  environments: Record<Environment, EnvironmentConfig>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deprecatedAt: string | null;
  archivedAt: string | null;
  codeReferences: "unverified" | "none_found" | "referenced";
}
export type Availability =
  | "available"
  | "emergency_off"
  | "not_ready"
  | "flag_disabled"
  | "plan_restricted"
  | "subscription_inactive"
  | "rollout_restricted"
  | "dependency_blocked"
  | "integration_blocked"
  | "internal_only";

export type BlockReason = Exclude<Availability, "available">;

export type ConditionState = "pass" | "fail" | "not_applicable";

export interface CompanyEvaluation {
  flagKey: string;
  environment: Environment;
  companyId: string;
  companyName: string;
  companyDisplayId: string;
  planName: string;
  planKey: string;
  subscriptionId: string;
  subscriptionStatus: string;
  accountActive: boolean;
  /** Each condition on its own: a feature can fail more than one. */
  conditions: {
    implementation: ConditionState;
    flag: ConditionState;
    emergency: ConditionState;
    targeting: ConditionState;
    plan: ConditionState;
    subscription: ConditionState;
    dependencies: ConditionState;
    integration: ConditionState;
  };
  /** True when the plan entitlement does not gate this feature or gates it and passes. */
  eligible: boolean;
  targeted: boolean;
  availability: Availability;
  /** Every reason the feature is not available, most significant first. */
  reasons: BlockReason[];
  primaryReason: BlockReason | null;
  missingPrerequisites: string[];
  integrationDetail: Array<{ provider: IntegrationProvider; state: "ready" | "not_connected" | "not_ready" }>;
  /** Action-level eligibility from usage. The feature stays visible when this is limited. */
  action: { state: "ok" | "limited" | "not_applicable"; detail: string | null };
  /** Deterministic bucket 0-99.99 used by the percentage strategy, exposed so the result is explainable. */
  bucket: number;
}

export interface FlagStats {
  /** Companies whose subscription and plan can carry the feature. */
  eligible: number;
  /** Eligible companies the current targeting matches. */
  targeted: number;
  /** Companies the targeting matches whether or not they are eligible. */
  targetingMatched: number;
  effective: number;
  blocked: number;
  blockedByPlan: number;
  blockedByDependency: number;
  blockedByIntegration: number;
  totalCompanies: number;
}

/* ------------------------------------------------------------------ */
/* Changes                                                             */
/* ------------------------------------------------------------------ */

export type ChangeType =
  | "flag_created"
  | "state_changed"
  | "rollout_updated"
  | "target_added"
  | "target_removed"
  | "dependency_updated"
  | "emergency_disabled"
  | "emergency_restored"
  | "metadata_updated"
  | "flag_deprecated"
  | "flag_archived";

export type ChangeStatus = "draft" | "pending_approval" | "scheduled" | "applied" | "rejected" | "cancelled";

/** The parts of an environment configuration a change can propose. */
export interface ConfigDiff {
  enabled: boolean;
  strategy: RolloutStrategy;
  percentage: number;
  selectedCompanyIds: string[];
  emergencyOff: boolean;
  prerequisites: string[];
}

export interface ImpactSummary {
  currentEnabled: number;
  projectedEnabled: number;
  newlyEnabled: Array<{ id: string; name: string }>;
  newlyDisabled: Array<{ id: string; name: string }>;
  planBlocked: number;
  dependencyBlocked: number;
  integrationBlocked: number;
  eligible: number;
  /** Not calculable from available data; shown as unavailable, never invented. */
  affectedClients: number | null;
  affectedScheduledJobs: number | null;
}

export interface FlagChange {
  id: string;
  flagId: string;
  flagKey: string;
  flagName: string;
  environment: Environment;
  type: ChangeType;
  status: ChangeStatus;
  before: ConfigDiff | null;
  after: ConfigDiff | null;
  reason: string;
  requestedBy: string;
  requestedById: string;
  requestedAt: string;
  effectiveAt: string | null;
  timezone: string;
  approvalRequired: boolean;
  approvalNote: string;
  impact: ImpactSummary | null;
  appliedAt: string | null;
  demo: boolean;
  /** Configuration version created when the change was applied. */
  versionNumber: number | null;
  auditRef: string | null;
}

export interface ConfigVersion {
  id: string;
  flagId: string;
  flagKey: string;
  environment: Environment;
  version: number;
  config: ConfigDiff;
  createdBy: string;
  createdAt: string;
  reason: string;
  changeId: string | null;
  current: boolean;
}

export interface FlagActivity {
  id: string;
  at: string;
  actor: string;
  flagKey: string;
  flagName: string;
  environment: Environment | null;
  type: ChangeType;
  result: "applied" | "pending" | "scheduled" | "cancelled" | "rejected";
  summary: string;
  changeId: string | null;
}

/* ------------------------------------------------------------------ */
/* Inputs, queries, views                                              */
/* ------------------------------------------------------------------ */

export interface MutationActor {
  id: string;
  name: string;
}

export interface CreateFlagInput {
  name: string;
  key: string;
  description: string;
  category: FeatureCategory;
  ownerTeam: string;
  relatedModule: string;
  documentation: string;
  type: FlagType;
  implementation: ImplementationStatus;
  protection: Protection;
  entitlement: string | null;
  requiredCapability: Permission | null;
  integrations: IntegrationProvider[];
  usageResource: string | null;
  prerequisites: string[];
  /** Initial configuration for each environment. Production always starts disabled unless explicitly proposed. */
  initial: Record<Environment, { strategy: RolloutStrategy; percentage: number; selectedCompanyIds: string[]; enabled: boolean }>;
  reason: string;
}

export interface ProposeChangeInput {
  flagKey: string;
  environment: Environment;
  proposed: Partial<ConfigDiff>;
  reason: string;
  /** ISO time in the future for a scheduled change; omit for immediate. */
  effectiveAt?: string | null;
  saveAsDraft?: boolean;
}

export interface ChangeOutcome {
  change: FlagChange;
  applied: boolean;
  flag: FeatureFlag;
}

export interface FlagListQuery {
  environment: Environment;
  search?: string;
  category?: string;
  type?: string;
  lifecycle?: string;
  state?: string;
  strategy?: string;
  owner?: string;
  quick?: string;
  sort?: string;
  includeArchived?: boolean;
}

export interface FlagRow {
  flag: FeatureFlag;
  environment: Environment;
  config: EnvironmentConfig;
  state: OperationalState;
  stats: FlagStats;
  pendingChanges: number;
}

export interface Dependencies {
  direct: string[];
  indirect: string[];
  dependents: string[];
}

export interface AttentionItem {
  id: string;
  severity: "critical" | "warning" | "info";
  flagKey: string;
  flagName: string;
  environment: Environment;
  kind: "not_ready" | "dependency_blocked" | "plan_mismatch" | "awaiting_approval" | "emergency_off" | "conflict" | "deprecated_referenced" | "inconsistent" | "cleanup";
  issue: string;
  scope: string;
  detectedAt: string;
  changeId: string | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
}
