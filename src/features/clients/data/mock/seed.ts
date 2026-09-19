/**
 * Deterministic demo extras for clients that have never been changed.
 *
 * The core client, its team access and its connections already exist in the
 * company bundle (they are the Companies module's records). This adds only what
 * the Companies module does not model - websites, onboarding requirements,
 * operations counters, lifecycle history and a client activity trail - derived
 * from those records and a stable hash, so every load looks identical and the
 * numbers agree with the records they describe.
 */
import { STAFF } from "@/features/companies/data/mock/dataset";
import type { CompanyBundle, CompanyClient, CompanyUser } from "@/features/companies/data/types";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { daysAgo, minutesAgo } from "@/mocks/lib/random";
import { DEFAULT_REQUIRED_STEPS, PAUSE_REASONS } from "../config";
import { hash } from "../selectors";
import type { ClientActivity, ClientDetailRecord, ClientLifecycleEvent, ClientWebsite } from "../types";

const DAY_MS = 86_400_000;

export function slugify(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client";
}

export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function plusDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

export function buildWebsite(client: Pick<CompanyClient, "id" | "companyId" | "createdAt">, url: string, index: number, salt: number): ClientWebsite {
  const domain = domainOf(url) ?? url;
  const h = hash(`${client.id}:${domain}:${salt}`);
  const stopped = h % 11 === 0;
  const paused = !stopped && h % 13 === 0;
  return {
    id: `web_${client.id}_${index}`,
    clientId: client.id,
    companyId: client.companyId,
    url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    domain,
    addedAt: client.createdAt,
    monitoring: stopped ? "stopped" : paused ? "paused" : "active",
    availability: h % 23 === 0 ? "down" : "up",
    lastCheckedAt: stopped ? daysAgo(6 + (h % 9)) : minutesAgo(5 + (h % 90)),
    lastCrawlAt: daysAgo(1 + (h % 6)),
    pagesDiscovered: 30 + (h % 820),
    criticalIssues: h % 12 === 0 ? 1 + (h % 3) : 0,
    warnings: h % 5 === 0 ? 0 : h % 9,
    sitemap: h % 6 === 0 ? "missing" : "found",
    robots: h % 19 === 0 ? "missing" : "found",
    redirect: h % 6 === 0 ? "http to https, www to apex" : null,
    dataSource: "demo",
  };
}

const LEAD_ROLES = new Set(["owner", "admin", "project_admin", "marketing_manager"]);

function pickLead(users: CompanyUser[]): CompanyUser | undefined {
  const active = users.filter((user) => user.status === "active");
  return active.find((user) => LEAD_ROLES.has(user.role)) ?? active[0];
}

const REVIEWERS = STAFF.filter((member) => member.status === "active" && (member.role === "operations" || member.role === "super_admin"));

export function seedClientDetail(bundle: CompanyBundle, client: CompanyClient): ClientDetailRecord {
  const h = hash(client.id);
  const { company } = bundle;
  const owner = bundle.users.find((user) => user.id === company.ownerUserId);
  const createdBy = owner?.name ?? "Company admin";
  const assigned = bundle.users.filter((user) => user.clientAccessIds.includes(client.id));
  const active = client.status === "active" || client.status === "onboarding";
  const integrations = bundle.integrations.filter((item) => item.clientId === client.id);

  const websites: ClientWebsite[] = [];
  if (client.websiteUrl) {
    websites.push(buildWebsite(client, client.websiteUrl, 1, 1));
    const domain = domainOf(client.websiteUrl);
    if (domain && h % 5 === 0) websites.push(buildWebsite(client, `https://blog.${domain}`, 2, 2));
    if (domain && h % 10 === 0) websites.push(buildWebsite(client, `https://shop.${domain}`, 3, 3));
  }

  const leadCandidate = pickLead(assigned);
  const leadUserId = h % 8 === 1 ? null : (leadCandidate?.id ?? null);
  const primary = websites[0] ?? null;
  const primaryDomain = domainOf(client.websiteUrl);

  const events: ClientLifecycleEvent[] = [{ id: `cle_${client.id}_1`, at: client.createdAt, type: "created", by: createdBy, reason: null }];
  const pause =
    client.status === "paused"
      ? { reason: PAUSE_REASONS[h % PAUSE_REASONS.length]!.value, note: "", pausedAt: daysAgo(10 + (h % 30)), pausedBy: createdBy }
      : null;
  if (pause) events.push({ id: `cle_${client.id}_2`, at: pause.pausedAt, type: "paused", by: pause.pausedBy, reason: pause.reason });
  const archive =
    client.status === "archived" ? { archivedAt: daysAgo(30 + (h % 60)), archivedBy: "Aditya Raghunath", note: "" } : null;
  if (archive) events.push({ id: `cle_${client.id}_3`, at: archive.archivedAt, type: "archived", by: archive.archivedBy, reason: null });

  const detail: ClientDetailRecord = {
    clientId: client.id,
    companyId: company.id,
    profile: {
      displayName: client.name,
      industry: company.profile.industry,
      description: `${client.name} - a workspace managed by ${company.name}.`,
      contactEmail: h % 9 === 0 || !company.domain ? null : `${slugify(client.name)}@${company.domain}`,
      contactPhone: company.profile.contactPhone,
      logoDataUrl: null,
      timezone: company.profile.timezone,
      language: company.profile.language,
      reportingPeriod: "30d",
      createdBy,
    },
    websites,
    primaryWebsiteId: primary?.id ?? null,
    searchConfig: {
      gscProperty: primaryDomain && h % 3 === 0 ? `sc-domain:${primaryDomain}` : null,
      ga4MeasurementId: primaryDomain && h % 4 === 0 ? `G-${(h % 9_000_000) + 1_000_000}` : null,
    },
    leadUserId,
    assignments: {},
    onboarding: {
      required: { ...DEFAULT_REQUIRED_STEPS },
      accessReviewedAt: h % 3 !== 0 ? plusDays(client.createdAt, 3) : null,
      accessReviewedBy: h % 3 !== 0 ? "Daniel Okafor" : null,
    },
    operations: {
      processingJobs: active ? h % 3 : 0,
      retryPending: active ? Math.min(client.failedPosts, h % 3) : 0,
      lastPublishedAt: active && (client.scheduledPosts > 0 || h % 2 === 0) ? minutesAgo(30 + (h % 3000)) : null,
      activeAutomations: active ? h % 4 : 0,
      pendingApprovals: active && h % 9 === 0 ? { count: 2 + (h % 3), oldestAt: daysAgo(4 + (h % 5)) } : null,
    },
    lifecycle: { pause, archive, events },
    platformReviewerId: h % 4 === 0 && REVIEWERS.length > 0 ? REVIEWERS[h % REVIEWERS.length]!.id : null,
    activity: [],
  };

  // --- A believable trail, built from the records that exist ----------------
  const trail: ClientActivity[] = [];
  const push = (entry: Omit<ClientActivity, "id" | "clientId" | "companyId" | "result" | "previousValue" | "newValue" | "reason" | "correlationId"> & Partial<ClientActivity>) =>
    trail.push({
      id: `cact_${client.id}_${String(trail.length + 1).padStart(3, "0")}`,
      clientId: client.id,
      companyId: company.id,
      result: "success",
      previousValue: null,
      newValue: null,
      reason: null,
      correlationId: `req_${(hash(`${client.id}:${trail.length}`) % 900000) + 100000}`,
      ...entry,
    });

  const customer = { id: owner?.id ?? "owner", name: createdBy, type: "customer" as const };
  const system = { id: "system", name: "Platform Scheduler", type: "system" as const };

  push({ at: client.createdAt, actor: customer, action: "client.created", summary: `Client ${client.name} was created`, module: "client", entity: { type: "client", id: client.id, label: client.name }, severity: "info" });
  if (primary) {
    push({ at: plusDays(client.createdAt, 0.01), actor: customer, action: "website.added", summary: `Website ${primary.domain} was configured`, module: "website", entity: { type: "website", id: primary.id, label: primary.domain }, severity: "info", newValue: primary.domain });
  }
  assigned.slice(0, 3).forEach((user, index) => {
    push({ at: plusDays(client.createdAt, 0.5 + index * 0.4), actor: customer, action: "team.member_assigned", summary: `${user.name} was assigned to the client`, module: "team", entity: { type: "membership", id: user.id, label: user.name }, severity: "info", newValue: "Access granted" });
  });
  for (const connection of integrations.slice(0, 4)) {
    const label = INTEGRATION_PROVIDER[connection.provider].label;
    push({ at: plusDays(client.createdAt, 1 + (hash(connection.id) % 12)), actor: customer, action: "channel.connected", summary: `${label} account ${connection.accountName} was connected`, module: "channels", entity: { type: "connection", id: connection.id, label: connection.accountName }, severity: "info" });
  }
  for (const connection of integrations.filter((item) => item.state === "needs_reconnect" || item.state === "permission_issue")) {
    const label = INTEGRATION_PROVIDER[connection.provider].label;
    push({ at: connection.lastError?.occurredAt ?? connection.lastSyncAt, actor: system, action: connection.state === "needs_reconnect" ? "channel.connection_expired" : "channel.permission_revoked", summary: `${label} ${connection.state === "needs_reconnect" ? "connection expired" : "permission was revoked"}`, module: "channels", entity: { type: "connection", id: connection.id, label: connection.accountName }, severity: "warning", result: "failure", previousValue: "Healthy", newValue: connection.state === "needs_reconnect" ? "Needs reconnect" : "Permission issue" });
  }
  if (client.failedPosts > 0) {
    push({ at: bundle.jobs.lastFailureAt ?? client.lastActivityAt, actor: system, action: "post.publish_failed", summary: `${client.failedPosts} scheduled ${client.failedPosts === 1 ? "post" : "posts"} failed to publish`, module: "jobs", entity: { type: "job", id: `job_${client.id}`, label: "Scheduled publishing" }, severity: client.failedPosts >= 2 ? "critical" : "warning", result: "failure" });
  }
  if (primary) {
    push({ at: primary.lastCrawlAt ?? client.lastActivityAt, actor: system, action: "website.crawl_completed", summary: `Website crawl completed for ${primary.domain} (demo data)`, module: "website", entity: { type: "website", id: primary.id, label: primary.domain }, severity: primary.criticalIssues > 0 ? "warning" : "info" });
  }
  if (pause) {
    push({ at: pause.pausedAt, actor: { id: "owner", name: pause.pausedBy, type: "staff" }, action: "client.paused", summary: "Client workspace was paused", module: "client", entity: { type: "client", id: client.id, label: client.name }, severity: "warning", previousValue: "Active", newValue: "Paused", reason: pause.reason.replace(/_/g, " ") });
  }
  if (archive) {
    push({ at: archive.archivedAt, actor: { id: "stf_001", name: archive.archivedBy, type: "staff" }, action: "client.archived", summary: "Client workspace was archived", module: "client", entity: { type: "client", id: client.id, label: client.name }, severity: "warning", previousValue: "Active", newValue: "Archived" });
  }

  detail.activity = trail.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return detail;
}
