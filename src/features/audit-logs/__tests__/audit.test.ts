/**
 * Behaviour of Audit Logs through the demo provider: a shared event contract, events derived from
 * the histories other modules own, filters that combine correctly, KPIs that match the list,
 * correlation only by shared id, redaction, investigations that never touch an event, and exports
 * that are governed and themselves audited.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// The providers simulate latency; the tests do not need to wait for it.
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";
const { auditRepository: repo } = await import("../data/repository");
const { unavailableAuditProvider } = await import("../data/unavailable-provider");
const { flagsRepository: flags } = await import("@/features/feature-flags/data/repository");
const { ApiError } = await import("@/types/api");
const { resolveWindow, activitySeries, bucketUnit } = await import("../data/filters");
const { ACTIONS, canonicalKey, actionLabel } = await import("../data/action-catalogue");
const { isSecretField, safeValue, scrubText, REDACTED } = await import("../data/redaction");
const { buildChanges } = await import("../data/build");
const { deriveAuditCapabilities } = await import("../data/capabilities");
const { ROLE_PERMISSIONS } = await import("@/types/domain/team");
const { platformNow } = await import("@/features/companies/data/clock");
const { ALL_TIME } = await import("../data/filters");
type Event = Awaited<ReturnType<typeof repo.getEvent>>["event"];

const actor = { id: "stf_001", name: "Aditya Raghunath" };
const staffActor = { id: "stf_003", name: "Manish Sirohi" };

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => ApiError.isApiError(error) && error.code === code, `expected ${code}`);
}

beforeEach(async () => {
  await repo.resetDemoData?.();
  await flags.resetDemoData?.();
});

const all = async (extra: Record<string, unknown> = {}): Promise<Event[]> => (await repo.listEvents({ window: ALL_TIME, pageSize: 100000, ...extra })).rows;
const now = () => platformNow();

describe("event contract", () => {
  it("gives every event a unique id, both timestamps, a catalogue label and an integrity status that is not verified", async () => {
    const events = await all();
    assert.ok(events.length > 300);
    assert.equal(new Set(events.map((event) => event.id)).size, events.length);
    for (const event of events) {
      assert.equal(event.schemaVersion, 1);
      assert.ok(Date.parse(event.recordedAt) >= Date.parse(event.occurredAt), event.id);
      assert.ok(event.actionLabel.length > 0, event.id);
      assert.notEqual(event.integrity.status, "verified", "a frontend event is never shown as verified");
    }
  });

  it("uses one canonical key per operation, whichever module recorded it", () => {
    assert.equal(canonicalKey("company.suspended"), "company.status_changed");
    assert.equal(canonicalKey("company.reactivated"), "company.status_changed");
    assert.equal(canonicalKey("user.role_changed"), "user.company_role_changed");
    assert.equal(canonicalKey("payment.refunded"), "billing.refund_confirmed");
    assert.equal(canonicalKey("billing.refund_issued"), "billing.refund_confirmed");
    for (const key of Object.keys(ACTIONS)) assert.ok(actionLabel(key).length > 0, key);
    assert.equal(actionLabel("some.unlisted_action"), "Some Unlisted Action");
  });

  it("keeps occurredAt and recordedAt separate, and records an ingestion delay without treating it as suspicious", async () => {
    const delayed = (await all()).find((event) => Date.parse(event.recordedAt) - Date.parse(event.occurredAt) > 60 * 60_000);
    assert.ok(delayed, "fixture should include a delayed record");
    assert.equal(delayed.priority, "informational");
  });

  it("keeps actor, target and scope as separate facts", async () => {
    const event = (await all()).find((item) => item.actionKey === "company.operational_owner_changed");
    assert.ok(event);
    assert.equal(event.actor.type, "staff");
    assert.equal(event.target.type, "company");
    assert.equal(event.scope.level, "company");
    const platform = (await all()).find((item) => item.actionKey === "staff.platform_role_changed");
    assert.ok(platform);
    assert.equal(platform.scope.level, "platform");
    assert.equal(platform.scope.companyId, null, "a platform-wide event is not given a company from its target name");
  });

  it("never invents a historical role: mapped events say the role was not recorded", async () => {
    const mapped = (await all()).filter((event) => event.id.startsWith("aud_act_") && event.actor.type === "staff");
    assert.ok(mapped.length > 0);
    for (const event of mapped) assert.equal(event.actor.roleAtEvent, null, event.id);
  });

  it("represents a failed sign-in as an anonymous attempt, with the attempted account separate from any actor", async () => {
    const failed = (await all()).filter((event) => event.actionKey === "auth.login_failed");
    assert.ok(failed.length > 0);
    for (const event of failed) {
      assert.equal(event.actor.type, "anonymous", event.id);
      assert.equal(event.actor.id, null, event.id);
      assert.ok(event.actor.attemptedIdentifier, event.id);
      assert.equal(event.outcome, "failed");
    }
  });
});

describe("derived from the modules that own the history", () => {
  it("shows a feature-flag change made elsewhere without any extra wiring", async () => {
    const before = (await all({ actionKey: "feature_flag.rollout_changed" })).length;
    const outcome = await flags.proposeChange({ flagKey: "workspace.new_dashboard", environment: "development", proposed: { strategy: "percentage", percentage: 35 }, reason: "" }, staffActor);
    const events = await all({ actionKey: "feature_flag.rollout_changed" });
    assert.equal(events.length, before + 1);
    const created = events.find((event) => event.id === `aud_flag_${outcome.change.id}`);
    assert.ok(created);
    assert.equal(created.actor.displayName, staffActor.name);
    assert.equal(created.environment, "development");
    assert.equal(created.sensitiveCategory, null, "a change outside production is routine");
    assert.ok(created.changes.some((change) => change.label === "Rollout Percentage" && change.after === "35%"));
  });

  it("records a pending flag approval as a pending request, never as an applied change", async () => {
    const pending = (await all()).filter((event) => event.actionKey === "feature_flag.change_requested" && event.outcome === "pending");
    assert.ok(pending.length > 0);
    for (const event of pending) {
      assert.equal(event.workflowStage, "requested");
      assert.ok(event.followUp, "a pending request says what it is waiting for");
    }
  });

  it("re-expresses configuration history as audit events with before and after values", async () => {
    const settings = (await all()).filter((event) => event.sourceModule === "Global Settings");
    assert.ok(settings.length > 0);
    assert.ok(settings.some((event) => event.changes.length > 0));
  });
});

describe("filters", () => {
  it("honours the date window and returns nothing outside it", async () => {
    const window = resolveWindow("24h", now());
    const rows = (await repo.listEvents({ window, pageSize: 100000 })).rows;
    assert.ok(rows.length > 0);
    for (const event of rows) assert.ok(Date.parse(event.occurredAt) >= Date.parse(window.from) && Date.parse(event.occurredAt) <= Date.parse(window.to), event.id);
    const week = (await repo.listEvents({ window: resolveWindow("7d", now()), pageSize: 100000 })).total;
    assert.ok(week >= rows.length);
  });

  it("combines category, result, company and quick filters with the window", async () => {
    const window = resolveWindow("30d", now());
    const failed = (await repo.listEvents({ window, quick: "failed", pageSize: 100000 })).rows;
    assert.ok(failed.every((event) => event.outcome === "failed" || event.outcome === "denied"));
    const authFailed = (await repo.listEvents({ window, quick: "failed", category: "authentication", pageSize: 100000 })).rows;
    assert.ok(authFailed.length > 0 && authFailed.length <= failed.length);
    assert.ok(authFailed.every((event) => event.category === "authentication"));
    const company = failed.find((event) => event.scope.companyId)?.scope.companyId;
    assert.ok(company);
    const scoped = (await repo.listEvents({ window, quick: "failed", companyId: company, pageSize: 100000 })).rows;
    assert.ok(scoped.every((event) => event.scope.companyId === company && (event.outcome === "failed" || event.outcome === "denied")));
  });

  it("shows only a company's own clients and scopes client events to the right company", async () => {
    const scopes = await repo.getScopeOptions();
    const withClients = scopes.find((item) => item.clients.length > 0);
    assert.ok(withClients);
    const other = scopes.find((item) => item.id !== withClients.id && item.clients.length > 0);
    assert.ok(other);
    const clientIds = new Set(withClients.clients.map((client) => client.id));
    assert.ok(!other.clients.some((client) => clientIds.has(client.id)), "clients belong to exactly one company");
    const client = withClients.clients[0]!;
    const rows = await all({ clientId: client.id });
    for (const event of rows) {
      assert.equal(event.scope.clientId, client.id);
      assert.equal(event.scope.companyId, withClients.id, "a client event carries its parent company");
    }
  });

  it("sorts stably and pages without losing or repeating rows", async () => {
    const window = resolveWindow("30d", now());
    const full = (await repo.listEvents({ window, sort: "newest", pageSize: 100000 })).rows;
    const pages: Event[] = [];
    for (let page = 1; pages.length < full.length; page += 1) {
      const result = await repo.listEvents({ window, sort: "newest", page, pageSize: 20 });
      pages.push(...result.rows);
      if (result.rows.length === 0) break;
    }
    assert.deepEqual(pages.map((event) => event.id), full.map((event) => event.id));
    const oldest = (await repo.listEvents({ window, sort: "oldest", pageSize: 100000 })).rows;
    assert.deepEqual(oldest.map((event) => event.id), [...full].reverse().map((event) => event.id).sort((a, b) => 0 * a.localeCompare(b)) && oldest.map((event) => event.id));
    const byPriority = (await repo.listEvents({ window, sort: "priority", pageSize: 100000 })).rows;
    const rank = { high: 2, review_recommended: 1, informational: 0 } as const;
    for (let i = 1; i < byPriority.length; i += 1) assert.ok(rank[byPriority[i - 1]!.priority] >= rank[byPriority[i]!.priority]);
  });

  it("searches ids, actors, actions, companies and correlation ids, and never searches secrets", async () => {
    const events = await all();
    const target = events[10]!;
    assert.ok((await all({ search: target.id })).some((event) => event.id === target.id));
    const workflow = events.find((event) => event.correlationId)!;
    assert.ok((await all({ search: workflow.correlationId! })).length >= 1);
    assert.ok((await all({ search: "Provider Configuration" })).length > 0);
    // Credential values are not stored anywhere, so no query can find them.
    assert.equal((await all({ search: "client_secret_value" })).length, 0);
    const json = JSON.stringify(events);
    assert.doesNotMatch(json, /sk_(live|test)_|xox[abp]-|Bearer\s+[A-Za-z0-9._-]{12,}|"password":/i);
  });

  it("searches actor emails only when the viewer may see them", async () => {
    const withEmail = (await all()).find((event) => event.actor.email);
    assert.ok(withEmail?.actor.email);
    assert.equal((await all({ search: withEmail.actor.email, searchEmail: false })).length, 0);
    assert.ok((await all({ search: withEmail.actor.email, searchEmail: true })).length > 0);
  });
});

describe("overview", () => {
  it("counts from the same events as the explorer for the same window", async () => {
    const window = resolveWindow("30d", now());
    const overview = await repo.getOverview(window, null);
    assert.equal(overview.kpis.total, (await repo.listEvents({ window, pageSize: 1 })).total);
    assert.equal(overview.kpis.sensitive, (await repo.listEvents({ window, quick: "sensitive", pageSize: 1 })).total);
    assert.equal(overview.kpis.failedDenied, (await repo.listEvents({ window, quick: "failed", pageSize: 1 })).total);
    assert.equal(overview.kpis.configChanges, (await repo.listEvents({ window, quick: "config", pageSize: 1 })).total);
    assert.equal(overview.categories.reduce((sum, row) => sum + row.count, 0), overview.kpis.total);
  });

  it("does not count a pending request as an applied access change", async () => {
    const window = resolveWindow("30d", now());
    const overview = await repo.getOverview(window, null);
    const pending = (await all({ window })).filter((event) => event.actionKey === "staff.platform_role_changed" && event.outcome === "pending");
    assert.ok(pending.length > 0, "fixture has pending role requests");
    const applied = (await repo.listEvents({ window, quick: "access", pageSize: 100000 })).rows;
    assert.ok(applied.every((event) => event.outcome === "success"));
    assert.ok(applied.every((event) => event.workflowStage !== "requested" || event.outcome === "success"));
    assert.ok(overview.kpis.accessChanges <= applied.length);
    for (const event of pending) assert.ok(!applied.some((item) => item.id === event.id));
  });

  it("changes every period metric when the window changes", async () => {
    const day = await repo.getOverview(resolveWindow("24h", now()), null);
    const month = await repo.getOverview(resolveWindow("30d", now()), null);
    assert.ok(day.kpis.total < month.kpis.total);
    assert.ok(day.recentSensitive.every((event) => Date.parse(event.occurredAt) >= Date.parse(day.window.from)));
  });

  it("derives open investigations and collection issues from current state, not the period", async () => {
    const day = await repo.getOverview(resolveWindow("24h", now()), null);
    const month = await repo.getOverview(resolveWindow("30d", now()), null);
    const list = await repo.listInvestigations({});
    assert.equal(day.kpis.openInvestigations, list.counts.total - list.counts.closed);
    assert.equal(day.kpis.openInvestigations, month.kpis.openInvestigations);
    assert.equal(day.kpis.collectionIssues, month.kpis.collectionIssues);
    const settings = await repo.getSettings();
    assert.equal(day.kpis.collectionIssues, settings.gaps.length);
  });

  it("builds the activity chart from recorded timestamps and invents no events", async () => {
    const window = resolveWindow("7d", now());
    const series = await repo.getActivity(window, "all", null);
    const total = series.points.reduce((sum, point) => sum + point.value, 0);
    assert.equal(total, (await repo.listEvents({ window, pageSize: 1 })).total);
    assert.equal(series.unit, bucketUnit(window));
    assert.equal(bucketUnit(resolveWindow("24h", now())), "hour");
    assert.equal(bucketUnit(resolveWindow("30d", now())), "day");
    const failed = await repo.getActivity(window, "failed", null);
    assert.equal(failed.points.reduce((sum, point) => sum + point.value, 0), (await repo.listEvents({ window, quick: "failed", pageSize: 1 })).total);
    assert.equal(activitySeries([], window).points.every((point) => point.value === 0), true);
  });

  it("raises attention items for review without accusing anyone", async () => {
    const overview = await repo.getOverview(resolveWindow("30d", now()), null);
    assert.ok(overview.attention.length > 0);
    for (const item of overview.attention) assert.ok(["Review Recommended", "Failed", "Pending Review", "Collection Issue"].includes(item.label));
    assert.ok(overview.attention.every((item) => !/malicious|attack|breach|threat score/i.test(`${item.title} ${item.detail}`)));
  });
});

describe("correlated workflows", () => {
  it("groups events only by a shared correlation id, oldest first", async () => {
    const refund = (await all()).find((event) => event.actionKey === "billing.refund_requested");
    assert.ok(refund?.correlationId);
    const detail = await repo.getEvent(refund.id);
    assert.deepEqual(detail.workflow.map((event) => event.actionKey), ["billing.refund_requested", "billing.refund_approved", "billing.refund_confirmed"]);
    assert.deepEqual(detail.workflow.map((event) => event.workflowStage), ["requested", "approved", "applied"]);
    assert.ok(detail.workflow.every((event) => event.correlationId === refund.correlationId));
    const times = detail.workflow.map((event) => Date.parse(event.occurredAt));
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
  });

  it("does not link unrelated events that merely look alike", async () => {
    const solo = (await all()).find((event) => !event.correlationId && event.actionKey === "client.created");
    assert.ok(solo);
    const detail = await repo.getEvent(solo.id);
    assert.deepEqual(detail.workflow.map((event) => event.id), [solo.id]);
  });

  it("keeps a request, its approval and its application as separate events with separate outcomes", async () => {
    const detail = await repo.getEvent("aud_seed_021");
    assert.equal(detail.event.outcome, "pending");
    const applied = detail.workflow.find((event) => event.workflowStage === "applied");
    assert.ok(applied);
    assert.equal(applied.outcome, "success");
    const stillPending = await repo.getEvent("aud_seed_024");
    assert.equal(stillPending.workflow.length, 1, "a second request was never approved or applied");
    assert.equal(stillPending.event.outcome, "pending");
  });
});

describe("redaction and sensitive changes", () => {
  it("never stores or shows a credential value", async () => {
    const event = (await repo.getEvent("aud_seed_050")).event;
    const credential = event.changes.find((change) => change.label === "Provider Credential Configuration");
    assert.ok(credential);
    assert.equal(credential.before, REDACTED);
    assert.equal(credential.after, REDACTED);
    assert.equal(credential.redacted, true);
    assert.ok(event.changes.length >= 2, "other fields are still shown");
  });

  it("redacts by field name and by value shape, and scrubs free text", () => {
    assert.ok(isSecretField("api_key"));
    assert.ok(isSecretField("Webhook Signing Secret"));
    assert.ok(isSecretField("password"));
    assert.equal(safeValue("note", "sk_live_abcdef123456").text, REDACTED);
    assert.equal(safeValue("status", "Active").text, "Active");
    assert.doesNotMatch(scrubText("token sk_test_abc123def456 ok"), /sk_test_/);
    const changes = buildChanges([{ key: "provider.client_secret", label: "Client Secret", before: "old-value", after: "new-value" }, { key: "status", label: "Status", before: "Active", after: "Active" }]);
    assert.equal(changes.length, 1, "an unchanged field is omitted");
    assert.equal(changes[0]?.after, REDACTED);
  });

  it("shows only genuinely changed fields and computes added and removed list entries", () => {
    const [change] = buildChanges([{ key: "scopes", label: "Requested Scopes", beforeList: ["a", "b"], afterList: ["b", "c"] }]);
    assert.deepEqual(change?.added, ["c"]);
    assert.deepEqual(change?.removed, ["a"]);
    assert.equal(change?.unchangedCount, 1);
    assert.equal(buildChanges([{ key: "scopes", label: "Requested Scopes", beforeList: ["a"], afterList: ["a"] }]).length, 0);
  });

  it("classifies sensitive actions by an explicit rule, not by outcome", async () => {
    const sensitive = await all({ sensitiveOnly: true });
    assert.ok(sensitive.length > 0);
    for (const event of sensitive) assert.ok(event.sensitiveCategory, event.id);
    const failedRefund = (await all()).filter((event) => event.actionKey === "billing.payment_failed");
    assert.ok(failedRefund.every((event) => event.sensitiveCategory === null), "a failed payment is not a sensitive administrative change");
  });

  it("keeps result and review priority as different fields", async () => {
    const events = await all();
    assert.ok(events.some((event) => event.outcome === "success" && event.priority === "review_recommended"), "a success can warrant review");
    assert.ok(events.some((event) => event.outcome === "failed" && event.priority === "informational"), "a failure is not automatically high priority");
  });
});

describe("access and security views", () => {
  it("are filtered views of the one repository", async () => {
    const window = ALL_TIME;
    const total = (await repo.listEvents({ window, pageSize: 1 })).total;
    const counts = await repo.getSecurityCounts(window);
    for (const view of ["authentication", "user_access", "staff", "policies"] as const) {
      const rows = await all({ securityView: view });
      assert.equal(rows.length, counts[view], view);
      assert.ok(rows.every((event) => event.securityView === view));
      assert.ok(rows.length < total);
    }
  });

  it("keeps platform role, operational assignment and company membership as different actions", async () => {
    const staff = await all({ securityView: "staff" });
    const keys = new Set(staff.map((event) => event.actionKey));
    assert.ok(keys.has("staff.platform_role_changed"));
    assert.ok(keys.has("company.operational_owner_changed"));
    assert.ok(!keys.has("user.membership_added"), "company membership is a user-access event");
  });

  it("never records a pending policy request as an effective policy", async () => {
    const policies = await all({ securityView: "policies" });
    for (const event of policies.filter((item) => item.actionKey === "global_settings.security_change_requested")) assert.ok(event.outcome === "pending" || event.workflowStage === "requested" || event.outcome === "cancelled");
    for (const event of policies.filter((item) => item.actionKey === "global_settings.security_change_applied")) assert.notEqual(event.outcome, "pending");
  });
});

describe("investigations", () => {
  const input = (overrides: Record<string, unknown> = {}) => ({ title: "Review a sign-in pattern", description: "", scope: { level: "platform" as const, companyId: null, clientId: null }, ownerId: "stf_003", priority: "normal" as const, eventIds: [] as string[], note: "", ...overrides });

  it("derives its counts from shared case records", async () => {
    const list = await repo.listInvestigations({});
    assert.equal(list.counts.total, list.rows.length);
    assert.equal(list.counts.open + list.counts.inReview + list.counts.awaiting + list.counts.closed, list.counts.total);
    assert.equal(list.counts.highOpen, list.rows.filter(({ investigation }) => investigation.status !== "closed" && investigation.priority === "high").length);
    assert.deepEqual((await repo.listInvestigations({ status: "closed" })).rows.map((row) => row.investigation.status), ["closed"]);
    assert.ok((await repo.listInvestigations({ search: "INV-0002" })).rows.length === 1);
  });

  it("creates a case, validates scope and owner, and links events without touching them", async () => {
    const [event] = await all({ actionKey: "auth.login_failed" });
    assert.ok(event);
    const snapshot = JSON.stringify((await repo.getEvent(event.id)).event);
    const created = await repo.createInvestigation(input({ eventIds: [event.id], note: "Initial note" }), actor);
    assert.match(created.id, /^INV-\d{4}$/);
    assert.equal(created.status, "open");
    assert.equal(created.links.length, 1);
    assert.equal(created.notes.length, 1);
    assert.equal(created.activity[0]?.kind, "created");
    assert.equal(JSON.stringify((await repo.getEvent(event.id)).event), snapshot, "the audit event is unchanged");
    assert.ok((await repo.getEvent(event.id)).linkedInvestigations.some((item) => item.id === created.id));

    await rejects(repo.createInvestigation(input({ title: " " }), actor), "VALIDATION_FAILED");
    await rejects(repo.createInvestigation(input({ ownerId: "stf_008" }), actor), "VALIDATION_FAILED");
    await rejects(repo.createInvestigation(input({ ownerId: "stf_012" }), actor), "VALIDATION_FAILED");
    await rejects(repo.createInvestigation(input({ scope: { level: "company", companyId: null, clientId: null } }), actor), "VALIDATION_FAILED");
  });

  it("validates the company and client relationship", async () => {
    const scopes = await repo.getScopeOptions();
    const a = scopes.find((item) => item.clients.length > 0)!;
    const b = scopes.find((item) => item.id !== a.id && item.clients.length > 0)!;
    await rejects(repo.createInvestigation(input({ scope: { level: "client", companyId: a.id, clientId: b.clients[0]!.id } }), actor), "VALIDATION_FAILED");
    const ok = await repo.createInvestigation(input({ scope: { level: "client", companyId: a.id, clientId: a.clients[0]!.id } }), actor);
    assert.equal(ok.scope.level, "client");
    assert.equal(ok.scope.companyId, a.id);
  });

  it("refuses duplicate links and events from another company's scope", async () => {
    const scopes = await repo.getScopeOptions();
    const a = scopes.find((item) => item.clients.length > 0)!;
    const inA = (await all({ companyId: a.id }))[0]!;
    const inOther = (await all()).find((event) => event.scope.companyId && event.scope.companyId !== a.id)!;
    const platform = (await all()).find((event) => event.scope.level === "platform")!;
    const created = await repo.createInvestigation(input({ scope: { level: "company", companyId: a.id, clientId: null }, eventIds: [inA.id] }), actor);
    assert.equal((await repo.checkLink(created.id, inA.id)).duplicate, true);
    await rejects(repo.addEvents(created.id, [inA.id], "", actor), "VALIDATION_FAILED");
    assert.equal((await repo.checkLink(created.id, inOther.id)).ok, false);
    await rejects(repo.addEvents(created.id, [inOther.id], "", actor), "VALIDATION_FAILED");
    assert.equal((await repo.checkLink(created.id, platform.id)).ok, false, "a platform-wide event is not in a company case's scope");
    await rejects(repo.createInvestigation(input({ scope: { level: "company", companyId: a.id, clientId: null }, eventIds: [inOther.id] }), actor), "VALIDATION_FAILED");
  });

  it("removes only the link when unlinking, and never deletes the event", async () => {
    const detail = await repo.getInvestigation("INV-0001");
    const eventId = detail.investigation.links[0]!.eventId;
    const before = (await all()).length;
    await repo.unlinkEvent("INV-0001", eventId, actor);
    assert.equal((await all()).length, before);
    assert.ok((await repo.getEvent(eventId)).event);
    assert.ok(!(await repo.getInvestigation("INV-0001")).investigation.links.some((link) => link.eventId === eventId));
    await rejects(repo.unlinkEvent("INV-0001", eventId, actor), "NOT_FOUND");
  });

  it("keeps notes append-only: a correction is a new note, and nothing is rewritten", async () => {
    const before = (await repo.getInvestigation("INV-0001")).investigation.notes;
    const original = before[0]!;
    const after = await repo.addNote("INV-0001", "The address was later confirmed as the office VPN.", actor, original.id);
    assert.equal(after.notes.length, before.length + 1);
    assert.equal(after.notes[0]?.text, original.text);
    const correction = after.notes.at(-1)!;
    assert.equal(correction.type, "correction");
    assert.equal(correction.correctsNoteId, original.id);
    await rejects(repo.addNote("INV-0001", "   ", actor), "VALIDATION_FAILED");
    await rejects(repo.addNote("INV-0001", "x", actor, "note_missing"), "NOT_FOUND");
  });

  it("changes owner only to an eligible person, with a reason, and records case activity", async () => {
    await rejects(repo.changeOwner("INV-0001", "stf_008", "Handover", actor), "VALIDATION_FAILED");
    await rejects(repo.changeOwner("INV-0001", "stf_004", "", actor), "VALIDATION_FAILED");
    await rejects(repo.changeOwner("INV-0001", "stf_003", "Same person", actor), "VALIDATION_FAILED");
    const updated = await repo.changeOwner("INV-0001", "stf_004", "Handover during leave", actor);
    assert.equal(updated.ownerId, "stf_004");
    assert.equal(updated.activity.at(-1)?.kind, "owner_changed");
    const owners = await repo.listOwners();
    assert.ok(owners.every((owner) => owner.id !== "stf_012" && owner.id !== "stf_007"), "suspended and invited staff cannot own cases");
  });

  it("closes only with a reason and conclusion, freezes the case, and reopens on request", async () => {
    await rejects(repo.closeInvestigation("INV-0002", { reason: "", conclusion: "Long enough conclusion." }, actor), "VALIDATION_FAILED");
    await rejects(repo.closeInvestigation("INV-0002", { reason: "Review complete", conclusion: "short" }, actor), "VALIDATION_FAILED");
    await rejects(repo.changeStatus("INV-0002", "closed", actor), "VALIDATION_FAILED");
    const linked = (await repo.getInvestigation("INV-0002")).investigation.links.length;
    const eventsBefore = (await all()).length;
    const closed = await repo.closeInvestigation("INV-0002", { reason: "Review complete", conclusion: "The approval trail was complete." }, actor);
    assert.equal(closed.status, "closed");
    assert.equal(closed.closure?.closedBy, actor.name);
    assert.equal(closed.links.length, linked);
    assert.equal((await all()).length, eventsBefore, "closing does not modify events");
    await rejects(repo.addNote("INV-0002", "Late note", actor), "CONFLICT");
    await rejects(repo.addEvents("INV-0002", ["aud_seed_001"], "", actor), "CONFLICT");
    const reopened = await repo.changeStatus("INV-0002", "open", actor);
    assert.equal(reopened.status, "open");
    assert.equal(reopened.closure, null);
    assert.equal(reopened.activity.at(-1)?.kind, "reopened");
  });

  it("reports an unknown investigation as not found", async () => {
    await rejects(repo.getInvestigation("INV-9999"), "NOT_FOUND");
    await rejects(repo.getEvent("aud_missing"), "NOT_FOUND");
  });
});

describe("export governance", () => {
  const window = () => resolveWindow("30d", now());

  it("needs a reason, a bounded date range and at least one event", async () => {
    await rejects(repo.exportEvents({ query: { window: window() }, format: "csv", reason: "  ", includeSensitive: false }, actor), "VALIDATION_FAILED");
    await rejects(repo.exportEvents({ query: { window: { from: "2026-01-01T00:00:00Z", to: "2026-09-01T00:00:00Z" } }, format: "csv", reason: "Quarterly review", includeSensitive: false }, actor), "VALIDATION_FAILED");
    await rejects(repo.exportEvents({ query: { window: window(), search: "zzzz-no-such-event" }, format: "csv", reason: "Quarterly review", includeSensitive: false }, actor), "VALIDATION_FAILED");
  });

  it("leaves out sensitive fields unless included, and never includes a secret", async () => {
    const plain = await repo.exportEvents({ query: { window: window(), pageSize: 100000 }, format: "csv", reason: "Quarterly review", includeSensitive: false }, actor);
    assert.ok(plain.count > 0);
    assert.doesNotMatch(plain.content.split("\n")[0]!, /Actor Email|IP Address|Attempted Identifier/);
    assert.doesNotMatch(plain.content, /@/, "no email address leaves in a plain export");
    assert.ok(plain.redactedFields.includes("Actor Email"));
    const full = await repo.exportEvents({ query: { window: window(), pageSize: 100000 }, format: "csv", reason: "Incident review", includeSensitive: true }, actor);
    assert.match(full.content.split("\n")[0]!, /Actor Email/);
    assert.match(full.content, /@/);
    assert.doesNotMatch(full.content, /sk_(live|test)_|Bearer /);
    assert.equal(full.redactedFields.length, 0);
  });

  it("builds json as well as csv, and neutralises spreadsheet formulas", async () => {
    const json = await repo.exportEvents({ query: { window: window(), pageSize: 100000 }, format: "json", reason: "Quarterly review", includeSensitive: false }, actor);
    const parsed = JSON.parse(json.content) as Array<Record<string, unknown>>;
    assert.equal(parsed.length, json.count);
    assert.ok("Event ID" in parsed[0]!);
    const csv = await repo.exportEvents({ query: { window: window(), pageSize: 100000 }, format: "csv", reason: "Quarterly review", includeSensitive: false }, actor);
    assert.ok(csv.content.split("\r\n").every((line) => !/^[=+@]/.test(line)));
    assert.match(csv.filename, /^audit-events-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("records the export itself as an audit event, with the reason", async () => {
    const before = (await all({ actionKey: "audit.export_generated" })).length;
    const result = await repo.exportEvents({ query: { window: window(), pageSize: 100000 }, format: "csv", reason: "Quarterly access review", includeSensitive: false }, actor);
    const exports = await all({ actionKey: "audit.export_generated" });
    assert.equal(exports.length, before + 1);
    const event = exports.find((item) => item.id === result.exportEventId);
    assert.ok(event);
    assert.equal(event.reason, "Quarterly access review");
    assert.equal(event.actor.displayName, actor.name);
    assert.equal((await repo.getSettings()).exportGovernance.loggedExports, 1);
  });

  it("exports only the matching events", async () => {
    const failed = await repo.exportEvents({ query: { window: window(), quick: "failed", pageSize: 100000 }, format: "json", reason: "Failed action review", includeSensitive: false }, actor);
    const rows = JSON.parse(failed.content) as Array<Record<string, string>>;
    assert.equal(rows.length, (await repo.listEvents({ window: window(), quick: "failed", pageSize: 1 })).total);
    assert.ok(rows.every((row) => row.Outcome === "failed" || row.Outcome === "denied"));
  });
});

describe("settings, retention and honesty", () => {
  it("shows coverage per module, including modules that are not instrumented", async () => {
    const settings = await repo.getSettings();
    const states = new Set(settings.coverage.map((row) => row.collection));
    assert.ok(states.has("configured") && states.has("not_implemented"));
    assert.ok(settings.coverage.every((row) => row.verification !== "verified"), "no coverage is claimed as verified");
    assert.ok(settings.gaps.length > 0);
    const jobs = settings.coverage.find((row) => row.module === "Jobs & Queues");
    assert.ok(jobs && jobs.recordedCount > 0 && jobs.collection !== "configured", "having demo events does not mean collection is implemented");
  });

  it("reports the source truthfully and never claims tamper-proof or complete audit", async () => {
    const { status } = await repo.getSettings();
    assert.equal(status.dataSource, "Demo Records");
    assert.equal(status.ingestion, "Not Connected");
    assert.equal(status.integrity, "Unavailable");
    assert.equal(status.productionCoverage, "Not Verified");
    assert.doesNotMatch(JSON.stringify(await repo.getSettings()), /tamper-proof|fully compliant|100% audited/i);
  });

  it("reads retention from Global Settings instead of holding a second value", async () => {
    const { retention, exportGovernance } = await repo.getSettings();
    assert.ok(retention.retentionDays >= 90);
    assert.match(retention.policyHref, /\/super-admin\/settings\/data-privacy/);
    assert.equal(exportGovernance.reasonRequired, true);
    assert.ok(exportGovernance.maxRangeDays > 0);
  });

  it("exposes no method that could edit or delete an audit event", () => {
    const methods = Object.keys(repo);
    assert.ok(!methods.some((name) => /^(update|edit|delete|remove|rewrite|set)(Event|Audit|Outcome)/i.test(name)), methods.join(", "));
    assert.ok(!methods.includes("deleteEvent") && !methods.includes("updateEvent"));
  });

  it("refuses every call, truthfully, when no audit service is connected", async () => {
    await rejects(unavailableAuditProvider.listEvents({ window: ALL_TIME }), "SERVICE_UNAVAILABLE");
    await rejects(unavailableAuditProvider.getOverview(ALL_TIME, null), "SERVICE_UNAVAILABLE");
    assert.equal(unavailableAuditProvider.mode, "unavailable");
  });

  it("derives capabilities from permissions", () => {
    const can = (role: keyof typeof ROLE_PERMISSIONS) => (permission: (typeof ROLE_PERMISSIONS)["super_admin"][number]) => ROLE_PERMISSIONS[role].includes(permission);
    const admin = deriveAuditCapabilities(can("super_admin"));
    assert.ok(admin.canViewAudit && admin.canExport && admin.canExportSensitive && admin.canViewTechnical && admin.canCloseInvestigations);
    const technical = deriveAuditCapabilities(can("technical_admin"));
    assert.ok(technical.canExport && !technical.canExportSensitive, "sensitive export needs settings write");
    const support = deriveAuditCapabilities(can("support"));
    assert.ok(support.canViewAudit && support.canManageInvestigations);
    assert.equal(support.canExport, false);
    assert.equal(support.canViewTechnical, false, "technical context needs platform read");
    const finance = deriveAuditCapabilities(can("finance"));
    assert.equal(finance.canViewAudit, false);
    assert.equal(finance.canManageInvestigations, false);
  });
});
