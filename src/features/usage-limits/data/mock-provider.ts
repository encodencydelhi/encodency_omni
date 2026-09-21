/**
 * Demo implementation of `UsageRepository`.
 *
 * It is a monitoring layer: usage, entitlements and overrides are read from the
 * company bundles and plan store that Companies and Plans & Subscriptions share,
 * and everything else is derived. The only things it writes are alert
 * acknowledgements and edited thresholds. Granting or revoking an override goes
 * through the Plans & Subscriptions repository, never through here, so there is
 * one override system. No quota is enforced, no charge is made, no worker runs.
 *
 * Only `repository.ts` imports this file.
 */
import { env } from "@/config/env";
import { nowIso, platformNow } from "@/features/companies/data/clock";
import { STAFF } from "@/features/companies/data/mock/dataset";
import { allBundles, findBundle } from "@/features/companies/data/mock/store";
import type { DerivationContext } from "@/features/companies/data/selectors";
import { commercialContext } from "@/features/plans-subscriptions/data/mock/plan-store";
import { ApiError } from "@/types/api";
import { RESOURCE_BY_KEY, RESOURCE_DEFINITIONS, getResource } from "./catalogue";
import type { AlertDetail, AlertsResult, OverridesResult, ResourceDetail, ResourceListItem, TrendResult, UsageRepository } from "./repository";
import { buildEvents, buildMeteringHealth, hash, meteringStatusFor } from "./mock/metering";
import { isSeeded, listAcknowledgements, listStoredActivity, markSeeded, nextSeq, recordAcknowledgement, recordThresholds, resetUsageState, thresholdsFor } from "./mock/store";
import {
  buildAttention,
  buildCompanySummaries,
  buildOverages,
  buildOverrideRows,
  buildUsageRows,
  capacityTrend,
  clientContributions,
  computeAlertCounts,
  computeOverrideCounts,
  computeOverview,
  deriveActiveAlerts,
  eventTrend,
  mergeAlertState,
  periodDays,
  queryAlerts,
  queryCompanyUsage,
  queryEvents,
  queryOverrides,
  topConsumers,
  sumEvents,
} from "./selectors";
import type { MutationActor, OverrideRow, ResourceKey, ThresholdPolicy, UsageActivity, UsageAlert, UsageRow } from "./types";

function wait(kind: "read" | "write"): Promise<void> {
  const base = kind === "read" ? env.mockLatencyMs * 0.6 : env.mockLatencyMs * 1.1;
  return new Promise((resolve) => setTimeout(resolve, Math.round(base)));
}

function fail(code: ConstructorParameters<typeof ApiError>[0]["code"], message: string, fieldErrors?: Record<string, string>): never {
  const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "CONFLICT" ? 409 : 422;
  throw new ApiError({ code, status, message, fieldErrors });
}

function context(): DerivationContext {
  return { now: platformNow(), staff: STAFF, ...commercialContext() };
}

/** Everything derived from the shared records at one instant. */
function world() {
  const ctx = context();
  const bundles = allBundles();
  const rows = buildUsageRows(bundles, { ctx, thresholds: thresholdsFor, metering: meteringStatusFor });
  const summaries = buildCompanySummaries(rows, bundles, ctx);
  const events = buildEvents(bundles, ctx.now);
  const health = buildMeteringHealth(bundles, ctx.now);
  return { ctx, bundles, rows, summaries, events, health, now: ctx.now };
}

function alertsFrom(state: ReturnType<typeof world>): UsageAlert[] {
  const active = deriveActiveAlerts(state.rows, thresholdsFor, state.now);
  // First read of a fresh demo: two open alerts already acknowledged, so the queue shows every status.
  if (!isSeeded()) {
    const open = active.filter((alert) => alert.type !== "metering").sort((a, b) => a.id.localeCompare(b.id));
    const picks = [open[1], open[4]].filter((alert): alert is UsageAlert => Boolean(alert));
    picks.forEach((alert, index) => {
      const at = new Date(state.now - (index === 0 ? 30 : 8) * 3_600_000).toISOString();
      recordAcknowledgement(
        { alertId: alert.id, by: STAFF[index + 1]?.name ?? "Platform staff", at, note: index === 0 ? "Reviewed with the account manager. Customer is planning a plan change." : "Watching until the next reset." },
        { id: `act_seed_${index}`, at, kind: "acknowledged", text: `Acknowledged: ${RESOURCE_BY_KEY[alert.resource].name} alert for ${alert.companyName}`, companyId: alert.companyId, companyName: alert.companyName, resource: alert.resource, actor: STAFF[index + 1]?.name ?? "Platform staff" },
        true,
      );
    });
    markSeeded();
  }
  return mergeAlertState(active, listAcknowledgements(), state.rows, state.now);
}

function buildActivity(state: ReturnType<typeof world>, alerts: UsageAlert[], overrides: OverrideRow[]): UsageActivity[] {
  const items: UsageActivity[] = [];
  const name = (resource: ResourceKey) => RESOURCE_BY_KEY[resource].name;
  for (const override of overrides) {
    const detail = override.rule === "additive" ? `+${override.amount.toLocaleString("en-IN")}` : `${override.amount.toLocaleString("en-IN")} (absolute)`;
    items.push({ id: `act_ovr_${override.id}_g`, at: override.raw.createdAt, kind: "override_granted", text: `Override granted: ${name(override.resource)} ${detail} for ${override.companyName}`, companyId: override.companyId, companyName: override.companyName, resource: override.resource, actor: override.approvedBy });
    if (override.status === "expired") items.push({ id: `act_ovr_${override.id}_e`, at: override.expiresAt, kind: "override_expired", text: `Override expired: ${name(override.resource)} for ${override.companyName}`, companyId: override.companyId, companyName: override.companyName, resource: override.resource, actor: null });
    if (override.revokedAt) items.push({ id: `act_ovr_${override.id}_r`, at: override.revokedAt, kind: "override_revoked", text: `Override revoked: ${name(override.resource)} for ${override.companyName}`, companyId: override.companyId, companyName: override.companyName, resource: override.resource, actor: null });
  }
  for (const alert of alerts.filter((item) => item.status !== "resolved" && item.type !== "metering" && item.type !== "override_expiring")) {
    items.push({ id: `act_thr_${alert.id}`, at: alert.firstTriggeredAt, kind: "threshold", text: `${alert.companyName} ${alert.type === "exceeded" ? "exceeded" : alert.type === "at_limit" ? "reached" : "reached the warning threshold on"} ${name(alert.resource)}${alert.type === "threshold" ? "" : " limit"}`, companyId: alert.companyId, companyName: alert.companyName, resource: alert.resource, actor: null });
  }
  for (const row of state.rows.filter((item) => item.resource === "apiRequests" && item.used !== null && item.previousUsed > 0 && item.used > item.previousUsed * 1.8)) {
    items.push({ id: `act_anm_${row.key}`, at: row.updatedAt, kind: "anomaly", text: `Usage anomaly detected: API requests for ${row.companyName} are ${(row.used! / row.previousUsed).toFixed(1)}x the previous period`, companyId: row.companyId, companyName: row.companyName, resource: row.resource, actor: null });
  }
  for (const bundle of state.bundles.filter((item) => hash(item.company.id) % 6 === 0).slice(0, 4)) {
    items.push({ id: `act_rst_${bundle.company.id}`, at: bundle.subscription.currentPeriodStart, kind: "quota_reset", text: `Quota reset recorded for ${bundle.company.name}: period counters restarted`, companyId: bundle.company.id, companyName: bundle.company.name, resource: null, actor: null });
  }
  for (let day = 0; day < 5; day += 1) {
    items.push({ id: `act_rec_${day}`, at: new Date(state.now - (day * 24 + 7) * 3_600_000).toISOString(), kind: "reconciliation", text: "Metering reconciliation completed", companyId: null, companyName: null, resource: null, actor: null });
  }
  return [...items, ...listStoredActivity()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 80);
}

function resourceItem(key: ResourceKey, state: ReturnType<typeof world>): ResourceListItem {
  const definition = RESOURCE_BY_KEY[key];
  const thresholds = thresholdsFor(key);
  const list = state.rows.filter((row) => row.resource === key);
  const count = (s: string) => list.filter((row) => row.resolved.state === s).length;
  return {
    definition,
    thresholds,
    edited: thresholds.warningPct !== definition.warningPct || thresholds.criticalPct !== definition.criticalPct,
    companies: { within: count("within"), near: count("near"), atLimit: count("at_limit"), exceeded: count("exceeded"), unknown: count("unknown") },
  };
}

function requireResource(key: string): ResourceKey {
  if (!getResource(key)) fail("NOT_FOUND", `Resource ${key} is not in the catalogue.`);
  return key as ResourceKey;
}

export const mockUsageProvider: UsageRepository = {
  mode: "mock",

  async getOverview(period) {
    await wait("read");
    const state = world();
    const overrides = buildOverrideRows(state.bundles, state.rows, state.now);
    const alerts = alertsFrom(state);
    const overview = computeOverview({ summaries: state.summaries, rows: state.rows, events: state.events, health: state.health, activeOverrides: overrides.filter((row) => row.status === "active").length, period, now: state.now });
    return { ...overview, attention: buildAttention(alerts) };
  },

  async getTrend(resource, period, scope = {}): Promise<TrendResult> {
    await wait("read");
    const state = world();
    const definition = RESOURCE_BY_KEY[resource];
    const empty = (unavailable: string): TrendResult => ({ points: null, unavailable, total: 0, peak: 0, previousTotal: null });
    if (definition.measurement === "metered_period") {
      const points = eventTrend(state.events, resource, period, state.now, scope);
      const days = periodDays(period);
      const total = points.reduce((sum, point) => sum + point.value, 0);
      const previousTotal = state.events
        .filter((event) => event.counted && event.resource === resource && (!scope.companyId || event.companyId === scope.companyId) && (!scope.clientId || event.clientId === scope.clientId))
        .filter((event) => {
          const at = Date.parse(event.occurredAt);
          return at > state.now - 2 * days * 86_400_000 && at <= state.now - days * 86_400_000;
        })
        .reduce((sum, event) => sum + event.quantity, 0);
      return { points, unavailable: null, total, peak: Math.max(0, ...points.map((point) => point.value)), previousTotal };
    }
    const bundle = scope.companyId ? findBundle(scope.companyId) : undefined;
    if (bundle) {
      const points = capacityTrend(bundle, resource, period, state.now);
      if (points) return { points, unavailable: null, total: points[points.length - 1]?.value ?? 0, peak: Math.max(0, ...points.map((point) => point.value)), previousTotal: null };
    }
    return empty(scope.companyId ? `${definition.name} history is not recorded at a point in time yet, so no trend is shown.` : `${definition.name} is a ${definition.measurement === "capacity_snapshot" ? "current snapshot" : "concurrent capacity"}, not a period total. Choose a metered resource for a trend.`);
  },

  async getTopConsumers(resource, sort) {
    await wait("read");
    return topConsumers(world().rows, resource, sort);
  },

  async listCompanyUsage(query) {
    await wait("read");
    const state = world();
    return queryCompanyUsage(state.rows, state.summaries, query);
  },

  async getCompanyUsage(companyId) {
    await wait("read");
    const state = world();
    const summary = state.summaries.find((item) => item.companyId === companyId);
    const bundle = state.bundles.find((item) => item.company.id === companyId);
    if (!summary || !bundle) fail("NOT_FOUND", `Company ${companyId} was not found.`);
    return {
      summary,
      companyName: bundle.company.name,
      contributions: clientContributions(bundle, state.events, state.rows),
      overrides: buildOverrideRows([bundle], state.rows, state.now),
    };
  },

  async listResources() {
    await wait("read");
    const state = world();
    return RESOURCE_DEFINITIONS.map((definition) => resourceItem(definition.key, state));
  },

  async getResource(key): Promise<ResourceDetail> {
    await wait("read");
    const resource = requireResource(key);
    const state = world();
    const alerts = alertsFrom(state);
    const overrides = buildOverrideRows(state.bundles, state.rows, state.now);
    const item = resourceItem(resource, state);
    return {
      ...item,
      planEntitlements: planEntitlementsFor(state.ctx, resource),
      activity: buildActivity(state, alerts, overrides).filter((entry) => entry.resource === resource).slice(0, 12),
    };
  },

  async updateResourcePolicy(key, thresholds, reason, actor) {
    await wait("write");
    const resource = requireResource(key);
    const errors: Record<string, string> = {};
    if (!Number.isInteger(thresholds.warningPct) || thresholds.warningPct < 50 || thresholds.warningPct > 99) errors.warningPct = "Use a whole number from 50 to 99.";
    if (!Number.isInteger(thresholds.criticalPct) || thresholds.criticalPct <= thresholds.warningPct || thresholds.criticalPct > 100) errors.criticalPct = "The critical threshold must be above the warning threshold and at most 100.";
    if (!reason.trim()) errors.reason = "Say why the thresholds are changing.";
    if (Object.keys(errors).length > 0) fail("VALIDATION_FAILED", "The thresholds could not be saved.", errors);
    const previous = thresholdsFor(resource);
    recordThresholds(resource, thresholds, {
      id: `act_pol_${nextSeq()}`,
      at: nowIso(),
      kind: "policy_changed",
      text: `Thresholds changed for ${RESOURCE_BY_KEY[resource].name}: warning ${previous.warningPct}% to ${thresholds.warningPct}%, critical ${previous.criticalPct}% to ${thresholds.criticalPct}%. Reason: ${reason.trim()}`,
      companyId: null,
      companyName: null,
      resource,
      actor: actor.name,
    });
    return mockUsageProvider.getResource(resource);
  },

  async listAlerts(query): Promise<AlertsResult> {
    await wait("read");
    const state = world();
    const all = alertsFrom(state);
    return {
      alerts: queryAlerts(all, query),
      all,
      counts: computeAlertCounts(all),
      overages: buildOverages(state.rows),
      facets: { companies: state.summaries.map((item) => ({ id: item.companyId, name: item.companyName, subscriptionId: item.subscriptionId })).sort((a, b) => a.name.localeCompare(b.name)) },
    };
  },

  async getAlert(id): Promise<AlertDetail> {
    await wait("read");
    const state = world();
    const alert = alertsFrom(state).find((item) => item.id === id);
    if (!alert) fail("NOT_FOUND", `Alert ${id} was not found.`);
    const overrides = buildOverrideRows(state.bundles, state.rows, state.now);
    return {
      alert,
      events: state.events.filter((event) => event.companyId === alert.companyId && event.resource === alert.resource).slice(0, 6),
      override: overrides.find((item) => item.id === alert.overrideId) ?? overrides.find((item) => item.companyId === alert.companyId && item.resource === alert.resource && item.status === "active") ?? null,
      activity: buildActivity(state, alertsFrom(state), overrides).filter((entry) => entry.companyId === alert.companyId && entry.resource === alert.resource).slice(0, 8),
    };
  },

  async acknowledgeAlert(id, note, actor) {
    await wait("write");
    const state = world();
    const alert = alertsFrom(state).find((item) => item.id === id);
    if (!alert) fail("NOT_FOUND", `Alert ${id} was not found.`);
    if (alert.status === "resolved") fail("CONFLICT", "This alert is already resolved.");
    if (alert.status === "acknowledged") fail("CONFLICT", "This alert is already acknowledged.");
    if (note.length > 300) fail("VALIDATION_FAILED", "The note is too long.", { note: "Keep the note under 300 characters." });
    const at = nowIso();
    recordAcknowledgement(
      { alertId: id, by: actor.name, at, note: note.trim() },
      { id: `act_ack_${nextSeq()}`, at, kind: "acknowledged", text: `Acknowledged: ${RESOURCE_BY_KEY[alert.resource].name} alert for ${alert.companyName}. The underlying usage is unchanged.`, companyId: alert.companyId, companyName: alert.companyName, resource: alert.resource, actor: actor.name },
    );
    const updated = alertsFrom(world()).find((item) => item.id === id);
    if (!updated) fail("NOT_FOUND", `Alert ${id} was not found.`);
    return updated;
  },

  async listOverrides(query): Promise<OverridesResult> {
    await wait("read");
    const state = world();
    const all = buildOverrideRows(state.bundles, state.rows, state.now);
    return {
      rows: queryOverrides(all, query),
      counts: computeOverrideCounts(all),
      facets: { companies: state.summaries.map((item) => ({ id: item.companyId, name: item.companyName, subscriptionId: item.subscriptionId })).sort((a, b) => a.name.localeCompare(b.name)), approvers: [...new Set(all.map((row) => row.approvedBy))].sort() },
    };
  },

  async getOverride(id) {
    await wait("read");
    const state = world();
    const found = buildOverrideRows(state.bundles, state.rows, state.now).find((item) => item.id === id);
    if (!found) fail("NOT_FOUND", `Override ${id} was not found.`);
    return found;
  },

  async getMetering() {
    await wait("read");
    const state = world();
    const alerts = alertsFrom(state);
    return { health: state.health, activity: buildActivity(state, alerts, buildOverrideRows(state.bundles, state.rows, state.now)) };
  },

  async listEvents(query) {
    await wait("read");
    const state = world();
    return queryEvents(state.events, query, state.now);
  },

  async getEvent(id) {
    await wait("read");
    const found = world().events.find((event) => event.id === id);
    if (!found) fail("NOT_FOUND", `Event ${id} was not found.`);
    return found;
  },

  async resetDemoData() {
    await wait("write");
    resetUsageState();
  },
};

function planEntitlementsFor(ctx: DerivationContext, resource: ResourceKey): Array<{ plan: string; limit: number | null }> {
  const metric = ({ users: "users", clients: "Clients", connectedAccounts: "channels", aiCredits: "aiCredits", automationRuns: "automationRuns", reports: "reports", apiRequests: "apiCalls", storage: "storageGb" } as Partial<Record<ResourceKey, keyof (typeof ctx.plans)[number]["limits"]>>)[resource];
  if (!metric) return [];
  return ctx.plans.map((plan) => ({ plan: plan.name, limit: plan.limits[metric] ?? null }));
}

/** Sums metered events in a window; exported for the overview and tests. */
export const meteredTotal = sumEvents;
export type { UsageRow, ThresholdPolicy, MutationActor };
