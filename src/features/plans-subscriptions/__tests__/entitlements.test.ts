import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CompanyUsageOverride } from "@/features/companies/data/types";
import { RESOURCES, formatRule, limitToRule, ruleToLimit } from "../data/catalogue";
import { activeOverrideAt, overrideValueFor, resolveEffectiveEntitlements } from "../data/entitlements";
import { DEFAULT_POLICY, parseDays, validatePolicy } from "../data/policies";
import { annualSavings, fromMinor, moneyTotals, toMinor } from "../lib/money";
import type { LimitRule, PlanVersion, ResourceKey } from "../data/types";

const NOW = Date.parse("2026-09-09T09:30:00Z");
const DAY = 86_400_000;

function limits(overrides: Partial<Record<ResourceKey, LimitRule>> = {}): Pick<PlanVersion, "limits"> {
  const base = Object.fromEntries(RESOURCES.map((def) => [def.key, { kind: "fixed", value: 10 } as LimitRule])) as Record<ResourceKey, LimitRule>;
  return { limits: { ...base, ...overrides } };
}

function override(patch: Partial<CompanyUsageOverride>): CompanyUsageOverride {
  return {
    id: "ovr_1",
    companyId: "cmp_x",
    resource: "aiCredits",
    baseLimit: 10,
    overrideLimit: 15,
    reason: "test",
    startsAt: new Date(NOW - DAY).toISOString(),
    expiresAt: new Date(NOW + 10 * DAY).toISOString(),
    approvedBy: "Someone",
    createdAt: new Date(NOW - DAY).toISOString(),
    ...patch,
  };
}

describe("limit semantics", () => {
  it("keeps none, fixed, unlimited and custom distinct", () => {
    assert.equal(ruleToLimit({ kind: "none", value: null }), 0);
    assert.equal(ruleToLimit({ kind: "unlimited", value: null }), null);
    assert.equal(ruleToLimit({ kind: "fixed", value: 25 }), 25);
    assert.equal(ruleToLimit({ kind: "custom", value: 40 }), 40);
    assert.deepEqual(limitToRule(null), { kind: "unlimited", value: null });
    assert.deepEqual(limitToRule(0), { kind: "none", value: null });
    assert.equal(formatRule({ kind: "none", value: null }), "Not available");
    assert.equal(formatRule({ kind: "unlimited", value: null }), "Unlimited");
    assert.match(formatRule({ kind: "custom", value: 1000 }, "GB"), /custom/);
  });
});

describe("effective entitlement resolution", () => {
  it("returns the plan allowance when there is no override", () => {
    const result = resolveEffectiveEntitlements({ version: limits(), overrides: [], subscriptionStatus: "active", evaluationDate: NOW });
    assert.equal(result.aiCredits.effectiveValue, 10);
    assert.equal(result.aiCredits.ruleApplied, "base");
  });

  it("adds an additive override to the plan and says so", () => {
    const result = resolveEffectiveEntitlements({ version: limits(), overrides: [override({ rule: "additive", delta: 5, overrideLimit: 15 })], subscriptionStatus: "active", evaluationDate: NOW });
    assert.equal(result.aiCredits.baseValue, 10, "the base is never rewritten");
    assert.equal(result.aiCredits.effectiveValue, 15);
    assert.equal(result.aiCredits.ruleApplied, "additive increase");
  });

  it("recomputes an additive override when the plan allowance changes", () => {
    const item = override({ rule: "additive", delta: 5, overrideLimit: 15 });
    const bigger = resolveEffectiveEntitlements({ version: limits({ aiCredits: { kind: "fixed", value: 100 } }), overrides: [item], subscriptionStatus: "active", evaluationDate: NOW });
    assert.equal(bigger.aiCredits.effectiveValue, 105);
  });

  it("replaces the plan with an absolute override", () => {
    const result = resolveEffectiveEntitlements({ version: limits(), overrides: [override({ rule: "absolute", overrideLimit: 3 })], subscriptionStatus: "active", evaluationDate: NOW });
    assert.equal(result.aiCredits.effectiveValue, 3, "an absolute override may be lower than the plan");
    assert.equal(result.aiCredits.ruleApplied, "absolute replacement");
  });

  it("leaves an unlimited allowance unlimited under an additive override", () => {
    const result = resolveEffectiveEntitlements({ version: limits({ aiCredits: { kind: "unlimited", value: null } }), overrides: [override({ rule: "additive", delta: 5 })], subscriptionStatus: "active", evaluationDate: NOW });
    assert.equal(result.aiCredits.effectiveValue, null);
  });

  it("ignores overrides that have not started, have expired or were revoked", () => {
    for (const patch of [
      { startsAt: new Date(NOW + DAY).toISOString(), expiresAt: new Date(NOW + 5 * DAY).toISOString() },
      { startsAt: new Date(NOW - 5 * DAY).toISOString(), expiresAt: new Date(NOW - DAY).toISOString() },
      { revokedAt: new Date(NOW - 1000).toISOString() },
    ]) {
      const result = resolveEffectiveEntitlements({ version: limits(), overrides: [override(patch)], subscriptionStatus: "active", evaluationDate: NOW });
      assert.equal(result.aiCredits.effectiveValue, 10);
      assert.equal(result.aiCredits.ruleApplied, "base");
    }
  });

  it("applies overrides only while the subscription is not ended", () => {
    const ended = resolveEffectiveEntitlements({ version: limits(), overrides: [override({})], subscriptionStatus: "cancelled", evaluationDate: NOW });
    assert.equal(ended.aiCredits.effectiveValue, 10);
    assert.equal(ended.aiCredits.ruleApplied, "inactive subscription");
    const trial = resolveEffectiveEntitlements({ version: limits(), overrides: [override({})], subscriptionStatus: "trialing", evaluationDate: NOW });
    assert.equal(trial.aiCredits.effectiveValue, 15);
  });

  it("picks the most generous of two live overrides, deterministically", () => {
    const pick = activeOverrideAt([override({ id: "a", overrideLimit: 12 }), override({ id: "b", overrideLimit: 20 })], "aiCredits", NOW, 10);
    assert.equal(pick?.id, "b");
    assert.equal(overrideValueFor(override({ rule: "additive", delta: 4 }), 10), 14);
  });

  it("is a pure function of its inputs", () => {
    const input = { version: limits(), overrides: [override({})], subscriptionStatus: "active" as const, evaluationDate: NOW };
    assert.deepEqual(resolveEffectiveEntitlements(input), resolveEffectiveEntitlements(input));
  });
});

describe("policy and money helpers", () => {
  it("accepts the default policy and rejects nonsense", () => {
    assert.deepEqual(validatePolicy(DEFAULT_POLICY), {});
    const bad = structuredClone(DEFAULT_POLICY);
    bad.trial.defaultTrialDays = 0;
    bad.renewal.gracePeriodDays = 999;
    bad.trial.reminderDays = [Number.NaN];
    const errors = validatePolicy(bad);
    assert.ok(errors.defaultTrialDays && errors.gracePeriodDays && errors.trialReminders);
  });

  it("parses reminder days", () => {
    assert.deepEqual(parseDays("1, 7 3"), [7, 3, 1]);
    assert.ok(parseDays("7, x").some((day) => Number.isNaN(day)));
  });

  it("converts prices between major and minor units and computes savings honestly", () => {
    assert.equal(toMinor("14,900"), 1_490_000);
    assert.equal(toMinor("abc"), 0);
    assert.equal(fromMinor(1_490_000), "14900");
    assert.deepEqual(annualSavings(1_490_000, 14_900_000), { amountMinor: 2_980_000, percent: 16.7 });
    assert.equal(annualSavings(0, 100), null, "no savings claim without both prices");
  });

  it("never adds currencies together", () => {
    const text = moneyTotals({ INR: 5_000_000, USD: 200_000 });
    assert.match(text, / \+ /);
    assert.equal(moneyTotals({}), "-");
  });
});
