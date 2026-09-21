/**
 * Pure derivations for Usage & Limits. Every number on every screen comes from
 * here, computed from the same company bundles, the same effective limits and
 * the same utilisation resolver - so the overview, the directory, the alerts and
 * the company page cannot disagree. Nothing reads a clock or a store: callers pass
 * `now` and the policy in.
 */
import { computeUsage, planForSubscription, type DerivationContext } from "@/features/companies/data/selectors";
import type { CompanyBundle } from "@/features/companies/data/types";
import { activeOverrideAt, overrideValueFor } from "@/features/plans-subscriptions/data/entitlements";
import { ALERT_SEVERITY, OVERRIDE_EXPIRY_WARNING_DAYS, PERIODS } from "./config";
import { RESOURCE_BY_KEY, RESOURCE_DEFINITIONS, formatQuantity, isFlowResource } from "./catalogue";
import { STATE_SEVERITY, resolveResourceUtilization } from "./resolver";
import type {
  Acknowledgement,
  AlertQuery,
  AlertSeverity,
  AlertType,
  AttentionItem,
  ClientContribution,
  CompanyUsageQuery,
  CompanyUsageResult,
  CompanyUsageSummary,
  EventQuery,
  EventResult,
  MeteringHealth,
  MeteringStatus,
  UsageOverageRow,
  OverrideQuery,
  OverrideRow,
  OverrideStatus,
  OverviewData,
  OverviewKpis,
  Period,
  ResourceHealthRow,
  ResourceKey,
  ThresholdPolicy,
  TrendPoint,
  UsageAlert,
  UsageEvent,
  UsageRow,
  UtilizationState,
} from "./types";

const DAY_MS = 86_400_000;

const EMPTY_STATES = (): Record<UtilizationState, number> => ({ within: 0, near: 0, at_limit: 0, exceeded: 0, unlimited: 0, not_entitled: 0, unknown: 0, monitored: 0 });

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

export interface RowInputs {
  ctx: DerivationContext;
  thresholds: (resource: ResourceKey) => ThresholdPolicy;
  metering: (bundle: CompanyBundle, resource: ResourceKey) => MeteringStatus;
}

export function buildUsageRows(bundles: readonly CompanyBundle[], inputs: RowInputs): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const bundle of bundles) {
    const usage = computeUsage(inputs.ctx, bundle);
    const plan = planForSubscription(inputs.ctx, bundle.subscription);
    for (const record of usage.records) {
      const definition = RESOURCE_BY_KEY[record.resource];
      const metering = inputs.metering(bundle, record.resource);
      const override = record.activeOverride;
      const rule = override?.rule === "additive" ? "additive" : "absolute";
      rows.push({
        key: `${bundle.company.id}:${record.resource}`,
        companyId: bundle.company.id,
        companyName: bundle.company.name,
        companyDisplayId: bundle.company.displayId,
        subscriptionId: bundle.subscription.id,
        subscriptionStatus: bundle.subscription.status,
        planName: plan.name,
        resource: record.resource,
        used: metering === "missing" ? null : record.used,
        lastKnownUsed: record.used,
        previousUsed: record.previousUsed,
        base: record.includedLimit,
        override: override
          ? { id: override.id, rule, amount: rule === "additive" ? (override.delta ?? 0) : override.overrideLimit, value: overrideValueFor(override, record.includedLimit), startsAt: override.startsAt, expiresAt: override.expiresAt, approvedBy: override.approvedBy, reason: override.reason }
          : null,
        effective: record.effectiveLimit,
        resolved: resolveResourceUtilization({
          definition,
          effectiveLimit: record.effectiveLimit,
          contractLimit: plan.tier === "enterprise" && record.effectiveLimit !== null && !override,
          used: record.used,
          thresholds: inputs.thresholds(record.resource),
          metering,
        }),
        metering,
        updatedAt: record.updatedAt,
        resetAt: definition.resetPolicy === "none" ? null : usage.periodEnd,
        periodStart: definition.resetPolicy === "none" ? null : usage.periodStart,
        periodEnd: definition.resetPolicy === "none" ? null : usage.periodEnd,
        afterExpiryLimit: record.includedLimit,
        hasActiveOverride: Boolean(override),
      });
    }
  }
  return rows;
}

const ATTENTION_ORDER: CompanyUsageSummary["attention"][] = ["exceeded", "at_limit", "near", "unknown", "within"];

export function buildCompanySummaries(rows: readonly UsageRow[], bundles: readonly CompanyBundle[], ctx: DerivationContext): CompanyUsageSummary[] {
  const byCompany = new Map<string, UsageRow[]>();
  for (const row of rows) byCompany.set(row.companyId, [...(byCompany.get(row.companyId) ?? []), row]);

  return bundles.map((bundle) => {
    const list = byCompany.get(bundle.company.id) ?? [];
    const states = EMPTY_STATES();
    for (const row of list) states[row.resolved.state] += 1;
    const attention = (ATTENTION_ORDER.find((state) => (state === "within" ? states.within > 0 || states.unlimited > 0 : states[state] > 0)) ?? "within") as CompanyUsageSummary["attention"];
    const ranked = [...list].filter((row) => row.resolved.state !== "not_entitled" && row.resolved.state !== "monitored").sort(compareByPressure);
    const first = list[0];
    return {
      companyId: bundle.company.id,
      companyName: bundle.company.name,
      companyDisplayId: bundle.company.displayId,
      subscriptionId: bundle.subscription.id,
      subscriptionStatus: bundle.subscription.status,
      planName: planForSubscription(ctx, bundle.subscription).name,
      billingCycle: bundle.subscription.billingCycle,
      rows: list,
      states,
      attention,
      highest: ranked[0] ?? first ?? null,
      activeOverrides: list.filter((row) => row.hasActiveOverride).length,
      updatedAt: list.map((row) => row.updatedAt).sort().pop() ?? bundle.company.lastActiveAt,
    };
  });
}

/** Worst state first, then by percentage. Missing percentages sort after known ones. */
export function compareByPressure(a: UsageRow, b: UsageRow): number {
  return STATE_SEVERITY[b.resolved.state] - STATE_SEVERITY[a.resolved.state] || (b.resolved.percent ?? -1) - (a.resolved.percent ?? -1) || a.companyName.localeCompare(b.companyName);
}

/* ------------------------------------------------------------------ */
/* Company usage directory                                             */
/* ------------------------------------------------------------------ */

function matchesQuick(row: UsageRow, quick: string | undefined): boolean {
  switch (quick) {
    case "near": return row.resolved.state === "near";
    case "at_limit": return row.resolved.state === "at_limit";
    case "exceeded": return row.resolved.state === "exceeded";
    case "overrides": return row.hasActiveOverride;
    case "missing": return row.resolved.state === "unknown";
    default: return true;
  }
}

const SORTS: Record<string, (a: UsageRow, b: UsageRow) => number> = {
  utilization: (a, b) => (b.resolved.percent ?? -1) - (a.resolved.percent ?? -1) || a.companyName.localeCompare(b.companyName),
  consumption: (a, b) => (b.used ?? -1) - (a.used ?? -1) || a.companyName.localeCompare(b.companyName),
  remaining: (a, b) => (a.resolved.remaining ?? Number.POSITIVE_INFINITY) - (b.resolved.remaining ?? Number.POSITIVE_INFINITY) || a.companyName.localeCompare(b.companyName),
  updated: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.companyName.localeCompare(b.companyName),
  name: (a, b) => a.companyName.localeCompare(b.companyName) || a.resource.localeCompare(b.resource),
};

export function queryCompanyUsage(rows: readonly UsageRow[], summaries: readonly CompanyUsageSummary[], query: CompanyUsageQuery): CompanyUsageResult {
  const search = query.search?.trim().toLowerCase();
  const baseMatch = (summary: CompanyUsageSummary) =>
    (!query.company || summary.companyId === query.company) &&
    (!query.plan || summary.planName === query.plan) &&
    (!query.subscription || summary.subscriptionStatus === query.subscription) &&
    (!search || `${summary.companyName} ${summary.companyDisplayId} ${summary.companyId} ${summary.planName}`.toLowerCase().includes(search));

  const scoped = summaries.filter(baseMatch);
  const scopedIds = new Set(scoped.map((summary) => summary.companyId));

  // Counts: each company once, in its worst state. Overrides Active overlaps by design.
  const counts = { companies: scoped.length, within: 0, near: 0, atLimit: 0, exceeded: 0, noData: 0, overrides: 0 };
  for (const summary of scoped) {
    if (summary.attention === "within") counts.within += 1;
    else if (summary.attention === "near") counts.near += 1;
    else if (summary.attention === "at_limit") counts.atLimit += 1;
    else if (summary.attention === "exceeded") counts.exceeded += 1;
    else counts.noData += 1;
    if (summary.activeOverrides > 0) counts.overrides += 1;
  }

  // With a resource selected, one row per company for that resource; otherwise each company's most pressed resource.
  let candidates: UsageRow[];
  if (query.resource) candidates = rows.filter((row) => scopedIds.has(row.companyId) && row.resource === query.resource);
  else if (query.expand) candidates = rows.filter((row) => scopedIds.has(row.companyId));
  else candidates = scoped.flatMap((summary) => (summary.highest ? [summary.highest] : []));

  const filtered = candidates
    .filter((row) => !query.state || row.resolved.state === query.state)
    .filter((row) => (query.override === "active" ? row.hasActiveOverride : query.override === "none" ? !row.hasActiveOverride : true))
    .filter((row) => matchesQuick(row, query.quick))
    .sort(SORTS[query.sort ?? "utilization"] ?? SORTS.utilization!);

  const pageSize = query.pageSize ?? 10;
  const page = Math.max(1, query.page ?? 1);
  return {
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
    counts,
    facets: {
      companies: summaries.map((summary) => ({ id: summary.companyId, name: summary.companyName, subscriptionId: summary.subscriptionId })).sort((a, b) => a.name.localeCompare(b.name)),
      plans: [...new Set(summaries.map((summary) => summary.planName))].sort(),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

const inWindow = (event: UsageEvent, now: number, days: number) => event.counted && Date.parse(event.occurredAt) >= now - days * DAY_MS && Date.parse(event.occurredAt) <= now;

export function periodDays(period: Period): number {
  return PERIODS.find((item) => item.value === period)?.days ?? 30;
}

export function sumEvents(events: readonly UsageEvent[], resource: ResourceKey, now: number, days: number): number {
  return events.filter((event) => event.resource === resource && inWindow(event, now, days)).reduce((total, event) => total + event.quantity, 0);
}

export function computeOverview(input: { summaries: readonly CompanyUsageSummary[]; rows: readonly UsageRow[]; events: readonly UsageEvent[]; health: MeteringHealth; activeOverrides: number; period: Period; now: number }): OverviewData {
  const { summaries, rows, events, health, period, now } = input;
  const days = periodDays(period);
  const distribution = EMPTY_STATES();
  for (const row of rows) distribution[row.resolved.state] += 1;

  const kpis: OverviewKpis = {
    // A company has valid usage data when at least one plan-controlled reading is known.
    meteredCompanies: summaries.filter((summary) => summary.rows.some((row) => row.resolved.state !== "unknown" && row.resolved.state !== "monitored")).length,
    totalCompanies: summaries.length,
    nearLimitCompanies: summaries.filter((summary) => summary.attention === "near" || summary.attention === "at_limit").length,
    exceededCompanies: summaries.filter((summary) => summary.attention === "exceeded").length,
    aiCredits: sumEvents(events, "aiCredits", now, days),
    automationRuns: sumEvents(events, "automationRuns", now, days),
    apiRequests: sumEvents(events, "apiRequests", now, days),
    activeOverrides: input.activeOverrides,
    meteringIssues: health.delayed + health.failed + health.missingWindows,
  };

  return { kpis, distribution, resourceHealth: computeResourceHealth(rows), updatedAt: new Date(now).toISOString() };
}

export function computeResourceHealth(rows: readonly UsageRow[]): ResourceHealthRow[] {
  return RESOURCE_DEFINITIONS.map((definition) => {
    const list = rows.filter((row) => row.resource === definition.key);
    const count = (state: UtilizationState) => list.filter((row) => row.resolved.state === state).length;
    return { resource: definition.key, within: count("within"), near: count("near"), atLimit: count("at_limit"), exceeded: count("exceeded"), unknown: count("unknown"), unlimited: count("unlimited"), notEntitled: count("not_entitled") };
  });
}

export function topConsumers(rows: readonly UsageRow[], resource: ResourceKey, sort: "consumption" | "utilization", limit = 12): UsageRow[] {
  return rows
    .filter((row) => row.resource === resource && row.used !== null)
    .sort((a, b) => (sort === "utilization" ? (b.resolved.percent ?? -1) - (a.resolved.percent ?? -1) : (b.used ?? 0) - (a.used ?? 0)) || a.companyName.localeCompare(b.companyName))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Trends                                                              */
/* ------------------------------------------------------------------ */

function bucketLabel(at: number): string {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Daily buckets up to 30 days, weekly beyond, oldest first. Only counted events contribute. */
export function eventTrend(events: readonly UsageEvent[], resource: ResourceKey, period: Period, now: number, filter?: { companyId?: string; clientId?: string }): TrendPoint[] {
  const days = periodDays(period);
  const step = days > 30 ? 7 : 1;
  const buckets = Math.ceil(days / step);
  const points: TrendPoint[] = [];
  for (let index = buckets - 1; index >= 0; index -= 1) {
    const end = now - index * step * DAY_MS;
    const start = end - step * DAY_MS;
    const value = events
      .filter((event) => event.counted && event.resource === resource && (!filter?.companyId || event.companyId === filter.companyId) && (!filter?.clientId || event.clientId === filter.clientId))
      .filter((event) => {
        const at = Date.parse(event.occurredAt);
        return at > start && at <= end;
      })
      .reduce((total, event) => total + event.quantity, 0);
    points.push({ at: new Date(end).toISOString(), label: bucketLabel(end), value });
  }
  return points;
}

/** Concurrent-capacity history from record creation dates: how many existed at each point. */
export function capacityTrend(bundle: CompanyBundle, resource: ResourceKey, period: Period, now: number): TrendPoint[] | null {
  const created: string[] | null = resource === "users" ? bundle.users.map((item) => item.createdAt) : resource === "clients" ? bundle.clients.map((item) => item.createdAt) : null;
  if (!created) return null;
  const days = periodDays(period);
  const step = days > 30 ? 7 : 1;
  const points: TrendPoint[] = [];
  for (let index = Math.ceil(days / step) - 1; index >= 0; index -= 1) {
    const end = now - index * step * DAY_MS;
    points.push({ at: new Date(end).toISOString(), label: bucketLabel(end), value: created.filter((at) => Date.parse(at) <= end).length });
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* Client contribution                                                 */
/* ------------------------------------------------------------------ */

const CLIENT_RESOURCES: ResourceKey[] = ["aiCredits", "automationRuns", "reports", "scheduledPosts"];

/**
 * Consumption by client for the resources that can be attributed. Seats are never
 * split by client (one user can reach several clients). Whatever events carry no
 * client is shown as company-level, so client figures never exceed the company total.
 */
export function clientContributions(bundle: CompanyBundle, events: readonly UsageEvent[], rows: readonly UsageRow[]): ClientContribution[] {
  const current = events.filter((event) => event.companyId === bundle.company.id && event.counted && event.aggregationPeriod === "Current billing period");
  const result: ClientContribution[] = bundle.clients.map((client) => {
    const values: ClientContribution["values"] = {};
    for (const resource of CLIENT_RESOURCES) {
      if (resource === "scheduledPosts") values.scheduledPosts = client.scheduledPosts;
      else values[resource] = current.filter((event) => event.resource === resource && event.clientId === client.id).reduce((total, event) => total + event.quantity, 0);
    }
    return { clientId: client.id, clientName: client.name, values };
  });
  const unallocated: ClientContribution["values"] = {};
  for (const resource of CLIENT_RESOURCES) {
    if (resource === "scheduledPosts") continue;
    const row = rows.find((item) => item.companyId === bundle.company.id && item.resource === resource);
    if (!row || row.used === null) continue;
    const attributed = result.reduce((total, item) => total + (item.values[resource] ?? 0), 0);
    unallocated[resource] = Math.max(0, row.used - attributed);
  }
  return [...result, { clientId: null, clientName: "Company-Level / Unallocated", values: unallocated }];
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export const alertId = (companyId: string, resource: ResourceKey, type: AlertType) => `alt__${companyId}__${resource}__${type}`;

export function parseAlertId(id: string): { companyId: string; resource: ResourceKey; type: AlertType } | null {
  const [, companyId, resource, type] = id.split("__");
  if (!companyId || !resource || !type || !(resource in RESOURCE_BY_KEY)) return null;
  return { companyId, resource: resource as ResourceKey, type: type as AlertType };
}

function alertFromRow(row: UsageRow, type: AlertType, severity: AlertSeverity, reason: string, threshold: number | null, now: number, overrideId: string | null = null): UsageAlert {
  const offset = (Number.parseInt(row.key.length.toString(), 10) % 5) * 3 + 2;
  const at = Date.parse(row.updatedAt);
  return {
    id: alertId(row.companyId, row.resource, type),
    type,
    severity,
    status: "open",
    companyId: row.companyId,
    companyName: row.companyName,
    subscriptionId: row.subscriptionId,
    resource: row.resource,
    used: row.used,
    limit: row.effective,
    percent: row.resolved.percent,
    threshold,
    firstTriggeredAt: new Date(Math.min(now, at) - offset * 3_600_000).toISOString(),
    lastObservedAt: new Date(Math.min(now, at)).toISOString(),
    reason,
    overrideId,
    acknowledgedBy: null,
    acknowledgedAt: null,
    acknowledgementNote: null,
    resolvedAt: null,
    resolvedReason: null,
  };
}

/** The alerts that exist right now, derived from the same rows the directory shows. */
export function deriveActiveAlerts(rows: readonly UsageRow[], thresholds: (resource: ResourceKey) => ThresholdPolicy, now: number): UsageAlert[] {
  const alerts: UsageAlert[] = [];
  for (const row of rows) {
    const def = RESOURCE_BY_KEY[row.resource];
    const policy = thresholds(row.resource);
    const state = row.resolved.state;
    const quantity = (value: number | null) => formatQuantity(value, row.resource);

    if (state === "near") {
      const critical = (row.resolved.percent ?? 0) >= policy.criticalPct;
      alerts.push(alertFromRow(row, "threshold", critical ? "critical" : "warning", `${def.name} is at ${row.resolved.percent}% of the effective limit (${quantity(row.used)} of ${quantity(row.effective)}), above the ${policy.warningPct}% warning threshold.`, policy.warningPct, now));
    } else if (state === "at_limit") {
      alerts.push(alertFromRow(row, "at_limit", "warning", `${def.name} is exactly at the effective limit of ${quantity(row.effective)}. ${def.overLimitBehavior}`, 100, now));
    } else if (state === "exceeded") {
      alerts.push(alertFromRow(row, "exceeded", "critical", `${def.name} is ${quantity(row.resolved.excess)} over the effective limit (${quantity(row.used)} of ${quantity(row.effective)}). An exceeded limit is an operational state; it is not automatically billable.`, 100, now));
    } else if (state === "unknown") {
      alerts.push(alertFromRow(row, "metering", "warning", `No usage reading is available for ${def.name}. The last known value was ${quantity(row.lastKnownUsed)}. It is not treated as healthy or as zero.`, null, now));
    }

    if (row.override && row.afterExpiryLimit !== null && row.used !== null && row.used > row.afterExpiryLimit) {
      const days = Math.ceil((Date.parse(row.override.expiresAt) - now) / DAY_MS);
      if (days <= OVERRIDE_EXPIRY_WARNING_DAYS) {
        alerts.push(alertFromRow(row, "override_expiring", days <= 3 ? "critical" : "warning", `An override on ${def.name} ends in ${days} day${days === 1 ? "" : "s"}. The limit then falls to ${quantity(row.afterExpiryLimit)}, and current usage of ${quantity(row.used)} would be above it.`, null, now, row.override.id));
      }
    }
  }
  return alerts;
}

/** Applies acknowledgements, and surfaces acknowledged alerts whose condition has cleared as resolved. */
export function mergeAlertState(active: readonly UsageAlert[], acks: readonly Acknowledgement[], rows: readonly UsageRow[], now: number): UsageAlert[] {
  const ackById = new Map(acks.map((ack) => [ack.alertId, ack]));
  const merged = active.map((alert) => {
    const ack = ackById.get(alert.id);
    return ack ? { ...alert, status: "acknowledged" as const, acknowledgedBy: ack.by, acknowledgedAt: ack.at, acknowledgementNote: ack.note || null } : alert;
  });
  const activeIds = new Set(active.map((alert) => alert.id));
  for (const ack of acks) {
    if (activeIds.has(ack.alertId)) continue;
    const parsed = parseAlertId(ack.alertId);
    const row = parsed ? rows.find((item) => item.companyId === parsed.companyId && item.resource === parsed.resource) : undefined;
    if (!parsed || !row) continue;
    merged.push({
      ...alertFromRow(row, parsed.type, "warning", `${RESOURCE_BY_KEY[row.resource].name} is no longer above the threshold: it is now ${ALERT_LABEL_STATE[row.resolved.state]}.`, null, now),
      status: "resolved",
      acknowledgedBy: ack.by,
      acknowledgedAt: ack.at,
      acknowledgementNote: ack.note || null,
      resolvedAt: new Date(now).toISOString(),
      resolvedReason: "The underlying condition cleared: usage reset, the entitlement increased or the reading was corrected.",
    });
  }
  return merged;
}

const ALERT_LABEL_STATE: Record<UtilizationState, string> = { within: "within its limit", near: "near its limit", at_limit: "at its limit", exceeded: "over its limit", unlimited: "unlimited", not_entitled: "not entitled", unknown: "without a reading", monitored: "monitored only" };

export function queryAlerts(alerts: readonly UsageAlert[], query: AlertQuery): UsageAlert[] {
  const search = query.search?.trim().toLowerCase();
  const list = alerts
    .filter((alert) => !query.severity || alert.severity === query.severity)
    .filter((alert) => !query.company || alert.companyId === query.company)
    .filter((alert) => !query.resource || alert.resource === query.resource)
    .filter((alert) => !query.type || alert.type === query.type)
    .filter((alert) => !query.status || alert.status === query.status)
    .filter((alert) => {
      switch (query.quick) {
        case "open": return alert.status === "open";
        case "critical": return alert.severity === "critical" && alert.status !== "resolved";
        case "exceeded": return alert.type === "exceeded" && alert.status !== "resolved";
        case "expiring": return alert.type === "override_expiring" && alert.status !== "resolved";
        case "metering": return alert.type === "metering" && alert.status !== "resolved";
        default: return true;
      }
    })
    .filter((alert) => !search || `${alert.companyName} ${alert.resource} ${RESOURCE_BY_KEY[alert.resource].name} ${alert.id}`.toLowerCase().includes(search));
  const sorters: Record<string, (a: UsageAlert, b: UsageAlert) => number> = {
    newest: (a, b) => Date.parse(b.firstTriggeredAt) - Date.parse(a.firstTriggeredAt),
    severity: (a, b) => ALERT_SEVERITY[b.severity].rank - ALERT_SEVERITY[a.severity].rank || Date.parse(b.firstTriggeredAt) - Date.parse(a.firstTriggeredAt),
    utilization: (a, b) => (b.percent ?? -1) - (a.percent ?? -1),
    company: (a, b) => a.companyName.localeCompare(b.companyName),
  };
  return [...list].sort(sorters[query.sort ?? "severity"] ?? sorters.severity!);
}

export function computeAlertCounts(alerts: readonly UsageAlert[]) {
  const live = alerts.filter((alert) => alert.status !== "resolved");
  return {
    open: alerts.filter((alert) => alert.status === "open").length,
    warning: live.filter((alert) => alert.severity === "warning").length,
    critical: live.filter((alert) => alert.severity === "critical").length,
    atLimit: live.filter((alert) => alert.type === "at_limit").length,
    exceeded: live.filter((alert) => alert.type === "exceeded").length,
    expiring: live.filter((alert) => alert.type === "override_expiring").length,
    metering: live.filter((alert) => alert.type === "metering").length,
  };
}

export function buildAttention(alerts: readonly UsageAlert[], limit = 8): AttentionItem[] {
  return queryAlerts(alerts.filter((alert) => alert.status === "open"), { sort: "severity" })
    .slice(0, limit)
    .map((alert) => ({ id: alert.id, severity: alert.severity, companyId: alert.companyId, companyName: alert.companyName, subscriptionId: alert.subscriptionId, resource: alert.resource, reason: alert.reason, detectedAt: alert.firstTriggeredAt, kind: alert.type, alertId: alert.id }));
}

/* ------------------------------------------------------------------ */
/* Overages (operational; no charges are invented)                     */
/* ------------------------------------------------------------------ */

export function buildOverages(rows: readonly UsageRow[]): UsageOverageRow[] {
  return rows
    .filter((row) => row.resolved.state === "exceeded" && row.effective !== null && row.used !== null)
    .map((row) => ({ key: row.key, companyId: row.companyId, companyName: row.companyName, subscriptionId: row.subscriptionId, resource: row.resource, included: row.effective as number, used: row.used as number, excess: row.resolved.excess, periodEnd: row.periodEnd }))
    .sort((a, b) => b.excess - a.excess);
}

/* ------------------------------------------------------------------ */
/* Overrides                                                           */
/* ------------------------------------------------------------------ */

export function overrideStatusAt(override: { startsAt: string; expiresAt: string; revokedAt?: string | null }, now: number): OverrideStatus {
  if (override.revokedAt) return "revoked";
  if (Date.parse(override.startsAt) > now) return "scheduled";
  return Date.parse(override.expiresAt) > now ? "active" : "expired";
}

export function buildOverrideRows(bundles: readonly CompanyBundle[], rows: readonly UsageRow[], now: number): OverrideRow[] {
  const result: OverrideRow[] = [];
  for (const bundle of bundles) {
    for (const override of bundle.overrides) {
      const row = rows.find((item) => item.companyId === bundle.company.id && item.resource === override.resource);
      const base = row?.base ?? override.baseLimit;
      const status = overrideStatusAt(override, now);
      const rule = override.rule === "additive" ? "additive" : "absolute";
      const value = overrideValueFor(override, base);
      const used = row?.used ?? null;
      const active = activeOverrideAt(bundle.overrides, override.resource, now, base);
      result.push({
        id: override.id,
        companyId: bundle.company.id,
        companyName: bundle.company.name,
        subscriptionId: bundle.subscription.id,
        resource: override.resource,
        rule,
        amount: rule === "additive" ? (override.delta ?? 0) : override.overrideLimit,
        base,
        effective: status === "active" ? (active?.id === override.id ? value : (row?.effective ?? value)) : value,
        startsAt: override.startsAt,
        expiresAt: override.expiresAt,
        revokedAt: override.revokedAt ?? null,
        status,
        approvedBy: override.approvedBy,
        reason: override.reason,
        used,
        expiresInDays: status === "active" ? Math.ceil((Date.parse(override.expiresAt) - now) / DAY_MS) : null,
        overAfterExpiry: status === "active" && base !== null && used !== null && used > base,
        raw: override,
      });
    }
  }
  return result;
}

export function computeOverrideCounts(rows: readonly OverrideRow[]) {
  const by = (status: OverrideStatus) => rows.filter((row) => row.status === status).length;
  const active = rows.filter((row) => row.status === "active");
  return {
    active: by("active"),
    scheduled: by("scheduled"),
    expiringSoon: active.filter((row) => row.expiresInDays !== null && row.expiresInDays <= OVERRIDE_EXPIRY_WARNING_DAYS).length,
    expired: by("expired"),
    revoked: by("revoked"),
    companies: new Set(active.map((row) => row.companyId)).size,
    needsReview: active.filter((row) => row.overAfterExpiry).length,
  };
}

export function queryOverrides(rows: readonly OverrideRow[], query: OverrideQuery): OverrideRow[] {
  const search = query.search?.trim().toLowerCase();
  const list = rows
    .filter((row) => !query.company || row.companyId === query.company)
    .filter((row) => !query.resource || row.resource === query.resource)
    .filter((row) => !query.rule || row.rule === query.rule)
    .filter((row) => !query.status || row.status === query.status)
    .filter((row) => !query.approvedBy || row.approvedBy === query.approvedBy)
    .filter((row) => !search || `${row.companyName} ${row.resource} ${RESOURCE_BY_KEY[row.resource].name} ${row.id}`.toLowerCase().includes(search));
  const sorters: Record<string, (a: OverrideRow, b: OverrideRow) => number> = {
    expiring: (a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || Date.parse(a.expiresAt) - Date.parse(b.expiresAt),
    newest: (a, b) => Date.parse(b.raw.createdAt) - Date.parse(a.raw.createdAt),
    allowance: (a, b) => (b.effective ?? Number.POSITIVE_INFINITY) - (a.effective ?? Number.POSITIVE_INFINITY),
    company: (a, b) => a.companyName.localeCompare(b.companyName),
  };
  return [...list].sort(sorters[query.sort ?? "expiring"] ?? sorters.expiring!);
}

/** What the effective limit and state would be if an override were revoked now. */
export function revocationImpact(row: OverrideRow) {
  const after = row.base;
  const over = after !== null && row.used !== null && row.used > after;
  return { effectiveAfter: after, over, excess: over && after !== null && row.used !== null ? row.used - after : 0 };
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export function queryEvents(events: readonly UsageEvent[], query: EventQuery, now: number): EventResult {
  const search = query.search?.trim().toLowerCase();
  const rangeDays = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[query.range ?? "30d"] ?? 30;
  const filtered = events
    .filter((event) => Date.parse(event.occurredAt) >= now - rangeDays * DAY_MS)
    .filter((event) => !query.company || event.companyId === query.company)
    .filter((event) => !query.client || event.clientId === query.client)
    .filter((event) => !query.resource || event.resource === query.resource)
    .filter((event) => !query.source || event.source === query.source)
    .filter((event) => !query.status || event.status === query.status)
    .filter((event) => !search || `${event.id} ${event.companyName} ${event.resource} ${RESOURCE_BY_KEY[event.resource].name} ${event.reference}`.toLowerCase().includes(search));
  const pageSize = query.pageSize ?? 12;
  const page = Math.max(1, query.page ?? 1);
  return {
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
    facets: {
      companies: [...new Map(events.map((event) => [event.companyId, event.companyName])).entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      clients: [...new Map(events.filter((event) => event.clientId).map((event) => [event.clientId as string, `${event.clientName} (${event.companyName})`])).entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      sources: [...new Set(events.map((event) => event.source))].sort(),
    },
  };
}

export { isFlowResource };
