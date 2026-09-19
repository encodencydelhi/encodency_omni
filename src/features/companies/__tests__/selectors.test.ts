/**
 * The tenant dataset and the derivations over it. These tests protect the
 * properties the UI silently relies on: totals add up, counts agree between the
 * list and the detail tabs, and no company's records leak into another's.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLATFORM_USERS } from "@/mocks/data/tenants";
import { MOCK_NOW } from "@/mocks/lib/random";
import { DEMO_CLOCK_ANCHOR, USAGE_RESOURCES, USAGE_THRESHOLDS } from "../data/config";
import { PLAN_CATALOGUE, STAFF, buildDataset } from "../data/mock/dataset";
import {
  applyListQuery,
  computeBilling,
  computePortfolio,
  computeSecurityWarnings,
  computeSummary,
  computeUsage,
  countIntegrations,
  deriveOwner,
  estimateProration,
  filterSummaries,
  planFor,
  resourceStatus,
  sortSummaries,
  usedFor,
  type DerivationContext,
} from "../data/selectors";
import type { CompanyBundle } from "../data/types";

const bundles: CompanyBundle[] = [...buildDataset().values()];
const ctx: DerivationContext = { now: Date.parse("2026-09-09T09:30:00.000Z"), plans: PLAN_CATALOGUE, staff: STAFF };
const summaries = bundles.map((bundle) => computeSummary(ctx, bundle));
const portfolio = computePortfolio(ctx, summaries);
const byId = new Map(bundles.map((bundle) => [bundle.company.id, bundle]));

describe("dataset integrity", () => {
  it("anchors the workspace clock to the same instant as the app-wide mock data", () => {
    assert.equal(DEMO_CLOCK_ANCHOR, MOCK_NOW);
  });

  it("is deterministic across builds", () => {
    const again = [...buildDataset().values()].map((bundle) => computeSummary(ctx, bundle));
    assert.deepEqual(
      again.map((item) => [item.company.id, item.mrrMinor, item.health.status, item.counts.users]),
      summaries.map((item) => [item.company.id, item.mrrMinor, item.health.status, item.counts.users]),
    );
  });

  it("agrees with the global Users page on every company's user count", () => {
    for (const bundle of bundles) {
      const global = PLATFORM_USERS.filter((user) => user.company.id === bundle.company.id).length;
      assert.equal(bundle.users.length, global, bundle.company.name);
    }
  });

  it("stamps the right company id on every company-scoped record", () => {
    for (const bundle of bundles) {
      const id = bundle.company.id;
      const scoped = [
        ...bundle.users,
        ...bundle.clients,
        ...bundle.integrations,
        ...bundle.invoices,
        ...bundle.payments,
        ...bundle.activity,
        ...bundle.notes,
        ...bundle.tickets,
        ...bundle.overrides,
      ];
      assert.ok(scoped.every((record) => record.companyId === id), `${bundle.company.name}: foreign record found`);
      assert.equal(bundle.subscription.companyId, id);
      assert.equal(bundle.security.companyId, id);
    }
  });

  it("never lets a record id appear under two companies", () => {
    const seen = new Map<string, string>();
    for (const bundle of bundles) {
      for (const record of [...bundle.clients, ...bundle.integrations, ...bundle.invoices, ...bundle.payments]) {
        const owner = seen.get(record.id);
        assert.ok(!owner || owner === bundle.company.id, `${record.id} belongs to two companies`);
        seen.set(record.id, bundle.company.id);
      }
    }
  });

  it("links every client access entry to a client of the same company", () => {
    for (const bundle of bundles) {
      const clientIds = new Set(bundle.clients.map((client) => client.id));
      for (const user of bundle.users) {
        assert.ok(user.clientAccessIds.every((id) => clientIds.has(id)), `${bundle.company.name}/${user.name}`);
      }
    }
  });

  it("gives every company exactly one owner record that exists", () => {
    for (const bundle of bundles) {
      const owner = bundle.users.find((user) => user.id === bundle.company.ownerUserId);
      assert.ok(owner, `${bundle.company.name} has no owner membership`);
      assert.equal(owner.role, "owner");
      assert.equal(bundle.users.filter((user) => user.role === "owner").length, 1, `${bundle.company.name}: owner count`);
    }
  });
});

describe("summary consistency", () => {
  it("shows the same counts on the list as the records behind the tabs", () => {
    for (const summary of summaries) {
      const bundle = byId.get(summary.company.id)!;
      assert.equal(summary.counts.users, bundle.users.length);
      assert.equal(summary.counts.clients, bundle.clients.length);
      assert.equal(summary.counts.connections, bundle.integrations.length);
      const counts = countIntegrations(bundle.integrations);
      assert.equal(summary.counts.healthyConnections + summary.counts.attentionConnections, counts.total);
    }
  });

  it("derives count-based usage from the records, not from a separate number", () => {
    for (const bundle of bundles) {
      assert.equal(usedFor(bundle, "users"), bundle.users.length);
      assert.equal(usedFor(bundle, "clients"), bundle.clients.length);
      assert.equal(usedFor(bundle, "connectedAccounts"), bundle.integrations.length);
    }
  });

  it("matches the subscription's plan on the summary", () => {
    for (const summary of summaries) {
      const bundle = byId.get(summary.company.id)!;
      assert.equal(summary.plan.tier, bundle.subscription.planTier);
      assert.equal(summary.plan.billingCycle, bundle.subscription.billingCycle);
      assert.equal(summary.subscriptionStatus, bundle.subscription.status);
    }
  });

  it("reconciles the billing summary with its invoices", () => {
    for (const bundle of bundles) {
      const billing = computeBilling(ctx, bundle);
      const outstanding = bundle.invoices
        .filter((invoice) => invoice.status === "open" || invoice.status === "overdue")
        .reduce((total, invoice) => total + invoice.amountMinor, 0);
      assert.equal(billing.outstandingMinor, outstanding, bundle.company.name);
      assert.equal(billing.invoiceCount, bundle.invoices.length);
    }
  });

  it("charges catalogue prices for MRR, and counts none for non-operating companies", () => {
    for (const summary of summaries) {
      const bundle = byId.get(summary.company.id)!;
      if (bundle.company.accountStatus !== "active") {
        assert.equal(summary.mrrMinor, 0, `${summary.company.name} should not count towards MRR`);
        continue;
      }
      const plan = planFor(ctx, bundle.subscription.planTier);
      const paying = ["active", "past_due", "scheduled_cancellation"].includes(bundle.subscription.status);
      const expected = !paying ? 0 : bundle.subscription.billingCycle === "annual" ? Math.round(plan.annualPriceMinor / 12) : plan.monthlyPriceMinor;
      assert.equal(summary.mrrMinor, expected, summary.company.name);
    }
  });
});

describe("portfolio KPIs", () => {
  it("adds the four account states up to the total", () => {
    const { accountStatus } = portfolio;
    assert.equal(accountStatus.active + accountStatus.suspended + accountStatus.deactivated + accountStatus.archived, portfolio.total);
    assert.equal(portfolio.total, summaries.length);
  });

  it("adds the health buckets up to the total, with nothing counted twice", () => {
    const { health } = portfolio;
    assert.equal(health.healthy + health.needs_attention + health.critical + health.suspended + health.notAssessed, portfolio.total);
    assert.equal(health.suspended, portfolio.suspended);
  });

  it("agrees with the filters it links to", () => {
    const count = (query: Parameters<typeof filterSummaries>[1]) => filterSummaries(summaries, query, ctx.now).length;
    assert.equal(count({ accountStatus: "active" }), portfolio.active);
    assert.equal(count({ accountStatus: "suspended" }), portfolio.suspended);
    assert.equal(count({ subscriptionStatus: "trialing", accountStatus: "active" }), portfolio.trialing);
    assert.equal(count({ subscriptionStatus: "past_due", accountStatus: "active" }), portfolio.pastDue);
    assert.equal(count({ health: "critical" }), portfolio.health.critical);
  });

  it("sums MRR from the companies that generate it", () => {
    assert.equal(portfolio.mrrMinor, summaries.reduce((total, item) => total + item.mrrMinor, 0));
    assert.equal(portfolio.payingCompanies, summaries.filter((item) => item.mrrMinor > 0).length);
  });

  it("only counts a company as needing attention for a real (non-info) issue", () => {
    const expected = summaries.filter((item) => item.attention.some((entry) => entry.severity !== "info")).length;
    assert.equal(portfolio.needsAttention, expected);
  });

  it("keeps quiet about suspended, deactivated and archived companies", () => {
    for (const summary of summaries.filter((item) => item.company.accountStatus !== "active")) {
      assert.deepEqual(summary.attention, [], summary.company.name);
    }
  });
});

describe("usage and limits", () => {
  it("treats exactly 100% as at the limit, and only above it as exceeded", () => {
    assert.equal(resourceStatus(USAGE_THRESHOLDS.exceeded), "near_limit");
    assert.equal(resourceStatus(USAGE_THRESHOLDS.exceeded + 0.1), "exceeded");
    assert.equal(resourceStatus(null), "not_metered");
    assert.equal(resourceStatus(89.9), "high");
  });

  it("does not raise alarms for hard caps sitting exactly at their limit", () => {
    for (const bundle of bundles) {
      const usage = computeUsage(ctx, bundle);
      for (const record of usage.records) {
        const def = USAGE_RESOURCES.find((item) => item.key === record.resource)!;
        if (def.capped && (record.utilization ?? 0) <= 100) assert.equal(record.alertable, false, `${bundle.company.name}/${def.label}`);
      }
    }
  });

  it("keeps the plan limit and an override separate, and never edits the catalogue", () => {
    const kaveri = byId.get("cmp_kaveri-institute")!;
    const usage = computeUsage(ctx, kaveri);
    const ai = usage.records.find((record) => record.resource === "aiCredits")!;
    const plan = planFor(ctx, kaveri.subscription.planTier);
    assert.equal(ai.includedLimit, plan.limits.aiCredits);
    assert.ok(ai.activeOverride, "expected an active override");
    assert.equal(ai.effectiveLimit, ai.activeOverride.overrideLimit);
    assert.ok((ai.effectiveLimit ?? 0) > (ai.includedLimit ?? 0));
    assert.equal(PLAN_CATALOGUE.find((item) => item.tier === plan.tier)?.limits.aiCredits, plan.limits.aiCredits);
  });

  it("ignores an expired override", () => {
    const kaveri = byId.get("cmp_kaveri-institute")!;
    const later = computeUsage({ ...ctx, now: ctx.now + 400 * 86_400_000 }, kaveri);
    const ai = later.records.find((record) => record.resource === "aiCredits")!;
    assert.equal(ai.activeOverride, null);
    assert.equal(ai.effectiveLimit, ai.includedLimit);
  });

  it("reports the headline utilisation as the highest single resource, never an average", () => {
    for (const bundle of bundles) {
      const usage = computeUsage(ctx, bundle);
      const max = Math.max(-1, ...usage.records.filter((record) => record.alertable).map((record) => record.utilization ?? -1));
      assert.equal(usage.highest?.utilization ?? -1, max, bundle.company.name);
    }
  });
});

describe("tenant health", () => {
  it("explains every non-healthy company with at least one warning factor", () => {
    for (const summary of summaries) {
      if (summary.health.status === "needs_attention" || summary.health.status === "critical") {
        assert.ok(summary.health.factors.some((factor) => factor.status !== "healthy"), summary.company.name);
        assert.notEqual(summary.health.reason.trim(), "");
      }
      if (summary.health.status === "healthy") {
        assert.ok(summary.health.factors.every((factor) => factor.status === "healthy"), summary.company.name);
        assert.equal(summary.health.factors.length, 7);
      }
    }
  });

  it("is critical exactly when a factor is critical", () => {
    for (const summary of summaries.filter((item) => item.company.accountStatus === "active")) {
      const hasCritical = summary.health.factors.some((factor) => factor.status === "critical");
      assert.equal(summary.health.status === "critical", hasCritical, summary.company.name);
    }
  });

  it("does not assess suspended companies", () => {
    for (const summary of summaries.filter((item) => item.company.accountStatus === "suspended")) {
      assert.equal(summary.health.status, "suspended");
    }
  });

  it("tells a payment-failed company apart from a healthy one", () => {
    const namo = summaries.find((item) => item.company.id === "cmp_namo-gange-trust")!;
    assert.equal(namo.billingStatus, "payment_failed");
    assert.equal(namo.health.status, "critical");
    assert.ok(namo.attention.some((item) => item.kind === "payment_failed" && item.section === "billing"));
  });

  it("keeps account, subscription, billing and health as independent axes", () => {
    const combos = new Set(summaries.map((item) => [item.company.accountStatus, item.subscriptionStatus, item.billingStatus, item.health.status].join("|")));
    assert.ok(combos.size > 8, "expected a varied portfolio");
    const namo = summaries.find((item) => item.company.id === "cmp_namo-gange-trust")!;
    assert.equal(namo.company.accountStatus, "active");
    assert.equal(namo.subscriptionStatus, "past_due");
    assert.notEqual(namo.health.status, "healthy");
  });
});

describe("listing", () => {
  it("searches company, owner, email, domain and company id", () => {
    const namo = summaries.find((item) => item.company.id === "cmp_namo-gange-trust")!;
    for (const term of [namo.company.name.slice(0, 6), namo.owner.name, namo.owner.email, namo.company.domain ?? "", namo.company.displayId]) {
      const hit = filterSummaries(summaries, { search: term }, ctx.now).some((item) => item.company.id === namo.company.id);
      assert.ok(hit, `search "${term}" should find Namo Gange Trust`);
    }
  });

  it("sorts by MRR in both directions and breaks ties by name", () => {
    const desc = sortSummaries(summaries, { field: "mrr", direction: "desc" }).map((item) => item.mrrMinor);
    assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
    const asc = sortSummaries(summaries, { field: "mrr", direction: "asc" }).map((item) => item.mrrMinor);
    assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  });

  it("paginates without losing or duplicating rows", () => {
    const seen: string[] = [];
    let page = 1;
    for (;;) {
      const result = applyListQuery(summaries, { page, pageSize: 10, sort: { field: "name", direction: "asc" } }, ctx.now);
      seen.push(...result.data.map((item) => item.company.id));
      assert.equal(result.pagination.total, summaries.length);
      if (!result.pagination.hasNextPage) break;
      page += 1;
    }
    assert.equal(new Set(seen).size, summaries.length);
    assert.equal(seen.length, summaries.length);
  });

  it("clamps an out-of-range page instead of returning nothing", () => {
    const result = applyListQuery(summaries, { page: 99, pageSize: 10 }, ctx.now);
    assert.ok(result.data.length > 0);
    assert.equal(result.pagination.page, result.pagination.totalPages);
  });

  it("filters by every documented dimension", () => {
    const count = (query: Parameters<typeof filterSummaries>[1]) => filterSummaries(summaries, query, ctx.now).length;
    assert.ok(count({ plan: "growth" }) > 0 && count({ plan: "growth" }) < summaries.length);
    assert.ok(count({ billingStatus: "payment_failed" }) > 0);
    assert.ok(count({ usageLevel: "near_limit" }) > 0);
    assert.ok(count({ health: "at_risk" }) === portfolio.health.needs_attention + portfolio.health.critical);
    assert.ok(count({ issue: "payment" }) > 0);
    assert.ok(count({ tag: "Enterprise" }) > 0);
    assert.equal(count({ search: "zzzz-no-such-company" }), 0);
  });
});

describe("owner and security", () => {
  it("flags a company with nobody able to administer it, and only that one", () => {
    const orphaned = summaries.filter((item) => item.attention.some((entry) => entry.kind === "no_active_admin"));
    assert.deepEqual(orphaned.map((item) => item.company.id), ["cmp_craftline-interiors"]);
  });

  it("gives every security warning a concrete action", () => {
    for (const bundle of bundles) {
      const warnings = computeSecurityWarnings(bundle, deriveOwner(bundle));
      for (const warning of warnings) {
        assert.ok(warning.action.label.length > 0 && warning.action.kind, `${bundle.company.name}/${warning.id}`);
      }
    }
  });
});

describe("plan change maths", () => {
  it("estimates a positive net charge for an upgrade and a credit for a downgrade", () => {
    const growth = planFor(ctx, "growth");
    const agency = planFor(ctx, "agency");
    const subscription = { billingCycle: "monthly" as const, currentPeriodStart: "2026-09-01T00:00:00.000Z", renewsAt: "2026-10-01T00:00:00.000Z" };
    const up = estimateProration(growth, agency, subscription, "monthly", ctx.now);
    const down = estimateProration(agency, growth, subscription, "monthly", ctx.now);
    assert.ok(up.netMinor > 0);
    assert.ok(down.netMinor < 0);
    assert.equal(up.creditMinor + up.netMinor, up.chargeMinor);
  });

  it("charges a cycle change in full because it starts a fresh period", () => {
    const growth = planFor(ctx, "growth");
    const subscription = { billingCycle: "monthly" as const, currentPeriodStart: "2026-09-01T00:00:00.000Z", renewsAt: "2026-10-01T00:00:00.000Z" };
    const result = estimateProration(growth, growth, subscription, "annual", ctx.now);
    assert.equal(result.chargeMinor, growth.annualPriceMinor);
  });
});
