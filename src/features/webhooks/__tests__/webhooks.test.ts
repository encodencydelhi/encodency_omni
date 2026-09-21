import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DEMO_CLOCK_ANCHOR } from "../data/config";
import { buildWebhooksSnapshot } from "../data/mock/dataset";
import * as store from "../data/mock/store";
import {
  attemptsFor,
  buildDeliveryTimeline,
  evaluateDeliveryRecovery,
  evaluateIncomingReprocess,
  overviewKpis,
  resolveWindow,
} from "../data/selectors";
import type { CreateEndpointInput, Delivery, WebhooksSnapshot } from "../data/types";
import { checkDestinationUrl } from "../data/validation";

const ANCHOR = Date.parse(DEMO_CLOCK_ANCHOR);

function assess(snapshot: WebhooksSnapshot, delivery: Delivery) {
  return evaluateDeliveryRecovery({
    delivery,
    endpoint: snapshot.endpoints.find((endpoint) => endpoint.id === delivery.endpointId),
    attempts: attemptsFor(snapshot, delivery.id),
    eventType: snapshot.eventTypes.find((type) => type.key === delivery.eventKey),
    siblingDeliveries: snapshot.deliveries.filter((item) => item.eventId === delivery.eventId && item.endpointId === delivery.endpointId),
  });
}

describe("destination URL validation", () => {
  it("accepts a normal HTTPS URL and strips nothing sensitive", () => {
    const result = checkDestinationUrl("https://hooks.example.com/omniplatform", "production");
    assert.equal(result.ok, true);
    assert.equal(result.sanitizedUrl, "https://hooks.example.com/omniplatform");
  });

  it("requires HTTPS in production but only warns in development", () => {
    assert.equal(checkDestinationUrl("http://hooks.example.com/x", "production").ok, false);
    const dev = checkDestinationUrl("http://hooks.example.com/x", "development");
    assert.equal(dev.ok, true);
    assert.ok(dev.warnings.length > 0);
  });

  it("rejects credentials, fragments and unsafe schemes", () => {
    assert.equal(checkDestinationUrl("https://user:pass@hooks.example.com/x", "production").ok, false);
    assert.equal(checkDestinationUrl("https://hooks.example.com/x#frag", "production").ok, false);
    assert.equal(checkDestinationUrl("javascript:alert(1)", "production").ok, false);
    assert.equal(checkDestinationUrl("ftp://hooks.example.com/x", "production").ok, false);
    assert.equal(checkDestinationUrl("not a url", "production").ok, false);
    assert.equal(checkDestinationUrl("", "production").ok, false);
  });

  it("rejects local, private and link-local targets", () => {
    for (const host of ["localhost", "127.0.0.1", "10.1.2.3", "172.16.5.5", "172.31.0.1", "192.168.1.10", "169.254.169.254", "[::1]", "printer.local", "db.internal", "intranet"]) {
      assert.equal(checkDestinationUrl(`https://${host}/hook`, "production").ok, false, host);
    }
    assert.equal(checkDestinationUrl("https://172.32.0.1/hook", "production").ok, true, "172.32 is public");
  });

  it("does not store or display the query string", () => {
    const result = checkDestinationUrl("https://hooks.example.com/x?token=secret", "production");
    assert.equal(result.hadQueryString, true);
    assert.ok(!result.sanitizedUrl?.includes("secret"));
    assert.ok(result.warnings.some((warning) => warning.includes("Query")));
  });
});

describe("demo dataset invariants", () => {
  const environments = ["development", "staging", "production"] as const;

  for (const environment of environments) {
    it(`${environment}: deliveries, attempts and scope are internally consistent`, () => {
      const snapshot = buildWebhooksSnapshot(environment);
      assert.ok(snapshot.deliveries.length > 0);
      for (const delivery of snapshot.deliveries) {
        const attempts = attemptsFor(snapshot, delivery.id);
        assert.equal(delivery.attemptsUsed, attempts.length, `${delivery.id} attemptsUsed`);
        assert.ok(delivery.attemptsUsed <= delivery.maxAttempts, `${delivery.id} within max`);
        const endpoint = snapshot.endpoints.find((item) => item.id === delivery.endpointId);
        assert.ok(endpoint, `${delivery.id} endpoint exists`);
        if (endpoint.ownerScope === "company") assert.equal(delivery.companyId, endpoint.companyId, `${delivery.id} scope`);
        if (delivery.state === "delivered") assert.equal(attempts.at(-1)?.result, "succeeded");
        if (delivery.state === "retry_scheduled") assert.ok(Date.parse(delivery.nextRetryAt!) > ANCHOR, `${delivery.id} retry is in the future`);
        if (delivery.state !== "retry_scheduled") assert.equal(delivery.nextRetryAt, null);
        assert.deepEqual(attempts.map((a) => a.number), attempts.map((_, i) => i + 1), `${delivery.id} attempts are numbered without gaps`);
      }
    });

    it(`${environment}: company endpoints never subscribe to platform-only events`, () => {
      const snapshot = buildWebhooksSnapshot(environment);
      for (const subscription of snapshot.subscriptions) {
        const endpoint = snapshot.endpoints.find((item) => item.id === subscription.endpointId)!;
        const type = snapshot.eventTypes.find((item) => item.key === subscription.eventKey)!;
        if (endpoint.ownerScope === "company") assert.notEqual(type.audience, "platform", `${endpoint.id} -> ${type.key}`);
      }
    });

    it(`${environment}: unverified incoming events are never processed`, () => {
      const snapshot = buildWebhooksSnapshot(environment);
      for (const event of snapshot.incomingEvents) {
        if (event.verification.state !== "verified") {
          assert.ok(["received", "rejected"].includes(event.processing.state), `${event.id} ${event.processing.state}`);
          assert.equal(event.processing.resourceUpdate, "not_attempted");
          assert.equal(event.relatedResource, null);
        }
        if (event.dedup.result === "duplicate_http_delivery") {
          assert.ok(snapshot.incomingEvents.some((other) => other.id === event.dedup.originalEventId), `${event.id} original exists`);
        }
        assert.ok(!JSON.stringify(event).toLowerCase().includes("secret"), "no secret material");
      }
    });
  }

  it("production data covers the failure classes the UI must explain", () => {
    const snapshot = buildWebhooksSnapshot("production");
    const classes = new Set(snapshot.deliveries.map((d) => d.latestFailureClass));
    for (const expected of ["endpoint_gone", "attempts_exhausted", "unknown_external_outcome", "http_429", "http_4xx_permanent", "dns_tls_failure", "invalid_endpoint_configuration"] as const) {
      assert.ok(classes.has(expected), `missing ${expected}`);
    }
    const states = new Set(snapshot.deliveries.map((d) => d.state));
    for (const expected of ["pending", "attempting", "retry_scheduled", "delivered", "failed", "cancelled"] as const) assert.ok(states.has(expected), `missing state ${expected}`);
    assert.ok(snapshot.deliveries.some((d) => d.attemptsUsed > 1), "multi-attempt delivery exists");
    const perEvent = new Map<string, number>();
    snapshot.deliveries.forEach((d) => perEvent.set(d.eventId, (perEvent.get(d.eventId) ?? 0) + 1));
    assert.ok([...perEvent.values()].some((n) => n > 1), "one event delivered to several endpoints");
  });

  it("attempts do not inflate delivery counts in KPIs", () => {
    const snapshot = buildWebhooksSnapshot("production");
    const window = resolveWindow(snapshot, "30d", 24);
    const kpi = overviewKpis(snapshot, window);
    assert.equal(kpi.outgoingDeliveries, snapshot.deliveries.filter((d) => Date.parse(d.createdAt) >= window.fromMs).length);
    assert.ok(kpi.attemptCount > kpi.outgoingDeliveries, "attempts exceed deliveries");
  });
});

describe("retry, redelivery and replay eligibility", () => {
  const snapshot = buildWebhooksSnapshot("production");

  it("blocks recovery of an HTTP 410 endpoint", () => {
    const gone = snapshot.deliveries.find((d) => d.latestFailureClass === "endpoint_gone")!;
    assert.equal(assess(snapshot, gone).level, "not_eligible");
  });

  it("treats an unknown external outcome as needing review with duplicate risk, never as safe", () => {
    const unknown = snapshot.deliveries.find((d) => d.latestFailureClass === "unknown_external_outcome")!;
    const result = assess(snapshot, unknown);
    assert.notEqual(result.level, "eligible");
    assert.equal(result.duplicateRisk, "possible");
  });

  it("flags redelivery of an already-accepted delivery as high duplicate risk", () => {
    const delivered = snapshot.deliveries.find((d) => d.state === "delivered")!;
    const result = assess(snapshot, delivered);
    assert.equal(result.duplicateRisk, "high");
    assert.notEqual(result.level, "eligible");
  });

  it("blocks in-flight and cancelled deliveries", () => {
    for (const state of ["attempting", "pending", "cancelled"] as const) {
      const delivery = snapshot.deliveries.find((d) => d.state === state)!;
      assert.equal(assess(snapshot, delivery).level, "not_eligible", state);
    }
  });

  it("never allows reprocessing a rejected or unverified incoming event", () => {
    const rejected = snapshot.incomingEvents.find((e) => e.verification.state === "rejected")!;
    const unverified = snapshot.incomingEvents.find((e) => e.verification.state === "unavailable")!;
    assert.equal(evaluateIncomingReprocess(rejected, snapshot.sources.find((s) => s.id === rejected.sourceId)).level, "not_eligible");
    assert.equal(evaluateIncomingReprocess(unverified, snapshot.sources.find((s) => s.id === unverified.sourceId)).level, "not_eligible");
  });

  it("does not allow reprocessing an ignored duplicate delivery", () => {
    const duplicate = snapshot.incomingEvents.find((e) => e.dedup.result === "duplicate_http_delivery")!;
    assert.equal(evaluateIncomingReprocess(duplicate, snapshot.sources.find((s) => s.id === duplicate.sourceId)).level, "not_eligible");
  });
});

describe("demo store mutations", () => {
  const env = "production" as const;
  const draft = (overrides: Partial<CreateEndpointInput> = {}): CreateEndpointInput => ({
    name: "Test Endpoint", description: "", environment: env, ownerScope: "company", companyId: "cmp_nordwind-studios",
    destinationUrl: "https://hooks.example.org/omni", allowedAudience: "", contactRef: null, eventKeys: ["post.published"],
    timeoutMs: 8_000, retryPolicyRef: "retry-policy/standard-v1", payloadPrivacy: "operational", state: "draft", ...overrides,
  });

  beforeEach(() => store.resetDemo(env));

  it("creates a demo endpoint, subscriptions and an activity entry without creating deliveries", () => {
    const before = store.getSnapshot(env);
    const result = store.createEndpoint(env, draft());
    assert.equal(result.ok, true);
    const after = store.getSnapshot(env);
    assert.equal(after.endpoints.length, before.endpoints.length + 1);
    assert.equal(after.deliveries.length, before.deliveries.length);
    assert.equal(after.attempts.length, before.attempts.length);
    assert.equal(result.data?.signing.state, "demo_reference");
    assert.equal(result.data?.signing.secretVersionRef, "demo-ref/not-a-real-secret");
    assert.equal(after.activity[0]?.type, "endpoint_created");
  });

  it("rejects invalid URLs, duplicate names, missing company and unauthorised events", () => {
    assert.equal(store.createEndpoint(env, draft({ destinationUrl: "http://hooks.example.org/x" })).ok, false);
    assert.equal(store.createEndpoint(env, draft({ destinationUrl: "https://10.0.0.5/x" })).ok, false);
    assert.equal(store.createEndpoint(env, draft({ name: "Platform - Ops Alert Relay" })).ok, false);
    assert.equal(store.createEndpoint(env, draft({ companyId: null })).ok, false);
    assert.equal(store.createEndpoint(env, draft({ eventKeys: ["integration.provider_degraded"] })).ok, false, "platform-only event");
    assert.equal(store.createEndpoint(env, draft({ eventKeys: ["campaign.status_changed"] })).ok, false, "deprecated event");
    assert.equal(store.createEndpoint(env, draft({ eventKeys: [] })).ok, false);
  });

  it("changing subscriptions never rewrites delivery history", () => {
    const before = store.getSnapshot(env);
    const result = store.saveSubscriptions(env, "wep_002", ["report.generated"], "Narrowing scope");
    assert.equal(result.ok, true);
    const after = store.getSnapshot(env);
    assert.deepEqual(after.deliveries, before.deliveries);
    assert.deepEqual(after.attempts, before.attempts);
    assert.equal(after.subscriptions.filter((s) => s.endpointId === "wep_002").length, 1);
    assert.equal(store.saveSubscriptions(env, "wep_002", [], "x").ok, false, "cannot empty an endpoint");
    assert.equal(store.saveSubscriptions(env, "wep_002", ["report.generated", "integration.provider_degraded"], "x").ok, false, "platform-only for company endpoint");
    assert.equal(store.saveSubscriptions(env, "wep_002", ["report.generated", "seo_audit.completed"], "").ok, false, "reason required");
  });

  it("requires a reason for state changes and refuses to lift a suspension", () => {
    assert.equal(store.setEndpointState(env, "wep_006", "enabled", "").ok, false);
    assert.equal(store.setEndpointState(env, "wep_008", "enabled", "please").ok, false);
    const ok = store.setEndpointState(env, "wep_006", "enabled", "Migration finished");
    assert.equal(ok.ok, true);
    assert.equal(ok.data?.state, "enabled");
  });

  it("a demo recovery request never adds attempts, deliveries or a success", () => {
    const snapshot = store.getSnapshot(env);
    const target = snapshot.deliveries.find((d) => d.latestFailureClass === "attempts_exhausted" && !snapshot.recoveryRequests.some((r) => r.targetId === d.id && r.state === "pending_review"))!;
    const gone = snapshot.deliveries.find((d) => d.latestFailureClass === "endpoint_gone")!;

    assert.equal(store.createRecoveryRequest(env, { direction: "outgoing", kind: "redelivery", targetId: gone.id, reason: "try", duplicateRiskAcknowledged: true, submit: true }).ok, false, "410 is blocked");
    assert.equal(store.createRecoveryRequest(env, { direction: "outgoing", kind: "redelivery", targetId: target.id, reason: "", duplicateRiskAcknowledged: true, submit: true }).ok, false, "reason required");

    const result = store.createRecoveryRequest(env, { direction: "outgoing", kind: "redelivery", targetId: target.id, reason: "Destination recovered", duplicateRiskAcknowledged: true, submit: true });
    assert.equal(result.ok, true);
    assert.equal(result.data?.state, "pending_review");
    assert.equal(result.data?.executionEvidence, null);
    assert.equal(result.data?.demo, true);

    const after = store.getSnapshot(env);
    assert.equal(after.attempts.length, snapshot.attempts.length);
    assert.equal(after.deliveries.length, snapshot.deliveries.length);
    const updated = after.deliveries.find((d) => d.id === target.id)!;
    assert.equal(updated.state, target.state);
    assert.equal(updated.attemptsUsed, target.attemptsUsed);

    const timeline = buildDeliveryTimeline({ delivery: updated, eventOccurredAt: null, attempts: attemptsFor(after, updated.id), recoveryRequests: after.recoveryRequests.filter((r) => r.targetId === updated.id) });
    assert.ok(timeline.some((entry) => entry.title.includes("requested (demo, not sent)")));
    assert.ok(!timeline.some((entry) => entry.title.startsWith("Delivered")), "no invented success");
  });

  it("requires acknowledging duplicate risk and refuses to reprocess unverified incoming events", () => {
    const snapshot = store.getSnapshot(env);
    const unknown = snapshot.deliveries.find((d) => d.latestFailureClass === "unknown_external_outcome")!;
    assert.equal(store.createRecoveryRequest(env, { direction: "outgoing", kind: "redelivery", targetId: unknown.id, reason: "check", duplicateRiskAcknowledged: false, submit: false }).ok, false);
    const rejected = snapshot.incomingEvents.find((e) => e.verification.state === "rejected")!;
    assert.equal(store.createRecoveryRequest(env, { direction: "incoming", kind: "reprocess", targetId: rejected.id, reason: "please", duplicateRiskAcknowledged: false, submit: true }).ok, false);
  });

  it("a secret rotation review request changes no secret", () => {
    const before = store.getSnapshot(env).endpoints.find((e) => e.id === "wep_001")!;
    const result = store.requestSecretRotationReview(env, "wep_001");
    assert.equal(result.ok, true);
    const after = store.getSnapshot(env).endpoints.find((e) => e.id === "wep_001")!;
    assert.equal(after.signing.secretVersionRef, before.signing.secretVersionRef);
    assert.equal(after.signing.lastRotationAt, before.signing.lastRotationAt);
  });
});
