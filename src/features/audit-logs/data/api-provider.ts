import { superAdminCompaniesApi } from "@/features/companies/live/super-admin-companies-api";
import {
  auditInvestigationsApi,
  superAdminAuditLogsApi,
  type SuperAdminAuditLogItem,
} from "../live/super-admin-audit-logs-api";
import { auditRoutes } from "./config";
import type { AddEventsResult, AuditRepository, LinkCheck, ScopeOption } from "./repository";
import type {
  ActivityPoint,
  ActorSnapshot,
  AttentionItem,
  AuditEvent,
  AuditOutcome,
  AuditOverview,
  CoverageRow,
  DateWindow,
  EventDetail,
  EventFacets,
  EventPage,
  EventQuery,
  ExportRequest,
  ExportResult,
  FieldChange,
  Investigation,
  InvestigationDetail,
  InvestigationList,
  InvestigationQuery,
  OwnerOption,
  SensitiveCategory,
  SettingsData,
  TargetSnapshot,
} from "./types";

/**
 * The real audit trail. Every call goes to `/super-admin/audit-logs/*` and `/super-admin/audit-investigations/*`; nothing falls
 * back to demo data, so a failed request shows an error instead of invented events.
 */

const RESOURCE_LABELS: Record<string, string> = {
  COMPANY: "Company", INVITATION: "Invitation", USER: "User", MEMBERSHIP: "Team member", TEAM_GROUP: "Team group", STAFF_INVITATION: "Staff invitation",
  CLIENT: "Client", CAMPAIGN: "Campaign", CONTENT_DRAFT: "Draft", MEDIA_ASSET: "Media file", INTEGRATION: "Integration", RESOURCE_MAPPING: "Channel mapping",
  SCHEDULED_POST: "Scheduled post", WHATSAPP_CONFIG: "WhatsApp settings", WHATSAPP_MESSAGE: "WhatsApp message", PLAN: "Plan", SUBSCRIPTION: "Subscription",
  INVOICE: "Invoice", REFUND: "Refund", PAYMENT: "Payment", AUDIT_LOG: "Audit export", AUDIT_INVESTIGATION: "Investigation",
};

const humanize = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_.]/g, " ").replace(/^./, (c) => c.toUpperCase());
const resourceLabel = (type: string) => RESOURCE_LABELS[type] ?? humanize(type.toLowerCase());

function changesOf(metadata: Record<string, unknown> | null): FieldChange[] {
  if (!metadata) return [];
  const changes: FieldChange[] = [];
  const used = new Set<string>();
  for (const key of Object.keys(metadata)) {
    const match = /^previous([A-Z].*)$/.exec(key);
    if (!match) continue;
    const base = match[1]!;
    const next = metadata[`new${base}`];
    if (next === undefined) continue;
    used.add(key);
    used.add(`new${base}`);
    changes.push({ key: base, label: humanize(base), kind: "changed", before: String(metadata[key]), after: String(next), redacted: false });
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (used.has(key)) continue;
    if (key === "changedFields" && Array.isArray(value)) {
      for (const field of value) if (typeof field === "string") changes.push({ key: field, label: humanize(field), kind: "changed", before: null, after: null, redacted: false });
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      changes.push({ key, label: humanize(key), kind: "added", before: null, after: String(value), redacted: false });
    }
  }
  return changes;
}

export function toAuditEvent(item: SuperAdminAuditLogItem): AuditEvent {
  const system = item.actor.type === "SYSTEM";
  const staff = item.actor.platformRole === "SUPER_ADMIN" || item.actor.platformRole === "SUPPORT";
  const displayName = item.actor.name?.trim() || item.actor.email || (system ? "System" : "Unknown user");
  const actor: ActorSnapshot = {
    type: system ? "system" : staff ? "staff" : "company_user",
    id: item.actor.userId,
    displayName,
    email: item.actor.email,
    roleAtEvent: item.actor.platformRole,
    scopeAtEvent: item.companyName ?? "Platform",
    attemptedIdentifier: null,
    authContext: null,
  };
  const resource = resourceLabel(item.resourceType);
  const target: TargetSnapshot = {
    type: item.resourceType,
    id: item.resourceId ?? item.id,
    displayName: item.resourceId ? `${resource} ${item.resourceId.slice(0, 8)}` : resource,
    parent: item.companyId ? { type: "Company", id: item.companyId, name: item.companyName ?? "Company" } : null,
    href: null,
  };
  const outcome: AuditOutcome = item.outcome === "FAILURE" ? "failed" : "success";
  const reason = typeof item.metadata?.reason === "string" ? item.metadata.reason : null;
  const where = item.companyName ? ` in ${item.companyName}` : "";
  return {
    id: item.id,
    schemaVersion: 1,
    occurredAt: item.createdAt,
    recordedAt: item.createdAt,
    category: item.category,
    actionKey: item.action,
    actionLabel: item.label,
    actor,
    target,
    scope: { level: item.clientId ? "client" : item.companyId ? "company" : "platform", companyId: item.companyId, companyName: item.companyName, clientId: item.clientId, clientName: item.clientName },
    outcome,
    priority: item.priority === "high" ? "high" : item.priority === "review_recommended" ? "review_recommended" : "informational",
    sensitiveCategory: item.sensitiveCategory,
    changes: changesOf(item.metadata),
    summary: `${displayName}: ${item.label}${where}${outcome === "failed" ? " (failed)" : ""}.`,
    reason,
    environment: "production",
    sourceModule: item.module,
    producer: system ? "Background worker" : "API request",
    requestId: item.requestId,
    correlationId: null,
    workflowStage: null,
    securityView: item.securityView,
    related: [],
    technical: { ipAddress: item.ipAddress, userAgent: item.userAgent, sessionRef: null, producerService: "OmniPlatform backend", ingestion: "Written in the same transaction as the change" },
    integrity: { status: "verified", note: "The database refuses any edit or delete of an audit record." },
    followUp: null,
  };
}

/** Filters the backend understands. Filters it cannot honour make the result empty rather than silently ignored. */
function filterParams(query: EventQuery): { params: Record<string, string | number | boolean | undefined>; impossible: boolean } {
  const impossible =
    Boolean(query.workflowStage) ||
    Boolean(query.correlationId) ||
    (query.outcome !== undefined && !["success", "failed", "denied"].includes(query.outcome)) ||
    (query.actorType !== undefined && !["staff", "company_user", "system"].includes(query.actorType));
  const params: Record<string, string | number | boolean | undefined> = {
    from: query.window?.from,
    to: query.window?.to,
    search: query.search?.trim() || undefined,
    category: query.category,
    outcome: query.outcome === "success" ? "SUCCESS" : query.outcome === "failed" || query.outcome === "denied" ? "FAILURE" : undefined,
    actorType: query.actorType,
    companyId: query.companyId,
    clientId: query.clientId,
    quick: query.quick,
    action: query.actionKey,
    priority: query.priority,
    actorUserId: query.actorId,
    resourceType: query.resourceType,
    module: query.sourceModule,
    requestId: query.requestId,
    sensitiveOnly: query.sensitiveOnly,
    sensitiveCategory: query.sensitiveCategory,
    securityView: query.securityView,
  };
  // One exact event (used by "export this event").
  if (query.eventId) params.search = query.eventId;
  return { params, impossible };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (n: number) => String(n).padStart(2, "0");
function pointLabel(at: string, unit: "hour" | "day" | "week"): string {
  const d = new Date(at);
  return unit === "hour" ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${two(d.getUTCHours())}:00` : `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const windowParams = (w: DateWindow) => ({ from: w.from, to: w.to });

/** What the platform does not record yet. Honest, not computed: these services emit no audit events. */
const KNOWN_GAPS: Array<{ id: string; module: string; summary: string }> = [
  { id: "gap_auth", module: "Authentication", summary: "Sign-ins, failed sign-ins, MFA verification and lockouts are not recorded as audit events yet." },
  { id: "gap_usage", module: "Usage & Limits", summary: "Usage overrides, limit policy changes and alert acknowledgements are not recorded yet." },
  { id: "gap_health", module: "System Health", summary: "Incident creation and status changes are not recorded yet." },
  { id: "gap_jobs", module: "Jobs & Queues", summary: "Queue monitoring is read-only today, so there are no job actions to record." },
  { id: "gap_notifications", module: "Notifications", summary: "Platform notifications sent to Companies are not recorded yet." },
];

const MODULE_HREFS: Record<string, string | null> = {
  Companies: "/super-admin/companies",
  Users: "/super-admin/users",
  Team: "/super-admin/users",
  "Internal Team": "/super-admin/team",
  Clients: "/super-admin/clients",
  "Plans & Subscriptions": "/super-admin/plans",
  "Billing & Payments": "/super-admin/billing",
  Integrations: "/super-admin/integrations",
  "API Monitoring": "/super-admin/api-monitoring",
};

const asInvestigation = (value: unknown) => value as Investigation;

export const apiAuditProvider: AuditRepository = {
  mode: "live",

  async getOverview(window: DateWindow): Promise<AuditOverview> {
    const [live, cases] = await Promise.all([superAdminAuditLogsApi.overview(windowParams(window)), auditInvestigationsApi.list() as Promise<InvestigationList>]);
    const attention: AttentionItem[] = live.attention.map((item) => ({
      id: `att_${item.id}`,
      eventId: item.id,
      label: item.outcome === "FAILURE" ? "Failed" : "Review Recommended",
      title: item.label,
      detail: toAuditEvent(item).summary,
      at: item.createdAt,
      href: auditRoutes.event(item.id),
    }));
    return {
      window,
      environment: "all",
      kpis: {
        total: live.kpis.total,
        sensitive: live.kpis.sensitive,
        failedDenied: live.kpis.failed,
        accessChanges: live.kpis.accessChanges,
        authFailures: live.kpis.authFailures,
        configChanges: live.kpis.configChanges,
        openInvestigations: cases.counts.open + cases.counts.inReview + cases.counts.awaiting,
        collectionIssues: KNOWN_GAPS.length,
      },
      categories: live.categories,
      attention,
      recentSensitive: live.recentSensitive.map(toAuditEvent),
      lastRecordedAt: live.lastRecordedAt,
      source: {
        dataSource: "OmniPlatform audit log (PostgreSQL)",
        ingestion: "Recorded in the same transaction as each change",
        collection: `${live.totalRecorded.toLocaleString()} records in total`,
        lastReceivedAt: live.lastRecordedAt,
        knownGaps: KNOWN_GAPS.length,
        storageVerification: "Append-only: the database refuses edits and deletes",
        integrity: "Enforced by the database",
        retentionExecution: "Nothing is deleted automatically",
        productionCoverage: "Covers Companies, Users, Team, Clients, Content, Integrations, Plans, Billing and Internal Team",
      },
    };
  },

  async getActivity(window: DateWindow, metric: string): Promise<{ unit: "hour" | "day" | "week"; points: ActivityPoint[] }> {
    const res = await superAdminAuditLogsApi.activity({ ...windowParams(window), metric });
    return { unit: res.unit, points: res.points.map((p): ActivityPoint => ({ at: p.at, label: pointLabel(p.at, res.unit), value: p.value })) };
  },

  async listEvents(query: EventQuery): Promise<EventPage> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const { params, impossible } = filterParams(query);
    if (impossible) return { rows: [], total: 0, page, pageSize };
    const res = await superAdminAuditLogsApi.list({ ...params, page, limit: pageSize, sort: query.sort === "oldest" ? "oldest" : query.sort === "actor" ? "actor" : "newest" });
    return { rows: res.items.map(toAuditEvent), total: res.total, page: res.page, pageSize: res.limit };
  },

  async getFacets(): Promise<EventFacets> {
    const res = await superAdminAuditLogsApi.facets();
    return {
      actors: res.actors.map((a) => ({ id: a.id, name: a.name, type: a.type })),
      companies: res.companies,
      actions: res.actions,
      resourceTypes: res.resourceTypes,
      sourceModules: res.sourceModules,
    };
  },

  async getScopeOptions(): Promise<ScopeOption[]> {
    const companies = await superAdminCompaniesApi.list({ limit: 100 });
    const clients: Array<{ id: string; name: string; companyId: string }> = [];
    for (let page = 1; page <= 20; page += 1) {
      const res = await superAdminCompaniesApi.listClients({ page, limit: 100 });
      clients.push(...res.items.map((c) => ({ id: c.id, name: c.displayName?.trim() || c.name, companyId: c.companyId })));
      if (clients.length >= res.total || res.items.length === 0) break;
    }
    return companies.items.map((c) => ({ id: c.id, name: c.name, clients: clients.filter((client) => client.companyId === c.id).map(({ id, name }) => ({ id, name })) }));
  },

  async getEvent(id: string): Promise<EventDetail> {
    const [item, cases] = await Promise.all([superAdminAuditLogsApi.detail(id), auditInvestigationsApi.list({ eventId: id }) as Promise<InvestigationList>]);
    return {
      event: toAuditEvent(item),
      workflow: [],
      linkedInvestigations: cases.rows.map((row) => ({ id: row.investigation.id, title: row.investigation.title, status: row.investigation.status })),
      sameRequest: item.sameRequest.map(toAuditEvent),
    };
  },

  async getSecurityCounts(window) {
    const { security } = await superAdminAuditLogsApi.counts(windowParams(window));
    return { authentication: security.authentication, user_access: security.user_access, staff: security.staff, policies: security.policies };
  },

  async getSensitiveCounts(window): Promise<Record<SensitiveCategory, number>> {
    const { sensitive } = await superAdminAuditLogsApi.counts(windowParams(window));
    return { ...sensitive, feature_flags: 0, maintenance_availability: 0 };
  },

  async getSettings(): Promise<SettingsData> {
    const [coverage, exported] = await Promise.all([superAdminAuditLogsApi.coverage(), superAdminAuditLogsApi.list({ action: "audit.exported", limit: 1 })]);
    const rows: CoverageRow[] = coverage.modules.map((m) => ({
      module: m.module,
      category: m.category,
      expectedEvents: [`${m.definedActions} kinds of events are defined for this module`],
      collection: m.recordedCount > 0 ? "configured" : "verification_pending",
      verification: m.recordedCount > 0 ? "verified" : "not_verified",
      lastRecordedAt: m.lastRecordedAt,
      recordedCount: m.recordedCount,
      note: m.recordedCount > 0 ? `${m.recordedActions} of ${m.definedActions} defined event kinds have been recorded.` : "Defined, but no event of this module has been recorded yet.",
      href: MODULE_HREFS[m.module] ?? null,
    }));
    return {
      coverage: rows,
      gaps: KNOWN_GAPS.map((gap) => ({ ...gap, since: coverage.firstRecordedAt ?? new Date().toISOString() })),
      retention: {
        retentionDays: 0,
        effectiveSince: coverage.firstRecordedAt,
        owner: "Platform",
        archiveBehavior: "Records stay in the database.",
        expiryPolicy: coverage.retention.note,
        legalHold: "Not applicable: nothing is deleted.",
        policyHref: "/super-admin/settings",
      },
      exportGovernance: {
        requiredCapability: "Super Admin",
        allowedScope: `Up to ${coverage.maxRangeDays} days and ${coverage.maxExportRows.toLocaleString()} records per export`,
        reasonRequired: true,
        maxRangeDays: coverage.maxRangeDays,
        redaction: "IP addresses, browsers and event details are left out unless you choose to include them.",
        approval: "No approval step; every export is recorded.",
        loggingPolicy: "Each export is written to the audit trail with who, when, how many records and why.",
        loggedExports: exported.total,
      },
      status: {
        dataSource: "OmniPlatform audit log (PostgreSQL)",
        ingestion: "Recorded in the same transaction as each change",
        collection: `${coverage.totalRecorded.toLocaleString()} records in total`,
        lastReceivedAt: coverage.lastRecordedAt,
        knownGaps: KNOWN_GAPS.length,
        storageVerification: "Append-only: the database refuses edits and deletes",
        integrity: "Enforced by the database",
        retentionExecution: "Nothing is deleted automatically",
        productionCoverage: "Covers Companies, Users, Team, Clients, Content, Integrations, Plans, Billing and Internal Team",
      },
    };
  },

  async exportEvents(request: ExportRequest): Promise<ExportResult> {
    const { params } = filterParams(request.query);
    const { from, to, ...filters } = params;
    return superAdminAuditLogsApi.export({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)),
      from,
      to,
      format: request.format,
      reason: request.reason,
      includeSensitive: request.includeSensitive,
    });
  },

  /* ------------------------------ investigations ------------------------------ */

  async listInvestigations(query: InvestigationQuery): Promise<InvestigationList> {
    return (await auditInvestigationsApi.list({ ...query } as Record<string, string | undefined>)) as InvestigationList;
  },

  async getInvestigation(id: string): Promise<InvestigationDetail> {
    const res = await auditInvestigationsApi.get(id);
    return {
      investigation: asInvestigation(res.investigation),
      events: res.events.map((entry) => ({ link: entry.link as InvestigationDetail["events"][number]["link"], event: entry.event ? toAuditEvent(entry.event) : null })),
      related: res.related as InvestigationDetail["related"],
    };
  },

  async listOwners(): Promise<OwnerOption[]> {
    return auditInvestigationsApi.owners();
  },

  async createInvestigation(input) {
    return asInvestigation(await auditInvestigationsApi.create({ ...input }));
  },

  async checkLink(investigationId, eventId): Promise<LinkCheck> {
    return auditInvestigationsApi.linkCheck(investigationId, eventId);
  },

  async addEvents(investigationId, eventIds, note): Promise<AddEventsResult> {
    return (await auditInvestigationsApi.addEvents(investigationId, { eventIds, note })) as AddEventsResult;
  },

  async unlinkEvent(investigationId, eventId) {
    return asInvestigation(await auditInvestigationsApi.unlink(investigationId, eventId));
  },

  async editRelevance(investigationId, eventId, note) {
    return asInvestigation(await auditInvestigationsApi.relevance(investigationId, eventId, note));
  },

  async addNote(investigationId, text, _actor, correctsNoteId = null) {
    return asInvestigation(await auditInvestigationsApi.addNote(investigationId, { text, correctsNoteId }));
  },

  async changeOwner(investigationId, ownerId, reason) {
    return asInvestigation(await auditInvestigationsApi.changeOwner(investigationId, { ownerId, reason }));
  },

  async changeStatus(investigationId, status) {
    return asInvestigation(await auditInvestigationsApi.changeStatus(investigationId, status));
  },

  async changePriority(investigationId, priority) {
    return asInvestigation(await auditInvestigationsApi.changePriority(investigationId, priority));
  },

  async closeInvestigation(investigationId, input) {
    return asInvestigation(await auditInvestigationsApi.close(investigationId, input));
  },
};
