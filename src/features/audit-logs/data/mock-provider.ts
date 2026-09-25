/**
 * Demo implementation of `AuditRepository`.
 *
 * It behaves like a remote audit service - asynchronous, validating, throwing `ApiError` - and
 * claims nothing more. Events are derived on every read from the histories the other modules
 * own (company activity, feature-flag changes, configuration history, plan history) plus a
 * curated set for areas with no history of their own. Because they are derived, a change made
 * elsewhere shows up here, and there is no path to rewrite or remove an event.
 *
 * What this layer owns is only the investigation workspace (cases, links, notes, case
 * activity) and the audit events created by this module's own exports. Nothing here is
 * ingested, verified or tamper-evident, and every screen says so.
 *
 * Only `repository.ts` imports this file.
 */
import { env } from "@/config/env";
import { platformNow, nowIso } from "@/features/companies/data/clock";
import { allBundles } from "@/features/companies/data/mock/store";
import { toCsv } from "@/features/companies/lib/csv";
import { flagsRepository } from "@/features/feature-flags/data/repository";
import { settingsRepository } from "@/features/global-settings/data/repository";
import { plansRepository } from "@/features/plans-subscriptions/data/repository";
import { ApiError } from "@/types/api";
import { priorityFor } from "./action-catalogue";
import { makeEvent } from "./build";
import { COVERAGE_MODULES, MAX_EXPORT_RANGE_DAYS } from "./config";
import { activitySeries, categoryCounts, countKpis, facetsOf, filterEvents, inWindow, paginate, sortEvents, workflowOf } from "./filters";
import { eligibleOwners, isEditable, isEligibleOwner, scopeCompatibility, validateCreate } from "./investigation-policies";
import type { AddEventsResult, AuditRepository, LinkCheck, ScopeOption } from "./repository";
import { curatedEvents } from "./seed";
import { companyActivityEvents } from "./sources";
import { flagEvents, planEvents, settingsEvents } from "./sources-modules";
import { nextCase, nextId, resetAuditState, save, state } from "./store";
import type {
  AttentionItem,
  AuditEvent,
  CollectionGap,
  CoverageRow,
  EventScope,
  ExportResult,
  Investigation,
  InvestigationActivity,
  InvestigationRow,
  SecurityView,
  SensitiveCategory,
  SettingsData,
} from "./types";
import { auditRoutes } from "./config";

function wait(kind: "read" | "write"): Promise<void> {
  const base = kind === "read" ? env.mockLatencyMs * 0.6 : env.mockLatencyMs * 1.1;
  return new Promise((resolve) => setTimeout(resolve, Math.round(base)));
}

function fail(code: ConstructorParameters<typeof ApiError>[0]["code"], message: string, fieldErrors?: Record<string, string>): never {
  const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "CONFLICT" ? 409 : 422;
  throw new ApiError({ code, status, message, fieldErrors });
}

/** A module whose history cannot be read must not take the whole audit view down; it becomes a known gap. */
async function safely<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

async function world() {
  const bundles = allBundles();
  const [flagChanges, settingChanges, planRecent] = await Promise.all([
    safely(flagsRepository.listChanges({ pageSize: 2000 }), null),
    safely(settingsRepository.listChanges({ pageSize: 2000 }), null),
    safely(plansRepository.getRecentChanges(), []),
  ]);
  const companyName = (id: string) => bundles.find((bundle) => bundle.company.id === id)?.company.name ?? id;
  const derived = [
    ...companyActivityEvents(bundles),
    ...curatedEvents(bundles),
    ...flagEvents(flagChanges?.rows ?? [], companyName),
    ...settingsEvents(settingChanges?.rows ?? []),
    ...planEvents(planRecent),
  ];
  const store = state(derived);
  const unique = new Map<string, AuditEvent>();
  for (const event of [...derived, ...store.exportEvents]) unique.set(event.id, event);
  const events = [...unique.values()].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id));
  const byId = new Map(events.map((event) => [event.id, event]));
  return { bundles, events, byId, store, unreadable: { flags: flagChanges === null, settings: settingChanges === null } };
}

type World = Awaited<ReturnType<typeof world>>;

function coverage(w: World): CoverageRow[] {
  return COVERAGE_MODULES.map((row) => {
    const matching = w.events.filter((event) => event.sourceModule === row.module);
    const last = matching.reduce<string | null>((max, event) => (max === null || event.recordedAt > max ? event.recordedAt : max), null);
    const unreadable = (row.module === "Feature Flags" && w.unreadable.flags) || (row.module === "Global Settings" && w.unreadable.settings);
    return {
      module: row.module,
      category: row.category,
      expectedEvents: row.expected,
      collection: unreadable ? "unknown" : row.configured,
      verification: row.configured === "verification_pending" ? "pending" : "not_verified",
      lastRecordedAt: last,
      recordedCount: matching.length,
      note: unreadable ? "The module's history could not be read, so coverage is unknown." : row.note,
      href: row.href,
    };
  });
}

function gapsOf(rows: readonly CoverageRow[]): CollectionGap[] {
  return rows
    .filter((row) => row.collection === "partially_instrumented" || row.collection === "not_implemented" || row.collection === "unknown")
    .map((row, index) => ({ id: `gap_${row.module.toLowerCase().replace(/[^a-z]+/g, "_")}`, module: row.module, summary: row.note, since: new Date(platformNow() - (20 + index * 9) * 86_400_000).toISOString() }));
}

function sourceStatus(w: World, rows: readonly CoverageRow[]) {
  const configured = rows.filter((row) => row.collection === "configured").length;
  const last = w.events.reduce<string | null>((max, event) => (max === null || event.recordedAt > max ? event.recordedAt : max), null);
  return {
    dataSource: "Demo Records",
    ingestion: "Not Connected",
    collection: `${configured} of ${rows.length} modules configured in demo`,
    lastReceivedAt: last,
    knownGaps: gapsOf(rows).length,
    storageVerification: "Not Available",
    integrity: "Unavailable",
    retentionExecution: "Not Running. No cleanup worker is connected.",
    productionCoverage: "Not Verified",
  };
}

/* ------------------------------------------------------------------ */
/* Investigations                                                      */
/* ------------------------------------------------------------------ */

function requireCase(w: World, id: string): Investigation {
  const found = w.store.investigations.find((item) => item.id === id);
  if (!found) fail("NOT_FOUND", `Investigation ${id} was not found.`);
  return found;
}

function log(w: World, item: Investigation, actor: { name: string }, kind: InvestigationActivity["kind"], summary: string, context: string | null = null): void {
  const stamp = nowIso();
  item.activity.push({ id: nextId(w.store, "activity"), at: stamp, actor: actor.name, kind, summary, context });
  item.updatedAt = stamp;
}

function requireOpen(item: Investigation): void {
  if (!isEditable(item)) fail("CONFLICT", "This investigation is closed. Reopen it before changing it.");
}

const rowOf = (item: Investigation): InvestigationRow => ({ investigation: item, linkedEvents: item.links.length });

function investigationScope(w: World, input: { level: EventScope["level"]; companyId: string | null; clientId: string | null }): EventScope {
  const bundle = input.companyId ? w.bundles.find((item) => item.company.id === input.companyId) : undefined;
  const client = input.clientId ? bundle?.clients.find((item) => item.id === input.clientId) : undefined;
  return { level: input.level, companyId: bundle?.company.id ?? null, companyName: bundle?.company.name ?? null, clientId: client?.id ?? null, clientName: client?.name ?? null };
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

const EXPORT_HEADERS = ["Event ID", "Occurred At", "Recorded At", "Category", "Action", "Action Key", "Actor Type", "Actor", "Target Type", "Target", "Scope", "Company", "Client", "Outcome", "Review Priority", "Sensitive Category", "Environment", "Source Module", "Request ID", "Correlation ID", "Reason", "Changes"];
const SENSITIVE_EXPORT_HEADERS = ["Actor Email", "Attempted Identifier", "IP Address"];

function changesText(event: AuditEvent, includeSensitive: boolean): string {
  if (event.changes.length === 0) return "";
  // Values of a sensitive event are withheld unless the exporter may include sensitive fields.
  if (event.sensitiveCategory && !includeSensitive) return event.changes.map((change) => `${change.label}: value not included`).join("; ");
  const text = event.changes.map((change) => `${change.label}: ${change.before ?? "Not recorded"} -> ${change.after ?? "Not recorded"}`).join("; ");
  return includeSensitive ? text : text.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[REDACTED]");
}

function exportRow(event: AuditEvent, includeSensitive: boolean): Array<string | number | null> {
  const base = [event.id, event.occurredAt, event.recordedAt, event.category, event.actionLabel, event.actionKey, event.actor.type, event.actor.displayName, event.target.type, event.target.displayName, event.scope.level, event.scope.companyName, event.scope.clientName, event.outcome, event.priority, event.sensitiveCategory, event.environment, event.sourceModule, event.requestId, event.correlationId, event.reason, changesText(event, includeSensitive)];
  return includeSensitive ? [...base, event.actor.email, event.actor.attemptedIdentifier, event.technical?.ipAddress ?? null] : base;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export const mockAuditProvider: AuditRepository = {
  mode: "mock",

  async getOverview(window, environment) {
    await wait("read");
    const w = await world();
    const scoped = w.events.filter((event) => (!environment || event.environment === environment) && inWindow(event, window));
    const kpis = countKpis(scoped);
    const rows = coverage(w);
    const gaps = gapsOf(rows);

    const attention: AttentionItem[] = scoped
      .filter((event) => event.priority !== "informational" && (event.sensitiveCategory !== null || event.outcome === "failed" || event.outcome === "denied"))
      .sort((a, b) => (b.priority === "high" ? 1 : 0) - (a.priority === "high" ? 1 : 0) || Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id))
      .slice(0, 6)
      .map((event) => ({
        id: `att_${event.id}`,
        eventId: event.id,
        label: event.outcome === "failed" || event.outcome === "denied" ? ("Failed" as const) : event.outcome === "pending" ? ("Pending Review" as const) : ("Review Recommended" as const),
        title: event.actionLabel,
        detail: `${event.actor.displayName} - ${event.target.displayName}${event.scope.companyName ? ` - ${event.scope.companyName}` : " - Platform-Wide"}`,
        at: event.occurredAt,
        href: auditRoutes.event(event.id),
      }));
    const firstGap = gaps[0];
    if (firstGap) attention.push({ id: "att_gap", eventId: null, label: "Collection Issue", title: `${firstGap.module}: ${gaps.length} known collection ${gaps.length === 1 ? "gap" : "gaps"}`, detail: firstGap.summary, at: firstGap.since, href: auditRoutes.settings({ section: "coverage" }) });

    return {
      window,
      environment: environment ?? "all",
      kpis: { ...kpis, openInvestigations: w.store.investigations.filter((item) => item.status !== "closed").length, collectionIssues: gaps.length },
      categories: categoryCounts(scoped),
      attention,
      recentSensitive: sortEvents(scoped.filter((event) => event.sensitiveCategory !== null)).slice(0, 6),
      lastRecordedAt: w.events.reduce<string | null>((max, event) => (max === null || event.recordedAt > max ? event.recordedAt : max), null),
      source: sourceStatus(w, rows),
    };
  },

  async getActivity(window, metric, environment) {
    await wait("read");
    const w = await world();
    return activitySeries(w.events.filter((event) => !environment || event.environment === environment), window, metric);
  },

  async listEvents(query) {
    await wait("read");
    const w = await world();
    return paginate(sortEvents(filterEvents(w.events, query), query.sort), query.page, query.pageSize);
  },

  async getFacets() {
    await wait("read");
    return facetsOf((await world()).events);
  },

  async getScopeOptions(): Promise<ScopeOption[]> {
    await wait("read");
    const w = await world();
    return w.bundles.map((bundle) => ({ id: bundle.company.id, name: bundle.company.name, clients: bundle.clients.map((client) => ({ id: client.id, name: client.name })) })).sort((a, b) => a.name.localeCompare(b.name));
  },

  async getEvent(id) {
    await wait("read");
    const w = await world();
    const event = w.byId.get(id);
    if (!event) fail("NOT_FOUND", `Audit event ${id} was not found.`);
    return {
      event,
      workflow: workflowOf(event, w.events),
      linkedInvestigations: w.store.investigations.filter((item) => item.links.some((link) => link.eventId === id)).map((item) => ({ id: item.id, title: item.title, status: item.status })),
      sameRequest: event.requestId ? w.events.filter((item) => item.requestId === event.requestId && item.id !== id) : [],
    };
  },

  async getSecurityCounts(window) {
    await wait("read");
    const w = await world();
    const inRange = w.events.filter((event) => inWindow(event, window));
    const count = (view: SecurityView) => inRange.filter((event) => event.securityView === view).length;
    return { authentication: count("authentication"), user_access: count("user_access"), staff: count("staff"), policies: count("policies") };
  },

  async getSensitiveCounts(window) {
    await wait("read");
    const w = await world();
    const counts = {} as Record<SensitiveCategory, number>;
    for (const category of ["privileged_access", "billing_financial", "subscription_entitlements", "integrations", "feature_flags", "platform_security", "data_privacy", "maintenance_availability"] as const) counts[category] = 0;
    for (const event of w.events) if (event.sensitiveCategory && inWindow(event, window)) counts[event.sensitiveCategory] += 1;
    return counts;
  },

  async getSettings(): Promise<SettingsData> {
    await wait("read");
    const w = await world();
    const rows = coverage(w);
    const config = await safely(settingsRepository.getConfiguration(), null);
    const days = Number(config?.values["privacy.retention.audit_logs"] ?? 365);
    const logExports = config?.values["privacy.export.log_activity"];
    return {
      coverage: rows,
      gaps: gapsOf(rows),
      status: sourceStatus(w, rows),
      retention: {
        retentionDays: Number.isFinite(days) ? days : 365,
        effectiveSince: config?.changedAt["privacy.retention.audit_logs"] ?? null,
        owner: "Audit Logs (configured in Global Settings, Data & Privacy)",
        archiveBehavior: "Not connected. No archive step runs in this frontend phase.",
        expiryPolicy: "Configured as a policy only. No worker deletes or archives events, so nothing expires.",
        legalHold: "No legal hold reference is configured.",
        policyHref: auditRoutes.privacySettings(),
      },
      exportGovernance: {
        requiredCapability: "Audit access with platform or settings write. Exporting sensitive fields needs settings write.",
        allowedScope: "The events matching the filters on screen, within one date window.",
        reasonRequired: true,
        maxRangeDays: MAX_EXPORT_RANGE_DAYS,
        redaction: "Secrets are never present. Actor emails, attempted identifiers, IP addresses and the values of sensitive changes are left out unless sensitive fields are included.",
        approval: "No approval step. No approval service is connected in this phase.",
        loggingPolicy: logExports === false ? "Export logging is switched off in Global Settings." : "Every export writes an audit event, shown in Event Explorer.",
        loggedExports: w.store.exportEvents.length,
      },
    };
  },

  async exportEvents(request, actor): Promise<ExportResult> {
    await wait("write");
    const w = await world();
    const reason = request.reason.trim();
    if (reason.length < 10) fail("VALIDATION_FAILED", "Say why these events are being exported.", { reason: "Enter a reason of at least 10 characters." });
    const span = (Date.parse(request.query.window.to) - Date.parse(request.query.window.from)) / 86_400_000;
    if (span > MAX_EXPORT_RANGE_DAYS) fail("VALIDATION_FAILED", `An export can cover at most ${MAX_EXPORT_RANGE_DAYS} days.`, { range: `Narrow the date range to ${MAX_EXPORT_RANGE_DAYS} days or fewer.` });
    const matching = sortEvents(filterEvents(w.events, request.query), request.query.sort);
    if (matching.length === 0) fail("VALIDATION_FAILED", "There are no events to export for these filters.", { range: "No events match." });

    const includeSensitive = request.includeSensitive;
    const stamp = new Date(platformNow()).toISOString().slice(0, 10);
    const headers = includeSensitive ? [...EXPORT_HEADERS, ...SENSITIVE_EXPORT_HEADERS] : EXPORT_HEADERS;
    const content =
      request.format === "csv"
        ? toCsv(headers, matching.map((event) => exportRow(event, includeSensitive)))
        : JSON.stringify(matching.map((event) => Object.fromEntries(headers.map((header, index) => [header, exportRow(event, includeSensitive)[index]]))), null, 2);

    const seq = nextId(w.store, "export");
    const exportEvent = makeEvent({
      id: `aud_export_${seq.padStart(3, "0")}`,
      occurredAt: nowIso(),
      actionKey: "audit.export_generated",
      actor: { type: "staff", id: actor.id, displayName: actor.name, email: null },
      target: { type: "audit_export", id: `exp_${seq}`, displayName: `Audit export (${request.format.toUpperCase()}, ${matching.length} events)`, parent: null, href: null },
      reason,
      summary: `${actor.name} exported ${matching.length} audit ${matching.length === 1 ? "event" : "events"} as ${request.format.toUpperCase()}${includeSensitive ? ", including sensitive fields" : ", without sensitive fields"}.`,
      priority: includeSensitive ? "high" : priorityFor("audit.export_generated", "success"),
      followUp: "Exports are logged. No approval service is connected in this phase.",
      recordedDelaySec: 1,
    });
    w.store.exportEvents.push(exportEvent);
    save(w.store);
    return { filename: `audit-events-${stamp}.${request.format}`, format: request.format, content, count: matching.length, redactedFields: includeSensitive ? [] : ["Actor Email", "Attempted Identifier", "IP Address", "Sensitive change values"], exportEventId: exportEvent.id };
  },

  /* ------------------------ investigations ------------------------ */

  async listInvestigations(query) {
    await wait("read");
    const w = await world();
    const all = w.store.investigations;
    const needle = query.search?.trim().toLowerCase();
    const between = (iso: string, from?: string, to?: string) => (!from || iso >= `${from}T00:00:00.000Z`) && (!to || iso <= `${to}T23:59:59.999Z`);
    const filtered = all.filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.priority && item.priority !== query.priority) return false;
      if (query.ownerId && item.ownerId !== query.ownerId) return false;
      if (query.companyId && item.scope.companyId !== query.companyId) return false;
      if (!between(item.createdAt, query.createdFrom, query.createdTo)) return false;
      if (!between(item.updatedAt, query.updatedFrom, query.updatedTo)) return false;
      if (needle && !`${item.id} ${item.title} ${item.scope.companyName ?? ""} ${item.ownerName}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const rank = { high: 2, elevated: 1, normal: 0 } as const;
    const sorted = [...filtered].sort((a, b) => {
      switch (query.sort) {
        case "oldest_open": return (a.status === "closed" ? 1 : 0) - (b.status === "closed" ? 1 : 0) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
        case "priority": return rank[b.priority] - rank[a.priority] || Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id);
        case "id": return a.id.localeCompare(b.id);
        default: return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id);
      }
    });
    return {
      rows: sorted.map(rowOf),
      counts: {
        open: all.filter((item) => item.status === "open").length,
        inReview: all.filter((item) => item.status === "in_review").length,
        awaiting: all.filter((item) => item.status === "awaiting_information").length,
        closed: all.filter((item) => item.status === "closed").length,
        highOpen: all.filter((item) => item.status !== "closed" && item.priority === "high").length,
        total: all.length,
      },
      owners: [...new Map(all.map((item) => [item.ownerId, item.ownerName])).entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      companies: [...new Map(all.filter((item) => item.scope.companyId).map((item) => [item.scope.companyId as string, item.scope.companyName as string])).entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  },

  async getInvestigation(id) {
    await wait("read");
    const w = await world();
    const investigation = requireCase(w, id);
    const events = investigation.links.map((link) => ({ link, event: w.byId.get(link.eventId) ?? null }));
    const related = new Map<string, { type: string; id: string; label: string; href: string | null }>();
    for (const { event } of events) {
      if (!event) continue;
      for (const ref of event.related) related.set(`${ref.type}:${ref.id}`, ref);
      if (event.target.href) related.set(`${event.target.type}:${event.target.id}`, { type: event.target.type, id: event.target.id, label: event.target.displayName, href: event.target.href });
    }
    return { investigation: structuredClone(investigation), events, related: [...related.values()] };
  },

  async listOwners() {
    await wait("read");
    return eligibleOwners();
  },

  async createInvestigation(input, actor) {
    await wait("write");
    const w = await world();
    const issues = validateCreate(input, (companyId) => new Set(w.bundles.find((bundle) => bundle.company.id === companyId)?.clients.map((client) => client.id) ?? []));
    const scope = investigationScope(w, input.scope);
    const unknown = input.eventIds.filter((id) => !w.byId.has(id));
    if (unknown.length > 0) issues.push({ field: "eventIds", message: `${unknown.length} chosen ${unknown.length === 1 ? "event does" : "events do"} not exist.` });
    for (const id of input.eventIds) {
      const event = w.byId.get(id);
      if (event) {
        const fit = scopeCompatibility(scope, event);
        if (!fit.ok) issues.push({ field: "eventIds", message: `${event.id}: ${fit.message}` });
      }
    }
    if (issues.length > 0) fail("VALIDATION_FAILED", issues[0]?.message ?? "The investigation could not be created.", Object.fromEntries(issues.map((issue) => [issue.field, issue.message])));

    const owner = eligibleOwners().find((item) => item.id === input.ownerId);
    const stamp = nowIso();
    const item: Investigation = {
      id: nextCase(w.store),
      title: input.title.trim(),
      description: input.description.trim(),
      scope,
      ownerId: input.ownerId,
      ownerName: owner?.name ?? input.ownerId,
      priority: input.priority,
      status: "open",
      createdBy: actor.name,
      createdAt: stamp,
      updatedAt: stamp,
      closedAt: null,
      closure: null,
      links: [...new Set(input.eventIds)].map((eventId) => ({ eventId, linkedBy: actor.name, linkedAt: stamp, note: "" })),
      notes: input.note.trim() ? [{ id: nextId(w.store, "note"), author: actor.name, authorId: actor.id, at: stamp, type: "note", text: input.note.trim(), correctsNoteId: null }] : [],
      activity: [],
      relatedReference: null,
    };
    log(w, item, actor, "created", "Investigation created");
    if (item.links.length > 0) log(w, item, actor, "event_linked", `${item.links.length} ${item.links.length === 1 ? "event" : "events"} linked`);
    if (item.notes.length > 0) log(w, item, actor, "note_added", "Initial note added");
    w.store.investigations.push(item);
    save(w.store);
    return item;
  },

  async checkLink(investigationId, eventId): Promise<LinkCheck> {
    await wait("read");
    const w = await world();
    const item = requireCase(w, investigationId);
    const event = w.byId.get(eventId);
    if (!event) fail("NOT_FOUND", `Audit event ${eventId} was not found.`);
    if (item.status === "closed") return { ok: false, duplicate: false, message: "This investigation is closed." };
    if (item.links.some((link) => link.eventId === eventId)) return { ok: false, duplicate: true, message: "This event is already linked to the investigation." };
    const fit = scopeCompatibility(item.scope, event);
    return { ok: fit.ok, duplicate: false, message: fit.message };
  },

  async addEvents(investigationId, eventIds, note, actor): Promise<AddEventsResult> {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    requireOpen(item);
    const added: string[] = [];
    const skipped: AddEventsResult["skipped"] = [];
    for (const eventId of [...new Set(eventIds)]) {
      const event = w.byId.get(eventId);
      if (!event) { skipped.push({ eventId, reason: "The event does not exist." }); continue; }
      if (item.links.some((link) => link.eventId === eventId)) { skipped.push({ eventId, reason: "Already linked." }); continue; }
      const fit = scopeCompatibility(item.scope, event);
      if (!fit.ok) { skipped.push({ eventId, reason: fit.message }); continue; }
      // A link is a separate record: the audit event itself is not touched.
      item.links.push({ eventId, linkedBy: actor.name, linkedAt: nowIso(), note: note.trim() });
      added.push(eventId);
    }
    if (added.length === 0) fail("VALIDATION_FAILED", skipped[0]?.reason ?? "Nothing was linked.", { eventIds: skipped[0]?.reason ?? "Nothing was linked." });
    log(w, item, actor, "event_linked", `${added.length} ${added.length === 1 ? "event" : "events"} linked`, note.trim() || null);
    save(w.store);
    return { investigation: item, added, skipped };
  },

  async unlinkEvent(investigationId, eventId, actor) {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    requireOpen(item);
    if (!item.links.some((link) => link.eventId === eventId)) fail("NOT_FOUND", "That event is not linked to this investigation.");
    // Only the link is removed. The audit event stays exactly where it was.
    item.links = item.links.filter((link) => link.eventId !== eventId);
    log(w, item, actor, "event_unlinked", "Event unlinked", eventId);
    save(w.store);
    return item;
  },

  async editRelevance(investigationId, eventId, note, actor) {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    requireOpen(item);
    const link = item.links.find((entry) => entry.eventId === eventId);
    if (!link) fail("NOT_FOUND", "That event is not linked to this investigation.");
    if (note.length > 300) fail("VALIDATION_FAILED", "Keep the note under 300 characters.", { note: "Keep the note under 300 characters." });
    link.note = note.trim();
    log(w, item, actor, "relevance_edited", "Relevance note edited", eventId);
    save(w.store);
    return item;
  },

  async addNote(investigationId, text, actor, correctsNoteId = null) {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    requireOpen(item);
    if (!text.trim()) fail("VALIDATION_FAILED", "Write the note first.", { text: "A note cannot be empty." });
    if (text.length > 1500) fail("VALIDATION_FAILED", "Keep the note under 1,500 characters.", { text: "Keep the note under 1,500 characters." });
    if (correctsNoteId && !item.notes.some((entry) => entry.id === correctsNoteId)) fail("NOT_FOUND", "The note being corrected was not found.");
    // Append-only: a correction is a new note that points at the old one; nothing is rewritten.
    item.notes.push({ id: nextId(w.store, "note"), author: actor.name, authorId: actor.id, at: nowIso(), type: correctsNoteId ? "correction" : "note", text: text.trim(), correctsNoteId });
    log(w, item, actor, "note_added", correctsNoteId ? "Correction note added" : "Note added");
    save(w.store);
    return item;
  },

  async changeOwner(investigationId, ownerId, reason, actor) {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    requireOpen(item);
    if (!isEligibleOwner(ownerId)) fail("VALIDATION_FAILED", "That person cannot own an investigation.", { ownerId: "Choose an eligible internal owner." });
    if (ownerId === item.ownerId) fail("VALIDATION_FAILED", "That person already owns this investigation.", { ownerId: "Choose someone else." });
    if (!reason.trim()) fail("VALIDATION_FAILED", "Say why the owner is changing.", { reason: "A reason is required." });
    const owner = eligibleOwners().find((entry) => entry.id === ownerId);
    const previous = item.ownerName;
    item.ownerId = ownerId;
    item.ownerName = owner?.name ?? ownerId;
    log(w, item, actor, "owner_changed", `Owner changed from ${previous} to ${item.ownerName}`, reason.trim());
    save(w.store);
    return item;
  },

  async changeStatus(investigationId, status, actor) {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    if (status === "closed") fail("VALIDATION_FAILED", "Use Close Investigation to close a case with a conclusion.");
    if (item.status === status) fail("VALIDATION_FAILED", "The investigation already has that status.");
    const reopening = item.status === "closed";
    const previous = item.status;
    item.status = status;
    if (reopening) { item.closedAt = null; item.closure = null; }
    log(w, item, actor, reopening ? "reopened" : "status_changed", reopening ? "Investigation reopened" : `Status changed to ${status.replace(/_/g, " ")}`, `${previous.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}`);
    save(w.store);
    return item;
  },

  async changePriority(investigationId, priority, actor) {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    requireOpen(item);
    if (item.priority === priority) fail("VALIDATION_FAILED", "The investigation already has that priority.");
    const previous = item.priority;
    item.priority = priority;
    log(w, item, actor, "priority_changed", `Priority changed to ${priority}`, `${previous} to ${priority}`);
    save(w.store);
    return item;
  },

  async closeInvestigation(investigationId, input, actor) {
    await wait("write");
    const w = await world();
    const item = requireCase(w, investigationId);
    requireOpen(item);
    if (!input.reason.trim()) fail("VALIDATION_FAILED", "Choose a closure reason.", { reason: "A closure reason is required." });
    if (input.conclusion.trim().length < 10) fail("VALIDATION_FAILED", "Write a short conclusion.", { conclusion: "Add a conclusion of at least 10 characters." });
    const stamp = nowIso();
    item.status = "closed";
    item.closedAt = stamp;
    item.closure = { reason: input.reason.trim(), conclusion: input.conclusion.trim(), closedBy: actor.name };
    log(w, item, actor, "closed", "Investigation closed", input.reason.trim());
    save(w.store);
    return item;
  },

  async resetDemoData() {
    await wait("write");
    resetAuditState();
  },
};
