/**
 * Effective entitlement resolution.
 *
 * One deterministic function decides what a company may actually use, from the
 * plan version it is pinned to, the overrides granted to it, its lifecycle state
 * and the evaluation date. Company usage, client-creation eligibility and the
 * subscription screens all resolve limits through here, so they cannot disagree.
 *
 * Override semantics are explicit, never guessed:
 *   absolute  the override value replaces the plan allowance
 *   additive  the override value is added to the plan allowance
 * An additive override on an unlimited allowance stays unlimited.
 */
import type { CompanySubscriptionStatus, CompanyUsageOverride, UsageResource } from "@/features/companies/data/types";
import { RESOURCES, ruleToLimit } from "./catalogue";
import type { EffectiveLimit, EffectiveRule, LimitRule, PlanVersion, ResourceKey } from "./types";

/** Lifecycle states in which a company is not entitled to overrides. */
const INACTIVE: ReadonlySet<CompanySubscriptionStatus> = new Set(["cancelled", "expired"]);

export function isInactiveStatus(status: CompanySubscriptionStatus): boolean {
  return INACTIVE.has(status);
}

export function resourceKeyForUsage(resource: UsageResource): ResourceKey | null {
  return RESOURCES.find((item) => item.usageResource === resource)?.key ?? null;
}

/** The value an override yields on top of a given plan allowance. */
export function overrideValueFor(override: CompanyUsageOverride, base: number | null): number | null {
  if (override.rule === "additive") return base === null ? null : base + (override.delta ?? 0);
  return override.overrideLimit;
}

export function overrideRuleLabel(override: CompanyUsageOverride): EffectiveRule {
  return override.rule === "additive" ? "additive increase" : "absolute replacement";
}

/** The override in force at `now` (started, not expired, not revoked); the most generous wins. */
export function activeOverrideAt(
  overrides: readonly CompanyUsageOverride[],
  resource: UsageResource,
  now: number,
  base: number | null,
): CompanyUsageOverride | null {
  const live = overrides.filter(
    (item) => item.resource === resource && !item.revokedAt && Date.parse(item.startsAt) <= now && Date.parse(item.expiresAt) > now,
  );
  const rank = (item: CompanyUsageOverride) => {
    const value = overrideValueFor(item, base);
    return value === null ? Number.POSITIVE_INFINITY : value;
  };
  return live.sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

export interface ResolveInput {
  version: Pick<PlanVersion, "limits">;
  overrides: readonly CompanyUsageOverride[];
  subscriptionStatus: CompanySubscriptionStatus;
  evaluationDate: number;
}

export function resolveEffectiveEntitlements(input: ResolveInput): Record<ResourceKey, EffectiveLimit> {
  const result = {} as Record<ResourceKey, EffectiveLimit>;
  const inactive = isInactiveStatus(input.subscriptionStatus);

  for (const def of RESOURCES) {
    const baseRule: LimitRule = input.version.limits[def.key] ?? { kind: "none", value: null };
    const baseValue = ruleToLimit(baseRule);
    const override = def.usageResource && !inactive ? activeOverrideAt(input.overrides, def.usageResource, input.evaluationDate, baseValue) : null;

    result[def.key] = {
      baseValue,
      baseRule,
      effectiveValue: override ? overrideValueFor(override, baseValue) : baseValue,
      override,
      ruleApplied: inactive ? "inactive subscription" : override ? overrideRuleLabel(override) : "base",
      afterExpiryValue: baseValue,
    };
  }
  return result;
}

/** Whether `used` already exceeds `limit` (null is unlimited). */
export function exceeds(used: number, limit: number | null): boolean {
  return limit !== null && used > limit;
}
