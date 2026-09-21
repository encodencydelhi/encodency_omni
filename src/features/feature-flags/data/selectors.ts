/**
 * Pure derivations for Feature Flags: rows, overview counts, change impact,
 * governance decisions and validation. Nothing here reads a clock or a store -
 * callers pass `now` and the records in - so every number is deterministic.
 */
import { CLEANUP_AFTER_DAYS, KEY_PATTERN, LOW_IMPACT_COMPANY_LIMIT } from "./config";
import { computeStats, dependenciesOf, evaluateAll, evaluateFlag, validatePrerequisites, type CompanyFacts, type EvaluationContext } from "./evaluate";
import type {
  AttentionItem,
  ChangeType,
  ConfigDiff,
  CreateFlagInput,
  Environment,
  EnvironmentConfig,
  FeatureFlag,
  FlagChange,
  FlagListQuery,
  FlagRow,
  FlagStats,
  ImpactSummary,
  OperationalState,
  ValidationIssue,
} from "./types";

const DAY_MS = 86_400_000;

export const operationalState = (config: EnvironmentConfig): OperationalState => (config.emergencyOff ? "emergency_off" : config.enabled ? "enabled" : "disabled");

export const contextOf = (flags: readonly FeatureFlag[]): EvaluationContext => ({ flags: new Map(flags.map((flag) => [flag.key, flag])) });

/** Returns a copy of `flag` with one environment (and optionally prerequisites) replaced by a proposed configuration. */
export function applyDiff(flag: FeatureFlag, environment: Environment, diff: Partial<ConfigDiff>): FeatureFlag {
  const config = flag.environments[environment];
  return {
    ...flag,
    prerequisites: diff.prerequisites ? [...diff.prerequisites] : flag.prerequisites,
    environments: {
      ...flag.environments,
      [environment]: {
        ...config,
        enabled: diff.enabled ?? config.enabled,
        strategy: diff.strategy ?? config.strategy,
        percentage: diff.percentage ?? config.percentage,
        selectedCompanyIds: diff.selectedCompanyIds ? [...diff.selectedCompanyIds] : config.selectedCompanyIds,
        emergencyOff: diff.emergencyOff ?? config.emergencyOff,
      },
    },
  };
}

export const configOf = (flag: FeatureFlag, environment: Environment): ConfigDiff => {
  const config = flag.environments[environment];
  return { enabled: config.enabled, strategy: config.strategy, percentage: config.percentage, selectedCompanyIds: [...config.selectedCompanyIds], emergencyOff: config.emergencyOff, prerequisites: [...flag.prerequisites] };
};

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().every((item, index) => item === [...b].sort()[index]);

export function changeTypeOf(before: ConfigDiff, after: ConfigDiff): ChangeType {
  if (!before.emergencyOff && after.emergencyOff) return "emergency_disabled";
  if (before.emergencyOff && !after.emergencyOff) return "emergency_restored";
  if (!same(before.prerequisites, after.prerequisites)) return "dependency_updated";
  if (before.enabled !== after.enabled) return "state_changed";
  if (before.strategy === "selected" && after.strategy === "selected") {
    const added = after.selectedCompanyIds.filter((id) => !before.selectedCompanyIds.includes(id));
    const removed = before.selectedCompanyIds.filter((id) => !after.selectedCompanyIds.includes(id));
    if (added.length > 0 && removed.length === 0) return "target_added";
    if (removed.length > 0 && added.length === 0) return "target_removed";
  }
  return "rollout_updated";
}

export function isNoChange(before: ConfigDiff, after: ConfigDiff): boolean {
  return before.enabled === after.enabled && before.strategy === after.strategy && before.percentage === after.percentage && before.emergencyOff === after.emergencyOff && same(before.selectedCompanyIds, after.selectedCompanyIds) && same(before.prerequisites, after.prerequisites);
}

/* ------------------------------------------------------------------ */
/* Rows and queries                                                    */
/* ------------------------------------------------------------------ */

export function buildRow(flag: FeatureFlag, environment: Environment, companies: readonly CompanyFacts[], context: EvaluationContext, changes: readonly FlagChange[]): FlagRow {
  return {
    flag,
    environment,
    config: flag.environments[environment],
    state: operationalState(flag.environments[environment]),
    stats: computeStats(evaluateAll(flag, environment, companies, context)),
    pendingChanges: changes.filter((item) => item.flagKey === flag.key && item.environment === environment && (item.status === "pending_approval" || item.status === "scheduled" || item.status === "draft")).length,
  };
}

const SORTERS: Record<string, (a: FlagRow, b: FlagRow) => number> = {
  updated: (a, b) => Date.parse(b.config.updatedAt) - Date.parse(a.config.updatedAt),
  name: (a, b) => a.flag.name.localeCompare(b.flag.name),
  created: (a, b) => Date.parse(b.flag.createdAt) - Date.parse(a.flag.createdAt),
  percentage: (a, b) => b.config.percentage - a.config.percentage || a.flag.name.localeCompare(b.flag.name),
  owner: (a, b) => a.flag.ownerTeam.localeCompare(b.flag.ownerTeam) || a.flag.name.localeCompare(b.flag.name),
};

export function queryRows(rows: readonly FlagRow[], query: FlagListQuery): FlagRow[] {
  const search = query.search?.trim().toLowerCase();
  const list = rows
    .filter((row) => query.includeArchived || query.lifecycle === "archived" || row.flag.lifecycle !== "archived")
    .filter((row) => !query.category || row.flag.category === query.category)
    .filter((row) => !query.type || row.flag.type === query.type)
    .filter((row) => !query.lifecycle || row.flag.lifecycle === query.lifecycle)
    .filter((row) => !query.state || row.state === query.state)
    .filter((row) => !query.strategy || row.config.strategy === query.strategy)
    .filter((row) => !query.owner || row.flag.ownerTeam === query.owner)
    .filter((row) => {
      switch (query.quick) {
        case "enabled": return row.state === "enabled";
        case "disabled": return row.state === "disabled";
        case "gradual": return row.state === "enabled" && (row.config.strategy === "percentage" || row.config.strategy === "selected");
        case "internal": return row.config.strategy === "internal";
        case "emergency": return row.state === "emergency_off";
        default: return true;
      }
    })
    .filter((row) => !search || `${row.flag.name} ${row.flag.key} ${row.flag.category} ${row.flag.description}`.toLowerCase().includes(search));
  return [...list].sort(SORTERS[query.sort ?? "updated"] ?? SORTERS.updated!);
}

export function summarize(rows: readonly FlagRow[]) {
  const live = rows.filter((row) => row.flag.lifecycle !== "archived");
  return {
    total: live.length,
    enabled: live.filter((row) => row.state === "enabled").length,
    disabled: live.filter((row) => row.state === "disabled").length,
    targeted: live.filter((row) => row.state === "enabled" && (row.config.strategy === "selected" || row.config.strategy === "percentage")).length,
    internal: live.filter((row) => row.config.strategy === "internal").length,
    emergency: live.filter((row) => row.state === "emergency_off").length,
    archived: rows.filter((row) => row.flag.lifecycle === "archived").length,
  };
}

/* ------------------------------------------------------------------ */
/* Cleanup and attention                                               */
/* ------------------------------------------------------------------ */

export function isCleanupCandidate(flag: FeatureFlag, now: number): boolean {
  if (flag.lifecycle === "archived" || flag.protection === "protected") return false;
  if (flag.lifecycle === "deprecated") return true;
  const production = flag.environments.production;
  const untouched = now - Date.parse(flag.updatedAt) > CLEANUP_AFTER_DAYS * DAY_MS;
  const fullyOn = production.enabled && production.strategy === "all" && !production.emergencyOff;
  const stuckOff = !production.enabled && production.strategy === "disabled";
  return untouched && (fullyOn || stuckOff) && flag.type === "release";
}

export function buildAttention(rows: readonly FlagRow[], changes: readonly FlagChange[], flags: readonly FeatureFlag[], environment: Environment, now: number): AttentionItem[] {
  const items: AttentionItem[] = [];
  const push = (item: Omit<AttentionItem, "id">) => items.push({ ...item, id: `att_${item.kind}_${item.flagKey}_${item.changeId ?? ""}` });
  const byKey = new Map(flags.map((flag) => [flag.key, flag]));

  for (const row of rows) {
    const { flag, config, stats } = row;
    if (flag.lifecycle === "archived") continue;
    const detected = config.updatedAt;
    if (config.emergencyOff) push({ severity: "critical", flagKey: flag.key, flagName: flag.name, environment, kind: "emergency_off", issue: "Emergency disable is active.", scope: `${stats.targetingMatched} matched companies`, detectedAt: config.emergencyAt ?? detected, changeId: null });
    if (config.enabled && !config.emergencyOff && flag.implementation === "not_implemented") push({ severity: "critical", flagKey: flag.key, flagName: flag.name, environment, kind: "not_ready", issue: "Enabled, but the feature is not implemented.", scope: "Every matched company", detectedAt: detected, changeId: null });
    if (config.enabled && !config.emergencyOff && stats.blockedByPlan > 0) push({ severity: "warning", flagKey: flag.key, flagName: flag.name, environment, kind: "plan_mismatch", issue: `${stats.blockedByPlan} targeted ${stats.blockedByPlan === 1 ? "company is" : "companies are"} not entitled under their plan.`, scope: `${stats.blockedByPlan} companies`, detectedAt: detected, changeId: null });
    const missing = flag.prerequisites.filter((key) => { const pre = byKey.get(key); return !pre || pre.lifecycle === "archived" || !pre.environments[environment].enabled || pre.environments[environment].emergencyOff; });
    if (config.enabled && !config.emergencyOff && missing.length > 0) push({ severity: "warning", flagKey: flag.key, flagName: flag.name, environment, kind: "dependency_blocked", issue: `Prerequisite ${missing.map((key) => byKey.get(key)?.name ?? key).join(", ")} is not enabled in ${environment}.`, scope: "Every matched company", detectedAt: detected, changeId: null });
    if (config.enabled && !config.emergencyOff && config.strategy === "selected" && config.selectedCompanyIds.length === 0) push({ severity: "info", flagKey: flag.key, flagName: flag.name, environment, kind: "conflict", issue: "Selected Companies strategy with no companies selected: nothing is matched.", scope: "0 companies", detectedAt: detected, changeId: null });
    if (flag.lifecycle === "deprecated" && config.enabled) push({ severity: "info", flagKey: flag.key, flagName: flag.name, environment, kind: "deprecated_referenced", issue: flag.codeReferences === "referenced" ? "Deprecated, still enabled and still referenced by code." : "Deprecated but still enabled. Code references are unverified.", scope: "Platform", detectedAt: flag.deprecatedAt ?? detected, changeId: null });
    if (isCleanupCandidate(flag, now)) push({ severity: "info", flagKey: flag.key, flagName: flag.name, environment, kind: "cleanup", issue: "Cleanup candidate: review whether the flag can be retired.", scope: "Platform", detectedAt: flag.updatedAt, changeId: null });
  }
  for (const change of changes.filter((item) => item.environment === environment && item.status === "pending_approval")) {
    push({ severity: "warning", flagKey: change.flagKey, flagName: change.flagName, environment, kind: "awaiting_approval", issue: `A ${environment} change is waiting for approval.`, scope: change.impact ? `${change.impact.newlyEnabled.length} newly enabled` : "Impact was not recorded", detectedAt: change.requestedAt, changeId: change.id });
  }
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort((a, b) => rank[a.severity] - rank[b.severity] || Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
}

/* ------------------------------------------------------------------ */
/* Impact and governance                                               */
/* ------------------------------------------------------------------ */

/** Impact of replacing `current` with `next`, each evaluated against a context that holds its own prerequisite flags. */
export function computeImpactWith(current: FeatureFlag, next: FeatureFlag, environment: Environment, companies: readonly CompanyFacts[], currentContext: EvaluationContext, nextContext: EvaluationContext): ImpactSummary {
  const before = companies.map((company) => evaluateFlag(current, environment, company, currentContext));
  const after = companies.map((company) => evaluateFlag(next, environment, company, nextContext));
  const wasOn = new Set(before.filter((item) => item.availability === "available").map((item) => item.companyId));
  const isOn = new Set(after.filter((item) => item.availability === "available").map((item) => item.companyId));
  const name = new Map(companies.map((company) => [company.id, company.name]));
  const stats = computeStats(after);
  return {
    currentEnabled: wasOn.size,
    projectedEnabled: isOn.size,
    newlyEnabled: [...isOn].filter((id) => !wasOn.has(id)).map((id) => ({ id, name: name.get(id) ?? id })),
    newlyDisabled: [...wasOn].filter((id) => !isOn.has(id)).map((id) => ({ id, name: name.get(id) ?? id })),
    planBlocked: stats.blockedByPlan,
    dependencyBlocked: stats.blockedByDependency,
    integrationBlocked: stats.blockedByIntegration,
    eligible: stats.eligible,
    // The data to count clients or scheduled jobs affected by a flag does not exist yet.
    affectedClients: null,
    affectedScheduledJobs: null,
  };
}

export interface ApprovalDecision {
  required: boolean;
  /** True when the change may not be made from this screen at all. */
  forbidden: boolean;
  reason: string;
}

/**
 * What governance says about a proposed change. Non-production changes apply
 * directly in the demo. A production change that touches more than a handful of
 * companies, or any change to a protected flag, needs approval - and because no
 * approval service exists, it is recorded as pending rather than applied.
 */
export function decideApproval(flag: FeatureFlag, environment: Environment, type: ChangeType, impact: ImpactSummary): ApprovalDecision {
  if (environment !== "production") return { required: false, forbidden: false, reason: "Not required outside production." };
  if (type === "emergency_disabled") {
    return flag.protection === "protected"
      ? { required: true, forbidden: true, reason: "Protected flags cannot be emergency-disabled from this screen." }
      : { required: false, forbidden: false, reason: "Emergency disable is permitted for standard and sensitive flags." };
  }
  if (flag.protection === "protected") return { required: true, forbidden: false, reason: "Protected flags need approval for every production change." };
  if (type === "emergency_restored") return { required: flag.protection === "sensitive", forbidden: false, reason: flag.protection === "sensitive" ? "Restoring a sensitive flag needs review." : "Restoring the preserved configuration is permitted." };
  const exposure = impact.newlyEnabled.length;
  if (exposure > LOW_IMPACT_COMPANY_LIMIT) return { required: true, forbidden: false, reason: `Enables ${exposure} more companies, above the low-impact limit of ${LOW_IMPACT_COMPANY_LIMIT}.` };
  if (flag.protection === "sensitive") return { required: true, forbidden: false, reason: "Sensitive flags need review for production changes." };
  return { required: false, forbidden: false, reason: "Low-impact production change: permitted as a demo change." };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export function validateCreate(input: CreateFlagInput, flags: readonly FeatureFlag[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const map = new Map(flags.map((flag) => [flag.key, flag]));
  if (!input.name.trim()) issues.push({ field: "name", message: "Feature name is required." });
  else if (input.name.trim().length > 80) issues.push({ field: "name", message: "Keep the name under 80 characters." });
  if (!input.key.trim()) issues.push({ field: "key", message: "Stable feature key is required." });
  else if (!KEY_PATTERN.test(input.key)) issues.push({ field: "key", message: "Use lowercase area.feature_name, for example content.ai_generator." });
  else if (map.has(input.key)) issues.push({ field: "key", message: "Another flag already uses this key." });
  if (input.description.trim().length < 10) issues.push({ field: "description", message: "Add a description of at least 10 characters." });
  if (!input.ownerTeam) issues.push({ field: "ownerTeam", message: "Choose the owner team." });
  if (input.documentation && !/^https?:\/\/\S+\.\S+/.test(input.documentation)) issues.push({ field: "documentation", message: "Enter a valid URL." });
  issues.push(...validatePrerequisites(input.key, input.prerequisites, map));
  for (const environment of ["development", "staging", "production"] as const) {
    const initial = input.initial[environment];
    if (initial.strategy === "percentage" && (!Number.isInteger(initial.percentage) || initial.percentage < 1 || initial.percentage > 100)) issues.push({ field: `initial.${environment}`, message: "Use a whole percentage from 1 to 100." });
    if (initial.strategy === "selected" && initial.selectedCompanyIds.length === 0) issues.push({ field: `initial.${environment}`, message: "Select at least one company, or choose another strategy." });
  }
  if (input.initial.production.enabled && input.initial.production.strategy !== "disabled") issues.push({ field: "initial.production", message: "A new flag starts disabled in production. Roll it out from the flag's Targeting & Rollout tab." });
  if (input.implementation === "not_implemented" && input.initial.development.enabled) issues.push({ field: "initial.development", message: "The feature is not implemented, so it cannot be enabled anywhere." });
  return issues;
}

/** What stops a flag from being archived. */
export function archiveBlockers(flag: FeatureFlag, flags: readonly FeatureFlag[], changes: readonly FlagChange[]): string[] {
  const blockers: string[] = [];
  if (flag.protection === "protected") blockers.push("Protected flags cannot be archived from this screen.");
  for (const environment of ["development", "staging", "production"] as const) {
    const config = flag.environments[environment];
    if (config.enabled && config.strategy !== "disabled") blockers.push(`Still rolled out in ${environment} (${config.strategy}). Disable it first.`);
    if (config.emergencyOff) blockers.push(`An emergency disable is active in ${environment}. Restore or resolve it first.`);
  }
  const dependents = dependenciesOf(flag.key, new Map(flags.map((item) => [item.key, item]))).dependents.filter((key) => flags.find((item) => item.key === key)?.lifecycle !== "archived");
  if (dependents.length > 0) blockers.push(`Required by ${dependents.join(", ")}.`);
  const open = changes.filter((item) => item.flagKey === flag.key && (item.status === "pending_approval" || item.status === "scheduled" || item.status === "draft"));
  if (open.length > 0) blockers.push(`${open.length} pending, scheduled or draft change${open.length === 1 ? "" : "s"} must be resolved.`);
  return blockers;
}

export type { FlagStats };
