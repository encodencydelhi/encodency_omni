/**
 * Demo implementation of `ClientsRepository`.
 *
 * It does not keep a client store of its own. Clients live in the company
 * bundles owned by the Companies module; client-specific extras live beside them
 * in `bundle.clientDetails`. Every mutation therefore updates the one shared
 * record (a paused client is a paused `CompanyClient`, an assignment is a
 * `CompanyUser.clientAccessIds` entry) and Companies, Clients and the derived
 * counts cannot disagree.
 *
 * Behaves like a remote service (asynchronous, throws `ApiError`) and never
 * claims to have changed a provider, job, session or message.
 *
 * Only `repository.ts` imports this file.
 */
import { env } from "@/config/env";
import { nowIso, platformNow } from "@/features/companies/data/clock";
import { PLAN_CATALOGUE, STAFF } from "@/features/companies/data/mock/dataset";
import { allBundles, findBundle, resetDemoState, writeBundle } from "@/features/companies/data/mock/store";
import { computeUsage, type DerivationContext } from "@/features/companies/data/selectors";
import type { CompanyActivity, CompanyBundle, CompanyClient, CompanyUser } from "@/features/companies/data/types";
import { ApiError } from "@/types/api";
import { INTEGRATION_PROVIDER, type IntegrationProvider } from "@/types/domain/integration";
import { ARCHIVE_SLOT_POLICY, ACCESS_LEVEL_META, PAUSE_REASON_LABEL } from "./config";
import { domainOf, seedClientDetail } from "./mock/seed";
import type { ClientsRepository, LifecycleAction } from "./repository";
import {
  applyClientListQuery,
  assignmentsFor,
  clientNumbering,
  computeClientPortfolio,
  computeClientSummary,
  computeClientUsage,
  computeSearchAnalytics,
  connectionsFor,
  creationCompany,
  defaultAccessLevel,
  eligibleMembers,
  filterClients,
  primaryWebsiteOf,
  sortClients,
  workspaceOf,
} from "./selectors";
import type {
  BulkResult,
  ClientActivity,
  ClientActivityModule,
  ClientDetailRecord,
  ClientSummary,
  ClientWebsite,
  CreateClientInput,
  MutationActor,
  UpdateClientInput,
} from "./types";

/* ------------------------------------------------------------------ */
/* Plumbing                                                            */
/* ------------------------------------------------------------------ */

function wait(kind: "read" | "write"): Promise<void> {
  const base = kind === "read" ? env.mockLatencyMs * 0.6 : env.mockLatencyMs * 1.1;
  return new Promise((resolve) => setTimeout(resolve, Math.round(base)));
}

function context(): DerivationContext {
  return { now: platformNow(), plans: PLAN_CATALOGUE, staff: STAFF };
}

function fail(code: ConstructorParameters<typeof ApiError>[0]["code"], message: string, fieldErrors?: Record<string, string>): never {
  const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "CONFLICT" ? 409 : 422;
  throw new ApiError({ code, status, message, fieldErrors });
}

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}${sequence}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUrl(value: string): boolean {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.includes(".");
  } catch {
    return false;
  }
}

function normaliseUrl(value: string): string {
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
}

interface Located {
  bundle: CompanyBundle;
  client: CompanyClient;
  detail: ClientDetailRecord;
}

function locate(clientId: string): Located {
  for (const bundle of allBundles()) {
    const client = bundle.clients.find((item) => item.id === clientId);
    if (client) return { bundle, client, detail: bundle.clientDetails?.[client.id] ?? seedClientDetail(bundle, client) };
  }
  return fail("NOT_FOUND", `Client ${clientId} was not found.`);
}

function everyClient(): Located[] {
  return allBundles().flatMap((bundle) =>
    bundle.clients.map((client) => ({ bundle, client, detail: bundle.clientDetails?.[client.id] ?? seedClientDetail(bundle, client) })),
  );
}

function summaryOf(located: Located, numbers?: Map<string, string>): ClientSummary {
  const map = numbers ?? clientNumbering(allBundles());
  return computeClientSummary(context(), located.bundle, located.client, located.detail, map.get(located.client.id) ?? "CL-0000");
}

function allSummaries(): ClientSummary[] {
  const numbers = clientNumbering(allBundles());
  return everyClient().map((located) => summaryOf(located, numbers));
}

/* ------------------------------------------------------------------ */
/* Writing: one function every mutation goes through                   */
/* ------------------------------------------------------------------ */

interface Draft {
  action: string;
  summary: string;
  module: ClientActivityModule;
  entity?: { type: string; id: string; label: string };
  severity?: ClientActivity["severity"];
  result?: ClientActivity["result"];
  previous?: string | null;
  next?: string | null;
  reason?: string | null;
}

interface Patch {
  client?: CompanyClient;
  detail?: ClientDetailRecord;
  users?: CompanyUser[];
  integrations?: CompanyBundle["integrations"];
}

/**
 * Applies a change to the client, its team access and its connections in one go,
 * records the client activity, and mirrors it into the company's activity log so
 * the Companies module shows the same history.
 */
function persist(located: Located, actor: MutationActor, drafts: Draft[], patch: Patch): ClientSummary {
  const client = patch.client ?? located.client;
  const detail = patch.detail ?? located.detail;
  const at = nowIso();

  const entries: ClientActivity[] = drafts.map((draft, index) => ({
    id: nextId(`cact_${client.id}`),
    clientId: client.id,
    companyId: client.companyId,
    at: new Date(Date.parse(at) + index).toISOString(),
    actor: { id: actor.id, name: actor.name, type: "staff" },
    action: draft.action,
    summary: draft.summary,
    module: draft.module,
    entity: draft.entity ?? { type: "client", id: client.id, label: client.name },
    severity: draft.severity ?? "info",
    result: draft.result ?? "success",
    previousValue: draft.previous ?? null,
    newValue: draft.next ?? null,
    reason: draft.reason ?? null,
    correlationId: `req_${Math.floor(100000 + Math.random() * 899999)}`,
  }));

  const mirrored: CompanyActivity[] = entries.map((entry) => ({
    id: nextId(`act_${client.companyId}`),
    companyId: client.companyId,
    at: entry.at,
    actor: entry.actor,
    action: entry.action,
    summary: `${client.name}: ${entry.summary}`,
    module: "clients",
    entity: { type: "client", id: client.id, label: client.name },
    severity: entry.severity,
    result: entry.result,
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    reason: entry.reason,
    correlationId: entry.correlationId,
  }));

  const next: CompanyBundle = {
    ...located.bundle,
    clients: located.bundle.clients.map((item) => (item.id === client.id ? client : item)),
    users: patch.users ?? located.bundle.users,
    integrations: patch.integrations ?? located.bundle.integrations,
    activity: [...mirrored.reverse(), ...located.bundle.activity],
    clientDetails: { ...located.bundle.clientDetails, [client.id]: { ...detail, activity: [...entries.reverse(), ...detail.activity] } },
  };
  writeBundle(next);
  return summaryOf({ bundle: next, client, detail: next.clientDetails![client.id]! });
}

function blankWebsite(client: CompanyClient, url: string, index: number): ClientWebsite {
  const normalised = normaliseUrl(url);
  return {
    id: `web_${client.id}_${index}`,
    clientId: client.id,
    companyId: client.companyId,
    url: normalised,
    domain: domainOf(normalised) ?? normalised,
    addedAt: nowIso(),
    // A new website has been checked by nothing yet; the crawler is not connected in this phase.
    monitoring: "active",
    availability: "unknown",
    lastCheckedAt: null,
    lastCrawlAt: null,
    pagesDiscovered: null,
    criticalIssues: 0,
    warnings: 0,
    sitemap: "unknown",
    robots: "unknown",
    redirect: null,
    dataSource: "demo",
  };
}

function nextWebsiteIndex(detail: ClientDetailRecord): number {
  return Math.max(0, ...detail.websites.map((site) => Number(site.id.split("_").at(-1)) || 0)) + 1;
}

function requireActiveWorkspace(located: Located, action: string): void {
  if (workspaceOf(located.client) === "archived") fail("CONFLICT", `${located.client.name} is archived and cannot be changed (${action}).`);
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export const mockClientsProvider: ClientsRepository = {
  mode: "mock",

  async listClients(query) {
    await wait("read");
    return applyClientListQuery(allSummaries(), query, platformNow());
  },

  async exportClients({ query, ids }) {
    await wait("read");
    let summaries = allSummaries();
    if (ids) summaries = summaries.filter((item) => ids.includes(item.client.id));
    else if (query) summaries = filterClients(summaries, query, platformNow());
    return sortClients(summaries, query?.sort ?? null);
  },

  async getPortfolio() {
    await wait("read");
    return computeClientPortfolio(allSummaries());
  },

  async getFacets() {
    await wait("read");
    const summaries = allSummaries();
    const companies = new Map(summaries.map((item) => [item.company.id, { id: item.company.id, name: item.company.name, planName: item.company.planName }]));
    const providers = new Set<IntegrationProvider>();
    summaries.forEach((item) => item.connectedProviders.forEach((provider) => providers.add(provider)));
    return {
      companies: [...companies.values()].sort((a, b) => a.name.localeCompare(b.name)),
      providers: (Object.keys(INTEGRATION_PROVIDER) as IntegrationProvider[]).filter((provider) => providers.has(provider)),
    };
  },

  async listCreationCompanies() {
    await wait("read");
    const ctx = context();
    return allBundles().map((bundle) => creationCompany(ctx, bundle)).sort((a, b) => a.name.localeCompare(b.name));
  },

  async listEligibleMembers(companyId, clientId) {
    await wait("read");
    const bundle = findBundle(companyId);
    if (!bundle) return fail("NOT_FOUND", `Company ${companyId} was not found.`);
    return eligibleMembers(bundle, clientId ? bundle.clients.find((client) => client.id === clientId) : undefined);
  },

  async getClient(id) {
    await wait("read");
    return summaryOf(locate(id));
  },

  async getOverview(id) {
    await wait("read");
    const located = locate(id);
    const ctx = context();
    return {
      summary: summaryOf(located),
      usage: computeClientUsage(located.bundle, located.client, computeUsage(ctx, located.bundle)),
      team: assignmentsFor(located.bundle, located.client, located.detail),
      connections: connectionsFor(located.bundle, located.client),
      recentActivity: located.detail.activity.slice(0, 8),
      search: computeSearchAnalytics(located.bundle, located.client, located.detail),
    };
  },

  async getTeam(id) {
    await wait("read");
    const located = locate(id);
    return {
      summary: summaryOf(located),
      assignments: assignmentsFor(located.bundle, located.client, located.detail),
      eligibleMembers: eligibleMembers(located.bundle, located.client),
    };
  },

  async getChannels(id) {
    await wait("read");
    const located = locate(id);
    const connections = connectionsFor(located.bundle, located.client);
    const connected = new Set(connections.map((item) => item.provider));
    return {
      summary: summaryOf(located),
      connections,
      unconnectedProviders: (Object.keys(INTEGRATION_PROVIDER) as IntegrationProvider[]).filter((provider) => !connected.has(provider)),
    };
  },

  async getWebsiteSeo(id) {
    await wait("read");
    const located = locate(id);
    return {
      summary: summaryOf(located),
      websites: located.detail.websites,
      primaryWebsiteId: primaryWebsiteOf(located.detail)?.id ?? null,
      search: computeSearchAnalytics(located.bundle, located.client, located.detail),
    };
  },

  async getActivity(id, filter) {
    await wait("read");
    const located = locate(id);
    const term = filter.search?.trim().toLowerCase();
    const from = filter.from ? Date.parse(filter.from) : null;
    const to = filter.to ? Date.parse(filter.to) + 86_400_000 : null;
    const all = located.detail.activity;

    const entries = all.filter((entry) => {
      if (filter.actor && entry.actor.name !== filter.actor) return false;
      if (filter.module && entry.module !== filter.module) return false;
      if (filter.event && entry.action !== filter.event) return false;
      if (filter.severity && entry.severity !== filter.severity) return false;
      if (filter.result && entry.result !== filter.result) return false;
      if (from !== null && Date.parse(entry.at) < from) return false;
      if (to !== null && Date.parse(entry.at) >= to) return false;
      if (term && ![entry.summary, entry.action, entry.actor.name, entry.entity.label].some((field) => field.toLowerCase().includes(term))) return false;
      return true;
    });

    return {
      summary: summaryOf(located),
      entries,
      total: all.length,
      actors: [...new Set(all.map((entry) => entry.actor.name))].sort(),
      events: [...new Set(all.map((entry) => entry.action))].sort(),
    };
  },

  async getSettings(id) {
    await wait("read");
    const located = locate(id);
    return {
      summary: summaryOf(located),
      onboarding: located.detail.onboarding,
      lifecycle: located.detail.lifecycle,
      automations: located.detail.operations.activeAutomations,
      createdBy: located.detail.profile.createdBy,
      createdAt: located.client.createdAt,
      staff: STAFF.filter((member) => member.status === "active"),
    };
  },

  /* --------------------------- create / edit --------------------------- */

  async createClient(input: CreateClientInput, actor) {
    await wait("write");
    const bundle = findBundle(input.companyId);
    if (!bundle) return fail("NOT_FOUND", `Company ${input.companyId} was not found.`);

    const ctx = context();
    const eligibility = creationCompany(ctx, bundle).eligibility;
    if (!eligibility.ok) fail("CONFLICT", eligibility.reason ?? "This company cannot receive new clients.");

    const errors: Record<string, string> = {};
    if (!input.name.trim()) errors.name = "Client name is required.";
    if (input.website && !isValidUrl(input.website)) errors.website = "Enter a valid website URL.";
    if (input.contactEmail && !EMAIL_PATTERN.test(input.contactEmail)) errors.contactEmail = "Enter a valid email address.";
    const members = [...new Set([...input.memberIds, ...(input.leadUserId ? [input.leadUserId] : [])])];
    for (const memberId of members) {
      const user = bundle.users.find((item) => item.id === memberId);
      if (!user) errors.members = "A selected member does not belong to this company.";
      else if (user.status !== "active") errors.members = `${user.name} does not have an active membership.`;
    }
    if (Object.keys(errors).length > 0) fail("VALIDATION_FAILED", "The client could not be created.", errors);

    let index = bundle.clients.length + 1;
    while (bundle.clients.some((item) => item.id === `prj_${bundle.company.slug}_${index}`)) index += 1;
    const id = `prj_${bundle.company.slug}_${index}`;
    const now = nowIso();
    const website = input.website?.trim() ? normaliseUrl(input.website) : null;

    const client: CompanyClient = {
      id,
      companyId: bundle.company.id,
      name: input.name.trim(),
      websiteUrl: website,
      status: "onboarding",
      connectedChannels: [],
      brokenChannels: [],
      scheduledPosts: 0,
      failedPosts: 0,
      leadsLast30Days: 0,
      createdAt: now,
      lastActivityAt: now,
    };

    const site = website ? blankWebsite(client, website, 1) : null;
    const detail: ClientDetailRecord = {
      clientId: id,
      companyId: bundle.company.id,
      profile: {
        displayName: input.displayName?.trim() || client.name,
        industry: input.industry,
        description: input.description?.trim() ?? "",
        contactEmail: input.contactEmail?.trim() || null,
        contactPhone: input.contactPhone?.trim() || null,
        logoDataUrl: input.logoDataUrl ?? null,
        timezone: input.timezone,
        language: input.language,
        reportingPeriod: "30d",
        createdBy: actor.name,
      },
      websites: site ? [site] : [],
      primaryWebsiteId: site?.id ?? null,
      searchConfig: { gscProperty: null, ga4MeasurementId: null },
      leadUserId: input.leadUserId ?? null,
      assignments: Object.fromEntries(
        members.map((memberId) => {
          const user = bundle.users.find((item) => item.id === memberId)!;
          return [memberId, { level: defaultAccessLevel(user.role), assignedAt: now, assignedBy: actor.name }];
        }),
      ),
      onboarding: { required: { identity: true, website: false, lead: true, team: true, channel: true, access_review: false }, accessReviewedAt: null, accessReviewedBy: null },
      operations: { processingJobs: 0, retryPending: 0, lastPublishedAt: null, activeAutomations: 0, pendingApprovals: null },
      lifecycle: { pause: null, archive: null, events: [{ id: nextId("cle"), at: now, type: "created", by: actor.name, reason: null }] },
      platformReviewerId: null,
      activity: [],
    };

    const users = bundle.users.map((user) => (members.includes(user.id) ? { ...user, clientAccessIds: [...user.clientAccessIds, id] } : user));
    const drafts: Draft[] = [{ action: "client.created", summary: `Client ${client.name} was created`, module: "client", next: client.name }];
    if (site) drafts.push({ action: "website.added", summary: `Website ${site.domain} was configured`, module: "website", entity: { type: "website", id: site.id, label: site.domain }, next: site.domain });
    for (const memberId of members) {
      const user = bundle.users.find((item) => item.id === memberId)!;
      drafts.push({ action: "team.member_assigned", summary: `${user.name} was assigned to the client`, module: "team", entity: { type: "membership", id: user.id, label: user.name }, next: ACCESS_LEVEL_META[defaultAccessLevel(user.role)].label });
    }
    if (input.leadUserId) {
      const lead = bundle.users.find((item) => item.id === input.leadUserId)!;
      drafts.push({ action: "client.lead_changed", summary: `${lead.name} was set as client lead`, module: "team", entity: { type: "membership", id: lead.id, label: lead.name }, next: lead.name });
    }

    return persist({ bundle: { ...bundle, clients: [...bundle.clients, client] }, client, detail }, actor, drafts, { client, detail, users });
  },

  async updateClient(id, input: UpdateClientInput, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "edit");
    const { bundle, client, detail } = located;

    const errors: Record<string, string> = {};
    if (!input.name.trim()) errors.name = "Client name is required.";
    if (input.primaryWebsite && !isValidUrl(input.primaryWebsite)) errors.primaryWebsite = "Enter a valid website URL.";
    if (input.contactEmail && !EMAIL_PATTERN.test(input.contactEmail)) errors.contactEmail = "Enter a valid email address.";
    if (input.leadUserId) {
      const lead = bundle.users.find((user) => user.id === input.leadUserId);
      if (!lead) errors.leadUserId = "The client lead must be a member of this company.";
      else if (lead.status !== "active") errors.leadUserId = `${lead.name} does not have an active membership.`;
    }
    if (Object.keys(errors).length > 0) fail("VALIDATION_FAILED", "The client could not be updated.", errors);

    const drafts: Draft[] = [];
    const previousName = client.name;
    const nextName = input.name.trim();
    const changedFields: string[] = [];
    if (nextName !== previousName) changedFields.push("name");
    if (input.displayName.trim() !== detail.profile.displayName) changedFields.push("display name");
    if (input.industry !== detail.profile.industry) changedFields.push("industry");
    if (input.description.trim() !== detail.profile.description) changedFields.push("description");
    if ((input.contactEmail ?? null) !== detail.profile.contactEmail || (input.contactPhone ?? null) !== detail.profile.contactPhone) changedFields.push("contact");
    if ((input.logoDataUrl ?? null) !== detail.profile.logoDataUrl) changedFields.push("logo");
    if (input.timezone !== detail.profile.timezone || input.language !== detail.profile.language || input.reportingPeriod !== detail.profile.reportingPeriod) changedFields.push("workspace defaults");
    if (changedFields.length > 0) drafts.push({ action: "client.updated", summary: `Client details updated (${changedFields.join(", ")})`, module: "settings", previous: previousName, next: nextName });

    // Website: editing the primary field edits the primary website in place; clearing it removes it.
    let websites = detail.websites;
    let primaryWebsiteId = detail.primaryWebsiteId;
    const current = primaryWebsiteOf(detail);
    const wanted = input.primaryWebsite?.trim() ? normaliseUrl(input.primaryWebsite) : null;
    if ((current?.url ?? null) !== wanted) {
      if (wanted === null && current) {
        websites = websites.filter((site) => site.id !== current.id);
        primaryWebsiteId = websites[0]?.id ?? null;
        drafts.push({ action: "website.removed", summary: `Website ${current.domain} was removed`, module: "website", entity: { type: "website", id: current.id, label: current.domain }, previous: current.domain });
      } else if (wanted) {
        const duplicate = websites.find((site) => site.domain === domainOf(wanted) && site.id !== current?.id);
        if (duplicate) fail("CONFLICT", `${duplicate.domain} is already registered for this client.`, { primaryWebsite: "This domain is already a website of this client." });
        if (current) {
          const replaced = { ...blankWebsite(client, wanted, Number(current.id.split("_").at(-1)) || 1), id: current.id };
          websites = websites.map((site) => (site.id === current.id ? replaced : site));
          drafts.push({ action: "website.updated", summary: `Primary website changed to ${replaced.domain}`, module: "website", entity: { type: "website", id: current.id, label: replaced.domain }, previous: current.domain, next: replaced.domain });
        } else {
          const added = blankWebsite(client, wanted, nextWebsiteIndex(detail));
          websites = [...websites, added];
          primaryWebsiteId = added.id;
          drafts.push({ action: "website.added", summary: `Website ${added.domain} was configured`, module: "website", entity: { type: "website", id: added.id, label: added.domain }, next: added.domain });
        }
      }
    }

    // Lead: a member may lead only while assigned; assigning is part of naming them lead.
    let users = bundle.users;
    let assignments = detail.assignments;
    if ((input.leadUserId ?? null) !== detail.leadUserId) {
      const lead = input.leadUserId ? bundle.users.find((user) => user.id === input.leadUserId) : undefined;
      if (lead && !lead.clientAccessIds.includes(client.id)) {
        users = users.map((user) => (user.id === lead.id ? { ...user, clientAccessIds: [...user.clientAccessIds, client.id] } : user));
        assignments = { ...assignments, [lead.id]: { level: defaultAccessLevel(lead.role), assignedAt: nowIso(), assignedBy: actor.name } };
        drafts.push({ action: "team.member_assigned", summary: `${lead.name} was assigned to the client`, module: "team", entity: { type: "membership", id: lead.id, label: lead.name } });
      }
      const previousLead = bundle.users.find((user) => user.id === detail.leadUserId);
      drafts.push({ action: "client.lead_changed", summary: lead ? `${lead.name} was set as client lead` : "Client lead was cleared", module: "team", previous: previousLead?.name ?? "None", next: lead?.name ?? "None" });
    }

    const nextClient: CompanyClient = { ...client, name: nextName, websiteUrl: websites.find((site) => site.id === primaryWebsiteId)?.url ?? null };
    // Connections carry the client's name for display; keep them in step with a rename.
    const integrations = nextName !== previousName ? bundle.integrations.map((item) => (item.clientId === id ? { ...item, clientName: nextName } : item)) : bundle.integrations;

    if (drafts.length === 0) drafts.push({ action: "client.updated", summary: "Client details saved", module: "settings", next: nextName });

    const nextDetail: ClientDetailRecord = {
      ...detail,
      profile: {
        ...detail.profile,
        displayName: input.displayName.trim() || nextName,
        industry: input.industry,
        description: input.description.trim(),
        contactEmail: input.contactEmail?.trim() || null,
        contactPhone: input.contactPhone?.trim() || null,
        logoDataUrl: input.logoDataUrl ?? null,
        timezone: input.timezone,
        language: input.language,
        reportingPeriod: input.reportingPeriod,
      },
      websites,
      primaryWebsiteId,
      leadUserId: input.leadUserId ?? null,
      assignments,
    };
    return persist(located, actor, drafts, { client: nextClient, detail: nextDetail, users, integrations });
  },

  /* ------------------------------ lifecycle ---------------------------- */

  async changeLifecycle(ids, action: LifecycleAction, actor) {
    await wait("write");
    const result: BulkResult = { updated: [], skipped: [] };

    for (const id of ids) {
      let located: Located;
      try {
        located = locate(id);
      } catch {
        result.skipped.push({ id, name: id, reason: "Client not found" });
        continue;
      }
      const { client, detail } = located;
      const state = workspaceOf(client);
      const skip = (reason: string) => result.skipped.push({ id, name: client.name, reason });
      const now = nowIso();

      if (action.kind === "pause") {
        if (state === "paused") { skip("Already paused"); continue; }
        if (state === "archived") { skip("Archived clients cannot be paused"); continue; }
        persist(located, actor, [{ action: "client.paused", summary: "Client workspace was paused", module: "client", severity: "warning", previous: "Active", next: "Paused", reason: `${PAUSE_REASON_LABEL[action.reason]}${action.note ? ` - ${action.note}` : ""}` }], {
          client: { ...client, status: "paused" },
          detail: { ...detail, lifecycle: { ...detail.lifecycle, pause: { reason: action.reason, note: action.note, pausedAt: now, pausedBy: actor.name }, events: [...detail.lifecycle.events, { id: nextId("cle"), at: now, type: "paused", by: actor.name, reason: action.reason }] } },
        });
      } else if (action.kind === "resume") {
        if (state !== "paused") { skip("Only paused clients can be resumed"); continue; }
        const company = located.bundle.company;
        if (company.accountStatus !== "active") { skip(`${company.name} is ${company.accountStatus}`); continue; }
        persist(located, actor, [{ action: "client.resumed", summary: "Client workspace was resumed", module: "client", previous: "Paused", next: "Active", reason: action.note || null }], {
          client: { ...client, status: "active" },
          detail: { ...detail, lifecycle: { ...detail.lifecycle, pause: null, events: [...detail.lifecycle.events, { id: nextId("cle"), at: now, type: "resumed", by: actor.name, reason: action.note || null }] } },
        });
      } else {
        if (state === "archived") { skip("Already archived"); continue; }
        persist(located, actor, [{ action: "client.archived", summary: "Client workspace was archived", module: "client", severity: "warning", previous: state === "paused" ? "Paused" : "Active", next: "Archived", reason: `${action.note || "No reason given"}. ${ARCHIVE_SLOT_POLICY}` }], {
          client: { ...client, status: "archived" },
          detail: { ...detail, lifecycle: { pause: null, archive: { archivedAt: now, archivedBy: actor.name, note: action.note }, events: [...detail.lifecycle.events, { id: nextId("cle"), at: now, type: "archived", by: actor.name, reason: action.note || null }] } },
        });
      }
      result.updated.push(id);
    }
    return result;
  },

  /* -------------------------------- team ------------------------------- */

  async assignMember(id, { membershipId, level }, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "assign a member");
    const { bundle, client, detail } = located;
    // The selector only offers this company's members; the check makes the rule hold for any caller.
    const user = bundle.users.find((item) => item.id === membershipId);
    if (!user) fail("NOT_FOUND", "That person is not a member of this client's company.");
    if (user.status !== "active") fail("CONFLICT", `${user.name} does not have an active company membership, so they cannot be given client access.`);
    if (user.clientAccessIds.includes(id)) fail("CONFLICT", `${user.name} already has access to this client.`);

    const users = bundle.users.map((item) => (item.id === user.id ? { ...item, clientAccessIds: [...item.clientAccessIds, id] } : item));
    return persist(located, actor, [{ action: "team.member_assigned", summary: `${user.name} was assigned to the client as ${ACCESS_LEVEL_META[level].label}`, module: "team", entity: { type: "membership", id: user.id, label: user.name }, next: ACCESS_LEVEL_META[level].label }], {
      users,
      detail: { ...detail, assignments: { ...detail.assignments, [user.id]: { level, assignedAt: nowIso(), assignedBy: actor.name } } },
      client,
    });
  },

  async changeAccess(id, { membershipId, level }, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "change access");
    const { bundle, detail } = located;
    const view = assignmentsFor(bundle, located.client, detail).find((item) => item.membershipId === membershipId);
    if (!view) return fail("NOT_FOUND", "That member is not assigned to this client.");
    if (view.membershipStatus !== "active") fail("CONFLICT", `${view.name}'s company membership is ${view.membershipStatus}; client access cannot be changed until it is active again.`);
    if (view.level === level) fail("VALIDATION_FAILED", "Choose a different access level.", { level: "Choose a different access level." });

    return persist(located, actor, [{ action: "team.access_changed", summary: `${view.name}'s access changed to ${ACCESS_LEVEL_META[level].label}`, module: "team", entity: { type: "membership", id: membershipId, label: view.name }, previous: ACCESS_LEVEL_META[view.level].label, next: ACCESS_LEVEL_META[level].label }], {
      detail: { ...detail, assignments: { ...detail.assignments, [membershipId]: { level, assignedAt: detail.assignments[membershipId]?.assignedAt ?? nowIso(), assignedBy: detail.assignments[membershipId]?.assignedBy ?? actor.name } } },
    });
  },

  async removeAccess(id, { membershipId, newLeadId, note }, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "remove access");
    const { bundle, detail } = located;
    const view = assignmentsFor(bundle, located.client, detail).find((item) => item.membershipId === membershipId);
    if (!view) return fail("NOT_FOUND", "That member is not assigned to this client.");

    let leadUserId = detail.leadUserId;
    const drafts: Draft[] = [{ action: "team.access_removed", summary: `${view.name} no longer has access to the client`, module: "team", entity: { type: "membership", id: membershipId, label: view.name }, severity: "warning", previous: ACCESS_LEVEL_META[view.level].label, next: "No access", reason: note || null }];

    if (view.isLead) {
      const replacement = newLeadId ? assignmentsFor(bundle, located.client, detail).find((item) => item.membershipId === newLeadId && item.membershipId !== membershipId) : undefined;
      if (newLeadId && (!replacement || replacement.membershipStatus !== "active")) fail("CONFLICT", "The new client lead must be another active member already assigned to this client.");
      leadUserId = replacement?.membershipId ?? null;
      drafts.push({ action: "client.lead_changed", summary: replacement ? `${replacement.name} was set as client lead` : "Client lead was cleared", module: "team", previous: view.name, next: replacement?.name ?? "None" });
    }

    // Only this client's access goes: the person and their other memberships are untouched.
    const users = bundle.users.map((item) => (item.id === membershipId ? { ...item, clientAccessIds: item.clientAccessIds.filter((clientId) => clientId !== id) } : item));
    const assignments = { ...detail.assignments };
    delete assignments[membershipId];
    return persist(located, actor, drafts, { users, detail: { ...detail, assignments, leadUserId } });
  },

  async setLead(id, membershipId, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "set the client lead");
    const { bundle, detail } = located;
    const current = assignmentsFor(bundle, located.client, detail);
    const target = membershipId ? current.find((item) => item.membershipId === membershipId) : undefined;
    if (membershipId && !target) fail("CONFLICT", "Assign this member to the client before making them lead.");
    if (target && target.membershipStatus !== "active") fail("CONFLICT", `${target.name} does not have an active membership.`);
    const previous = current.find((item) => item.isLead);
    return persist(located, actor, [{ action: "client.lead_changed", summary: target ? `${target.name} was set as client lead` : "Client lead was cleared", module: "team", previous: previous?.name ?? "None", next: target?.name ?? "None" }], {
      detail: { ...detail, leadUserId: membershipId },
    });
  },

  /* ------------------------------ websites ----------------------------- */

  async addWebsite(id, { url, makePrimary }, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "add a website");
    if (!isValidUrl(url)) fail("VALIDATION_FAILED", "Enter a valid website URL.", { url: "Enter a valid website URL, e.g. example.com." });
    const { detail, client } = located;
    const site = blankWebsite(client, url, nextWebsiteIndex(detail));
    const duplicate = detail.websites.find((item) => item.domain === site.domain);
    if (duplicate) fail("CONFLICT", `${duplicate.domain} is already registered for this client.`, { url: "This domain is already a website of this client." });

    const becomesPrimary = makePrimary || detail.websites.length === 0;
    const nextDetail = { ...detail, websites: [...detail.websites, site], primaryWebsiteId: becomesPrimary ? site.id : detail.primaryWebsiteId };
    return persist(located, actor, [{ action: "website.added", summary: `Website ${site.domain} was added${becomesPrimary ? " as the primary website" : ""}`, module: "website", entity: { type: "website", id: site.id, label: site.domain }, next: site.domain }], {
      detail: nextDetail,
      client: { ...client, websiteUrl: becomesPrimary ? site.url : client.websiteUrl },
    });
  },

  async setPrimaryWebsite(id, websiteId, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "change the primary website");
    const site = located.detail.websites.find((item) => item.id === websiteId);
    if (!site) return fail("NOT_FOUND", "That website does not belong to this client.");
    const previous = primaryWebsiteOf(located.detail);
    if (previous?.id === site.id) fail("CONFLICT", `${site.domain} is already the primary website.`);
    return persist(located, actor, [{ action: "website.primary_changed", summary: `${site.domain} is now the primary website`, module: "website", entity: { type: "website", id: site.id, label: site.domain }, previous: previous?.domain ?? "None", next: site.domain }], {
      detail: { ...located.detail, primaryWebsiteId: site.id },
      client: { ...located.client, websiteUrl: site.url },
    });
  },

  async removeWebsite(id, websiteId, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "remove a website");
    const site = located.detail.websites.find((item) => item.id === websiteId);
    if (!site) return fail("NOT_FOUND", "That website does not belong to this client.");
    const websites = located.detail.websites.filter((item) => item.id !== websiteId);
    const wasPrimary = primaryWebsiteOf(located.detail)?.id === websiteId;
    const primaryWebsiteId = wasPrimary ? (websites[0]?.id ?? null) : located.detail.primaryWebsiteId;
    const primary = websites.find((item) => item.id === primaryWebsiteId);
    return persist(located, actor, [{ action: "website.removed", summary: `Website ${site.domain} was removed`, module: "website", entity: { type: "website", id: site.id, label: site.domain }, severity: "warning", previous: site.domain }], {
      detail: { ...located.detail, websites, primaryWebsiteId },
      client: { ...located.client, websiteUrl: primary?.url ?? null },
    });
  },

  /* ----------------------------- governance ---------------------------- */

  async setOnboardingRequirements(id, required, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "change onboarding requirements");
    const changed = Object.keys(required).filter((key) => required[key as keyof typeof required] !== located.detail.onboarding.required[key as keyof typeof required]);
    if (changed.length === 0) fail("VALIDATION_FAILED", "No requirement changed.");
    return persist(located, actor, [{ action: "onboarding.requirements_changed", summary: `Onboarding requirements updated (${changed.join(", ")})`, module: "onboarding" }], {
      detail: { ...located.detail, onboarding: { ...located.detail.onboarding, required } },
    });
  },

  async markAccessReviewed(id, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "review access");
    return persist(located, actor, [{ action: "onboarding.access_reviewed", summary: "Workspace access was reviewed", module: "onboarding" }], {
      detail: { ...located.detail, onboarding: { ...located.detail.onboarding, accessReviewedAt: nowIso(), accessReviewedBy: actor.name } },
    });
  },

  async setPlatformReviewer(id, staffId, actor) {
    await wait("write");
    const located = locate(id);
    requireActiveWorkspace(located, "assign a reviewer");
    const reviewer = staffId ? STAFF.find((member) => member.id === staffId && member.status === "active") : undefined;
    if (staffId && !reviewer) fail("VALIDATION_FAILED", "Choose an active member of the internal team.");
    const previous = STAFF.find((member) => member.id === located.detail.platformReviewerId);
    return persist(located, actor, [{ action: "client.reviewer_changed", summary: reviewer ? `${reviewer.name} is now the platform reviewer` : "Platform reviewer was cleared", module: "settings", previous: previous?.name ?? "None", next: reviewer?.name ?? "None" }], {
      detail: { ...located.detail, platformReviewerId: staffId },
    });
  },

  async requestReconnection(id, connectionId, actor) {
    await wait("write");
    const located = locate(id);
    const connection = connectionsFor(located.bundle, located.client).find((item) => item.id === connectionId);
    if (!connection) return fail("NOT_FOUND", "That connection does not belong to this client.");
    const label = INTEGRATION_PROVIDER[connection.provider].label;
    return persist(located, actor, [{ action: "channel.reconnection_requested", summary: `Reconnection of ${label} (${connection.accountName}) was requested from the company (demo - nothing was sent or refreshed)`, module: "channels", entity: { type: "connection", id: connection.id, label: connection.accountName } }], {});
  },

  async resetDemoData() {
    await wait("write");
    resetDemoState();
  },
};

