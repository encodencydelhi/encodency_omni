import { env } from "@/config/env";
import { nowIso, platformNow } from "@/features/companies/data/clock";
import { STAFF } from "@/features/companies/data/mock/dataset";
import { allBundles } from "@/features/companies/data/mock/store";
import { computeUsage, type DerivationContext } from "@/features/companies/data/selectors";
import type { CompanyBundle } from "@/features/companies/data/types";
import { commercialContext, findPlan } from "@/features/plans-subscriptions/data/mock/plan-store";
import { ApiError } from "@/types/api";
import type { IntegrationProvider } from "@/types/domain/integration";
import { CHANGE_TYPE, CATEGORIES } from "./config";
import { computeStats, dependenciesOf, evaluateAll, evaluateFlag, findCycle, validatePrerequisites, type CompanyFacts } from "./evaluate";
import { nextSeq, resetFlagsState, save, state } from "./mock/store";
import { toDiff } from "./mock/seed";
import type {
  ActivityResult,
  ChangePreview,
  ChangesResult,
  CompanyAccessResult,
  CompanyImpactResult,
  EvaluationDetail,
  FlagDetail,
  FlagListResult,
  FlagsRepository,
  OverviewData,
  VersionComparison,
} from "./repository";
import {
  applyDiff,
  archiveBlockers,
  buildAttention,
  buildRow,
  changeTypeOf,
  computeImpactWith,
  configOf,
  contextOf,
  decideApproval,
  isCleanupCandidate,
  isNoChange,
  operationalState,
  queryRows,
  summarize,
  validateCreate,
} from "./selectors";
import type {
  ChangeType,
  ConfigDiff,
  Environment,
  EnvironmentConfig,
  FeatureFlag,
  FlagActivity,
  FlagChange,
  MutationActor,
  ProposeChangeInput,
  ValidationIssue,
} from "./types";

function wait(kind: "read" | "write"): Promise<void> {
  const base = kind === "read" ? env.mockLatencyMs * 0.6 : env.mockLatencyMs * 1.1;
  return new Promise((resolve) => setTimeout(resolve, Math.round(base)));
}

function fail(code: ConstructorParameters<typeof ApiError>[0]["code"], message: string, fieldErrors?: Record<string, string>): never {
  const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "CONFLICT" ? 409 : 422;
  throw new ApiError({ code, status, message, fieldErrors });
}
function derivation(): DerivationContext {
  return { now: platformNow(), staff: STAFF, ...commercialContext() };
}

function factsOf(bundle: CompanyBundle, ctx: DerivationContext): CompanyFacts {
  const { subscription } = bundle;
  const plan = findPlan(subscription.planTier);
  const version = plan?.versions.find((item) => item.version === (subscription.planVersion ?? 1)) ?? plan?.versions.find((item) => item.status === "published");
  const entitlements = new Set(Object.entries(version?.features ?? {}).filter(([, on]) => on).map(([key]) => key));

  const integrations: CompanyFacts["integrations"] = {};
  for (const integration of bundle.integrations) {
    const provider = integration.provider as IntegrationProvider;
    integrations[provider] = integrations[provider] === "healthy" || integration.state === "healthy" ? "healthy" : "attention";
  }

  const usageLimited: Record<string, string> = {};
  for (const record of computeUsage(ctx, bundle).records) {
    if (record.effectiveLimit !== null && record.effectiveLimit > 0 && record.used >= record.effectiveLimit) usageLimited[record.resource] = `${record.resource} limit reached: usage is at or above the effective limit.`;
  }

  return {
    id: bundle.company.id,
    name: bundle.company.name,
    displayId: bundle.company.displayId,
    planKey: subscription.planTier,
    planName: plan?.name ?? subscription.planTier,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    accountActive: bundle.company.accountStatus === "active",
    entitlements,
    integrations,
    usageLimited,
  };
}

function world() {
  const ctx = derivation();
  const bundles = allBundles();
  const companies = bundles.map((bundle) => factsOf(bundle, ctx));
  const store = state(bundles.map((bundle) => bundle.company.id));
  const context = contextOf(store.flags);
  return { now: ctx.now, bundles, companies, store, context, ids: bundles.map((bundle) => bundle.company.id) };
}

type World = ReturnType<typeof world>;

function requireFlag(w: World, key: string): FeatureFlag {
  const found = w.store.flags.find((flag) => flag.key === key);
  if (!found) fail("NOT_FOUND", `Feature flag ${key} was not found.`);
  return found;
}

const nameOf = (w: World, id: string) => w.companies.find((company) => company.id === id)?.name ?? id;

/* ------------------------------------------------------------------ */
/* Changes                                                             */
/* ------------------------------------------------------------------ */

function preview(w: World, flag: FeatureFlag, environment: Environment, proposed: Partial<ConfigDiff>): ChangePreview {
  const before = configOf(flag, environment);
  const after: ConfigDiff = { ...before, ...proposed };
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(after.percentage) || after.percentage < 0 || after.percentage > 100) issues.push({ field: "percentage", message: "Use a whole percentage from 0 to 100." });
  if (after.strategy === "percentage" && after.percentage < 1) issues.push({ field: "percentage", message: "A percentage rollout needs at least 1%." });
  const unknown = after.selectedCompanyIds.filter((id) => !w.ids.includes(id));
  if (unknown.length > 0) issues.push({ field: "selectedCompanyIds", message: `${unknown.length} selected ${unknown.length === 1 ? "company does" : "companies do"} not exist.` });
  if (after.enabled && !before.enabled && flag.implementation === "not_implemented") issues.push({ field: "enabled", message: "The feature is not implemented, so it cannot be enabled." });
  if (proposed.prerequisites) issues.push(...validatePrerequisites(flag.key, after.prerequisites, new Map(w.store.flags.map((item) => [item.key, item]))));
  if (flag.lifecycle === "archived") issues.push({ field: "lifecycle", message: "An archived flag cannot be changed." });

  const nextFlag = applyDiff(flag, environment, after);
  const nextContext = contextOf(w.store.flags.map((item) => (item.key === flag.key ? nextFlag : item)));
  const impact = computeImpactWith(flag, nextFlag, environment, w.companies, w.context, nextContext);
  const noChange = isNoChange(before, after);
  const type = noChange ? null : changeTypeOf(before, after);
  const decision = decideApproval(flag, environment, type ?? "rollout_updated", impact);
  return { before, after, type, impact, decision, issues, noChange };
}

function record(w: World, change: FlagChange, result: FlagActivity["result"], summary: string): void {
  const store = w.store;
  store.changes.push(change);
  store.activity.push({ id: `fa_${String(nextSeq(w.ids)).padStart(4, "0")}`, at: nowIso(), actor: change.requestedBy, flagKey: change.flagKey, flagName: change.flagName, environment: change.environment, type: change.type, result, summary, changeId: change.id });
}

function describe(flag: FeatureFlag, environment: Environment, type: ChangeType, after: ConfigDiff): string {
  switch (type) {
    case "emergency_disabled": return `Emergency disable applied to ${flag.name} in ${environment}`;
    case "emergency_restored": return `${flag.name} restored from emergency off in ${environment}`;
    case "state_changed": return `${flag.name} ${after.enabled ? "enabled" : "disabled"} in ${environment}`;
    case "dependency_updated": return `${flag.name} prerequisites updated: ${after.prerequisites.join(", ") || "none"}`;
    case "target_added": return `Companies added to the ${flag.name} rollout in ${environment}`;
    case "target_removed": return `Companies removed from the ${flag.name} rollout in ${environment}`;
    default: return `${flag.name}: ${environment} rollout set to ${after.strategy}${after.strategy === "percentage" ? ` ${after.percentage}%` : ""}`;
  }
}

function applyConfig(w: World, flag: FeatureFlag, environment: Environment, after: ConfigDiff, actor: string, reason: string, changeId: string, type: ChangeType): number {
  const now = nowIso();
  const config: EnvironmentConfig = flag.environments[environment];
  const version = config.version + 1;
  const wasOff = config.emergencyOff;
  flag.environments[environment] = {
    ...config,
    enabled: after.enabled,
    strategy: after.strategy,
    percentage: after.percentage,
    selectedCompanyIds: [...after.selectedCompanyIds],
    emergencyOff: after.emergencyOff,
    emergencyReason: after.emergencyOff ? reason : null,
    emergencyAt: after.emergencyOff ? now : wasOff ? null : config.emergencyAt,
    emergencyBy: after.emergencyOff ? actor : null,
    version,
    updatedAt: now,
    updatedBy: actor,
  };
  flag.prerequisites = [...after.prerequisites];
  flag.updatedAt = now;
  flag.updatedBy = actor;
  w.store.versions = w.store.versions.map((item) => (item.flagKey === flag.key && item.environment === environment ? { ...item, current: false } : item));
  w.store.versions.push({ id: `${flag.id}_${environment}_v${version}`, flagId: flag.id, flagKey: flag.key, environment, version, config: after, createdBy: actor, createdAt: now, reason, changeId, current: true });
  void type;
  return version;
}

function makeChange(w: World, flag: FeatureFlag, input: ProposeChangeInput, actor: MutationActor, p: ChangePreview, status: FlagChange["status"], note: string): FlagChange {
  return {
    id: `chg_${String(nextSeq(w.ids)).padStart(4, "0")}`,
    flagId: flag.id,
    flagKey: flag.key,
    flagName: flag.name,
    environment: input.environment,
    type: p.type ?? "rollout_updated",
    status,
    before: p.before,
    after: p.after,
    reason: input.reason.trim(),
    requestedBy: actor.name,
    requestedById: actor.id,
    requestedAt: nowIso(),
    effectiveAt: input.effectiveAt ?? null,
    timezone: "UTC",
    approvalRequired: p.decision.required,
    approvalNote: note,
    impact: p.impact,
    appliedAt: null,
    demo: true,
    versionNumber: null,
    auditRef: null,
  };
}
function paginate<T>(rows: readonly T[], page = 1, pageSize = 10) {
  const safePage = Math.max(1, page);
  return { rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize), total: rows.length, page: safePage, pageSize };
}

const OPEN: FlagChange["status"][] = ["draft", "pending_approval", "scheduled"];

export const mockFlagsProvider: FlagsRepository = {
  mode: "mock",

  async getOverview(environment, filter = {}): Promise<OverviewData> {
    await wait("read");
    const w = world();
    const flags = w.store.flags.filter((flag) => flag.lifecycle !== "archived" && (!filter.category || flag.category === filter.category) && (!filter.owner || flag.ownerTeam === filter.owner));
    const keys = new Set(flags.map((flag) => flag.key));
    const rows = flags.map((flag) => buildRow(flag, environment, w.companies, w.context, w.store.changes));
    const inEnv = w.store.changes.filter((item) => item.environment === environment && keys.has(item.flagKey));
    const active = rows.filter((row) => row.state === "enabled" && (row.config.strategy === "selected" || row.config.strategy === "percentage" || row.config.strategy === "internal"));
    const live = w.store.flags.filter((flag) => flag.lifecycle !== "archived");
    return {
      environment,
      kpis: {
        total: rows.length,
        globallyEnabled: rows.filter((row) => row.state === "enabled" && row.config.strategy === "all").length,
        disabled: rows.filter((row) => row.state === "disabled").length,
        activeRollouts: active.length,
        scheduled: inEnv.filter((item) => item.status === "scheduled").length,
        pendingApproval: inEnv.filter((item) => item.status === "pending_approval").length,
        emergencyOff: rows.filter((row) => row.state === "emergency_off").length,
        cleanup: flags.filter((flag) => isCleanupCandidate(flag, w.now)).length,
      },
      rollouts: active.sort((a, b) => b.stats.effective - a.stats.effective),
      attention: buildAttention(rows, w.store.changes, flags, environment, w.now).filter((item) => keys.has(item.flagKey)),
      activity: [...w.store.activity].filter((item) => keys.has(item.flagKey) && (item.environment === environment || item.environment === null)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8),
      updatedAt: new Date(w.now).toISOString(),
      facets: { owners: [...new Set(live.map((flag) => flag.ownerTeam))].sort(), categories: [...new Set(live.map((flag) => flag.category))].sort() },
    };
  },

  async listFlags(query): Promise<FlagListResult> {
    await wait("read");
    const w = world();
    const all = w.store.flags.map((flag) => buildRow(flag, query.environment, w.companies, w.context, w.store.changes));
    // Cleanup is judged against the demo clock, which the row query does not know about.
    const scoped = query.quick === "cleanup" ? all.filter((row) => isCleanupCandidate(row.flag, w.now)) : all;
    return {
      rows: queryRows(scoped, query.quick === "cleanup" ? { ...query, quick: undefined } : query),
      summary: summarize(all),
      facets: { owners: [...new Set(w.store.flags.map((flag) => flag.ownerTeam))].sort(), categories: [...new Set(w.store.flags.map((flag) => flag.category))].sort() },
    };
  },

  async getFlag(key, environment): Promise<FlagDetail> {
    await wait("read");
    const w = world();
    const flag = requireFlag(w, key);
    const row = buildRow(flag, environment, w.companies, w.context, w.store.changes);
    const flagsMap = new Map(w.store.flags.map((item) => [item.key, item]));
    const rows = w.store.flags.filter((item) => item.lifecycle !== "archived").map((item) => buildRow(item, environment, w.companies, w.context, w.store.changes));
    const direct = new Set(flag.prerequisites);
    return {
      flag,
      row,
      dependencies: dependenciesOf(key, flagsMap),
      dependencyFlags: [...new Set([...dependenciesOf(key, flagsMap).direct, ...dependenciesOf(key, flagsMap).indirect])].map((dep) => {
        const found = flagsMap.get(dep);
        return { key: dep, name: found?.name ?? dep, state: found ? operationalState(found.environments[environment]) : "missing", lifecycle: found?.lifecycle ?? "missing" };
      }),
      attention: buildAttention(rows, w.store.changes, w.store.flags, environment, w.now).filter((item) => item.flagKey === key),
      activity: [...w.store.activity].filter((item) => item.flagKey === key).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 25),
      changes: w.store.changes.filter((item) => item.flagKey === key && item.environment === environment && OPEN.includes(item.status)),
      archiveBlockers: archiveBlockers(flag, w.store.flags, w.store.changes),
      candidatePrerequisites: w.store.flags
        .filter((item) => item.key !== key && item.lifecycle !== "archived" && !direct.has(item.key) && !findCycle(key, [...flag.prerequisites, item.key], flagsMap))
        .map((item) => ({ key: item.key, name: item.name })),
    };
  },

  async previewChange(key, environment, proposed) {
    await wait("read");
    const w = world();
    return preview(w, requireFlag(w, key), environment, proposed);
  },

  async proposeChange(input: ProposeChangeInput, actor): Promise<ReturnType<FlagsRepository["proposeChange"]> extends Promise<infer T> ? T : never> {
    await wait("write");
    const w = world();
    const flag = requireFlag(w, input.flagKey);
    const p = preview(w, flag, input.environment, input.proposed);
    if (p.issues.length > 0) fail("VALIDATION_FAILED", p.issues[0]?.message ?? "The change is not valid.", Object.fromEntries(p.issues.map((issue) => [issue.field, issue.message])));
    if (p.noChange || !p.type) fail("VALIDATION_FAILED", "Nothing differs from the current configuration.", { reason: "No change to make." });
    if (p.decision.forbidden) fail("FORBIDDEN", p.decision.reason);
    const production = input.environment === "production";
    if ((production || flag.protection !== "standard") && !input.reason.trim()) fail("VALIDATION_FAILED", "A reason is required for this change.", { reason: "Say why this is changing." });
    if (input.reason.length > 300) fail("VALIDATION_FAILED", "The reason is too long.", { reason: "Keep the reason under 300 characters." });
    const future = Boolean(input.effectiveAt) && Date.parse(input.effectiveAt as string) > w.now;
    if (input.effectiveAt && Number.isNaN(Date.parse(input.effectiveAt))) fail("VALIDATION_FAILED", "The effective time is not valid.", { effectiveAt: "Enter a valid date and time." });

    const type = p.type;
    if (input.saveAsDraft) {
      const change = makeChange(w, flag, input, actor, p, "draft", "Draft. Not submitted for review.");
      record(w, change, "pending", `Draft saved: ${describe(flag, input.environment, type, p.after)}`);
      save(w.store);
      return { change, applied: false, flag };
    }
    if (p.decision.required) {
      const change = makeChange(w, flag, input, actor, p, "pending_approval", `Awaiting approval: ${p.decision.reason} Demo record: no approval service is connected in this frontend phase.`);
      record(w, change, "pending", `Change requested: ${describe(flag, input.environment, type, p.after)}`);
      save(w.store);
      return { change, applied: false, flag };
    }
    if (future) {
      const change = makeChange(w, flag, input, actor, p, "scheduled", "Planned. No scheduler runs in this frontend phase, so it is not applied automatically.");
      record(w, change, "scheduled", `Scheduled: ${describe(flag, input.environment, type, p.after)}`);
      save(w.store);
      return { change, applied: false, flag };
    }

    const change = makeChange(w, flag, input, actor, p, "applied", p.decision.required ? "Approved" : "Permitted demo change. Enforced by nothing in production.");
    change.appliedAt = nowIso();
    change.effectiveAt = change.appliedAt;
    change.versionNumber = applyConfig(w, flag, input.environment, p.after, actor.name, input.reason.trim() || "Demo change", change.id, type);
    record(w, change, "applied", describe(flag, input.environment, type, p.after));
    save(w.store);
    return { change, applied: true, flag };
  },

  async createFlag(input, actor) {
    await wait("write");
    const w = world();
    const issues = validateCreate(input, w.store.flags);
    if (issues.length > 0) fail("VALIDATION_FAILED", issues[0]?.message ?? "The flag could not be created.", Object.fromEntries(issues.map((issue) => [issue.field, issue.message])));
    const now = nowIso();
    const envConfig = (environment: Environment): EnvironmentConfig => {
      const initial = input.initial[environment];
      const production = environment === "production";
      return {
        enabled: production ? false : initial.enabled,
        strategy: production ? "disabled" : initial.strategy,
        percentage: initial.strategy === "percentage" ? initial.percentage : 0,
        selectedCompanyIds: initial.strategy === "selected" ? [...initial.selectedCompanyIds] : [],
        emergencyOff: false,
        emergencyReason: null,
        emergencyAt: null,
        emergencyBy: null,
        salt: "v1",
        version: 1,
        updatedAt: now,
        updatedBy: actor.name,
      };
    };
    const flag: FeatureFlag = {
      id: `flag_${input.key.replace(/\./g, "_")}`,
      key: input.key,
      name: input.name.trim(),
      description: input.description.trim(),
      category: CATEGORIES.includes(input.category) ? input.category : "Platform",
      ownerTeam: input.ownerTeam,
      relatedModule: input.relatedModule,
      documentation: input.documentation,
      type: input.type,
      lifecycle: "draft",
      protection: input.protection,
      implementation: input.implementation,
      knownLimitations: [],
      entitlement: input.entitlement,
      requiredCapability: input.requiredCapability,
      integrations: input.integrations,
      usageResource: input.usageResource,
      prerequisites: input.prerequisites,
      environments: { development: envConfig("development"), staging: envConfig("staging"), production: envConfig("production") },
      createdAt: now,
      createdBy: actor.name,
      updatedAt: now,
      updatedBy: actor.name,
      deprecatedAt: null,
      archivedAt: null,
      codeReferences: "unverified",
    };
    w.store.flags.push(flag);
    for (const environment of ["development", "staging", "production"] as const) {
      w.store.versions.push({ id: `${flag.id}_${environment}_v1`, flagId: flag.id, flagKey: flag.key, environment, version: 1, config: toDiff(flag.environments[environment], flag.prerequisites), createdBy: actor.name, createdAt: now, reason: input.reason.trim() || "Initial configuration", changeId: null, current: true });
    }
    const change: FlagChange = {
      id: `chg_${String(nextSeq(w.ids)).padStart(4, "0")}`,
      flagId: flag.id,
      flagKey: flag.key,
      flagName: flag.name,
      environment: "production",
      type: "flag_created",
      status: "applied",
      before: null,
      after: toDiff(flag.environments.production, flag.prerequisites),
      reason: input.reason.trim() || "Flag definition created.",
      requestedBy: actor.name,
      requestedById: actor.id,
      requestedAt: now,
      effectiveAt: now,
      timezone: "UTC",
      approvalRequired: false,
      approvalNote: "Not required. Creating a definition does not implement the feature.",
      impact: null,
      appliedAt: now,
      demo: true,
      versionNumber: 1,
      auditRef: null,
    };
    record(w, change, "applied", `Created ${flag.name} (${flag.key}). Disabled in production.`);
    save(w.store);
    return flag;
  },

  async validateCreate(input) {
    await wait("read");
    return validateCreate(input, world().store.flags);
  },

  async updateMetadata(key, patch, actor) {
    await wait("write");
    const w = world();
    const flag = requireFlag(w, key);
    if (flag.lifecycle === "archived") fail("CONFLICT", "An archived flag cannot be edited.");
    if (patch.description !== undefined && patch.description.trim().length < 10) fail("VALIDATION_FAILED", "The description is too short.", { description: "Add a description of at least 10 characters." });
    if (patch.documentation && !/^https?:\/\/\S+\.\S+/.test(patch.documentation)) fail("VALIDATION_FAILED", "The documentation link is not valid.", { documentation: "Enter a valid URL." });
    Object.assign(flag, patch);
    flag.updatedAt = nowIso();
    flag.updatedBy = actor.name;
    const change: FlagChange = { id: `chg_${String(nextSeq(w.ids)).padStart(4, "0")}`, flagId: flag.id, flagKey: flag.key, flagName: flag.name, environment: "production", type: "metadata_updated", status: "applied", before: null, after: null, reason: "Metadata updated. The stable key is never edited.", requestedBy: actor.name, requestedById: actor.id, requestedAt: flag.updatedAt, effectiveAt: flag.updatedAt, timezone: "UTC", approvalRequired: false, approvalNote: "Not required", impact: null, appliedAt: flag.updatedAt, demo: true, versionNumber: null, auditRef: null };
    record(w, change, "applied", `Metadata updated for ${flag.name}`);
    save(w.store);
    return flag;
  },

  async setLifecycle(key, action, reason, actor) {
    await wait("write");
    const w = world();
    const flag = requireFlag(w, key);
    if (!reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "Say why the lifecycle is changing." });
    if (action === "deprecate") {
      if (flag.lifecycle === "deprecated" || flag.lifecycle === "archived") fail("CONFLICT", `The flag is already ${flag.lifecycle}.`);
      flag.lifecycle = "deprecated";
      flag.deprecatedAt = nowIso();
    } else {
      if (flag.lifecycle === "archived") fail("CONFLICT", "The flag is already archived.");
      const blockers = archiveBlockers(flag, w.store.flags, w.store.changes);
      if (blockers.length > 0) fail("CONFLICT", blockers[0] ?? "The flag cannot be archived yet.", { archive: blockers.join(" ") });
      flag.lifecycle = "archived";
      flag.archivedAt = nowIso();
    }
    flag.updatedAt = nowIso();
    flag.updatedBy = actor.name;
    const type: ChangeType = action === "deprecate" ? "flag_deprecated" : "flag_archived";
    const change: FlagChange = { id: `chg_${String(nextSeq(w.ids)).padStart(4, "0")}`, flagId: flag.id, flagKey: flag.key, flagName: flag.name, environment: "production", type, status: "applied", before: null, after: null, reason: reason.trim(), requestedBy: actor.name, requestedById: actor.id, requestedAt: flag.updatedAt, effectiveAt: flag.updatedAt, timezone: "UTC", approvalRequired: false, approvalNote: "Not required. Archiving does not remove code or delete history.", impact: null, appliedAt: flag.updatedAt, demo: true, versionNumber: null, auditRef: null };
    record(w, change, "applied", `${flag.name} ${action === "deprecate" ? "deprecated" : "archived"}`);
    save(w.store);
    return flag;
  },

  async listCompanyImpact(key, environment, query): Promise<CompanyImpactResult> {
    await wait("read");
    const w = world();
    const flag = requireFlag(w, key);
    const all = evaluateAll(flag, environment, w.companies, w.context);
    const search = query.search?.trim().toLowerCase();
    const rows = all
      .filter((item) => !query.plan || item.planKey === query.plan)
      .filter((item) => (query.targeting === "matched" ? item.targeted : query.targeting === "not_matched" ? !item.targeted : true))
      .filter((item) => !query.availability || item.availability === query.availability)
      .filter((item) => !query.reason || item.reasons.includes(query.reason as never))
      .filter((item) => !search || `${item.companyName} ${item.companyDisplayId} ${item.planName}`.toLowerCase().includes(search))
      .sort((a, b) => Number(b.availability === "available") - Number(a.availability === "available") || a.companyName.localeCompare(b.companyName));
    return { rows, stats: computeStats(all), facets: { plans: [...new Map(w.companies.map((company) => [company.planKey, company.planName])).entries()].map(([id]) => id).sort() } };
  },

  async evaluateCompany(key, environment, companyId): Promise<EvaluationDetail> {
    await wait("read");
    const w = world();
    const flag = requireFlag(w, key);
    const company = w.companies.find((item) => item.id === companyId);
    if (!company) fail("NOT_FOUND", `Company ${companyId} was not found.`);
    const evaluation = evaluateFlag(flag, environment, company, w.context);
    return {
      flag,
      evaluation,
      prerequisites: flag.prerequisites.map((dep) => {
        const found = w.store.flags.find((item) => item.key === dep);
        const result = found ? evaluateFlag(found, environment, company, w.context).availability : "missing";
        return { key: dep, name: found?.name ?? dep, availability: result, ok: result === "available" };
      }),
    };
  },

  async getCompanyAccess(companyId, environment): Promise<CompanyAccessResult> {
    await wait("read");
    const w = world();
    const company = w.companies.find((item) => item.id === companyId);
    if (!company) fail("NOT_FOUND", `Company ${companyId} was not found.`);
    const rows = w.store.flags
      .filter((flag) => flag.lifecycle !== "archived")
      .map((flag) => ({
        flag: { key: flag.key, name: flag.name, category: flag.category, type: flag.type, implementation: flag.implementation, lifecycle: flag.lifecycle, entitlement: flag.entitlement },
        evaluation: evaluateFlag(flag, environment, company, w.context),
        state: operationalState(flag.environments[environment]),
      }))
      .sort((a, b) => a.flag.category.localeCompare(b.flag.category) || a.flag.name.localeCompare(b.flag.name));
    const failing = (pick: (item: (typeof rows)[number]["evaluation"]) => boolean) => rows.filter((row) => pick(row.evaluation)).length;
    return {
      company: { id: company.id, name: company.name, displayId: company.displayId, accountActive: company.accountActive, planName: company.planName, subscriptionId: company.subscriptionId, subscriptionStatus: company.subscriptionStatus },
      environment,
      rows,
      counts: {
        total: rows.length,
        available: failing((item) => item.availability === "available"),
        planBlocked: failing((item) => item.conditions.plan === "fail"),
        rolloutBlocked: failing((item) => item.conditions.targeting === "fail" && item.conditions.flag === "pass"),
        dependencyBlocked: failing((item) => item.conditions.dependencies === "fail"),
        integrationBlocked: failing((item) => item.conditions.integration === "fail"),
      },
    };
  },

  async searchCompanies(term) {
    await wait("read");
    const w = world();
    const needle = term.trim().toLowerCase();
    return w.companies
      .filter((company) => !needle || `${company.name} ${company.displayId} ${company.id} ${company.planName}`.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 200)
      .map((company) => ({ id: company.id, name: company.name, displayId: company.displayId, plan: company.planName, status: company.subscriptionStatus }));
  },

  async listChanges(query): Promise<ChangesResult> {
    await wait("read");
    const w = world();
    const search = query.search?.trim().toLowerCase();
    const filtered = w.store.changes
      .filter((item) => !query.environment || item.environment === query.environment)
      .filter((item) => !query.status || query.status.includes(item.status))
      .filter((item) => !query.flagKey || item.flagKey === query.flagKey)
      .filter((item) => !query.type || item.type === query.type)
      .filter((item) => !query.actor || item.requestedBy === query.actor)
      .filter((item) => !query.result || item.status === query.result)
      .filter((item) => !search || `${item.flagName} ${item.flagKey} ${item.id} ${item.requestedBy}`.toLowerCase().includes(search))
      .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
    return { ...paginate(filtered, query.page, query.pageSize ?? 10), actors: [...new Set(w.store.changes.map((item) => item.requestedBy))].sort() };
  },

  async getChange(id) {
    await wait("read");
    const found = world().store.changes.find((item) => item.id === id);
    if (!found) fail("NOT_FOUND", `Change ${id} was not found.`);
    return found;
  },

  async cancelChange(id, reason, actor) {
    await wait("write");
    const w = world();
    const found = w.store.changes.find((item) => item.id === id);
    if (!found) fail("NOT_FOUND", `Change ${id} was not found.`);
    if (!OPEN.includes(found.status)) fail("CONFLICT", "Only a draft, pending or scheduled change can be cancelled.");
    if (!reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "Say why it is being cancelled." });
    found.status = "cancelled";
    found.approvalNote = `Cancelled by ${actor.name}: ${reason.trim()}`;
    w.store.activity.push({ id: `fa_${String(nextSeq(w.ids)).padStart(4, "0")}`, at: nowIso(), actor: actor.name, flagKey: found.flagKey, flagName: found.flagName, environment: found.environment, type: found.type, result: "cancelled", summary: `Cancelled: ${CHANGE_TYPE[found.type]} for ${found.flagName}`, changeId: found.id });
    save(w.store);
    return found;
  },

  async listActivity(query): Promise<ActivityResult> {
    await wait("read");
    const w = world();
    const search = query.search?.trim().toLowerCase();
    const filtered = [...w.store.activity]
      .filter((item) => !query.environment || item.environment === query.environment || item.environment === null)
      .filter((item) => !query.flagKey || item.flagKey === query.flagKey)
      .filter((item) => !query.type || item.type === query.type)
      .filter((item) => !query.actor || item.actor === query.actor)
      .filter((item) => !query.result || item.result === query.result)
      .filter((item) => !search || `${item.flagName} ${item.flagKey} ${item.actor} ${item.summary}`.toLowerCase().includes(search))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return { ...paginate(filtered, query.page, query.pageSize ?? 10), actors: [...new Set(w.store.activity.map((item) => item.actor))].sort() };
  },

  async listVersions(flagKey, environment) {
    await wait("read");
    const w = world();
    return { rows: w.store.versions.filter((item) => item.environment === environment && (!flagKey || item.flagKey === flagKey)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.version - a.version) };
  },

  async compareVersions(fromId, toId): Promise<VersionComparison> {
    await wait("read");
    const w = world();
    const from = w.store.versions.find((item) => item.id === fromId);
    const to = w.store.versions.find((item) => item.id === toId);
    if (!from || !to) fail("NOT_FOUND", "One of the versions was not found.");
    const names = (ids: string[]) => (ids.length === 0 ? "None" : `${ids.length}: ${ids.slice(0, 4).map((id) => nameOf(w, id)).join(", ")}${ids.length > 4 ? ", ..." : ""}`);
    const line = (field: string, a: string, b: string) => ({ field, from: a, to: b, changed: a !== b });
    return {
      from,
      to,
      rows: [
        line("Platform State", from.config.enabled ? "Enabled" : "Disabled", to.config.enabled ? "Enabled" : "Disabled"),
        line("Rollout Strategy", from.config.strategy, to.config.strategy),
        line("Percentage", from.config.strategy === "percentage" ? `${from.config.percentage}%` : "n/a", to.config.strategy === "percentage" ? `${to.config.percentage}%` : "n/a"),
        line("Selected Companies", from.config.strategy === "selected" ? names(from.config.selectedCompanyIds) : "n/a", to.config.strategy === "selected" ? names(to.config.selectedCompanyIds) : "n/a"),
        line("Prerequisites", from.config.prerequisites.join(", ") || "None", to.config.prerequisites.join(", ") || "None"),
        line("Emergency State", from.config.emergencyOff ? "Emergency Off" : "Normal", to.config.emergencyOff ? "Emergency Off" : "Normal"),
      ],
    };
  },

  async resetDemoData() {
    await wait("write");
    resetFlagsState();
  },
};
