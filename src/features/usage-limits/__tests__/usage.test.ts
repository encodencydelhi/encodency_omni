/**
 * Behaviour of Usage & Limits through the demo provider: that it reads the same
 * records Companies and Plans & Subscriptions own, resolves every state through
 * one resolver, reconciles its events with the usage totals, and never lets an
 * acknowledgement change consumption.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// The providers simulate latency; the tests do not need to wait for it.
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";
const { usageRepository: repo } = await import("../data/repository");
const { plansRepository: plans } = await import("@/features/plans-subscriptions/data/repository");
const { companiesRepository: companies } = await import("@/features/companies/data/repository");
const { clientsRepository: clients } = await import("@/features/clients/data/repository");
const { ApiError } = await import("@/types/api");
const { USAGE_RESOURCES } = await import("@/features/companies/data/config");
const { RESOURCE_DEFINITIONS, RESOURCE_BY_KEY } = await import("../data/catalogue");
const { resolveResourceUtilization } = await import("../data/resolver");
const { deriveUsageCapabilities } = await import("../data/capabilities");
const { ROLE_PERMISSIONS } = await import("@/types/domain/team");
const { platformNow } = await import("@/features/companies/data/clock");

const actor = { id: "stf_001", name: "Aditya Raghunath" };
const thresholds = { warningPct: 90, criticalPct: 95 };

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => ApiError.isApiError(error) && error.code === code, `expected ${code}`);
}

beforeEach(async () => {
  await repo.resetDemoData?.();
  await plans.resetDemoData?.();
});

const allRows = async () => (await repo.listCompanyUsage({ resource: "aiCredits", pageSize: 500 })).rows;

describe("resource catalogue", () => {
  it("is the one shared catalogue, extended - not a second list", () => {
    assert.deepEqual(RESOURCE_DEFINITIONS.map((item) => item.key), USAGE_RESOURCES.map((item) => item.key));
    for (const def of RESOURCE_DEFINITIONS) {
      assert.ok(def.description && def.overLimitBehavior && def.meteringSource && def.countingPolicy, def.key);
      assert.ok(def.warningPct < def.criticalPct && def.criticalPct <= 100, def.key);
    }
  });

  it("measures concurrent capacity, period quotas and snapshots differently, and only resets period quotas", () => {
    for (const def of RESOURCE_DEFINITIONS) {
      if (def.measurement === "metered_period") assert.notEqual(def.resetPolicy, "none", def.key);
      else assert.equal(def.resetPolicy, "none", def.key);
    }
    assert.equal(RESOURCE_BY_KEY.users.measurement, "concurrent_capacity");
    assert.equal(RESOURCE_BY_KEY.storage.measurement, "capacity_snapshot");
    assert.equal(RESOURCE_BY_KEY.aiCredits.measurement, "metered_period");
  });
});

describe("utilisation resolver", () => {
  const base = { definition: { planControlled: true }, thresholds, metering: "ok" as const };

  it("keeps not entitled, unlimited and unknown apart from a percentage", () => {
    assert.equal(resolveResourceUtilization({ ...base, effectiveLimit: 0, used: 0 }).state, "not_entitled");
    const unlimited = resolveResourceUtilization({ ...base, effectiveLimit: null, used: 5000 });
    assert.equal(unlimited.state, "unlimited");
    assert.equal(unlimited.percent, null);
    const unknown = resolveResourceUtilization({ ...base, effectiveLimit: 100, used: null });
    assert.equal(unknown.state, "unknown");
    assert.equal(unknown.percent, null);
    assert.equal(unknown.used, null, "missing usage is not zero");
  });

  it("classifies against the threshold, the limit and beyond it", () => {
    const at = (used: number) => resolveResourceUtilization({ ...base, effectiveLimit: 1000, used });
    assert.equal(at(500).state, "within");
    assert.equal(at(899).state, "within");
    assert.equal(at(900).state, "near");
    assert.equal(at(1000).state, "at_limit");
    assert.equal(at(1200).state, "exceeded");
    assert.equal(at(1200).excess, 200);
    assert.equal(at(1200).remaining, 0);
    assert.equal(at(827).percent, 82.7);
  });

  it("follows the configured threshold rather than a hardcoded one", () => {
    const at = (warningPct: number) => resolveResourceUtilization({ ...base, effectiveLimit: 15000, used: 12400, thresholds: { warningPct, criticalPct: 95 } });
    assert.equal(at(80).state, "near");
    assert.equal(at(90).state, "within");
  });

  it("does not treat a missing reading as healthy, and does not limit unmanaged resources", () => {
    assert.equal(resolveResourceUtilization({ ...base, effectiveLimit: 100, used: 10, metering: "missing" }).state, "unknown");
    assert.equal(resolveResourceUtilization({ ...base, definition: { planControlled: false }, effectiveLimit: null, used: 10 }).state, "monitored");
    assert.equal(resolveResourceUtilization({ ...base, effectiveLimit: 100, used: 10, metering: "delayed" }).stale, true);
  });
});

describe("shared data", () => {
  it("reads the same effective limits Companies shows", async () => {
    const list = await companies.listCompanies({ pageSize: 50 } as never);
    const sample = list.data[0];
    assert.ok(sample);
    const detail = await companies.getUsage(sample.company.id);
    const rows = (await repo.getCompanyUsage(sample.company.id)).summary.rows;
    for (const record of detail.records) {
      const row = rows.find((item) => item.resource === record.resource);
      assert.equal(row?.effective, record.effectiveLimit, record.resource);
      assert.equal(row?.base, record.includedLimit, record.resource);
      assert.equal(row?.lastKnownUsed, record.used, record.resource);
    }
  });

  it("is deterministic", async () => {
    const first = await repo.getOverview("30d");
    const second = await repo.getOverview("30d");
    assert.deepEqual(first.kpis, second.kpis);
    assert.deepEqual((await repo.listAlerts({})).all.map((item) => item.id), (await repo.listAlerts({})).all.map((item) => item.id));
  });

  it("gives every company one row per catalogue resource", async () => {
    const result = await repo.listCompanyUsage({ pageSize: 500 });
    const summaries = await Promise.all(result.facets.companies.map((company) => repo.getCompanyUsage(company.id)));
    for (const item of summaries) assert.equal(item.summary.rows.length, RESOURCE_DEFINITIONS.length);
  });
});

describe("company usage directory", () => {
  it("counts each company once, in its worst state", async () => {
    const result = await repo.listCompanyUsage({ pageSize: 500 });
    const { counts } = result;
    assert.equal(counts.within + counts.near + counts.atLimit + counts.exceeded + counts.noData, counts.companies);
  });

  it("filters, sorts and paginates", async () => {
    const exceeded = await repo.listCompanyUsage({ quick: "exceeded", pageSize: 500 });
    assert.ok(exceeded.rows.every((row) => row.resolved.state === "exceeded"));
    const byResource = await repo.listCompanyUsage({ resource: "clients", pageSize: 500 });
    assert.ok(byResource.rows.every((row) => row.resource === "clients"));
    const sorted = (await repo.listCompanyUsage({ resource: "aiCredits", sort: "consumption", pageSize: 500 })).rows.map((row) => row.used ?? -1);
    assert.deepEqual(sorted, [...sorted].sort((a, b) => b - a));
    const page = await repo.listCompanyUsage({ resource: "aiCredits", pageSize: 3, page: 2 });
    assert.equal(page.rows.length, 3);
    const search = await repo.listCompanyUsage({ search: "zzzz-none" });
    assert.equal(search.total, 0);
  });

  it("puts overrides on the row without hiding the base allowance", async () => {
    const rows = (await repo.listCompanyUsage({ quick: "overrides", pageSize: 500 })).rows;
    assert.ok(rows.length > 0, "the seed has active overrides");
    for (const row of rows) {
      assert.ok(row.override);
      if (row.override.rule === "additive" && row.base !== null) assert.equal(row.effective, row.base + row.override.amount);
      if (row.override.rule === "absolute") assert.equal(row.effective, row.override.amount);
    }
  });
});

describe("metering reconciliation", () => {
  it("makes counted events sum to each company's usage total", async () => {
    const events = await repo.listEvents({ range: "90d", pageSize: 5000 });
    const rows = await allRows();
    // Annual subscriptions span more than the 90 days the event window offers, so reconcile monthly ones.
    const monthly = new Set<string>();
    for (const row of rows) if ((await repo.getCompanyUsage(row.companyId)).summary.billingCycle === "monthly") monthly.add(row.companyId);
    const clean = rows.filter((row) => row.metering === "ok" && monthly.has(row.companyId));
    assert.ok(clean.length > 0);
    for (const row of clean) {
      const sum = events.rows
        .filter((event) => event.companyId === row.companyId && event.resource === "aiCredits" && event.counted && event.aggregationPeriod === "Current billing period")
        .reduce((total, event) => total + event.quantity, 0);
      assert.equal(sum, row.used, `${row.companyName} AI credits`);
    }
  });

  it("never counts duplicates or failures", async () => {
    const events = await repo.listEvents({ range: "90d", pageSize: 5000 });
    assert.ok(events.rows.filter((event) => event.status === "duplicate" || event.status === "failed").every((event) => !event.counted));
    assert.ok(events.rows.filter((event) => event.status === "failed").every((event) => event.errorReason));
  });

  it("keeps client attribution inside the company and inside its total", async () => {
    const companiesList = (await repo.listCompanyUsage({ pageSize: 500 })).facets.companies;
    for (const company of companiesList.slice(0, 8)) {
      const detail = await repo.getCompanyUsage(company.id);
      const clientIds = new Set(detail.contributions.map((item) => item.clientId).filter(Boolean));
      const events = await repo.listEvents({ company: company.id, range: "90d", pageSize: 3000 });
      for (const event of events.rows) {
        assert.equal(event.companyId, company.id, "no leakage across tenants");
        if (event.clientId) assert.ok(clientIds.has(event.clientId), `${event.clientId} belongs to ${company.id}`);
      }
      for (const resource of ["aiCredits", "automationRuns", "reports"] as const) {
        const total = detail.contributions.reduce((sum, item) => sum + (item.values[resource] ?? 0), 0);
        const used = detail.summary.rows.find((row) => row.resource === resource)?.used;
        if (used !== null && used !== undefined) assert.equal(total, used, `${company.name} ${resource} attribution`);
        assert.ok((detail.contributions.find((item) => item.clientId === null)?.values[resource] ?? 0) >= 0);
      }
      assert.equal(detail.contributions.some((item) => item.values.users !== undefined), false, "seats are never split by client");
    }
  });

  it("marks a missing usage window as unknown data, not healthy", async () => {
    const metering = await repo.getMetering();
    assert.ok(metering.health.missingWindows > 0);
    const gap = metering.health.gaps[0];
    assert.ok(gap);
    const detail = await repo.getCompanyUsage(gap.companyId);
    const row = detail.summary.rows.find((item) => item.resource === gap.resource);
    assert.equal(row?.resolved.state, "unknown");
    assert.equal(row?.used, null);
    const alerts = await repo.listAlerts({});
    assert.ok(alerts.all.some((alert) => alert.type === "metering" && alert.companyId === gap.companyId));
  });

  it("reports source health from the source records", async () => {
    const { health } = await repo.getMetering();
    assert.equal(health.healthy + health.delayed + health.failed, health.sources.length);
    assert.ok(health.delayed >= 1 && health.failed >= 1);
    assert.ok(health.sources.filter((item) => item.status !== "healthy").every((item) => item.failureReason));
  });
});

describe("trends", () => {
  it("draws metered resources as period totals and refuses to invent a trend for others", async () => {
    const ai = await repo.getTrend("aiCredits", "30d");
    assert.ok(ai.points && ai.points.length === 30);
    assert.equal(ai.total, ai.points.reduce((sum, point) => sum + point.value, 0));
    const weekly = await repo.getTrend("aiCredits", "90d");
    assert.equal(weekly.points?.length, 13);
    const users = await repo.getTrend("users", "30d");
    assert.equal(users.points, null);
    assert.ok(users.unavailable);
  });

  it("changes period-based metrics with the period", async () => {
    const week = (await repo.getOverview("7d")).kpis.aiCredits;
    const quarter = (await repo.getOverview("90d")).kpis.aiCredits;
    assert.ok(quarter > week);
  });
});

describe("alerts", () => {
  it("derives alerts from the same states the directory shows", async () => {
    const { all } = await repo.listAlerts({});
    const exceeded = (await repo.listCompanyUsage({ quick: "exceeded", pageSize: 5000, resource: undefined })).total;
    assert.ok(exceeded >= 0);
    for (const alert of all.filter((item) => item.type === "exceeded")) {
      assert.ok((alert.used ?? 0) > (alert.limit ?? Infinity), alert.id);
      assert.match(alert.reason, /not automatically billable/i);
    }
    for (const alert of all.filter((item) => item.type === "threshold")) assert.ok((alert.percent ?? 0) >= (alert.threshold ?? 0), alert.id);
  });

  it("acknowledges without changing consumption, and does not resolve the condition", async () => {
    const before = await repo.listAlerts({ status: "open" });
    const target = before.alerts.find((item) => item.type !== "metering");
    assert.ok(target);
    const usedBefore = (await repo.getCompanyUsage(target.companyId)).summary.rows.find((row) => row.resource === target.resource)?.used;
    const acknowledged = await repo.acknowledgeAlert(target.id, "Looking into it", actor);
    assert.equal(acknowledged.status, "acknowledged");
    assert.equal(acknowledged.acknowledgedBy, actor.name);
    assert.equal(acknowledged.acknowledgementNote, "Looking into it");
    const usedAfter = (await repo.getCompanyUsage(target.companyId)).summary.rows.find((row) => row.resource === target.resource)?.used;
    assert.equal(usedAfter, usedBefore);
    const detail = await repo.getAlert(target.id);
    assert.equal(detail.alert.status, "acknowledged");
    assert.notEqual(detail.alert.status, "resolved");
    assert.ok(detail.activity.some((entry) => entry.kind === "acknowledged"));
  });

  it("refuses to acknowledge twice or an unknown alert", async () => {
    const target = (await repo.listAlerts({ status: "open" })).alerts[0];
    assert.ok(target);
    await repo.acknowledgeAlert(target.id, "", actor);
    await rejects(repo.acknowledgeAlert(target.id, "", actor), "CONFLICT");
    await rejects(repo.acknowledgeAlert("alt__nope__users__exceeded", "", actor), "NOT_FOUND");
  });

  it("filters, sorts and counts", async () => {
    const result = await repo.listAlerts({ quick: "critical", sort: "severity" });
    assert.ok(result.alerts.every((alert) => alert.severity === "critical" && alert.status !== "resolved"));
    assert.equal(result.counts.critical, result.all.filter((alert) => alert.status !== "resolved" && alert.severity === "critical").length);
    assert.equal((await repo.listAlerts({ search: "zzzz" })).alerts.length, 0);
  });

  it("shows operational exceeded usage without inventing a charge", async () => {
    const { overages } = await repo.listAlerts({});
    for (const row of overages) {
      assert.equal(row.excess, row.used - row.included);
      assert.equal("estimatedAmount" in row, false);
    }
  });
});

describe("overrides use the one shared system", () => {
  const firstAtLimitRow = async () => {
    const rows = (await repo.listCompanyUsage({ resource: "aiCredits", sort: "utilization", pageSize: 500 })).rows.filter((row) => row.effective !== null && row.used !== null && !row.hasActiveOverride && row.base === row.effective);
    return rows.find((row) => (row.resolved.percent ?? 0) >= 50) ?? rows[0];
  };

  it("lists the same override records Plans & Subscriptions holds", async () => {
    const { rows } = await repo.listOverrides({});
    assert.ok(rows.length > 0);
    const target = rows.find((row) => row.status === "active");
    assert.ok(target);
    const detail = await plans.getSubscription(target.subscriptionId);
    assert.ok(detail.entitlements.some((item) => item.override?.id === target.id));
  });

  it("recalculates effective allowance, state and alerts when an override is granted and revoked", async () => {
    const row = await firstAtLimitRow();
    assert.ok(row && row.used !== null && row.effective !== null);
    const now = platformNow();
    const day = (offset: number) => new Date(now + offset * 86_400_000).toISOString().slice(0, 10);
    // Push the limit above current usage with an additive override.
    await plans.grantOverride(row.subscriptionId, { resource: "aiCredits", rule: "additive", value: Math.max(1000, row.used), startsAt: day(-1), expiresAt: day(20), reason: "Usage test", approvedBy: actor.name }, actor);
    const after = (await repo.getCompanyUsage(row.companyId)).summary.rows.find((item) => item.resource === "aiCredits");
    assert.ok(after?.override, "the override shows in Usage & Limits");
    assert.equal(after.effective, (row.base ?? 0) + Math.max(1000, row.used));
    assert.ok((after.resolved.percent ?? 0) < (row.resolved.percent ?? 100));
    const listed = await repo.listOverrides({ company: row.companyId });
    const created = listed.rows.find((item) => item.status === "active" && item.resource === "aiCredits" && item.reason === "Usage test");
    assert.ok(created);
    await plans.revokeOverride(row.subscriptionId, created.id, { reason: "Test revoke" }, actor);
    const revoked = (await repo.getCompanyUsage(row.companyId)).summary.rows.find((item) => item.resource === "aiCredits");
    assert.equal(revoked?.effective, row.effective);
    assert.equal((await repo.getOverride(created.id)).status, "revoked");
  });

  it("flags an override whose expiry would leave usage above the limit", async () => {
    const { rows, counts } = await repo.listOverrides({});
    const risky = rows.filter((row) => row.overAfterExpiry);
    assert.equal(counts.needsReview, risky.length);
    for (const row of risky) assert.ok(row.used !== null && row.base !== null && row.used > row.base);
  });

  it("filters and sorts overrides", async () => {
    const active = await repo.listOverrides({ status: "active" });
    assert.ok(active.rows.every((row) => row.status === "active"));
    const expiring = active.rows.map((row) => Date.parse(row.expiresAt));
    assert.deepEqual(expiring, [...expiring].sort((a, b) => a - b));
    assert.equal((await repo.listOverrides({ search: "zzzz" })).rows.length, 0);
  });
});

describe("shared state across modules", () => {
  it("moves usage and alerts when a client is created", async () => {
    const list = await repo.listCompanyUsage({ resource: "clients", pageSize: 500 });
    const row = list.rows.find((item) => item.effective !== null && item.used !== null && item.effective > 0 && item.used < item.effective);
    assert.ok(row);
    const before = row.used;
    await clients.createClient({ companyId: row.companyId, name: "Usage Test Client", industry: "Other", timezone: "Asia/Kolkata", language: "English", memberIds: [] }, actor);
    const after = (await repo.getCompanyUsage(row.companyId)).summary.rows.find((item) => item.resource === "clients");
    assert.equal(after?.used, (before ?? 0) + 1, "the new client is counted");
    assert.equal(after?.effective, row.effective);
  });

  it("re-evaluates against an edited threshold", async () => {
    const before = (await repo.listAlerts({})).all.filter((alert) => alert.resource === "aiCredits" && alert.type === "threshold").length;
    await repo.updateResourcePolicy("aiCredits", { warningPct: 50, criticalPct: 90 }, "Earlier warning", actor);
    const after = (await repo.listAlerts({})).all.filter((alert) => alert.resource === "aiCredits" && alert.type === "threshold").length;
    assert.ok(after >= before);
    const detail = await repo.getResource("aiCredits");
    assert.equal(detail.thresholds.warningPct, 50);
    assert.equal(detail.edited, true);
    assert.ok(detail.activity.some((entry) => entry.kind === "policy_changed"));
  });

  it("rejects invalid thresholds and a missing reason", async () => {
    await rejects(repo.updateResourcePolicy("aiCredits", { warningPct: 95, criticalPct: 90 }, "x", actor), "VALIDATION_FAILED");
    await rejects(repo.updateResourcePolicy("aiCredits", { warningPct: 80, criticalPct: 95 }, " ", actor), "VALIDATION_FAILED");
    await rejects(repo.updateResourcePolicy("nonsense" as never, { warningPct: 80, criticalPct: 95 }, "x", actor), "NOT_FOUND");
  });
});

describe("resources and detail", () => {
  it("lists every resource with its policy and per-state company counts", async () => {
    const list = await repo.listResources();
    assert.equal(list.length, RESOURCE_DEFINITIONS.length);
    const total = (await repo.listCompanyUsage({ pageSize: 500 })).facets.companies.length;
    for (const item of list) assert.ok(item.companies.within + item.companies.near + item.companies.atLimit + item.companies.exceeded + item.companies.unknown <= total);
  });

  it("returns a not-found error for an unknown resource, company, alert and event", async () => {
    await rejects(repo.getResource("nope"), "NOT_FOUND");
    await rejects(repo.getCompanyUsage("cmp_nope"), "NOT_FOUND");
    await rejects(repo.getAlert("alt__x__users__exceeded"), "NOT_FOUND");
    await rejects(repo.getEvent("evt_nope"), "NOT_FOUND");
  });

  it("explains plan entitlements per resource without editing them", async () => {
    const detail = await repo.getResource("aiCredits");
    assert.ok(detail.planEntitlements.length >= 3);
    assert.ok(detail.planEntitlements.every((item) => typeof item.plan === "string"));
  });
});

describe("capabilities", () => {
  const can = (role: keyof typeof ROLE_PERMISSIONS) => (permission: (typeof ROLE_PERMISSIONS)["super_admin"][number]) => ROLE_PERMISSIONS[role].includes(permission);

  it("gives a super admin everything", () => {
    assert.ok(Object.values(deriveUsageCapabilities(can("super_admin"))).every(Boolean));
  });

  it("lets support look but not move a quota", () => {
    const caps = deriveUsageCapabilities(can("support"));
    assert.equal(caps.canViewCompanyUsage, true);
    assert.equal(caps.canManageEntitlementOverrides, false);
    assert.equal(caps.canManageResourcePolicies, false);
  });

  it("needs plan management for overrides, the same as Plans & Subscriptions", () => {
    assert.equal(deriveUsageCapabilities(can("finance")).canManageEntitlementOverrides, true);
    assert.equal(deriveUsageCapabilities(can("operations")).canManageEntitlementOverrides, false);
  });
});
