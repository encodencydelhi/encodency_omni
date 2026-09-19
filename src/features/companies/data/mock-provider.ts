/**
 * Demo implementation of `CompaniesRepository`.
 *
 * It behaves like a remote service (asynchronous, takes time, throws `ApiError`)
 * so loading and error states are exercised for real. Every mutation records its
 * effect in the in-memory store and writes an activity entry, but it never claims
 * to have done more than change demo records: no sessions are ended, no email is
 * sent, no money moves.
 *
 * Only `repository.ts` imports this file.
 */
import { env } from "@/config/env";
import { PLATFORM_USERS } from "@/mocks/data/tenants";
import { ApiError } from "@/types/api";
import type { Plan } from "@/types/domain/plan";
import { OVERRIDABLE_RESOURCES, USAGE_RESOURCE_BY_KEY, USAGE_RESOURCES } from "./config";
import { nowIso, platformNow } from "./clock";
import { PLAN_CATALOGUE, STAFF } from "./mock/dataset";
import { allBundles, findBundle, requireBundle, resetDemoState, writeBundle } from "./mock/store";
import type {
  BulkResult,
  CompaniesRepository,
  CompanyActivityData,
  CompanyBillingData,
  CompanyClientsData,
  CompanyDirectoryEntry,
  CompanyIntegrationsData,
  CompanyOverviewData,
  CompanySecurityData,
  CompanySubscriptionData,
  CompanyUsersData,
  PlatformUserMatch,
  UsageHistory,
} from "./repository";
import {
  applyListQuery,
  computeBilling,
  computeBillingStatus,
  computePortfolio,
  computeSecurityWarnings,
  computeSummary,
  computeSupport,
  computeTwoFactorAdoption,
  computeUsage,
  countIntegrations,
  cyclePrice,
  deriveOwner,
  filterSummaries,
  planFor,
  sortSummaries,
  type DerivationContext,
} from "./selectors";
import type {
  ActivityFilter,
  ActivityModule,
  ActivitySeverity,
  ChangePlanInput,
  Company,
  CompanyActivity,
  CompanyBundle,
  CompanyInternalNote,
  CompanyInvoice,
  CompanyNotificationInput,
  CompanySummary,
  CompanyUsageOverride,
  CompanyUser,
  CreateCompanyInput,
  MutationActor,
  NoteInput,
  SuspensionReason,
  UpdateCompanyInput,
  UsageOverrideInput,
  UsageResource,
} from "./types";

const DAY_MS = 86_400_000;

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

function summarize(bundle: CompanyBundle): CompanySummary {
  return computeSummary(context(), bundle);
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

interface ActivityDraft {
  action: string;
  summary: string;
  module: ActivityModule;
  entity?: { type: string; id: string; label: string };
  severity?: ActivitySeverity;
  previousValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  result?: CompanyActivity["result"];
}

function withActivity(bundle: CompanyBundle, actor: MutationActor, draft: ActivityDraft): CompanyBundle {
  const entry: CompanyActivity = {
    id: nextId(`act_${bundle.company.id}`),
    companyId: bundle.company.id,
    at: nowIso(),
    actor: { id: actor.id, name: actor.name, type: "staff" },
    action: draft.action,
    summary: draft.summary,
    module: draft.module,
    entity: draft.entity ?? { type: "company", id: bundle.company.id, label: bundle.company.name },
    severity: draft.severity ?? "info",
    result: draft.result ?? "success",
    previousValue: draft.previousValue ?? null,
    newValue: draft.newValue ?? null,
    reason: draft.reason ?? null,
    correlationId: `req_${Math.floor(100000 + Math.random() * 899999)}`,
  };
  return { ...bundle, activity: [entry, ...bundle.activity] };
}

function commit(bundle: CompanyBundle): CompanySummary {
  writeBundle(bundle);
  return summarize(bundle);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "company"
  );
}

function domainOf(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function cycleDays(cycle: "monthly" | "annual"): number {
  return cycle === "annual" ? 365 : 30;
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

function planLabel(plan: Plan, cycle: string): string {
  return `${plan.name} (${cycle})`;
}

function requireActiveOperating(bundle: CompanyBundle, action: string): void {
  if (bundle.company.accountStatus === "archived") {
    fail("CONFLICT", `${bundle.company.name} is archived. Archived companies cannot be changed (${action}).`);
  }
}

function isProtectedOwner(bundle: CompanyBundle, user: CompanyUser): boolean {
  const activeOwners = bundle.users.filter((item) => item.role === "owner" && item.status === "active");
  return user.role === "owner" && user.status === "active" && activeOwners.length <= 1;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Usage history (deterministic, generated on demand)                  */
/* ------------------------------------------------------------------ */

function unit(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 10_000) / 10_000;
}

function dayWeight(companyId: string, resource: string, dayIndex: number, date: Date): number {
  const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  return (0.55 + unit(`${companyId}:${resource}:${dayIndex}`) * 0.9) * (weekend ? 0.55 : 1);
}

function buildUsageSeries(
  bundle: CompanyBundle,
  resource: UsageResource,
  range: { from: string; to: string },
): UsageHistory {
  const now = platformNow();
  const ctx = context();
  const usage = computeUsage(ctx, bundle);
  const record = usage.records.find((item) => item.resource === resource);
  const def = USAGE_RESOURCE_BY_KEY[resource];
  if (!record) fail("NOT_FOUND", `Unknown usage resource ${resource}.`);

  const periodStart = Date.parse(usage.periodStart);
  const periodMs = Math.max(DAY_MS, Date.parse(usage.periodEnd) - periodStart);
  const periodDays = Math.max(1, Math.round(periodMs / DAY_MS));
  const startDay = Math.floor((now - periodStart) / DAY_MS);
  const elapsed = Math.min(periodDays, Math.max(1, startDay + 1));

  const from = Math.floor(Date.parse(range.from) / DAY_MS) * DAY_MS;
  const to = Math.min(Math.floor(Date.parse(range.to) / DAY_MS) * DAY_MS, Math.floor(now / DAY_MS) * DAY_MS);

  const points: UsageHistory["points"] = [];
  const periodTotals = new Map<number, { total: number; days: number; weightSum: number; weights: number[] }>();

  const totalFor = (index: number): number =>
    index === 0 ? record.used : Math.round(record.previousUsed * 0.92 ** Math.max(0, -index - 1));

  for (let time = from; time <= to; time += DAY_MS) {
    const index = Math.floor((time - periodStart) / periodMs);
    const offset = Math.floor((time - (periodStart + index * periodMs)) / DAY_MS);
    const date = new Date(time);

    let info = periodTotals.get(index);
    if (!info) {
      const days = index === 0 ? elapsed : periodDays;
      const weights = Array.from({ length: days }, (_, day) => dayWeight(bundle.company.id, resource, index * 1000 + day, new Date(periodStart + index * periodMs + day * DAY_MS)));
      info = { total: totalFor(index), days, weightSum: weights.reduce((sum, weight) => sum + weight, 0), weights };
      periodTotals.set(index, info);
    }

    let value: number;
    if (def.kind === "flow") {
      value = Math.round(((info.weights[offset] ?? 0) / info.weightSum) * info.total);
    } else {
      const progress = (offset + 1) / Math.max(1, index === 0 ? periodDays : info.days);
      const wobble = 1 + (unit(`${bundle.company.id}:${resource}:${time}`) - 0.5) * 0.02;
      value = Math.max(0, Number((info.total * (0.86 + 0.14 * progress) * wobble).toFixed(resource === "storage" ? 1 : 0)));
      if (index === 0 && offset === info.days - 1) value = record.used;
    }

    points.push({ date: date.toISOString().slice(0, 10), value });
  }

  return {
    resource,
    unit: def.unit,
    kind: def.kind,
    limit: record.effectiveLimit,
    points,
  };
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

function bulk(
  ids: string[],
  apply: (bundle: CompanyBundle) => CompanyBundle | string,
): BulkResult {
  const result: BulkResult = { updated: [], skipped: [] };
  for (const id of ids) {
    const bundle = findBundle(id);
    if (!bundle) {
      result.skipped.push({ id, name: id, reason: "Company not found" });
      continue;
    }
    const outcome = apply(bundle);
    if (typeof outcome === "string") {
      result.skipped.push({ id, name: bundle.company.name, reason: outcome });
    } else {
      writeBundle(outcome);
      result.updated.push(id);
    }
  }
  return result;
}

export const mockCompaniesProvider: CompaniesRepository = {
  mode: "mock",

  /* ---------------------------- reads ---------------------------- */

  async listCompanies(query) {
    await wait("read");
    const ctx = context();
    const summaries = allBundles().map((bundle) => computeSummary(ctx, bundle));
    return applyListQuery(summaries, query, ctx.now);
  },

  async exportCompanies({ query, ids }) {
    await wait("read");
    const ctx = context();
    let summaries = allBundles().map((bundle) => computeSummary(ctx, bundle));
    if (ids) summaries = summaries.filter((summary) => ids.includes(summary.company.id));
    else if (query) summaries = filterSummaries(summaries, query, ctx.now);
    return sortSummaries(summaries, query?.sort ?? null);
  },

  async getPortfolio() {
    await wait("read");
    const ctx = context();
    return computePortfolio(ctx, allBundles().map((bundle) => computeSummary(ctx, bundle)));
  },

  async getDirectory(): Promise<CompanyDirectoryEntry[]> {
    await wait("read");
    return allBundles().map((bundle) => ({
      id: bundle.company.id,
      name: bundle.company.name,
      domain: bundle.company.domain,
      ownerEmail: deriveOwner(bundle).email || null,
    }));
  },

  async findPlatformUsers(email): Promise<PlatformUserMatch[]> {
    await wait("read");
    const needle = email.trim().toLowerCase();
    if (!needle) return [];

    const seeded = PLATFORM_USERS.filter((user) => user.email.toLowerCase() === needle).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company.id,
      companyName: user.company.name,
    }));

    // Owners invited through this workspace are platform users too.
    const created = allBundles()
      .filter((bundle) => bundle.company.isDemoCreated)
      .flatMap((bundle) =>
        bundle.users
          .filter((user) => user.email.toLowerCase() === needle)
          .map((user) => ({
            id: user.platformUserId,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: bundle.company.id,
            companyName: bundle.company.name,
          })),
      );

    return [...seeded, ...created];
  },

  async listPlans() {
    await wait("read");
    return [...PLAN_CATALOGUE];
  },

  async listStaff() {
    await wait("read");
    return [...STAFF];
  },

  async getCompany(id) {
    await wait("read");
    return summarize(requireBundle(id));
  },

  async getOverview(id): Promise<CompanyOverviewData> {
    await wait("read");
    const bundle = requireBundle(id);
    const ctx = context();
    return {
      summary: computeSummary(ctx, bundle),
      subscription: bundle.subscription,
      usage: computeUsage(ctx, bundle),
      support: computeSupport(bundle),
      recentActivity: bundle.activity.slice(0, 8),
      notes: [...bundle.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    };
  },

  async getUsers(id): Promise<CompanyUsersData> {
    await wait("read");
    const bundle = requireBundle(id);
    return {
      users: bundle.users,
      clients: bundle.clients.map((client) => ({ id: client.id, name: client.name })),
      owner: deriveOwner(bundle),
    };
  },

  async getClients(id): Promise<CompanyClientsData> {
    await wait("read");
    const bundle = requireBundle(id);
    const members: Record<string, string[]> = {};
    for (const client of bundle.clients) {
      members[client.id] = bundle.users.filter((user) => user.clientAccessIds.includes(client.id)).map((user) => user.name);
    }
    return { clients: bundle.clients, members };
  },

  async getSubscription(id): Promise<CompanySubscriptionData> {
    await wait("read");
    const bundle = requireBundle(id);
    const ctx = context();
    return {
      subscription: bundle.subscription,
      plan: planFor(ctx, bundle.subscription.planTier),
      plans: [...PLAN_CATALOGUE],
      usage: computeUsage(ctx, bundle),
      billingStatus: computeBillingStatus(bundle),
      mrrMinor: computeSummary(ctx, bundle).mrrMinor,
      companyName: bundle.company.name,
      accountStatus: bundle.company.accountStatus,
    };
  },

  async getBilling(id): Promise<CompanyBillingData> {
    await wait("read");
    const bundle = requireBundle(id);
    const ctx = context();
    return {
      summary: computeBilling(ctx, bundle),
      invoices: [...bundle.invoices].sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt)),
      payments: [...bundle.payments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      billingNotes: bundle.notes.filter((note) => note.tags.includes("billing")),
      plan: planFor(ctx, bundle.subscription.planTier),
    };
  },

  async getUsage(id) {
    await wait("read");
    return computeUsage(context(), requireBundle(id));
  },

  async getUsageHistory(id, resource, range) {
    await wait("read");
    return buildUsageSeries(requireBundle(id), resource, range);
  },

  async getIntegrations(id): Promise<CompanyIntegrationsData> {
    await wait("read");
    const bundle = requireBundle(id);
    return { integrations: bundle.integrations, counts: countIntegrations(bundle.integrations) };
  },

  async getActivity(id, filter: ActivityFilter): Promise<CompanyActivityData> {
    await wait("read");
    const bundle = requireBundle(id);
    const term = filter.search?.trim().toLowerCase();
    const from = filter.from ? Date.parse(filter.from) : null;
    const to = filter.to ? Date.parse(filter.to) + DAY_MS : null;

    const entries = bundle.activity.filter((entry) => {
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
      entries,
      total: bundle.activity.length,
      actors: [...new Set(bundle.activity.map((entry) => entry.actor.name))].sort(),
      events: [...new Set(bundle.activity.map((entry) => entry.action))].sort(),
    };
  },

  async getSecurity(id): Promise<CompanySecurityData> {
    await wait("read");
    const bundle = requireBundle(id);
    const owner = deriveOwner(bundle);
    return {
      security: bundle.security,
      owner,
      users: bundle.users,
      adoption: computeTwoFactorAdoption(bundle),
      warnings: computeSecurityWarnings(bundle, owner),
    };
  },

  async getAttention(id) {
    await wait("read");
    return summarize(requireBundle(id)).attention;
  },

  /* --------------------------- lifecycle -------------------------- */

  async createCompany(input: CreateCompanyInput, actor) {
    await wait("write");

    const errors: Record<string, string> = {};
    if (!input.name.trim()) errors.name = "Company name is required.";
    if (input.website && !isValidUrl(input.website)) errors.website = "Enter a valid website URL.";
    if (input.contactEmail && !EMAIL_PATTERN.test(input.contactEmail)) errors.contactEmail = "Enter a valid email address.";
    if (!input.owner.name.trim()) errors.ownerName = "Owner name is required.";
    if (!EMAIL_PATTERN.test(input.owner.email)) errors.ownerEmail = "Enter a valid owner email.";
    if (Object.keys(errors).length > 0) fail("VALIDATION_FAILED", "The company could not be created.", errors);

    const plan = PLAN_CATALOGUE.find((item) => item.tier === input.subscription.planTier);
    if (!plan) fail("VALIDATION_FAILED", "Unknown plan.", { plan: "Select a plan from the catalogue." });

    let slug = slugify(input.name);
    const taken = new Set(allBundles().map((bundle) => bundle.company.slug));
    for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${slugify(input.name)}-${suffix}`;

    const companyId = `cmp_${slug}`;
    const now = nowIso();
    const website = input.website ? (input.website.startsWith("http") ? input.website : `https://${input.website}`) : null;
    const highest = Math.max(0, ...allBundles().map((bundle) => Number(bundle.company.displayId.replace("CMP-", "")) || 0));

    const existing = input.owner.existingUserId ? PLATFORM_USERS.find((user) => user.id === input.owner.existingUserId) : undefined;
    const ownerId = existing ? `${existing.id}~${companyId}` : `usr_${slug}_1`;

    const owner: CompanyUser = {
      id: ownerId,
      companyId,
      platformUserId: existing?.id ?? ownerId,
      name: input.owner.name.trim(),
      email: input.owner.email.trim(),
      role: "owner",
      status: existing ? "active" : "invited",
      mfaEnabled: existing?.mfaEnabled ?? false,
      twoFactorRequired: false,
      clientAccessIds: [],
      lastLoginAt: existing?.lastLoginAt ?? null,
      createdAt: now,
      invitationExpired: false,
    };

    const trial = input.subscription.mode === "trial";
    const start = new Date(input.subscription.startDate || now).toISOString();
    const trialEndsAt = trial ? (input.subscription.trialEndsAt ? new Date(input.subscription.trialEndsAt).toISOString() : addDays(start, plan.trialDays)) : null;
    const renewsAt = trial && trialEndsAt ? trialEndsAt : addDays(start, cycleDays(input.subscription.billingCycle));

    const clientId = `prj_${slug}_1`;
    const clients = input.initialClient?.name.trim()
      ? [
          {
            id: clientId,
            companyId,
            name: input.initialClient.name.trim(),
            websiteUrl: input.initialClient.websiteUrl?.trim() || null,
            status: "onboarding" as const,
            connectedChannels: [],
            brokenChannels: [],
            scheduledPosts: 0,
            failedPosts: 0,
            leadsLast30Days: 0,
            createdAt: now,
            lastActivityAt: now,
          },
        ]
      : [];
    if (clients.length > 0) owner.clientAccessIds = [clientId];

    const overrides: CompanyUsageOverride[] = [];
    const requested = input.subscription.limitOverride;
    if (requested) {
      const def = USAGE_RESOURCE_BY_KEY[requested.resource];
      overrides.push({
        id: nextId("ovr"),
        companyId,
        resource: requested.resource,
        baseLimit: def.metric ? plan.limits[def.metric] : null,
        overrideLimit: requested.overrideLimit,
        reason: requested.reason,
        startsAt: now,
        expiresAt: new Date(requested.expiresAt).toISOString(),
        approvedBy: actor.name,
        createdAt: now,
      });
    }

    const baseline: CompanyBundle["usageBaseline"] = {};
    for (const def of USAGE_RESOURCES) {
      if (def.key === "users" || def.key === "clients" || def.key === "connectedAccounts" || def.key === "scheduledPosts") continue;
      baseline[def.key] = { used: 0, previousUsed: 0, updatedAt: now };
    }

    const company: Company = {
      id: companyId,
      displayId: `CMP-${String(highest + 1).padStart(4, "0")}`,
      slug,
      name: input.name.trim(),
      domain: domainOf(website),
      logoUrl: null,
      profile: {
        legalName: input.legalName?.trim() || null,
        website,
        industry: input.industry,
        country: input.country,
        companySize: input.companySize ?? null,
        contactEmail: input.contactEmail?.trim() || input.owner.email.trim(),
        contactPhone: input.contactPhone?.trim() || input.owner.phone?.trim() || null,
        timezone: input.workspace.timezone,
        currency: input.workspace.currency,
        language: input.workspace.language,
        region: input.workspace.region,
      },
      accountStatus: "active",
      suspension: null,
      archivedAt: null,
      ownerUserId: owner.id,
      internalOwners: { accountManagerId: null, supportOwnerId: null, technicalOwnerId: null },
      internalTags: [],
      createdAt: now,
      lastActiveAt: now,
      isDemoCreated: true,
    };

    const notes: CompanyInternalNote[] = input.subscription.internalNotes?.trim()
      ? [
          {
            id: nextId("note"),
            companyId,
            authorId: actor.id,
            authorName: actor.name,
            content: input.subscription.internalNotes.trim(),
            tags: [],
            pinned: false,
            createdAt: now,
            updatedAt: now,
          },
        ]
      : [];

    let bundle: CompanyBundle = {
      company,
      subscription: {
        id: `sub_${slug}`,
        companyId,
        planTier: plan.tier,
        billingCycle: input.subscription.billingCycle,
        status: trial ? "trialing" : "active",
        startedAt: start,
        currentPeriodStart: start,
        renewsAt,
        trialEndsAt,
        scheduledCancellationAt: null,
        cancelledAt: null,
        scheduledChange: null,
        paymentMethod: null,
      },
      overrides,
      usageBaseline: baseline,
      users: [owner],
      clients,
      integrations: [],
      invoices: [],
      payments: [],
      activity: [],
      security: {
        companyId,
        policies: { require2fa: false, passwordPolicy: "standard", sessionTimeoutMinutes: 720, ssoEnabled: false, ipAllowlistEnabled: false },
        allowedEmailDomains: [domainOf(website) ?? owner.email.split("@")[1] ?? ""].filter(Boolean),
        activeSessions: 0,
        accountLockouts: 0,
        accessLock: null,
        passwordResetRequestedAt: null,
        sessionRevocationRequestedAt: null,
        events: [
          { id: nextId("sec"), companyId, at: now, type: "owner_invited", severity: "info", summary: `Owner invitation created for ${owner.email} (demo - no email sent)`, actorLabel: actor.name },
        ],
      },
      notes,
      tickets: [],
      jobs: { failedLast24h: 0, lastFailureAt: null },
    };

    bundle = withActivity(bundle, actor, { action: "company.created", summary: `Company ${company.name} was created`, module: "company", newValue: company.name });
    bundle = withActivity(bundle, actor, {
      action: "owner.invited",
      summary: existing ? `${owner.name} (existing platform user) was set as owner` : `Owner invitation created for ${owner.name} (demo - no email sent)`,
      module: "users",
      entity: { type: "user", id: owner.id, label: owner.name },
    });
    bundle = withActivity(bundle, actor, {
      action: trial ? "subscription.trial_started" : "subscription.started",
      summary: `${plan.name} ${trial ? "trial started" : "subscription started"}`,
      module: "subscription",
      entity: { type: "subscription", id: bundle.subscription.id, label: plan.name },
      newValue: planLabel(plan, input.subscription.billingCycle),
    });
    if (clients[0]) {
      bundle = withActivity(bundle, actor, {
        action: "client.created",
        summary: `Client ${clients[0].name} was added`,
        module: "clients",
        entity: { type: "client", id: clients[0].id, label: clients[0].name },
      });
    }
    if (requested) {
      bundle = withActivity(bundle, actor, {
        action: "usage.override_applied",
        summary: `Temporary ${USAGE_RESOURCE_BY_KEY[requested.resource].label} override applied at creation`,
        module: "usage",
        newValue: String(requested.overrideLimit),
        reason: requested.reason,
      });
    }

    return commit(bundle);
  },

  async updateCompany(id, input: UpdateCompanyInput, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    requireActiveOperating(bundle, "edit");

    const errors: Record<string, string> = {};
    if (!input.name.trim()) errors.name = "Company name is required.";
    if (input.website && !isValidUrl(input.website)) errors.website = "Enter a valid website URL.";
    if (input.contactEmail && !EMAIL_PATTERN.test(input.contactEmail)) errors.contactEmail = "Enter a valid email address.";
    if (Object.keys(errors).length > 0) fail("VALIDATION_FAILED", "The company could not be updated.", errors);

    const website = input.website ? (input.website.startsWith("http") ? input.website : `https://${input.website}`) : null;
    const changed: string[] = [];
    if (input.name.trim() !== bundle.company.name) changed.push("name");
    if ((website ?? null) !== bundle.company.profile.website) changed.push("website");
    if (input.industry !== bundle.company.profile.industry) changed.push("industry");
    if (input.country !== bundle.company.profile.country) changed.push("country");
    if (JSON.stringify(input.internalTags) !== JSON.stringify(bundle.company.internalTags)) changed.push("tags");
    if (JSON.stringify(input.internalOwners) !== JSON.stringify(bundle.company.internalOwners)) changed.push("internal owners");

    let next: CompanyBundle = {
      ...bundle,
      company: {
        ...bundle.company,
        name: input.name.trim(),
        domain: domainOf(website) ?? bundle.company.domain,
        profile: {
          ...bundle.company.profile,
          legalName: input.legalName,
          website,
          industry: input.industry,
          country: input.country,
          companySize: input.companySize,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
        },
        internalTags: input.internalTags,
        internalOwners: input.internalOwners,
      },
    };
    next = withActivity(next, actor, {
      action: "company.updated",
      summary: changed.length > 0 ? `Company details updated (${changed.join(", ")})` : "Company details saved",
      module: "company",
      previousValue: bundle.company.name,
      newValue: input.name.trim(),
    });
    return commit(next);
  },

  async suspendCompanies(ids, { reason, note }, actor) {
    await wait("write");
    return bulk(ids, (bundle) => {
      if (bundle.company.accountStatus === "suspended") return "Already suspended";
      if (bundle.company.accountStatus !== "active") return `Cannot suspend a ${bundle.company.accountStatus} company`;
      const next: CompanyBundle = {
        ...bundle,
        company: {
          ...bundle.company,
          accountStatus: "suspended",
          suspension: { reason: reason as SuspensionReason, note, suspendedAt: nowIso(), suspendedBy: actor.name, previousStatus: "active" },
        },
      };
      return withActivity(next, actor, {
        action: "company.suspended",
        summary: `Company suspended (${reason.replace("_", " ")})`,
        module: "company",
        severity: "warning",
        previousValue: "Active",
        newValue: "Suspended",
        reason: note,
      });
    });
  },

  async reactivateCompanies(ids, { note }, actor) {
    await wait("write");
    return bulk(ids, (bundle) => {
      if (bundle.company.accountStatus !== "suspended") return "Only suspended companies can be reactivated";
      const next: CompanyBundle = {
        ...bundle,
        company: { ...bundle.company, accountStatus: bundle.company.suspension?.previousStatus ?? "active", suspension: null },
      };
      return withActivity(next, actor, {
        action: "company.reactivated",
        summary: "Company reactivated",
        module: "company",
        previousValue: "Suspended",
        newValue: "Active",
        reason: note || null,
      });
    });
  },

  async archiveCompany(id, { note }, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    if (bundle.company.accountStatus === "archived") fail("CONFLICT", `${bundle.company.name} is already archived.`);
    let next: CompanyBundle = {
      ...bundle,
      company: { ...bundle.company, accountStatus: "archived", archivedAt: nowIso(), suspension: null },
    };
    next = withActivity(next, actor, {
      action: "company.archived",
      summary: "Company archived",
      module: "company",
      severity: "warning",
      previousValue: bundle.company.accountStatus,
      newValue: "archived",
      reason: note || null,
    });
    return commit(next);
  },

  async transferOwnership(id, { newOwnerUserId, note }, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    requireActiveOperating(bundle, "transfer ownership");

    const target = bundle.users.find((user) => user.id === newOwnerUserId);
    if (!target) fail("NOT_FOUND", "The selected user is not a member of this company.");
    if (target.status !== "active") fail("CONFLICT", `${target.name} must have an active account to become the owner.`);
    if (target.id === bundle.company.ownerUserId) fail("CONFLICT", `${target.name} is already the owner.`);

    const previousOwner = bundle.users.find((user) => user.id === bundle.company.ownerUserId);
    const users = bundle.users.map((user) => {
      if (user.id === target.id) return { ...user, role: "owner" as const };
      if (user.id === previousOwner?.id) return { ...user, role: "admin" as const };
      return user;
    });

    let next: CompanyBundle = { ...bundle, users, company: { ...bundle.company, ownerUserId: target.id } };
    next = withActivity(next, actor, {
      action: "company.ownership_transferred",
      summary: `Ownership transferred to ${target.name}`,
      module: "users",
      entity: { type: "user", id: target.id, label: target.name },
      severity: "warning",
      previousValue: previousOwner?.name ?? "No owner",
      newValue: target.name,
      reason: note || null,
    });
    return commit(next);
  },

  async assignInternalOwners(ids, patch, actor) {
    await wait("write");
    const label = (staffId: string | null | undefined) => (staffId ? (STAFF.find((member) => member.id === staffId)?.name ?? staffId) : "Unassigned");

    return bulk(ids, (bundle) => {
      if (bundle.company.accountStatus === "archived") return "Archived companies cannot be reassigned";
      const previous = bundle.company.internalOwners;
      const nextOwners = { ...previous, ...patch };
      let next: CompanyBundle = { ...bundle, company: { ...bundle.company, internalOwners: nextOwners } };
      const parts: string[] = [];
      if ("accountManagerId" in patch) parts.push(`Account manager: ${label(nextOwners.accountManagerId)}`);
      if ("supportOwnerId" in patch) parts.push(`Support owner: ${label(nextOwners.supportOwnerId)}`);
      if ("technicalOwnerId" in patch) parts.push(`Technical owner: ${label(nextOwners.technicalOwnerId)}`);
      next = withActivity(next, actor, {
        action: "company.internal_owner_changed",
        summary: `Internal ownership updated - ${parts.join(", ")}`,
        module: "company",
        previousValue: [label(previous.accountManagerId), label(previous.supportOwnerId), label(previous.technicalOwnerId)].join(" / "),
        newValue: [label(nextOwners.accountManagerId), label(nextOwners.supportOwnerId), label(nextOwners.technicalOwnerId)].join(" / "),
      });
      return next;
    });
  },

  async sendNotification(ids, input: CompanyNotificationInput, actor) {
    await wait("write");
    return bulk(ids, (bundle) => {
      if (bundle.company.accountStatus === "archived" || bundle.company.accountStatus === "deactivated") {
        return `Cannot notify a ${bundle.company.accountStatus} company`;
      }
      return withActivity(bundle, actor, {
        action: "notification.queued",
        summary: `Platform notification recorded: "${input.title}" (demo - nothing was delivered)`,
        module: "company",
        newValue: input.audience === "all_users" ? "All users" : "Organisation admins",
        reason: input.message,
      });
    });
  },

  /* ------------------------- subscription ------------------------- */

  async changePlan(id, input: ChangePlanInput, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    requireActiveOperating(bundle, "change plan");
    const { subscription } = bundle;
    if (subscription.status === "cancelled" || subscription.status === "expired") {
      fail("CONFLICT", "Reactivate the subscription before changing its plan.");
    }

    const current = PLAN_CATALOGUE.find((item) => item.tier === subscription.planTier);
    const next = PLAN_CATALOGUE.find((item) => item.tier === input.planTier);
    if (!current || !next) fail("VALIDATION_FAILED", "Unknown plan.");
    if (current.tier === next.tier && subscription.billingCycle === input.billingCycle) {
      fail("VALIDATION_FAILED", "Choose a different plan or billing cycle.");
    }

    const before = planLabel(current, subscription.billingCycle);
    const after = planLabel(next, input.billingCycle);

    let updated: CompanyBundle;
    if (input.effective === "immediately") {
      updated = { ...bundle, subscription: { ...subscription, planTier: next.tier, billingCycle: input.billingCycle, scheduledChange: null } };
    } else {
      updated = {
        ...bundle,
        subscription: { ...subscription, scheduledChange: { planTier: next.tier, billingCycle: input.billingCycle, effectiveAt: subscription.renewsAt } },
      };
    }

    updated = withActivity(updated, actor, {
      action: input.effective === "immediately" ? "subscription.plan_changed" : "subscription.plan_change_scheduled",
      summary: input.effective === "immediately" ? `Plan changed from ${current.name} to ${next.name}` : `Plan change to ${next.name} scheduled for the next renewal`,
      module: "subscription",
      entity: { type: "subscription", id: subscription.id, label: next.name },
      previousValue: before,
      newValue: after,
      reason: input.reason || null,
    });
    return commit(updated);
  },

  async extendTrial(id, { days, reason }, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const { subscription } = bundle;
    if (subscription.status !== "trialing" || !subscription.trialEndsAt) fail("CONFLICT", "Only a trialing subscription can be extended.");
    if (days < 1 || days > 90) fail("VALIDATION_FAILED", "Extend by between 1 and 90 days.", { days: "Extend by between 1 and 90 days." });

    const trialEndsAt = addDays(subscription.trialEndsAt, days);
    let next: CompanyBundle = { ...bundle, subscription: { ...subscription, trialEndsAt, renewsAt: trialEndsAt } };
    next = withActivity(next, actor, {
      action: "subscription.trial_extended",
      summary: `Trial extended by ${days} days`,
      module: "subscription",
      entity: { type: "subscription", id: subscription.id, label: "Trial" },
      previousValue: subscription.trialEndsAt,
      newValue: trialEndsAt,
      reason,
    });
    return commit(next);
  },

  async convertTrialToPaid(id, { billingCycle }, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const { subscription } = bundle;
    if (subscription.status !== "trialing") fail("CONFLICT", "Only a trialing subscription can be converted.");

    const plan = planFor(context(), subscription.planTier);
    const now = nowIso();
    // No payment is taken: an invoice is issued and stays open until it is paid.
    const invoice: CompanyInvoice = {
      id: nextId(`inv_${bundle.company.id}`),
      companyId: bundle.company.id,
      number: `INV-2026-D${String(bundle.invoices.length + 1).padStart(4, "0")}`,
      periodStart: now,
      periodEnd: addDays(now, cycleDays(billingCycle)),
      issuedAt: now,
      dueAt: addDays(now, 14),
      amountMinor: cyclePrice(plan, billingCycle),
      currency: plan.currency,
      status: "open",
      paymentStatus: "pending",
      description: `${plan.name} plan - ${billingCycle} subscription`,
      paymentId: null,
    };

    let next: CompanyBundle = {
      ...bundle,
      subscription: {
        ...subscription,
        status: "active",
        billingCycle,
        trialEndsAt: null,
        currentPeriodStart: now,
        renewsAt: addDays(now, cycleDays(billingCycle)),
      },
      invoices: [invoice, ...bundle.invoices],
    };
    next = withActivity(next, actor, {
      action: "subscription.trial_converted",
      summary: `Trial converted to a paid ${plan.name} subscription (${billingCycle}). Invoice ${invoice.number} issued; no payment collected in demo.`,
      module: "subscription",
      entity: { type: "subscription", id: subscription.id, label: plan.name },
      previousValue: "Trialing",
      newValue: "Active",
    });
    return commit(next);
  },

  async changeBillingCycle(id, { billingCycle, reason }, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const { subscription } = bundle;
    if (subscription.billingCycle === billingCycle) fail("VALIDATION_FAILED", "The subscription already uses this billing cycle.");
    if (subscription.status === "cancelled" || subscription.status === "expired") fail("CONFLICT", "Reactivate the subscription first.");

    const now = nowIso();
    let next: CompanyBundle = {
      ...bundle,
      subscription:
        subscription.status === "trialing"
          ? { ...subscription, billingCycle }
          : { ...subscription, billingCycle, currentPeriodStart: now, renewsAt: addDays(now, cycleDays(billingCycle)) },
    };
    next = withActivity(next, actor, {
      action: "subscription.cycle_changed",
      summary: `Billing cycle changed to ${billingCycle}`,
      module: "subscription",
      entity: { type: "subscription", id: subscription.id, label: "Billing cycle" },
      previousValue: subscription.billingCycle,
      newValue: billingCycle,
      reason,
    });
    return commit(next);
  },

  async scheduleCancellation(id, { reason }, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const { subscription } = bundle;
    if (subscription.status !== "active" && subscription.status !== "trialing" && subscription.status !== "past_due") {
      fail("CONFLICT", "This subscription cannot be scheduled for cancellation.");
    }
    const endsAt = subscription.trialEndsAt ?? subscription.renewsAt;
    let next: CompanyBundle = {
      ...bundle,
      subscription: { ...subscription, status: "scheduled_cancellation", scheduledCancellationAt: endsAt, cancelledAt: nowIso(), scheduledChange: null },
    };
    next = withActivity(next, actor, {
      action: "subscription.cancellation_scheduled",
      summary: "Cancellation scheduled for the end of the current period",
      module: "subscription",
      entity: { type: "subscription", id: subscription.id, label: "Cancellation" },
      severity: "warning",
      previousValue: subscription.status,
      newValue: "scheduled_cancellation",
      reason,
    });
    return commit(next);
  },

  async reactivateSubscription(id, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const { subscription } = bundle;
    if (!["scheduled_cancellation", "paused", "cancelled", "expired"].includes(subscription.status)) {
      fail("CONFLICT", "This subscription is already active.");
    }

    const plan = planFor(context(), subscription.planTier);
    const now = nowIso();
    const needsNewPeriod = subscription.status === "cancelled" || subscription.status === "expired";

    const invoice: CompanyInvoice | null = needsNewPeriod
      ? {
          id: nextId(`inv_${bundle.company.id}`),
          companyId: bundle.company.id,
          number: `INV-2026-D${String(bundle.invoices.length + 1).padStart(4, "0")}`,
          periodStart: now,
          periodEnd: addDays(now, cycleDays(subscription.billingCycle)),
          issuedAt: now,
          dueAt: addDays(now, 14),
          amountMinor: cyclePrice(plan, subscription.billingCycle),
          currency: plan.currency,
          status: "open",
          paymentStatus: "pending",
          description: `${plan.name} plan - ${subscription.billingCycle} subscription`,
          paymentId: null,
        }
      : null;

    let next: CompanyBundle = {
      ...bundle,
      subscription: {
        ...subscription,
        status: "active",
        scheduledCancellationAt: null,
        cancelledAt: null,
        ...(needsNewPeriod ? { currentPeriodStart: now, renewsAt: addDays(now, cycleDays(subscription.billingCycle)) } : {}),
      },
      invoices: invoice ? [invoice, ...bundle.invoices] : bundle.invoices,
    };
    next = withActivity(next, actor, {
      action: "subscription.reactivated",
      summary: "Subscription reactivated",
      module: "subscription",
      entity: { type: "subscription", id: subscription.id, label: plan.name },
      previousValue: subscription.status,
      newValue: "active",
    });
    return commit(next);
  },

  async applyUsageOverride(id, input: UsageOverrideInput, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    requireActiveOperating(bundle, "apply a limit override");

    if (!OVERRIDABLE_RESOURCES.includes(input.resource)) fail("VALIDATION_FAILED", "This resource is not plan-controlled.", { resource: "Choose a plan-controlled resource." });
    if (!(input.overrideLimit > 0)) fail("VALIDATION_FAILED", "Enter a limit above zero.", { overrideLimit: "Enter a limit above zero." });
    if (!input.reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "A reason is required for the audit trail." });
    if (Date.parse(input.expiresAt) <= Date.parse(input.startsAt)) fail("VALIDATION_FAILED", "The expiry must be after the start.", { expiresAt: "The expiry must be after the start." });

    const plan = planFor(context(), bundle.subscription.planTier);
    const def = USAGE_RESOURCE_BY_KEY[input.resource];
    const baseLimit = def.metric ? plan.limits[def.metric] : null;
    const override: CompanyUsageOverride = {
      id: nextId("ovr"),
      companyId: id,
      resource: input.resource,
      baseLimit,
      overrideLimit: input.overrideLimit,
      reason: input.reason.trim(),
      startsAt: new Date(input.startsAt).toISOString(),
      expiresAt: new Date(input.expiresAt).toISOString(),
      approvedBy: actor.name,
      createdAt: nowIso(),
    };

    let next: CompanyBundle = { ...bundle, overrides: [override, ...bundle.overrides] };
    next = withActivity(next, actor, {
      action: "usage.override_applied",
      summary: `Temporary ${def.label} limit override applied`,
      module: "usage",
      entity: { type: "usage_override", id: override.id, label: def.label },
      previousValue: baseLimit === null ? "Unlimited" : String(baseLimit),
      newValue: String(input.overrideLimit),
      reason: override.reason,
    });
    return commit(next);
  },

  /* ---------------------- users and security ---------------------- */

  async setUserStatus(id, userId, status, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const user = bundle.users.find((item) => item.id === userId);
    if (!user) fail("NOT_FOUND", "User not found in this company.");

    if (status === "suspended" && isProtectedOwner(bundle, user)) {
      fail("CONFLICT", `${user.name} is the only active organisation owner. Transfer ownership before suspending them, so the company is never left without an owner.`);
    }
    if (user.status === status) fail("CONFLICT", `${user.name} is already ${status}.`);

    let next: CompanyBundle = {
      ...bundle,
      users: bundle.users.map((item) => (item.id === userId ? { ...item, status } : item)),
    };
    next = withActivity(next, actor, {
      action: status === "suspended" ? "user.suspended" : "user.reactivated",
      summary: `${user.name} was ${status === "suspended" ? "suspended" : "reactivated"}`,
      module: "users",
      entity: { type: "user", id: user.id, label: user.name },
      severity: status === "suspended" ? "warning" : "info",
      previousValue: user.status,
      newValue: status,
    });
    return commit(next);
  },

  async requireUserTwoFactor(id, userId, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const user = bundle.users.find((item) => item.id === userId);
    if (!user) fail("NOT_FOUND", "User not found in this company.");
    if (user.mfaEnabled) fail("CONFLICT", `${user.name} already has 2FA enabled.`);

    let next: CompanyBundle = {
      ...bundle,
      users: bundle.users.map((item) => (item.id === userId ? { ...item, twoFactorRequired: true } : item)),
    };
    next = withActivity(next, actor, {
      action: "user.two_factor_required",
      summary: `2FA required for ${user.name} at next sign-in (demo - policy recorded only)`,
      module: "security",
      entity: { type: "user", id: user.id, label: user.name },
    });
    return commit(next);
  },

  async requireCompanyTwoFactor(id, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    if (bundle.security.policies.require2fa) fail("CONFLICT", "2FA is already required for this company.");
    const now = nowIso();
    let next: CompanyBundle = {
      ...bundle,
      users: bundle.users.map((user) => (user.mfaEnabled ? user : { ...user, twoFactorRequired: true })),
      security: {
        ...bundle.security,
        policies: { ...bundle.security.policies, require2fa: true },
        events: [{ id: nextId("sec"), companyId: id, at: now, type: "policy_changed", severity: "info", summary: "2FA requirement recorded for all users (demo - not enforced)", actorLabel: actor.name }, ...bundle.security.events],
      },
    };
    next = withActivity(next, actor, {
      action: "security.policy_changed",
      summary: "Company-wide 2FA requirement recorded (demo - not enforced)",
      module: "security",
      previousValue: "Optional",
      newValue: "Required",
    });
    return commit(next);
  },

  async requirePasswordReset(id, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const now = nowIso();
    let next: CompanyBundle = {
      ...bundle,
      security: {
        ...bundle.security,
        passwordResetRequestedAt: now,
        events: [{ id: nextId("sec"), companyId: id, at: now, type: "password_reset", severity: "info", summary: "Password reset requested for all users (demo - no passwords changed)", actorLabel: actor.name }, ...bundle.security.events],
      },
    };
    next = withActivity(next, actor, {
      action: "security.password_reset_requested",
      summary: "Password reset requested for all users (demo - no passwords were changed)",
      module: "security",
      severity: "warning",
    });
    return commit(next);
  },

  async revokeSessions(id, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const now = nowIso();
    let next: CompanyBundle = {
      ...bundle,
      security: {
        ...bundle.security,
        sessionRevocationRequestedAt: now,
        events: [{ id: nextId("sec"), companyId: id, at: now, type: "session_revocation", severity: "warning", summary: "Session revocation requested (demo - no sessions were ended)", actorLabel: actor.name }, ...bundle.security.events],
      },
    };
    next = withActivity(next, actor, {
      action: "security.sessions_revocation_requested",
      summary: "Session revocation requested (demo - no sessions were ended)",
      module: "security",
      severity: "warning",
    });
    return commit(next);
  },

  async setAccessLock(id, { locked, reason }, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    if (locked && bundle.security.accessLock) fail("CONFLICT", "Access is already locked for this company.");
    if (!locked && !bundle.security.accessLock) fail("CONFLICT", "Access is not locked.");
    const now = nowIso();
    let next: CompanyBundle = {
      ...bundle,
      security: {
        ...bundle.security,
        accessLock: locked ? { lockedAt: now, lockedBy: actor.name, reason } : null,
        events: [{ id: nextId("sec"), companyId: id, at: now, type: "access_locked", severity: locked ? "warning" : "info", summary: locked ? "Company access lock recorded (demo - not enforced)" : "Company access lock cleared", actorLabel: actor.name }, ...bundle.security.events],
      },
    };
    next = withActivity(next, actor, {
      action: locked ? "security.access_locked" : "security.access_unlocked",
      summary: locked ? "Company access lock recorded (demo - not enforced)" : "Company access lock cleared",
      module: "security",
      severity: locked ? "warning" : "info",
      reason: locked ? reason : null,
    });
    return commit(next);
  },

  async resendOwnerInvitation(id, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const owner = bundle.users.find((user) => user.id === bundle.company.ownerUserId);
    if (!owner || owner.status !== "invited") fail("CONFLICT", "There is no pending owner invitation.");
    let next: CompanyBundle = {
      ...bundle,
      users: bundle.users.map((user) => (user.id === owner.id ? { ...user, invitationExpired: false } : user)),
    };
    next = withActivity(next, actor, {
      action: "owner.invitation_resent",
      summary: `Owner invitation renewed for ${owner.name} (demo - no email was sent)`,
      module: "users",
      entity: { type: "user", id: owner.id, label: owner.name },
    });
    return commit(next);
  },

  /* ---------------------------- notes ----------------------------- */

  async addNote(id, input: NoteInput, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    if (!input.content.trim()) fail("VALIDATION_FAILED", "A note cannot be empty.", { content: "Write something first." });
    const now = nowIso();
    const note: CompanyInternalNote = {
      id: nextId(`note_${id}`),
      companyId: id,
      authorId: actor.id,
      authorName: actor.name,
      content: input.content.trim(),
      tags: input.tags,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    writeBundle({ ...bundle, notes: [note, ...bundle.notes] });
    return note;
  },

  async updateNote(id, noteId, input, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const existing = bundle.notes.find((note) => note.id === noteId);
    if (!existing) fail("NOT_FOUND", "Note not found.");
    if (existing.authorId !== actor.id) fail("FORBIDDEN", "You can edit only your own notes.");
    if (!input.content.trim()) fail("VALIDATION_FAILED", "A note cannot be empty.", { content: "Write something first." });
    const updated: CompanyInternalNote = { ...existing, content: input.content.trim(), tags: input.tags, updatedAt: nowIso() };
    writeBundle({ ...bundle, notes: bundle.notes.map((note) => (note.id === noteId ? updated : note)) });
    return updated;
  },

  async setNotePinned(id, noteId, pinned) {
    await wait("write");
    const bundle = requireBundle(id);
    const existing = bundle.notes.find((note) => note.id === noteId);
    if (!existing) fail("NOT_FOUND", "Note not found.");
    const updated = { ...existing, pinned };
    writeBundle({ ...bundle, notes: bundle.notes.map((note) => (note.id === noteId ? updated : note)) });
    return updated;
  },

  async deleteNote(id, noteId, actor) {
    await wait("write");
    const bundle = requireBundle(id);
    const existing = bundle.notes.find((note) => note.id === noteId);
    if (!existing) fail("NOT_FOUND", "Note not found.");
    if (existing.authorId !== actor.id) fail("FORBIDDEN", "You can delete only your own notes.");
    writeBundle({ ...bundle, notes: bundle.notes.filter((note) => note.id !== noteId) });
  },

  async resetDemoData() {
    await wait("write");
    resetDemoState();
  },
};
