/**
 * The one utilisation resolver.
 *
 * Given a resource, its effective limit (already resolved by the shared
 * entitlement resolver from plan version and overrides), the reading and the
 * thresholds, it returns a single state. It keeps apart concepts that a naive
 * percentage would blur: not entitled is not zero-percent, unlimited has no
 * percentage, a missing reading is not a healthy one.
 */
import type { LimitType, MeteringStatus, ResolvedUtilization, ResourceDefinition, ThresholdPolicy, UtilizationState } from "./types";

export interface ResolveInput {
  definition: Pick<ResourceDefinition, "planControlled">;
  /** The effective limit: `null` is unlimited, `0` is not entitled. */
  effectiveLimit: number | null;
  /** The plan allowance before any override; used only to label custom limits. */
  contractLimit?: boolean;
  used: number | null;
  thresholds: ThresholdPolicy;
  metering: MeteringStatus;
}

const round1 = (value: number) => Number(value.toFixed(1));

export function resolveResourceUtilization(input: ResolveInput): ResolvedUtilization {
  const { effectiveLimit, thresholds, metering } = input;
  const missing = metering === "missing" || input.used === null;
  const stale = metering !== "ok";

  const result = (state: UtilizationState, limitType: LimitType, extra: Partial<ResolvedUtilization> = {}): ResolvedUtilization => ({
    state,
    limitType,
    used: missing ? null : input.used,
    limit: effectiveLimit,
    percent: null,
    remaining: null,
    excess: 0,
    stale,
    ...extra,
  });

  if (!input.definition.planControlled) return result("monitored", "none");
  if (effectiveLimit === 0) return result("not_entitled", "not_entitled");
  if (effectiveLimit === null) return result(missing ? "unknown" : "unlimited", "unlimited");

  const limitType: LimitType = input.contractLimit ? "custom" : "fixed";
  if (missing || input.used === null) return result("unknown", limitType, { used: null });

  const used = input.used;
  const percent = round1((used / effectiveLimit) * 100);
  const remaining = Math.max(0, effectiveLimit - used);
  if (used > effectiveLimit) return result("exceeded", limitType, { percent, remaining: 0, excess: used - effectiveLimit });
  if (used === effectiveLimit) return result("at_limit", limitType, { percent, remaining: 0 });
  if (percent >= thresholds.warningPct) return result("near", limitType, { percent, remaining });
  return result("within", limitType, { percent, remaining });
}

/** Ordering for "worst first": exceeded, at limit, near, unknown, within, then the states without a percentage. */
export const STATE_SEVERITY: Record<UtilizationState, number> = {
  exceeded: 6,
  at_limit: 5,
  near: 4,
  unknown: 3,
  within: 2,
  unlimited: 1,
  monitored: 1,
  not_entitled: 0,
};

export function isPressed(state: UtilizationState): boolean {
  return state === "near" || state === "at_limit" || state === "exceeded";
}
