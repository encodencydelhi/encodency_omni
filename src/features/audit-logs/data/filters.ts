/**
 * Pure selection over audit events: windows, filters, sorting, facets and the overview
 * derivations. Everything an overview number shows is computed here from event timestamps
 * and fields, so the same window and filters always give the same answer on every screen.
 */
import { ACCESS_CHANGE_KEYS, CONFIG_CHANGE_KEYS, PAGE_SIZE, PRIORITY } from "./config";
import { isSecretField } from "./redaction";
import type {
  ActivityPoint,
  AuditCategory,
  AuditEvent,
  DateWindow,
  EventFacets,
  EventPage,
  EventQuery,
  RangeKey,
} from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Every recorded event, whatever its date: an investigation is not limited to the explorer's window. */
export const ALL_TIME: DateWindow = { from: "2000-01-01T00:00:00.000Z", to: "2100-01-01T00:00:00.000Z" };

/** The window for a named range, ending at the demo clock's "now". A custom range uses whole UTC days. */
export function resolveWindow(range: RangeKey, now: number, from?: string, to?: string): DateWindow {
  if (range === "custom" && from && to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to))) {
    const start = Date.parse(`${from.slice(0, 10)}T00:00:00.000Z`);
    const end = Date.parse(`${to.slice(0, 10)}T23:59:59.999Z`);
    if (start <= end) return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
  }
  const span = range === "24h" ? DAY : range === "7d" ? 7 * DAY : 30 * DAY;
  return { from: new Date(now - span).toISOString(), to: new Date(now).toISOString() };
}

export const inWindow = (event: AuditEvent, window: DateWindow) => {
  const at = Date.parse(event.occurredAt);
  return at >= Date.parse(window.from) && at <= Date.parse(window.to);
};

/** Text a search may look at. Credentials, tokens and secrets are never indexed. */
function searchable(event: AuditEvent, includeEmail: boolean): string {
  const parts = [
    event.id,
    event.actor.displayName,
    includeEmail ? event.actor.email : null,
    includeEmail ? event.actor.attemptedIdentifier : null,
    event.actionLabel,
    event.actionKey,
    event.target.id,
    event.target.displayName,
    event.scope.companyName,
    event.scope.clientName,
    event.correlationId,
    event.requestId,
    event.summary,
    ...event.related.map((ref) => ref.label),
    // Field labels are searchable; the values of a redacted field are not stored at all.
    ...event.changes.filter((change) => !isSecretField(change.key)).map((change) => change.label),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function matchesQuick(event: AuditEvent, quick: string | undefined): boolean {
  switch (quick) {
    case "sensitive": return event.sensitiveCategory !== null;
    case "failed": return event.outcome === "failed" || event.outcome === "denied";
    case "access": return ACCESS_CHANGE_KEYS.has(event.actionKey) && event.outcome === "success";
    case "billing": return event.category === "billing";
    case "config": return CONFIG_CHANGE_KEYS.has(event.actionKey) && event.outcome === "success";
    default: return true;
  }
}

export function filterEvents(events: readonly AuditEvent[], query: EventQuery & { searchEmail?: boolean }): AuditEvent[] {
  const needle = query.search?.trim().toLowerCase();
  return events.filter((event) => {
    if (!inWindow(event, query.window)) return false;
    if (query.category && event.category !== query.category) return false;
    if (query.outcome && event.outcome !== query.outcome) return false;
    if (query.actorType && event.actor.type !== query.actorType) return false;
    if (query.companyId && event.scope.companyId !== query.companyId) return false;
    if (query.clientId && event.scope.clientId !== query.clientId) return false;
    if (query.actionKey && event.actionKey !== query.actionKey) return false;
    if (query.priority && event.priority !== query.priority) return false;
    if (query.actorId && event.actor.id !== query.actorId) return false;
    if (query.resourceType && event.target.type !== query.resourceType) return false;
    if (query.environment && event.environment !== query.environment) return false;
    if (query.sourceModule && event.sourceModule !== query.sourceModule) return false;
    if (query.correlationId && event.correlationId !== query.correlationId) return false;
    if (query.requestId && event.requestId !== query.requestId) return false;
    if (query.eventId && event.id !== query.eventId) return false;
    if (query.sensitiveOnly && event.sensitiveCategory === null) return false;
    if (query.sensitiveCategory && event.sensitiveCategory !== query.sensitiveCategory) return false;
    if (query.workflowStage && event.workflowStage !== query.workflowStage) return false;
    if (query.securityView && event.securityView !== query.securityView) return false;
    if (!matchesQuick(event, query.quick)) return false;
    if (needle && !searchable(event, query.searchEmail ?? false).includes(needle)) return false;
    return true;
  });
}

/** Stable: identical timestamps fall back to the event id, so paging never shuffles rows. */
export function sortEvents(events: readonly AuditEvent[], sort = "newest"): AuditEvent[] {
  const byTime = (a: AuditEvent, b: AuditEvent) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  const tie = (a: AuditEvent, b: AuditEvent) => a.id.localeCompare(b.id);
  const compare: Record<string, (a: AuditEvent, b: AuditEvent) => number> = {
    newest: (a, b) => byTime(a, b) || tie(a, b),
    oldest: (a, b) => -byTime(a, b) || tie(a, b),
    priority: (a, b) => PRIORITY[b.priority].rank - PRIORITY[a.priority].rank || byTime(a, b) || tie(a, b),
    category: (a, b) => a.category.localeCompare(b.category) || byTime(a, b) || tie(a, b),
    actor: (a, b) => a.actor.displayName.localeCompare(b.actor.displayName) || byTime(a, b) || tie(a, b),
  };
  return [...events].sort(compare[sort] ?? compare.newest!);
}

export function paginate(events: readonly AuditEvent[], page = 1, pageSize = PAGE_SIZE): EventPage {
  const pages = Math.max(1, Math.ceil(events.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  return { rows: events.slice((safePage - 1) * pageSize, safePage * pageSize), total: events.length, page: safePage, pageSize };
}

export function facetsOf(events: readonly AuditEvent[]): EventFacets {
  const actors = new Map<string, { id: string; name: string; type: AuditEvent["actor"]["type"] }>();
  const companies = new Map<string, { id: string; name: string }>();
  const actions = new Map<string, { key: string; label: string }>();
  const resources = new Set<string>();
  const modules = new Set<string>();
  for (const event of events) {
    if (event.actor.id) actors.set(event.actor.id, { id: event.actor.id, name: event.actor.displayName, type: event.actor.type });
    if (event.scope.companyId && event.scope.companyName) companies.set(event.scope.companyId, { id: event.scope.companyId, name: event.scope.companyName });
    actions.set(event.actionKey, { key: event.actionKey, label: event.actionLabel });
    resources.add(event.target.type);
    modules.add(event.sourceModule);
  }
  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);
  return {
    actors: [...actors.values()].sort(byName),
    companies: [...companies.values()].sort(byName),
    actions: [...actions.values()].sort((a, b) => a.label.localeCompare(b.label)),
    resourceTypes: [...resources].sort(),
    sourceModules: [...modules].sort(),
  };
}

/* ------------------------------------------------------------------ */
/* Overview derivations                                                */
/* ------------------------------------------------------------------ */

export function countKpis(events: readonly AuditEvent[]) {
  return {
    total: events.length,
    sensitive: events.filter((event) => event.sensitiveCategory !== null).length,
    failedDenied: events.filter((event) => event.outcome === "failed" || event.outcome === "denied").length,
    // A pending request is not an applied change, so it is never counted here.
    accessChanges: events.filter((event) => ACCESS_CHANGE_KEYS.has(event.actionKey) && event.outcome === "success" && event.workflowStage !== "requested" && event.workflowStage !== "approved").length,
    authFailures: events.filter((event) => (event.actionKey === "auth.login_failed" || event.actionKey === "auth.mfa_verification_failed") && event.outcome === "failed").length,
    configChanges: events.filter((event) => CONFIG_CHANGE_KEYS.has(event.actionKey) && event.outcome === "success").length,
  };
}

export function categoryCounts(events: readonly AuditEvent[]): Array<{ category: AuditCategory; count: number }> {
  const counts = new Map<AuditCategory, number>();
  for (const event of events) counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function metricMatch(event: AuditEvent, metric: string): boolean {
  switch (metric) {
    case "sensitive": return event.sensitiveCategory !== null;
    case "failed": return event.outcome === "failed" || event.outcome === "denied";
    case "auth": return event.category === "authentication";
    default: return true;
  }
}

/** Bucket size follows the window: hours for a day or two, days for weeks, weeks beyond that. */
export function bucketUnit(window: DateWindow): "hour" | "day" | "week" {
  const span = Date.parse(window.to) - Date.parse(window.from);
  return span <= 2 * DAY ? "hour" : span <= 45 * DAY ? "day" : "week";
}

const two = (value: number) => String(value).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Counts of real events per bucket. Empty buckets are zero; nothing is invented to fill them. */
export function activitySeries(events: readonly AuditEvent[], window: DateWindow, metric = "all"): { unit: "hour" | "day" | "week"; points: ActivityPoint[] } {
  const unit = bucketUnit(window);
  const size = unit === "hour" ? HOUR : unit === "day" ? DAY : 7 * DAY;
  const start = Date.parse(window.from);
  const end = Date.parse(window.to);
  const anchor = unit === "hour" ? Math.floor(start / HOUR) * HOUR : Math.floor(start / DAY) * DAY;
  const points: ActivityPoint[] = [];
  for (let t = anchor; t <= end; t += size) {
    const d = new Date(t);
    const label = unit === "hour" ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${two(d.getUTCHours())}:00` : `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
    points.push({ at: new Date(t).toISOString(), label, value: 0 });
  }
  for (const event of events) {
    if (!metricMatch(event, metric) || !inWindow(event, window)) continue;
    const index = Math.floor((Date.parse(event.occurredAt) - anchor) / size);
    const point = points[Math.min(Math.max(index, 0), points.length - 1)];
    if (point) point.value += 1;
  }
  return { unit, points };
}

/** Events that follow one workflow, oldest first. Only a shared correlation id groups events. */
export function workflowOf(event: AuditEvent, all: readonly AuditEvent[]): AuditEvent[] {
  if (!event.correlationId) return [event];
  return all.filter((item) => item.correlationId === event.correlationId).sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id));
}
