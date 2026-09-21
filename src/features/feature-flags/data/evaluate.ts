/**
 * Deterministic flag evaluation.
 *
 * One pure function decides whether a feature is available to a company in an
 * environment. The same inputs always give the same answer: the percentage
 * strategy hashes a stable key, environment, company id and salt - never a random
 * number, never the clock - so a backend can implement the identical contract
 * and the two cannot disagree about who is matched.
 *
 * Each condition is evaluated on its own and reported separately. A feature that
 * is switched on but not in the company's plan is Plan Restricted; a feature whose
 * prerequisite fails is Dependency Blocked; a feature whose credits ran out is still
 * visible and only its action is limited. The stored flag state is never changed
 * by any of these.
 */
import type { IntegrationProvider } from "@/types/domain/integration";
import type {
  Availability,
  BlockReason,
  CompanyEvaluation,
  ConditionState,
  Dependencies,
  Environment,
  EnvironmentConfig,
  FeatureFlag,
  FlagStats,
  ValidationIssue,
} from "./types";

/** What is known about a company. Built once per read from the shared company and plan records. */
export interface CompanyFacts {
  id: string;
  name: string;
  displayId: string;
  planKey: string;
  planName: string;
  subscriptionId: string;
  subscriptionStatus: string;
  accountActive: boolean;
  /** Feature keys the company's plan version includes. */
  entitlements: ReadonlySet<string>;
  integrations: Partial<Record<IntegrationProvider, "healthy" | "attention">>;
  /** Resource keys whose usage limit currently blocks new actions. */
  usageLimited: Readonly<Record<string, string>>;
}

/** Stable 0-99.99 bucket for a company. Changing the inputs changes it; refreshing does not. */
export function bucketFor(flagKey: string, environment: Environment, companyId: string, salt: string): number {
  const text = `${flagKey}|${environment}|${companyId}|${salt}`;
  // FNV-1a, 32 bit. Small, dependency-free and identical in any language.
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return Number(((hash % 10000) / 100).toFixed(2));
}

const ACTIVE_SUBSCRIPTIONS: ReadonlySet<string> = new Set(["trialing", "active", "past_due", "scheduled_cancellation"]);

const cond = (pass: boolean): ConditionState => (pass ? "pass" : "fail");

function implementationPasses(flag: FeatureFlag, environment: Environment): boolean {
  switch (flag.implementation) {
    case "not_implemented": return false;
    case "in_development": return environment === "development";
    case "testing": return environment !== "production";
    default: return true;
  }
}

function targetingMatches(flag: FeatureFlag, config: EnvironmentConfig, environment: Environment, company: CompanyFacts): { matched: boolean; bucket: number } {
  const bucket = bucketFor(flag.key, environment, company.id, config.salt);
  switch (config.strategy) {
    case "all": return { matched: true, bucket };
    case "selected": return { matched: config.selectedCompanyIds.includes(company.id), bucket };
    case "percentage": return { matched: bucket < config.percentage, bucket };
    // Internal testing never matches a tenant company: it must not open tenant data to staff.
    default: return { matched: false, bucket };
  }
}

/** Precedence of the reason shown first. Every failing reason is still returned. */
const PRECEDENCE: BlockReason[] = ["emergency_off", "not_ready", "flag_disabled", "plan_restricted", "subscription_inactive", "internal_only", "rollout_restricted", "dependency_blocked", "integration_blocked"];

export interface EvaluationContext {
  flags: ReadonlyMap<string, FeatureFlag>;
}

export function evaluateFlag(flag: FeatureFlag, environment: Environment, company: CompanyFacts, context: EvaluationContext, visiting: ReadonlySet<string> = new Set()): CompanyEvaluation {
  const config = flag.environments[environment];
  const { matched, bucket } = targetingMatches(flag, config, environment, company);

  const planApplicable = flag.entitlement !== null;
  const planPass = !planApplicable || company.entitlements.has(flag.entitlement as string);
  const subscriptionPass = ACTIVE_SUBSCRIPTIONS.has(company.subscriptionStatus) && company.accountActive;

  const missingPrerequisites: string[] = [];
  const nextVisiting = new Set([...visiting, flag.key]);
  for (const key of flag.prerequisites) {
    const prerequisite = context.flags.get(key);
    // A cycle would never resolve; treat it as unavailable rather than recursing forever.
    if (!prerequisite || nextVisiting.has(key) || evaluateFlag(prerequisite, environment, company, context, nextVisiting).availability !== "available") missingPrerequisites.push(key);
  }
  const dependenciesPass = missingPrerequisites.length === 0;

  const integrationDetail = flag.integrations.map((provider) => {
    const state = company.integrations[provider];
    return { provider, state: state === undefined ? ("not_connected" as const) : state === "healthy" ? ("ready" as const) : ("not_ready" as const) };
  });
  const integrationPass = integrationDetail.every((item) => item.state === "ready");

  const conditions = {
    implementation: cond(implementationPasses(flag, environment)),
    flag: cond(config.enabled),
    emergency: cond(!config.emergencyOff),
    targeting: cond(matched),
    plan: planApplicable ? cond(planPass) : ("not_applicable" as const),
    subscription: cond(subscriptionPass),
    dependencies: flag.prerequisites.length === 0 ? ("not_applicable" as const) : cond(dependenciesPass),
    integration: flag.integrations.length === 0 ? ("not_applicable" as const) : cond(integrationPass),
  };

  const failing = new Set<BlockReason>();
  if (config.emergencyOff) failing.add("emergency_off");
  if (conditions.implementation === "fail") failing.add("not_ready");
  if (!config.enabled) failing.add("flag_disabled");
  if (!planPass) failing.add("plan_restricted");
  if (!subscriptionPass) failing.add("subscription_inactive");
  if (!matched) failing.add(config.strategy === "internal" ? "internal_only" : "rollout_restricted");
  if (!dependenciesPass) failing.add("dependency_blocked");
  if (!integrationPass) failing.add("integration_blocked");

  const reasons = PRECEDENCE.filter((reason) => failing.has(reason));
  const availability: Availability = reasons[0] ?? "available";

  const limited = flag.usageResource ? company.usageLimited[flag.usageResource] : undefined;
  const action = !flag.usageResource ? { state: "not_applicable" as const, detail: null } : limited ? { state: "limited" as const, detail: limited } : { state: "ok" as const, detail: null };

  return {
    flagKey: flag.key,
    environment,
    companyId: company.id,
    companyName: company.name,
    companyDisplayId: company.displayId,
    planName: company.planName,
    planKey: company.planKey,
    subscriptionId: company.subscriptionId,
    subscriptionStatus: company.subscriptionStatus,
    accountActive: company.accountActive,
    conditions,
    eligible: planPass && subscriptionPass,
    targeted: matched,
    availability,
    reasons,
    primaryReason: reasons[0] ?? null,
    missingPrerequisites,
    integrationDetail,
    action,
    bucket,
  };
}

export function evaluateAll(flag: FeatureFlag, environment: Environment, companies: readonly CompanyFacts[], context: EvaluationContext): CompanyEvaluation[] {
  return companies.map((company) => evaluateFlag(flag, environment, company, context));
}

/**
 * Counts for a flag. Blocked-by counts are independent, not disjoint: a targeted
 * company can be both plan-blocked and integration-blocked, and appears in both.
 */
export function computeStats(evaluations: readonly CompanyEvaluation[]): FlagStats {
  const live = evaluations.filter((item) => item.conditions.flag === "pass" && item.conditions.emergency === "pass" && item.conditions.implementation === "pass");
  const targetingMatched = evaluations.filter((item) => item.targeted).length;
  const targetedLive = live.filter((item) => item.targeted);
  return {
    eligible: evaluations.filter((item) => item.eligible).length,
    targeted: evaluations.filter((item) => item.eligible && item.targeted).length,
    targetingMatched,
    effective: evaluations.filter((item) => item.availability === "available").length,
    blocked: targetedLive.filter((item) => item.availability !== "available").length,
    blockedByPlan: targetedLive.filter((item) => item.conditions.plan === "fail").length,
    blockedByDependency: targetedLive.filter((item) => item.conditions.plan !== "fail" && item.conditions.dependencies === "fail").length,
    blockedByIntegration: targetedLive.filter((item) => item.conditions.plan !== "fail" && item.conditions.integration === "fail").length,
    totalCompanies: evaluations.length,
  };
}

/* ------------------------------------------------------------------ */
/* Dependencies                                                        */
/* ------------------------------------------------------------------ */

export function dependenciesOf(key: string, flags: ReadonlyMap<string, FeatureFlag>): Dependencies {
  const direct = [...(flags.get(key)?.prerequisites ?? [])];
  const seen = new Set<string>(direct);
  const queue = [...direct];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of flags.get(current)?.prerequisites ?? []) {
      if (!seen.has(next) && next !== key) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  const dependents = [...flags.values()].filter((flag) => flag.prerequisites.includes(key)).map((flag) => flag.key);
  return { direct, indirect: [...seen].filter((item) => !direct.includes(item)), dependents };
}

/** The path that would form a cycle if `key` required `prerequisites`, or `null` when the graph stays acyclic. */
export function findCycle(key: string, prerequisites: readonly string[], flags: ReadonlyMap<string, FeatureFlag>): string[] | null {
  const edges = (node: string) => (node === key ? prerequisites : (flags.get(node)?.prerequisites ?? []));
  const path: string[] = [];
  const visit = (node: string, onPath: Set<string>): string[] | null => {
    path.push(node);
    onPath.add(node);
    for (const next of edges(node)) {
      if (onPath.has(next)) return [...path.slice(path.indexOf(next)), next];
      const found = visit(next, onPath);
      if (found) return found;
    }
    path.pop();
    onPath.delete(node);
    return null;
  };
  return visit(key, new Set());
}

export function validatePrerequisites(key: string, prerequisites: readonly string[], flags: ReadonlyMap<string, FeatureFlag>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const item of prerequisites) {
    if (item === key) issues.push({ field: "prerequisites", message: "A feature cannot require itself." });
    else if (!flags.has(item)) issues.push({ field: "prerequisites", message: `${item} is not a registered feature flag.` });
    else if (flags.get(item)?.lifecycle === "archived") issues.push({ field: "prerequisites", message: `${item} is archived and cannot be required.` });
  }
  if (issues.length === 0) {
    const cycle = findCycle(key, prerequisites, flags);
    if (cycle) issues.push({ field: "prerequisites", message: `This would create a circular dependency: ${cycle.join(" -> ")}.` });
  }
  return issues;
}
