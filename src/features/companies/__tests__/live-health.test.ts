import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveLiveHealth } from "../data/selectors";
import type { CompanySummary } from "../data/types";

const NOW = "2026-10-28T10:00:00.000Z";

/** Only what the derivation reads; everything else about a summary is irrelevant to health. */
function summary(over: Record<string, unknown> = {}): CompanySummary {
  return {
    company: { id: "c1", name: "Acme", accountStatus: "active" },
    owner: { state: "active", name: "Sompal" },
    counts: { users: 1, activeUsers: 1, clients: 1, connections: 5, healthyConnections: 5, attentionConnections: 0 },
    usage: { level: "normal", utilization: 40, resource: "apiRequests" },
    billingStatus: "paid",
    subscriptionStatus: "active",
    ...over,
  } as unknown as CompanySummary;
}

describe("live tenant health", () => {
  it("is healthy, with nothing to attend to, when every assessed factor is fine", () => {
    const { health, attention } = deriveLiveHealth(summary(), NOW);
    assert.equal(health.status, "healthy");
    assert.equal(health.factors.length, 5, "only the five factors the platform can measure per company");
    assert.match(health.reason, /All 5 assessed factors are healthy/);
    assert.deepEqual(attention, []);
  });

  it("nothing invoiced yet is not a billing fault (payment methods are not stored)", () => {
    assert.equal(deriveLiveHealth(summary({ billingStatus: "no_payment_method" }), NOW).health.status, "healthy");
  });

  it("an open invoice needs attention; a written-off one is critical", () => {
    const due = deriveLiveHealth(summary({ billingStatus: "payment_due" }), NOW);
    assert.equal(due.health.status, "needs_attention");
    assert.equal(due.attention[0]?.kind, "payment_due");
    const failed = deriveLiveHealth(summary({ billingStatus: "payment_failed" }), NOW);
    assert.equal(failed.health.status, "critical");
    assert.equal(failed.attention[0]?.kind, "payment_failed");
    assert.equal(failed.attention[0]?.section, "billing");
  });

  it("usage over a limit is critical, near a limit is a warning, and says which resource", () => {
    const over = deriveLiveHealth(summary({ usage: { level: "exceeded", utilization: 112, resource: "apiRequests" } }), NOW);
    assert.equal(over.health.status, "critical");
    assert.match(over.attention[0]?.title ?? "", /limit exceeded/);
    assert.match(over.attention[0]?.description ?? "", /112%/);
    const near = deriveLiveHealth(summary({ usage: { level: "near_limit", utilization: 93, resource: "apiRequests" } }), NOW);
    assert.equal(near.health.status, "needs_attention");
    assert.equal(near.attention[0]?.kind, "usage_near_limit");
  });

  it("connected accounts that need attention warn; most failing is critical", () => {
    const some = deriveLiveHealth(summary({ counts: { connections: 5, healthyConnections: 4, attentionConnections: 1 } }), NOW);
    assert.equal(some.health.status, "needs_attention");
    assert.equal(some.attention[0]?.kind, "integration_reconnect");
    assert.match(some.attention[0]?.title ?? "", /1 integration needs reconnection/);
    const most = deriveLiveHealth(summary({ counts: { connections: 4, healthyConnections: 1, attentionConnections: 3 } }), NOW);
    assert.equal(most.health.status, "critical");
  });

  it("a past-due or paused subscription warns; an expired one is critical", () => {
    assert.equal(deriveLiveHealth(summary({ subscriptionStatus: "past_due" }), NOW).health.status, "needs_attention");
    assert.equal(deriveLiveHealth(summary({ subscriptionStatus: "paused" }), NOW).health.status, "needs_attention");
    assert.equal(deriveLiveHealth(summary({ subscriptionStatus: "expired" }), NOW).health.status, "critical");
  });

  it("ownership: no owner is critical, an expired invitation warns, a pending one is fine", () => {
    assert.equal(deriveLiveHealth(summary({ owner: { state: "none", name: "" } }), NOW).health.status, "critical");
    assert.equal(deriveLiveHealth(summary({ owner: { state: "invitation_expired", name: "Sompal" } }), NOW).attention[0]?.kind, "owner_invitation_expired");
    assert.equal(deriveLiveHealth(summary({ owner: { state: "invited", name: "Sompal" } }), NOW).health.status, "healthy");
  });

  it("suspended and archived companies are not assessed and raise nothing", () => {
    const suspended = deriveLiveHealth(summary({ company: { id: "c1", name: "Acme", accountStatus: "suspended" }, billingStatus: "payment_failed" }), NOW);
    assert.equal(suspended.health.status, "suspended");
    assert.deepEqual(suspended.attention, []);
    const archived = deriveLiveHealth(summary({ company: { id: "c1", name: "Acme", accountStatus: "archived" } }), NOW);
    assert.equal(archived.health.status, "not_assessed");
  });

  it("the most severe item comes first", () => {
    const { attention } = deriveLiveHealth(summary({ billingStatus: "payment_due", usage: { level: "exceeded", utilization: 120, resource: "apiRequests" } }), NOW);
    assert.deepEqual(attention.map((item) => item.severity), ["critical", "warning"]);
  });
});
