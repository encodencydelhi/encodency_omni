/**
 * Behaviour of Feature Flags through the demo provider: deterministic targeting,
 * separate availability layers, governance that never fakes an approval, and change
 * records that stay honest about what was applied, planned or merely requested.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// The providers simulate latency; the tests do not need to wait for it.
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";
const { flagsRepository: repo } = await import("../data/repository");
const { unavailableFlagsProvider } = await import("../data/unavailable-provider");
const { ApiError } = await import("@/types/api");
const { KEY_PATTERN, LOW_IMPACT_COMPANY_LIMIT } = await import("../data/config");
const { bucketFor } = await import("../data/evaluate");
const { deriveFlagCapabilities } = await import("../data/capabilities");
const { ROLE_PERMISSIONS } = await import("@/types/domain/team");
const { platformNow, isoDaysFromNow } = await import("@/features/companies/data/clock");
type Flags = Awaited<ReturnType<typeof repo.listFlags>>;
type Input = Parameters<typeof repo.createFlag>[0];

const actor = { id: "stf_001", name: "Aditya Raghunath" };

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => ApiError.isApiError(error) && error.code === code, `expected ${code}`);
}

beforeEach(async () => {
  await repo.resetDemoData?.();
});

const list = (environment: "development" | "staging" | "production" = "production"): Promise<Flags> => repo.listFlags({ environment, includeArchived: true });
const off = { strategy: "disabled" as const, percentage: 10, selectedCompanyIds: [] as string[], enabled: false };
const input = (patch: Partial<Input> = {}): Input => ({
  name: "Test Feature", key: "test.new_feature", description: "A feature made for a test.", category: "Platform", ownerTeam: "Platform Engineering", relatedModule: "Platform", documentation: "",
  type: "release", implementation: "ready", protection: "standard", entitlement: null, requiredCapability: null, integrations: [], usageResource: null, prerequisites: [],
  initial: { development: off, staging: off, production: off }, reason: "", ...patch,
});

describe("registry", () => {
  it("seeds unique, well-formed keys and a version for every environment", async () => {
    const { rows } = await list();
    assert.ok(rows.length >= 15);
    assert.equal(new Set(rows.map((row) => row.flag.key)).size, rows.length);
    for (const row of rows) {
      assert.match(row.flag.key, KEY_PATTERN, row.flag.key);
      const versions = await repo.listVersions(row.flag.key, "production");
      assert.ok(versions.rows.some((version) => version.current), row.flag.key);
    }
  });

  it("keeps lifecycle separate from operational state", async () => {
    const { rows } = await list();
    const deprecated = rows.find((row) => row.flag.lifecycle === "deprecated");
    assert.ok(deprecated);
    assert.equal(deprecated.state, "enabled", "a deprecated flag can still be enabled");
    const draft = rows.find((row) => row.flag.lifecycle === "draft");
    assert.ok(draft);
    assert.equal(draft.state, "disabled");
  });
});

describe("deterministic targeting", () => {
  it("derives a stable bucket from key, environment, company and salt - never randomly", () => {
    assert.equal(bucketFor("a.b", "production", "cmp_1", "v1"), bucketFor("a.b", "production", "cmp_1", "v1"));
    assert.notEqual(bucketFor("a.b", "production", "cmp_1", "v1"), bucketFor("a.b", "staging", "cmp_1", "v1"));
    assert.notEqual(bucketFor("a.b", "production", "cmp_1", "v1"), bucketFor("a.b", "production", "cmp_1", "v2"));
    const bucket = bucketFor("a.b", "production", "cmp_1", "v1");
    assert.ok(bucket >= 0 && bucket < 100);
  });

  it("reports the real matched count and repeats it exactly", async () => {
    const first = await repo.listCompanyImpact("seo.advanced_audit", "production", {});
    const second = await repo.listCompanyImpact("seo.advanced_audit", "production", {});
    assert.deepEqual(first.rows.map((row) => row.companyId), second.rows.map((row) => row.companyId));
    const detail = await repo.getFlag("seo.advanced_audit", "production");
    const percentage = detail.flag.environments.production.percentage;
    const matched = first.rows.filter((row) => row.targeted);
    assert.equal(matched.length, first.stats.targetingMatched);
    for (const row of first.rows) assert.equal(row.targeted, row.bucket < percentage, row.companyName);
  });

  it("never matches a tenant company for internal-only rollouts", async () => {
    const impact = await repo.listCompanyImpact("workspace.calendar_v2", "production", {});
    assert.equal(impact.stats.targetingMatched, 0);
    assert.equal(impact.stats.effective, 0);
    assert.ok(impact.rows.every((row) => row.availability === "internal_only" || row.availability !== "available"));
  });

  it("keeps effective within targeted within eligible", async () => {
    const { rows } = await list();
    for (const row of rows) {
      assert.ok(row.stats.effective <= row.stats.targeted, row.flag.key);
      assert.ok(row.stats.targeted <= row.stats.eligible, row.flag.key);
      assert.ok(row.stats.targeted <= row.stats.targetingMatched, row.flag.key);
      assert.ok(row.stats.effective <= row.stats.totalCompanies, row.flag.key);
    }
  });
});

describe("availability layers", () => {
  it("does not grant a plan entitlement: a targeted company without the plan is plan restricted", async () => {
    const impact = await repo.listCompanyImpact("content.ai_generator", "development", {});
    const blocked = impact.rows.filter((row) => row.conditions.plan === "fail");
    if (blocked.length > 0) {
      for (const row of blocked) {
        assert.notEqual(row.availability, "available", row.companyName);
        assert.ok(row.reasons.includes("plan_restricted"), row.companyName);
      }
      assert.ok(impact.stats.blockedByPlan >= 1 || blocked.every((row) => !row.targeted));
    }
    assert.equal(impact.rows.filter((row) => row.availability === "available").length, impact.stats.effective);
  });

  it("returns every failing reason, with the highest-precedence one first", async () => {
    const impact = await repo.listCompanyImpact("analytics.advanced_reporting", "production", {});
    for (const row of impact.rows) {
      assert.equal(row.availability, "emergency_off", "an emergency disable outranks every other reason");
      assert.equal(row.primaryReason, "emergency_off");
    }
  });

  it("never lets a failed prerequisite change stored configuration", async () => {
    const before = (await repo.getFlag("automation.campaign_ai", "staging")).flag.environments.staging;
    await repo.listCompanyImpact("automation.campaign_ai", "staging", {});
    const after = (await repo.getFlag("automation.campaign_ai", "staging")).flag.environments.staging;
    assert.deepEqual(after, before);
  });

  it("explains one company's evaluation condition by condition", async () => {
    const impact = await repo.listCompanyImpact("seo.advanced_audit", "production", {});
    const row = impact.rows[0];
    assert.ok(row);
    const detail = await repo.evaluateCompany("seo.advanced_audit", "production", row.companyId);
    assert.equal(detail.evaluation.availability, row.availability);
    assert.equal(Object.keys(detail.evaluation.conditions).length, 8);
    await rejects(repo.evaluateCompany("seo.advanced_audit", "production", "cmp_missing"), "NOT_FOUND");
    await rejects(repo.evaluateCompany("nope.missing", "production", row.companyId), "NOT_FOUND");
  });
});

describe("dependencies", () => {
  it("shows direct and indirect prerequisites and dependents", async () => {
    const detail = await repo.getFlag("content.ai_generator", "production");
    assert.ok(detail.dependencies.dependents.includes("automation.campaign_ai"));
    const dependent = await repo.getFlag("automation.campaign_ai", "production");
    assert.deepEqual([...dependent.dependencies.direct].sort(), ["automation.builder", "content.ai_generator"]);
  });

  it("refuses a cycle and names the offending path", async () => {
    const rejected = repo.proposeChange({ flagKey: "content.ai_generator", environment: "development", proposed: { prerequisites: ["automation.campaign_ai"] }, reason: "test" }, actor);
    await assert.rejects(rejected, (error: unknown) => ApiError.isApiError(error) && error.code === "VALIDATION_FAILED" && /content\.ai_generator -> automation\.campaign_ai -> content\.ai_generator/.test(error.message));
    const unchanged = await repo.getFlag("content.ai_generator", "development");
    assert.deepEqual(unchanged.flag.prerequisites, []);
  });

  it("refuses a self-dependency and an unknown flag", async () => {
    await rejects(repo.proposeChange({ flagKey: "content.ai_generator", environment: "development", proposed: { prerequisites: ["content.ai_generator"] }, reason: "" }, actor), "VALIDATION_FAILED");
    await rejects(repo.proposeChange({ flagKey: "content.ai_generator", environment: "development", proposed: { prerequisites: ["x.unknown"] }, reason: "" }, actor), "VALIDATION_FAILED");
  });
});

describe("changes and governance", () => {
  it("applies a non-production change directly, versions it and records the activity", async () => {
    const before = (await repo.getFlag("workspace.new_dashboard", "development")).flag.environments.development.version;
    const outcome = await repo.proposeChange({ flagKey: "workspace.new_dashboard", environment: "development", proposed: { strategy: "percentage", percentage: 50 }, reason: "" }, actor);
    assert.equal(outcome.applied, true);
    assert.equal(outcome.change.status, "applied");
    assert.equal(outcome.change.demo, true);
    const after = (await repo.getFlag("workspace.new_dashboard", "development")).flag.environments.development;
    assert.equal(after.strategy, "percentage");
    assert.equal(after.version, before + 1);
    const versions = await repo.listVersions("workspace.new_dashboard", "development");
    assert.equal(versions.rows.filter((row) => row.current).length, 1);
    assert.equal(versions.rows.find((row) => row.current)?.version, before + 1);
    const activity = await repo.listActivity({ flagKey: "workspace.new_dashboard" });
    assert.ok(activity.rows.some((row) => row.changeId === outcome.change.id && row.result === "applied"));
  });

  it("requires a reason for production", async () => {
    await rejects(repo.proposeChange({ flagKey: "workspace.new_dashboard", environment: "production", proposed: { percentage: 31 }, reason: "  " }, actor), "VALIDATION_FAILED");
  });

  it("requires a reason for a non-production change to a protected flag too", async () => {
    await rejects(repo.proposeChange({ flagKey: "security.saml_sso", environment: "staging", proposed: { strategy: "percentage", percentage: 10 }, reason: "" }, actor), "VALIDATION_FAILED");
  });

  it("records a protected production change as pending approval and never applies or approves it", async () => {
    const before = (await repo.getFlag("security.saml_sso", "production")).flag.environments.production;
    const preview = await repo.previewChange("security.saml_sso", "production", { strategy: "all" });
    assert.equal(preview.decision.required, true);
    const outcome = await repo.proposeChange({ flagKey: "security.saml_sso", environment: "production", proposed: { strategy: "all" }, reason: "Wider rollout" }, actor);
    assert.equal(outcome.applied, false);
    assert.equal(outcome.change.status, "pending_approval");
    assert.equal(outcome.change.approvalRequired, true);
    assert.equal(outcome.change.appliedAt, null);
    const after = (await repo.getFlag("security.saml_sso", "production")).flag.environments.production;
    assert.deepEqual(after, before, "the live configuration is untouched");
  });

  it("treats a change reaching more than the low-impact limit as needing approval", async () => {
    const preview = await repo.previewChange("api.webhooks_v2", "production", { strategy: "all" });
    assert.ok(preview.impact.newlyEnabled.length > LOW_IMPACT_COMPANY_LIMIT, "fixture should widen the rollout");
    assert.equal(preview.decision.required, true);
  });

  it("records a future-dated change as scheduled and leaves the configuration alone", async () => {
    const before = (await repo.getFlag("api.webhooks_v2", "staging")).flag.environments.staging;
    const outcome = await repo.proposeChange({ flagKey: "api.webhooks_v2", environment: "staging", proposed: { strategy: "percentage", percentage: 60 }, reason: "", effectiveAt: isoDaysFromNow(2) }, actor);
    assert.equal(outcome.applied, false);
    assert.equal(outcome.change.status, "scheduled");
    assert.ok(Date.parse(outcome.change.effectiveAt ?? "") > platformNow());
    const after = (await repo.getFlag("api.webhooks_v2", "staging")).flag.environments.staging;
    assert.deepEqual(after, before, "scheduled is planned, not applied");
  });

  it("saves a draft without applying it", async () => {
    const outcome = await repo.proposeChange({ flagKey: "api.webhooks_v2", environment: "staging", proposed: { percentage: 55, strategy: "percentage" }, reason: "", saveAsDraft: true }, actor);
    assert.equal(outcome.change.status, "draft");
    assert.equal(outcome.applied, false);
  });

  it("rejects a no-op, an out-of-range percentage and an unknown company", async () => {
    await rejects(repo.proposeChange({ flagKey: "api.webhooks_v2", environment: "staging", proposed: {}, reason: "" }, actor), "VALIDATION_FAILED");
    await rejects(repo.proposeChange({ flagKey: "api.webhooks_v2", environment: "staging", proposed: { strategy: "percentage", percentage: 140 }, reason: "" }, actor), "VALIDATION_FAILED");
    await rejects(repo.proposeChange({ flagKey: "api.webhooks_v2", environment: "staging", proposed: { strategy: "selected", selectedCompanyIds: ["cmp_missing"] }, reason: "" }, actor), "VALIDATION_FAILED");
  });

  it("will not enable a feature that is not implemented", async () => {
    await rejects(repo.proposeChange({ flagKey: "media.smart_tagging", environment: "development", proposed: { enabled: true, strategy: "all" }, reason: "" }, actor), "VALIDATION_FAILED");
  });

  it("cancels an open change but not an applied one", async () => {
    const draft = await repo.proposeChange({ flagKey: "api.webhooks_v2", environment: "staging", proposed: { percentage: 55, strategy: "percentage" }, reason: "", saveAsDraft: true }, actor);
    const cancelled = await repo.cancelChange(draft.change.id, "Not needed", actor);
    assert.equal(cancelled.status, "cancelled");
    const applied = await repo.proposeChange({ flagKey: "workspace.new_dashboard", environment: "development", proposed: { percentage: 70, strategy: "percentage" }, reason: "" }, actor);
    await rejects(repo.cancelChange(applied.change.id, "Too late", actor), "CONFLICT");
    await rejects(repo.cancelChange(draft.change.id, "", actor), "CONFLICT");
  });
});

describe("emergency disable", () => {
  it("switches the feature off, preserves the rollout and restores it exactly", async () => {
    const before = (await repo.getFlag("seo.advanced_audit", "production")).flag.environments.production;
    const off = await repo.proposeChange({ flagKey: "seo.advanced_audit", environment: "production", proposed: { emergencyOff: true }, reason: "Incident 42" }, actor);
    assert.equal(off.applied, true);
    const disabled = (await repo.getFlag("seo.advanced_audit", "production")).flag.environments.production;
    assert.equal(disabled.emergencyOff, true);
    assert.equal(disabled.strategy, before.strategy);
    assert.equal(disabled.percentage, before.percentage);
    assert.equal(disabled.emergencyReason, "Incident 42");
    const impact = await repo.listCompanyImpact("seo.advanced_audit", "production", {});
    assert.equal(impact.stats.effective, 0);

    const restored = await repo.proposeChange({ flagKey: "seo.advanced_audit", environment: "production", proposed: { emergencyOff: false }, reason: "Resolved" }, actor);
    assert.equal(restored.applied, true);
    const after = (await repo.getFlag("seo.advanced_audit", "production")).flag.environments.production;
    assert.equal(after.emergencyOff, false);
    assert.equal(after.strategy, before.strategy);
    assert.equal(after.percentage, before.percentage);
    assert.deepEqual(after.selectedCompanyIds, before.selectedCompanyIds);
  });

  it("is forbidden for protected flags", async () => {
    await rejects(repo.proposeChange({ flagKey: "ops.publishing_pipeline", environment: "production", proposed: { emergencyOff: true }, reason: "Incident" }, actor), "FORBIDDEN");
  });
});

describe("creating flags", () => {
  it("creates a flag that is disabled in production, with its first versions and activity", async () => {
    const flag = await repo.createFlag(input(), actor);
    assert.equal(flag.lifecycle, "draft");
    for (const environment of ["development", "staging", "production"] as const) {
      assert.equal(flag.environments[environment].version, 1);
      const versions = await repo.listVersions(flag.key, environment);
      assert.equal(versions.rows.length, 1);
    }
    assert.equal(flag.environments.production.enabled, false);
    assert.equal(flag.environments.production.strategy, "disabled");
    const activity = await repo.listActivity({ flagKey: flag.key });
    assert.ok(activity.rows.some((row) => row.type === "flag_created"));
  });

  it("refuses to start a flag enabled in production", async () => {
    await rejects(repo.createFlag(input({ initial: { development: off, staging: off, production: { ...off, enabled: true, strategy: "all" } } }), actor), "VALIDATION_FAILED");
  });

  it("validates keys: format, uniqueness and required fields", async () => {
    await rejects(repo.createFlag(input({ key: "NotAKey" }), actor), "VALIDATION_FAILED");
    await rejects(repo.createFlag(input({ key: "single" }), actor), "VALIDATION_FAILED");
    await rejects(repo.createFlag(input({ key: "content.ai_generator" }), actor), "VALIDATION_FAILED");
    await rejects(repo.createFlag(input({ name: " ", description: "short", ownerTeam: "" }), actor), "VALIDATION_FAILED");
    const issues = await repo.validateCreate(input({ key: "content.ai_generator" }));
    assert.ok(issues.some((issue) => issue.field === "key" && /already/.test(issue.message)));
  });

  it("needs companies for a selected strategy and a valid percentage", async () => {
    await rejects(repo.createFlag(input({ initial: { development: { ...off, enabled: true, strategy: "selected" }, staging: off, production: off } }), actor), "VALIDATION_FAILED");
    await rejects(repo.createFlag(input({ initial: { development: { ...off, enabled: true, strategy: "percentage", percentage: 0 }, staging: off, production: off } }), actor), "VALIDATION_FAILED");
  });
});

describe("lifecycle", () => {
  it("blocks archiving a flag that other flags require, and one that is still rolled out", async () => {
    const detail = await repo.getFlag("content.ai_generator", "production");
    assert.ok(detail.archiveBlockers.length > 0);
    await rejects(repo.setLifecycle("content.ai_generator", "archive", "Retire", actor), "CONFLICT");
  });

  it("blocks archiving protected flags", async () => {
    const detail = await repo.getFlag("ops.publishing_pipeline", "production");
    assert.ok(detail.archiveBlockers.some((item) => /Protected/.test(item)));
  });

  it("deprecates with a reason, and archives an unblocked flag read-only", async () => {
    await rejects(repo.setLifecycle("media.smart_tagging", "deprecate", "", actor), "VALIDATION_FAILED");
    const deprecated = await repo.setLifecycle("media.smart_tagging", "deprecate", "Superseded", actor);
    assert.equal(deprecated.lifecycle, "deprecated");
    const archived = await repo.setLifecycle("media.smart_tagging", "archive", "Retired", actor);
    assert.equal(archived.lifecycle, "archived");
    await rejects(repo.proposeChange({ flagKey: "media.smart_tagging", environment: "development", proposed: { strategy: "all", enabled: true }, reason: "" }, actor), "VALIDATION_FAILED");
    await rejects(repo.updateMetadata("media.smart_tagging", { description: "A longer description here" }, actor), "CONFLICT");
  });

  it("never edits the key through metadata", async () => {
    const updated = await repo.updateMetadata("media.smart_tagging", { description: "Automatic tags and search for media." }, actor);
    assert.equal(updated.key, "media.smart_tagging");
    await rejects(repo.updateMetadata("media.smart_tagging", { description: "x" }, actor), "VALIDATION_FAILED");
    await rejects(repo.updateMetadata("media.smart_tagging", { documentation: "not a url" }, actor), "VALIDATION_FAILED");
  });
});

describe("company access", () => {
  it("evaluates every flag for one company and keeps counts consistent", async () => {
    const [first] = await repo.searchCompanies("");
    assert.ok(first);
    const access = await repo.getCompanyAccess(first.id, "production");
    assert.equal(access.counts.total, access.rows.length);
    assert.equal(access.counts.available, access.rows.filter((row) => row.evaluation.availability === "available").length);
    assert.equal(access.counts.planBlocked, access.rows.filter((row) => row.evaluation.conditions.plan === "fail").length);
    assert.ok(access.counts.available <= access.counts.total);
    await rejects(repo.getCompanyAccess("cmp_missing", "production"), "NOT_FOUND");
  });

  it("searches companies by name", async () => {
    const all = await repo.searchCompanies("");
    const [one] = all;
    assert.ok(one);
    const found = await repo.searchCompanies(one.name.slice(0, 4));
    assert.ok(found.some((item) => item.id === one.id));
  });
});

describe("versions and history", () => {
  it("compares two versions field by field", async () => {
    await repo.proposeChange({ flagKey: "workspace.new_dashboard", environment: "development", proposed: { strategy: "percentage", percentage: 50 }, reason: "" }, actor);
    const { rows } = await repo.listVersions("workspace.new_dashboard", "development");
    assert.ok(rows.length >= 2);
    const current = rows.find((row) => row.current);
    const older = rows.find((row) => !row.current);
    assert.ok(current && older);
    const comparison = await repo.compareVersions(older.id, current.id);
    assert.ok(comparison.rows.some((row) => row.changed));
    await rejects(repo.compareVersions("nope", current.id), "NOT_FOUND");
  });

  it("filters, searches and paginates changes", async () => {
    await repo.proposeChange({ flagKey: "workspace.new_dashboard", environment: "development", proposed: { strategy: "percentage", percentage: 50 }, reason: "" }, actor);
    const page = await repo.listChanges({ environment: "development", pageSize: 2 });
    assert.ok(page.rows.length <= 2);
    assert.ok(page.total >= page.rows.length);
    const filtered = await repo.listChanges({ flagKey: "workspace.new_dashboard", status: ["applied"] });
    assert.ok(filtered.rows.every((row) => row.flagKey === "workspace.new_dashboard" && row.status === "applied"));
    const sorted = filtered.rows.map((row) => Date.parse(row.requestedAt));
    assert.deepEqual(sorted, [...sorted].sort((a, b) => b - a));
  });
});

describe("overview", () => {
  it("counts from the same rows as the list, and honours category and owner filters", async () => {
    const overview = await repo.getOverview("production");
    const { rows, summary } = await list();
    assert.equal(overview.kpis.total, summary.total);
    assert.equal(overview.kpis.emergencyOff, summary.emergency);
    assert.equal(overview.kpis.disabled, summary.disabled);
    const filtered = await repo.getOverview("production", { category: "Channels" });
    assert.equal(filtered.kpis.total, rows.filter((row) => row.flag.category === "Channels" && row.flag.lifecycle !== "archived").length);
    assert.ok(filtered.attention.every((item) => rows.find((row) => row.flag.key === item.flagKey)?.flag.category === "Channels"));
  });

  it("surfaces the seeded pending and scheduled changes", async () => {
    const overview = await repo.getOverview("production");
    assert.ok(overview.kpis.pendingApproval >= 1);
    assert.ok(overview.kpis.scheduled >= 1);
  });

  it("supports the cleanup quick filter", async () => {
    const overview = await repo.getOverview("production");
    const result = await repo.listFlags({ environment: "production", quick: "cleanup" });
    assert.equal(result.rows.length, overview.kpis.cleanup);
  });
});

describe("boundaries", () => {
  it("refuses every call, truthfully, when no service is connected", async () => {
    await rejects(unavailableFlagsProvider.getOverview("production"), "SERVICE_UNAVAILABLE");
    await rejects(unavailableFlagsProvider.listFlags({ environment: "production" }), "SERVICE_UNAVAILABLE");
    assert.equal(unavailableFlagsProvider.mode, "unavailable");
  });

  it("derives capabilities from permissions, with no approval right", () => {
    const can = (role: keyof typeof ROLE_PERMISSIONS) => (permission: (typeof ROLE_PERMISSIONS)["super_admin"][number]) => ROLE_PERMISSIONS[role].includes(permission);
    const admin = deriveFlagCapabilities(can("super_admin"));
    assert.ok(admin.canChangeProduction && admin.canManageProtected && admin.canEmergencyDisable);
    const technical = deriveFlagCapabilities(can("technical_admin"));
    assert.ok(technical.canChangeProduction);
    assert.equal(technical.canManageProtected, false, "protected flags need settings write");
    const support = deriveFlagCapabilities(can("support"));
    assert.equal(support.canViewFlags, false);
    assert.equal(support.canChangeRollout, false);
    assert.ok(!Object.keys(admin).some((key) => /approve/i.test(key)), "no approval capability exists");
  });
});
