/**
 * Live verification: the REAL Feature Flags repository against the running backend.
 *
 * Read-only by construction: `fetch` is rewritten to the backend origin, carries a
 * dev session cookie, and refuses any method other than GET/HEAD, so a parallel
 * agent hammering the write endpoints is never touched and no state is created.
 * It also records every request so the report can prove that only reads happened.
 *
 * What it proves, end to end:
 *   1. `flagsRepository` really resolves to `liveFlagsProvider` (no mock fallback).
 *   2. Every read the Feature Flags screens issue hydrates the exact shape the
 *      frontend types promise (`OverviewData`, `FlagListResult`, `FlagDetail`,
 *      `ChangesResult`, `ActivityResult`, `VersionsResult`, `VersionComparison`,
 *      `CompanyImpactResult`, `CompanyAccessResult`, `EvaluationDetail`,
 *      `CompanyOption`) — no missing keys, no `undefined` leaves, every enum inside
 *      the union the UI switches on.
 *   3. Pagination envelopes (`rows`/`total`/`page`/`pageSize`) match what the UI's
 *      `Pager` reads.
 *   4. A missing flag rejects with a typed 404 `ApiError`, not a crash.
 *   5. Behaviour probes: query parameters the backend DTO accepts but the service
 *      never reads (`quick`, `sort`, `result`, `targeting`) are reported as FINDING
 *      lines, because the UI ships filters for them.
 *
 * Run:
 *   VERIFY_SESSION=<raw omni_session value> node --import ./scripts/ts-test-hooks.mjs scripts/verify-feature-flags-live.ts
 */
import { ApiError } from "@/types/api";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";

const SESSION = process.env.VERIFY_SESSION ?? "";
const ORIGIN = "http://127.0.0.1:4000";
if (!SESSION) throw new Error("VERIFY_SESSION (raw omni_session value) is required");

/* ------------------------------------------------------------------ */
/* Transport: read-only, cookie-carrying, call-recording               */
/* ------------------------------------------------------------------ */

interface RecordedCall {
  method: string;
  url: string;
  status: number;
}

const calls: RecordedCall[] = [];
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    throw new Error(`READ-ONLY harness refused ${method} ${String(input)}`);
  }
  const url = new URL(String(input), ORIGIN);
  const headers = new Headers(init.headers);
  headers.set("cookie", `omni_session=${SESSION}`);
  // The backend's CSRF guard only inspects unsafe methods, but the Origin is set
  // anyway so a future unsafe call in here would be judged by the same rule the
  // browser uses.
  if (!headers.has("origin")) headers.set("origin", ORIGIN);
  const response = await realFetch(url, { ...init, headers });
  calls.push({ method, url: url.pathname + url.search, status: response.status });
  return response;
}) as typeof fetch;

// The mock store that the repository imports touches `window`/`sessionStorage`
// lazily; give it inert stand-ins so importing the module graph stays side-effect
// free in Node.
function fakeStorage(): Storage {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => (memory.has(key) ? memory.get(key)! : null),
    setItem: (key, value) => void memory.set(key, String(value)),
    removeItem: (key) => void memory.delete(key),
    clear: () => void memory.clear(),
    key: (index) => Array.from(memory.keys())[index] ?? null,
    get length() {
      return memory.size;
    },
  };
}
(globalThis as { window?: unknown }).window = {
  localStorage: fakeStorage(),
  sessionStorage: fakeStorage(),
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};
(globalThis as { localStorage?: Storage }).localStorage = fakeStorage();
(globalThis as { sessionStorage?: Storage }).sessionStorage = fakeStorage();

const repository = await import("../src/features/feature-flags/data/repository");
const { liveFlagsProvider } = await import("../src/features/feature-flags/data/live-provider");
const { flagsRepository } = repository;

/* ------------------------------------------------------------------ */
/* Assertion helpers                                                   */
/* ------------------------------------------------------------------ */

interface Outcome {
  name: string;
  ok: boolean;
  notes: string[];
}

const outcomes: Outcome[] = [];
const findings: string[] = [];

function note(text: string): void {
  findings.push(text);
  console.log(`FINDING  ${text}`);
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** A read-only behaviour probe: failures here are findings, not contract breaks. */
async function probe(name: string, body: () => Promise<void>): Promise<void> {
  try {
    await body();
  } catch (error) {
    note(`probe "${name}" threw: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function check(name: string, body: (notes: string[]) => Promise<void> | void): Promise<void> {
  const notes: string[] = [];
  try {
    await body(notes);
    outcomes.push({ name, ok: true, notes });
    console.log(`PASS  ${name}${notes.length ? `  [${notes.join("; ")}]` : ""}`);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? `ApiError ${error.code} status=${error.status}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    outcomes.push({ name, ok: false, notes: [...notes, message] });
    console.log(`FAIL  ${name}  ${message}`);
  }
}

/** Keys the frontend type reads that are absent (or explicitly `undefined`) in the payload. */
function missingKeys(value: unknown, keys: readonly string[], label: string): string[] {
  if (value === null || typeof value !== "object") {
    return [`${label} is ${value === null ? "null" : typeof value}`];
  }
  const record = value as Record<string, unknown>;
  return keys.filter((key) => record[key] === undefined).map((key) => `${label}.${key}`);
}

/** Every leaf that is literally `undefined` (a field the backend builds as `undefined`). */
function undefinedLeaves(value: unknown, path = "$", out: string[] = [], seen = new WeakSet<object>()): string[] {
  if (value === undefined) {
    out.push(path);
    return out;
  }
  if (value === null || typeof value !== "object") return out;
  if (seen.has(value as object)) return out;
  seen.add(value as object);
  if (Array.isArray(value)) {
    value.forEach((item, index) => undefinedLeaves(item, `${path}[${index}]`, out, seen));
    return out;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    undefinedLeaves(child, `${path}.${key}`, out, seen);
  }
  return out;
}

function assertShape(value: unknown, keys: readonly string[], label: string, notes: string[]): void {
  const missing = missingKeys(value, keys, label);
  expect(missing.length === 0, `${label} missing ${missing.join(", ")}`);
  const undefineds = undefinedLeaves(value).slice(0, 8);
  expect(undefineds.length === 0, `${label} has undefined leaves: ${undefineds.join(", ")}`);
  if (missing.length === 0 && undefineds.length === 0) notes.push(`${label} ok`);
}

/* Enumerations the UI switches on (src/features/feature-flags/data/types.ts). */
const ENVIRONMENTS = ["development", "staging", "production"];
const FLAG_TYPES = ["release", "operational"];
const LIFECYCLES = ["draft", "active", "deprecated", "archived"];
const IMPLEMENTATIONS = ["not_implemented", "in_development", "testing", "ready", "deprecated"];
const PROTECTIONS = ["standard", "sensitive", "protected"];
const STRATEGIES = ["disabled", "internal", "selected", "percentage", "all"];
const STATES = ["enabled", "disabled", "emergency_off"];
const AVAILABILITY = [
  "available",
  "emergency_off",
  "not_ready",
  "flag_disabled",
  "plan_restricted",
  "subscription_inactive",
  "rollout_restricted",
  "dependency_blocked",
  "integration_blocked",
  "internal_only",
];
const CHANGE_TYPES = [
  "flag_created",
  "state_changed",
  "rollout_updated",
  "target_added",
  "target_removed",
  "dependency_updated",
  "emergency_disabled",
  "emergency_restored",
  "metadata_updated",
  "flag_deprecated",
  "flag_archived",
];
const CHANGE_STATUSES = ["draft", "pending_approval", "scheduled", "applied", "rejected", "cancelled"];
const ACTIVITY_RESULTS = ["applied", "pending", "scheduled", "cancelled", "rejected"];
const ATTENTION_KINDS = [
  "not_ready",
  "dependency_blocked",
  "plan_mismatch",
  "awaiting_approval",
  "emergency_off",
  "conflict",
  "deprecated_referenced",
  "inconsistent",
  "cleanup",
];
const SEVERITIES = ["critical", "warning", "info"];
const CONDITIONS = ["pass", "fail", "not_applicable"];
const CATEGORIES = [
  "AI & Content",
  "Automation",
  "Channels",
  "Website & SEO",
  "Analytics",
  "Workspace",
  "Agency",
  "Platform",
  "Security",
  "Billing",
];

function enumProblems(items: readonly unknown[], rules: ReadonlyArray<[string, readonly string[]]>, label: string): string[] {
  const problems: string[] = [];
  items.forEach((item, index) => {
    if (item === null || typeof item !== "object") {
      problems.push(`${label}[${index}] is not an object`);
      return;
    }
    const record = item as Record<string, unknown>;
    for (const [key, allowed] of rules) {
      const value = record[key];
      if (value === undefined || value === null) {
        problems.push(`${label}[${index}].${key} is ${value === null ? "null" : "missing"}`);
        continue;
      }
      if (!allowed.includes(String(value))) problems.push(`${label}[${index}].${key}=${JSON.stringify(value)} not in ${allowed.join("|")}`);
    }
  });
  return problems;
}

/* Key sets mirroring the frontend interfaces. */
const K_FLAG = [
  "id",
  "key",
  "name",
  "description",
  "category",
  "ownerTeam",
  "relatedModule",
  "documentation",
  "type",
  "lifecycle",
  "protection",
  "implementation",
  "knownLimitations",
  "entitlement",
  "requiredCapability",
  "integrations",
  "usageResource",
  "prerequisites",
  "environments",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "deprecatedAt",
  "archivedAt",
  "codeReferences",
];
const K_ENV_CONFIG = [
  "enabled",
  "strategy",
  "percentage",
  "selectedCompanyIds",
  "emergencyOff",
  "emergencyReason",
  "emergencyAt",
  "emergencyBy",
  "salt",
  "version",
  "updatedAt",
  "updatedBy",
];
const K_STATS = [
  "eligible",
  "targeted",
  "targetingMatched",
  "effective",
  "blocked",
  "blockedByPlan",
  "blockedByDependency",
  "blockedByIntegration",
  "totalCompanies",
];
const K_ROW = ["flag", "environment", "config", "state", "stats", "pendingChanges"];
const K_ATTENTION = ["id", "severity", "flagKey", "flagName", "environment", "kind", "issue", "scope", "detectedAt", "changeId"];
const K_ACTIVITY = ["id", "at", "actor", "flagKey", "flagName", "environment", "type", "result", "summary", "changeId"];
const K_CHANGE = [
  "id",
  "flagId",
  "flagKey",
  "flagName",
  "environment",
  "type",
  "status",
  "before",
  "after",
  "reason",
  "requestedBy",
  "requestedById",
  "requestedAt",
  "effectiveAt",
  "timezone",
  "approvalRequired",
  "approvalNote",
  "impact",
  "appliedAt",
  "demo",
  "versionNumber",
  "auditRef",
];
const K_VERSION = ["id", "flagId", "flagKey", "environment", "version", "config", "createdBy", "createdAt", "reason", "changeId", "current"];
const K_EVALUATION = [
  "flagKey",
  "environment",
  "companyId",
  "companyName",
  "companyDisplayId",
  "planName",
  "planKey",
  "subscriptionId",
  "subscriptionStatus",
  "accountActive",
  "conditions",
  "eligible",
  "targeted",
  "availability",
  "reasons",
  "primaryReason",
  "missingPrerequisites",
  "integrationDetail",
  "action",
  "bucket",
];
const K_PAGINATED = ["rows", "total", "page", "pageSize", "actors"];

function validateFlag(flag: unknown, label: string, notes: string[]): void {
  assertShape(flag, K_FLAG, label, notes);
  const record = flag as { environments?: Record<string, unknown> };
  for (const environment of ENVIRONMENTS) {
    const config = record.environments?.[environment];
    const missing = missingKeys(config, K_ENV_CONFIG, `${label}.environments.${environment}`);
    expect(missing.length === 0, `${label}.environments.${environment} missing ${missing.join(", ")}`);
  }
  const problems = enumProblems(
    [flag],
    [
      ["category", CATEGORIES],
      ["type", FLAG_TYPES],
      ["lifecycle", LIFECYCLES],
      ["protection", PROTECTIONS],
      ["implementation", IMPLEMENTATIONS],
      ["codeReferences", ["unverified", "none_found", "referenced"]],
    ],
    label,
  );
  expect(problems.length === 0, problems.join("; "));
  for (const environment of ENVIRONMENTS) {
    const config = record.environments?.[environment] as Record<string, unknown> | undefined;
    if (!config) continue;
    const strategyProblems = enumProblems([config], [["strategy", STRATEGIES]], `${label}.environments.${environment}`);
    expect(strategyProblems.length === 0, strategyProblems.join("; "));
  }
}

function validateRow(row: unknown, label: string, notes: string[]): void {
  assertShape(row, K_ROW, label, notes);
  const record = row as Record<string, unknown>;
  validateFlag(record.flag, `${label}.flag`, notes);
  assertShape(record.stats, K_STATS, `${label}.stats`, notes);
  const problems = enumProblems(
    [row],
    [
      ["environment", ENVIRONMENTS],
      ["state", STATES],
    ],
    label,
  );
  expect(problems.length === 0, problems.join("; "));
}

function validateAttention(items: unknown, label: string, notes: string[]): void {
  expect(Array.isArray(items), `${label} is not an array`);
  if ((items as unknown[]).length === 0) {
    notes.push(`${label} empty`);
    return;
  }
  (items as unknown[]).forEach((item, index) => assertShape(item, K_ATTENTION, `${label}[${index}]`, notes));
  const problems = enumProblems(items as unknown[], [
    ["severity", SEVERITIES],
    ["kind", ATTENTION_KINDS],
    ["environment", ENVIRONMENTS],
  ], label);
  expect(problems.length === 0, problems.join("; "));
}

function validateActivity(items: unknown, label: string, notes: string[]): void {
  expect(Array.isArray(items), `${label} is not an array`);
  if ((items as unknown[]).length === 0) {
    notes.push(`${label} empty`);
    return;
  }
  (items as unknown[]).forEach((item, index) => assertShape(item, K_ACTIVITY, `${label}[${index}]`, notes));
  const problems = enumProblems(items as unknown[], [
    ["type", CHANGE_TYPES],
    ["result", ACTIVITY_RESULTS],
  ], label);
  expect(problems.length === 0, problems.join("; "));
  // `environment: null` is legal (created/deprecated/archived events).
  const badEnvironment = (items as unknown[]).filter((item) => {
    const value = (item as { environment?: unknown }).environment;
    return value !== null && !ENVIRONMENTS.includes(String(value));
  });
  expect(badEnvironment.length === 0, `${label} has entries with an unknown environment`);
}

function validateChanges(items: unknown, label: string, notes: string[]): void {
  expect(Array.isArray(items), `${label} is not an array`);
  if ((items as unknown[]).length === 0) {
    notes.push(`${label} empty`);
    return;
  }
  (items as unknown[]).forEach((item, index) => assertShape(item, K_CHANGE, `${label}[${index}]`, notes));
  const problems = enumProblems(items as unknown[], [
    ["environment", ENVIRONMENTS],
    ["type", CHANGE_TYPES],
    ["status", CHANGE_STATUSES],
  ], label);
  expect(problems.length === 0, problems.join("; "));
}

function validateVersions(items: unknown, label: string, notes: string[]): void {
  expect(Array.isArray(items), `${label} is not an array`);
  if ((items as unknown[]).length === 0) {
    notes.push(`${label} empty`);
    return;
  }
  (items as unknown[]).forEach((item, index) => assertShape(item, K_VERSION, `${label}[${index}]`, notes));
  const problems = enumProblems(items as unknown[], [["environment", ENVIRONMENTS]], label);
  expect(problems.length === 0, problems.join("; "));
}

function validateEvaluations(items: unknown, label: string, notes: string[]): void {
  expect(Array.isArray(items), `${label} is not an array`);
  if ((items as unknown[]).length === 0) {
    notes.push(`${label} empty`);
    return;
  }
  (items as unknown[]).forEach((item, index) => assertShape(item, K_EVALUATION, `${label}[${index}]`, notes));
  const problems = enumProblems(items as unknown[], [
    ["environment", ENVIRONMENTS],
    ["availability", AVAILABILITY],
  ], label);
  expect(problems.length === 0, problems.join("; "));
  const conditionProblems: string[] = [];
  (items as unknown[]).forEach((item, index) => {
    const conditions = (item as { conditions?: Record<string, unknown> }).conditions;
    for (const [key, value] of Object.entries(conditions ?? {})) {
      if (!CONDITIONS.includes(String(value))) conditionProblems.push(`${label}[${index}].conditions.${key}=${JSON.stringify(value)}`);
    }
    const reasons = (item as { reasons?: unknown[] }).reasons ?? [];
    for (const reason of reasons) {
      if (!AVAILABILITY.includes(String(reason)) || String(reason) === "available") {
        conditionProblems.push(`${label}[${index}].reasons has ${JSON.stringify(reason)}`);
      }
    }
  });
  expect(conditionProblems.length === 0, conditionProblems.slice(0, 5).join("; "));
}

function assertPaginated(value: unknown, label: string, notes: string[]): void {
  const missing = missingKeys(value, K_PAGINATED, label);
  expect(missing.length === 0, `${label} missing ${missing.join(", ")}`);
  const record = value as { rows: unknown[]; total: unknown; page: unknown; pageSize: unknown; actors: unknown };
  expect(Array.isArray(record.rows), `${label}.rows is not an array`);
  expect(Array.isArray(record.actors), `${label}.actors is not an array`);
  expect(typeof record.total === "number", `${label}.total is ${typeof record.total}, expected number`);
  expect(typeof record.page === "number", `${label}.page is ${typeof record.page}, expected number`);
  expect(typeof record.pageSize === "number", `${label}.pageSize is ${typeof record.pageSize}, expected number`);
  const undefineds = undefinedLeaves(value).slice(0, 5);
  expect(undefineds.length === 0, `${label} has undefined leaves: ${undefineds.join(", ")}`);
  notes.push(`${label} envelope ok (${record.rows.length}/${record.total})`);
}

async function expectApiError(name: string, work: () => Promise<unknown>, status: number, code: string): Promise<void> {
  await check(name, async () => {
    let caught: unknown;
    try {
      await work();
    } catch (error) {
      caught = error;
    }
    expect(caught, "resolved instead of rejecting");
    expect(ApiError.isApiError(caught), `rejected with ${caught?.constructor?.name ?? typeof caught}, not an ApiError`);
    const apiError = caught as ApiError;
    expect(apiError.status === status, `status ${apiError.status}, expected ${status} (${apiError.message})`);
    expect(apiError.code === code, `code ${apiError.code}, expected ${code}`);
  });
}

/* ------------------------------------------------------------------ */
/* Session sanity                                                      */
/* ------------------------------------------------------------------ */

if (flagsRepository.mode !== "live") {
  throw new Error(`flagsRepository resolved to mode "${flagsRepository.mode}" — NEXT_PUBLIC_DATA_SOURCE=api was not honoured`);
}
if ((flagsRepository as { resetDemoData?: unknown }).resetDemoData !== liveFlagsProvider.resetDemoData) {
  throw new Error("flagsRepository is not liveFlagsProvider");
}
console.log(`provider mode: ${flagsRepository.mode}`);
console.log(`target:       ${ORIGIN}\n`);

/* ------------------------------------------------------------------ */
/* 1. Overview                                                         */
/* ------------------------------------------------------------------ */

const K_OVERVIEW = ["environment", "kpis", "rollouts", "attention", "activity", "updatedAt", "facets"];
const K_KPIS = ["total", "globallyEnabled", "disabled", "activeRollouts", "scheduled", "pendingApproval", "emergencyOff", "cleanup"];

let overviewEmergency = 0;
let baselineKeys: string[] = [];

await check("getOverview(production)", async (notes) => {
  const overview = await flagsRepository.getOverview("production");
  assertShape(overview, K_OVERVIEW, "overview", notes);
  const kpisMissing = missingKeys(overview.kpis, K_KPIS, "overview.kpis");
  expect(kpisMissing.length === 0, `overview.kpis missing ${kpisMissing.join(", ")}`);
  for (const key of K_KPIS) expect(typeof overview.kpis[key as keyof typeof overview.kpis] === "number", `overview.kpis.${key} is not a number`);
  expect(overview.environment === "production", `environment is ${overview.environment}`);
  const facetsMissing = missingKeys(overview.facets, ["owners", "categories"], "overview.facets");
  expect(facetsMissing.length === 0, `overview.facets missing ${facetsMissing.join(", ")}`);
  expect(Array.isArray(overview.facets.owners) && Array.isArray(overview.facets.categories), "overview.facets members are not arrays");
  expect(Number.isFinite(Date.parse(overview.updatedAt)), `updatedAt is not a date: ${overview.updatedAt}`);
  expect(Array.isArray(overview.rollouts), "overview.rollouts is not an array");
  overview.rollouts.forEach((row, index) => validateRow(row, `overview.rollouts[${index}]`, []));
  validateAttention(overview.attention, "overview.attention", notes);
  validateActivity(overview.activity, "overview.activity", notes);
  overviewEmergency = overview.kpis.emergencyOff;
  notes.push(`${overview.rollouts.length} rollouts, ${overview.attention.length} attention, ${overview.activity.length} activity`);
});

await check("getOverview(production, {category})", async (notes) => {
  const filtered = await flagsRepository.getOverview("production", { category: "Workspace" });
  assertShape(filtered, K_OVERVIEW, "overview", notes);
  expect(filtered.rollouts.every((row) => row.flag.category === "Workspace"), "category filter did not narrow the rows");
  notes.push(`${filtered.rollouts.length} Workspace rows`);
});

/* ------------------------------------------------------------------ */
/* 2. Flag list (search + category + includeArchived + probes)         */
/* ------------------------------------------------------------------ */

const K_LIST = ["rows", "summary", "facets"];
const K_SUMMARY = ["total", "enabled", "disabled", "targeted", "internal", "emergency", "archived"];

let allRows = 0;

await check("listFlags(baseline)", async (notes) => {
  const list = await flagsRepository.listFlags({ environment: "production" });
  assertShape(list, K_LIST, "list", notes);
  const summaryMissing = missingKeys(list.summary, K_SUMMARY, "list.summary");
  expect(summaryMissing.length === 0, `list.summary missing ${summaryMissing.join(", ")}`);
  const facetsMissing = missingKeys(list.facets, ["owners", "categories"], "list.facets");
  expect(facetsMissing.length === 0, `list.facets missing ${facetsMissing.join(", ")}`);
  list.rows.forEach((row, index) => validateRow(row, `list.rows[${index}]`, []));
  allRows = list.rows.length;
  baselineKeys = list.rows.map((row) => row.flag.key);
  notes.push(`${list.rows.length} rows, summary.total=${list.summary.total}, archived=${list.summary.archived}`);
});

await check("listFlags(search + category)", async (notes) => {
  const search = await flagsRepository.listFlags({ environment: "production", search: "dashboard" });
  assertShape(search, K_LIST, "list", notes);
  expect(search.rows.length > 0, "search 'dashboard' returned nothing — the seeded flags should match");
  expect(
    search.rows.every((row) => `${row.flag.name} ${row.flag.key} ${row.flag.description}`.toLowerCase().includes("dashboard")),
    "search did not filter the rows",
  );
  const category = await flagsRepository.listFlags({ environment: "production", category: "Channels" });
  expect(category.rows.length > 0, "category 'Channels' returned nothing");
  expect(
    category.rows.every((row) => row.flag.category === "Channels"),
    "category filter did not filter the rows",
  );
  const both = await flagsRepository.listFlags({ environment: "production", search: "publishing", category: "Channels" });
  expect(both.rows.every((row) => row.flag.category === "Channels"), "combined filter lost the category constraint");
  notes.push(`search=${search.rows.length}, category=${category.rows.length}, combined=${both.rows.length}`);
});

await check("listFlags(includeArchived)", async (notes) => {
  const base = await flagsRepository.listFlags({ environment: "production" });
  const withArchived = await flagsRepository.listFlags({ environment: "production", includeArchived: true });
  assertShape(withArchived, K_LIST, "list", notes);
  expect(withArchived.rows.length >= base.rows.length, "includeArchived returned fewer rows than the default");
  const archivedOnly = withArchived.rows.filter((row) => row.flag.lifecycle === "archived");
  const declared = withArchived.summary.archived;
  expect(archivedOnly.length === declared, `summary.archived=${declared} but the rows carry ${archivedOnly.length} archived flags`);
  // `includeArchived` is only ever sent as "true" (all-flags.tsx:54), so a "false"
  // wire value is never exercised. Note what the snapshot actually contains.
  notes.push(`${base.rows.length} -> ${withArchived.rows.length} rows, ${archivedOnly.length} archived in this snapshot`);
  if (declared === 0) notes.push("snapshot holds no archived flag, so the filter's effect is not observable here");
});

await check("listFlags(state + strategy + owner + type + lifecycle)", async (notes) => {
  const state = await flagsRepository.listFlags({ environment: "production", state: "disabled" });
  expect(state.rows.every((row) => row.state === "disabled"), "state filter did not filter");
  const strategy = await flagsRepository.listFlags({ environment: "production", strategy: "percentage" });
  expect(strategy.rows.every((row) => row.config.strategy === "percentage"), "strategy filter did not filter");
  const lifecycle = await flagsRepository.listFlags({ environment: "production", lifecycle: "deprecated" });
  expect(lifecycle.rows.every((row) => row.flag.lifecycle === "deprecated"), "lifecycle filter did not filter");
  const type = await flagsRepository.listFlags({ environment: "production", type: "operational" });
  expect(type.rows.every((row) => row.flag.type === "operational"), "type filter did not filter");
  const owners = (await flagsRepository.getOverview("production")).facets.owners;
  const owner = owners[0];
  const ownerRows = owner ? await flagsRepository.listFlags({ environment: "production", owner }) : null;
  if (ownerRows) expect(ownerRows.rows.every((row) => row.flag.ownerTeam === owner), "owner filter did not filter");
  notes.push(`state=${state.rows.length}, strategy=${strategy.rows.length}, lifecycle=${lifecycle.rows.length}, type=${type.rows.length}, owner=${ownerRows?.rows.length ?? "n/a"}`);
});

// --- Behaviour probes: parameters the DTO accepts but the service never reads ---

await probe("quick", async () => {
  const emergency = await flagsRepository.listFlags({ environment: "production", quick: "emergency" });
  const cleanup = await flagsRepository.listFlags({ environment: "production", quick: "cleanup" });
  if (overviewEmergency > 0 && emergency.rows.length === allRows && emergency.rows.length !== overviewEmergency) {
    note(`listFlags(quick="emergency") returned all ${emergency.rows.length} rows — the DTO accepts \`quick\` but super-admin-feature-flags.service.ts never reads it (mock applies it in data/selectors.ts:110). The Overview "Emergency Off" KPI deep-links here.`);
  }
  if (cleanup.rows.length === allRows) {
    note(`listFlags(quick="cleanup") returned all ${cleanup.rows.length} rows — no cleanup quick filter is applied server-side.`);
  }
});

await probe("sort", async () => {
  const byName = await flagsRepository.listFlags({ environment: "production", sort: "name" });
  const byUpdated = await flagsRepository.listFlags({ environment: "production", sort: "updated" });
  const nameOrder = byName.rows.map((row) => row.flag.key);
  const updatedOrder = byUpdated.rows.map((row) => row.flag.key);
  if (JSON.stringify(nameOrder) === JSON.stringify(updatedOrder)) {
    note(`listFlags(sort="name") and sort="updated" returned an identical order — \`sort\` is accepted by ListFlagsQueryDto but never applied by the service, so the Sort control on All Flags is inert in live mode.`);
  }
});

/* ------------------------------------------------------------------ */
/* 3. Flag detail + typed 404                                          */
/* ------------------------------------------------------------------ */

const K_DETAIL = [
  "flag",
  "row",
  "dependencies",
  "dependencyFlags",
  "attention",
  "activity",
  "changes",
  "archiveBlockers",
  "candidatePrerequisites",
];

const detailKey = baselineKeys[0] ?? "";

await check("getFlag(known key)", async (notes) => {
  expect(detailKey, "no flag key available from listFlags");
  const detail = await flagsRepository.getFlag(detailKey, "production");
  assertShape(detail, K_DETAIL, "detail", notes);
  expect(detail.flag.key === detailKey, `detail.flag.key ${detail.flag.key} !== ${detailKey}`);
  validateRow(detail.row, "detail.row", notes);
  const dependenciesMissing = missingKeys(detail.dependencies, ["direct", "indirect", "dependents"], "detail.dependencies");
  expect(dependenciesMissing.length === 0, `detail.dependencies missing ${dependenciesMissing.join(", ")}`);
  detail.dependencyFlags.forEach((item, index) => {
    const missing = missingKeys(item, ["key", "name", "state", "lifecycle"], `detail.dependencyFlags[${index}]`);
    expect(missing.length === 0, `detail.dependencyFlags missing ${missing.join(", ")}`);
  });
  validateAttention(detail.attention, "detail.attention", notes);
  validateActivity(detail.activity, "detail.activity", notes);
  validateChanges(detail.changes, "detail.changes", notes);
  expect(Array.isArray(detail.archiveBlockers), "detail.archiveBlockers is not an array");
  detail.candidatePrerequisites.forEach((item, index) => {
    const missing = missingKeys(item, ["key", "name"], `detail.candidatePrerequisites[${index}]`);
    expect(missing.length === 0, `candidatePrerequisites missing ${missing.join(", ")}`);
  });
  notes.push(`${detail.activity.length} activity, ${detail.changes.length} changes, ${detail.candidatePrerequisites.length} candidates`);
});

await check("getFlag('demo.dark_mode')", async (notes) => {
  try {
    const detail = await flagsRepository.getFlag("demo.dark_mode", "production");
    validateRow(detail.row, "detail.row", notes);
    notes.push(`flag EXISTS (key=${detail.flag.key})`);
  } catch (error) {
    if (ApiError.isApiError(error) && error.status === 404) {
      notes.push(`404 as typed ApiError (${error.code}) — 'demo.dark_mode' is not in the seeded snapshot`);
      return;
    }
    throw error;
  }
});

await expectApiError("getFlag(unknown key) -> typed 404", () => flagsRepository.getFlag("qa.definitely_missing_flag", "production"), 404, "NOT_FOUND");

/* ------------------------------------------------------------------ */
/* 4. Changes (pagination envelope + filters)                          */
/* ------------------------------------------------------------------ */

await check("listChanges(page 1)", async (notes) => {
  const page1 = await flagsRepository.listChanges({ environment: "production", page: 1, pageSize: 10 });
  assertPaginated(page1, "changes", notes);
  expect(page1.page === 1, `echoed page ${page1.page}`);
  expect(page1.pageSize === 10, `echoed pageSize ${page1.pageSize}`);
  validateChanges(page1.rows, "changes.rows", notes);
  const page2 = await flagsRepository.listChanges({ environment: "production", page: 2, pageSize: 10 });
  assertPaginated(page2, "changes", notes);
  expect(page2.page === 2, `page 2 echoed page ${page2.page}`);
  const overlap = page1.rows.filter((row) => page2.rows.some((other) => other.id === row.id));
  expect(overlap.length === 0, `page 2 repeats ${overlap.length} rows from page 1`);
  expect(page1.total === page2.total, "total changed between pages");
});

await check("listChanges(status filter)", async (notes) => {
  const all = await flagsRepository.listChanges({ environment: "production", page: 1, pageSize: 50 });
  const applied = await flagsRepository.listChanges({ environment: "production", status: ["applied"], page: 1, pageSize: 50 });
  assertPaginated(applied, "changes(status)", notes);
  expect(applied.rows.every((row) => row.status === "applied"), "status filter did not filter");
  expect(applied.total <= all.total, `filtered total ${applied.total} exceeds unfiltered ${all.total}`);
  const pending = await flagsRepository.listChanges({ environment: "production", status: ["pending_approval", "scheduled", "draft"], page: 1, pageSize: 50 });
  expect(
    pending.rows.every((row) => ["pending_approval", "scheduled", "draft"].includes(row.status)),
    "multi-value status filter did not filter",
  );
  notes.push(`all=${all.total}, applied=${applied.total}, open=${pending.total}`);
});

await probe("result (History status filter)", async () => {
  const plain = await flagsRepository.listChanges({ environment: "production", page: 1, pageSize: 50 });
  const withResult = await flagsRepository.listChanges({ environment: "production", result: "cancelled", page: 1, pageSize: 50 });
  if (withResult.total === plain.total && plain.total > 0) {
    const anyCancelled = plain.rows.some((row) => row.status === "cancelled");
    note(
      `listChanges(result="cancelled") returned the same ${withResult.total} rows as no filter — ` +
        `src/features/feature-flags/pages/changes.tsx:57 maps the History "Status" control onto \`result\`, ` +
        `but super-admin-feature-flags.service.ts:1108-1128 never reads \`query.result\` ` +
        `(the mock does, at data/mock-provider.ts:560). The Status filter is a silent no-op in live mode.` +
        (anyCancelled ? " (cancelled rows do exist, so this is not an empty-set artefact.)" : ""),
    );
  }
});

/* ------------------------------------------------------------------ */
/* 5. Activity                                                         */
/* ------------------------------------------------------------------ */

await check("listActivity(page 1)", async (notes) => {
  const activity = await flagsRepository.listActivity({ environment: "production", page: 1, pageSize: 8 });
  assertPaginated(activity, "activity", notes);
  expect(activity.page === 1 && activity.pageSize === 8, `echoed page=${activity.page} pageSize=${activity.pageSize}`);
  validateActivity(activity.rows, "activity.rows", notes);
});

await probe("null-environment activity", async () => {
  const unfiltered = await flagsRepository.listActivity({ page: 1, pageSize: 200 });
  const nullEnvironment = unfiltered.rows.filter((row) => row.environment === null);
  const filtered = await flagsRepository.listActivity({ environment: "production", page: 1, pageSize: 200 });
  const leaked = filtered.rows.filter((row) => row.environment === null);
  if (nullEnvironment.length > 0 && leaked.length === 0) {
    note(
      `${nullEnvironment.length} activity rows have environment=null (flag_created / flag_deprecated / flag_archived) ` +
        `and disappear from listActivity once an environment filter is applied ` +
        `(super-admin-feature-flags.service.ts:1179 filters 'a.environment === query.environment'), ` +
        `while the mock keeps them (data/mock-provider.ts:592 also matches '=== null'). ` +
        `They still appear on Overview, so the Activity Log and Overview disagree.`,
    );
  }
});

await probe("type filter on activity", async () => {
  const unfiltered = await flagsRepository.listActivity({ page: 1, pageSize: 200 });
  const types = new Set(unfiltered.rows.map((row) => row.type));
  if (types.size > 1) {
    const someType = [...types][0]!;
    const filtered = await flagsRepository.listActivity({ page: 1, pageSize: 200, type: someType });
    if (filtered.total === unfiltered.total) {
      note(
        `listActivity(type="${someType}") returned the same ${filtered.total} rows — ` +
          `src/features/feature-flags/live/super-admin-feature-flags-api.ts:194-207 does not forward \`type\` ` +
          `(and the service has no activity type filter either), while the History tab passes it at pages/changes.tsx:58. ` +
          `The mock honours it (data/mock-provider.ts:594).`,
      );
    }
  }
});

/* ------------------------------------------------------------------ */
/* 6. Versions                                                         */
/* ------------------------------------------------------------------ */

await check("listVersions(production)", async (notes) => {
  const versions = await flagsRepository.listVersions(null, "production");
  const missing = missingKeys(versions, ["rows"], "versions");
  expect(missing.length === 0, `versions missing ${missing.join(", ")}`);
  validateVersions(versions.rows, "versions.rows", notes);
  expect(versions.rows.every((row) => row.environment === "production"), "listVersions returned other environments");
  notes.push(`${versions.rows.length} versions`);
});

await check("compareVersions(from, to)", async (notes) => {
  const versions = await flagsRepository.listVersions(null, "production");
  expect(versions.rows.length >= 2, `need at least 2 versions, got ${versions.rows.length}`);
  const [first, second] = versions.rows;
  const comparison = await flagsRepository.compareVersions(first!.id, second!.id);
  const missing = missingKeys(comparison, ["from", "to", "rows"], "comparison");
  expect(missing.length === 0, `comparison missing ${missing.join(", ")}`);
  expect(comparison.from.id === first!.id, `comparison.from.id ${comparison.from.id} !== ${first!.id}`);
  expect(comparison.to.id === second!.id, `comparison.to.id ${comparison.to.id} !== ${second!.id}`);
  expect(Array.isArray(comparison.rows), "comparison.rows is not an array");
  comparison.rows.forEach((row, index) => {
    const rowMissing = missingKeys(row, ["field", "from", "to", "changed"], `comparison.rows[${index}]`);
    expect(rowMissing.length === 0, `comparison row missing ${rowMissing.join(", ")}`);
    expect(typeof row.changed === "boolean", `comparison.rows[${index}].changed is ${typeof row.changed}`);
  });
  notes.push(`${comparison.rows.length} fields compared, ${comparison.rows.filter((row) => row.changed).length} changed`);
});

await expectApiError("compareVersions(unknown ids) -> typed 404", () => flagsRepository.compareVersions("qa_nope_a", "qa_nope_b"), 404, "NOT_FOUND");

/* ------------------------------------------------------------------ */
/* 7. Companies, impact, access                                        */
/* ------------------------------------------------------------------ */

let companyId = "";

await check("searchCompanies('')", async (notes) => {
  const companies = await flagsRepository.searchCompanies("");
  expect(Array.isArray(companies), "searchCompanies did not return an array");
  companies.forEach((company, index) => {
    const missing = missingKeys(company, ["id", "name", "displayId", "plan", "status"], `companies[${index}]`);
    expect(missing.length === 0, `company missing ${missing.join(", ")}`);
  });
  companyId = companies[0]?.id ?? "";
  notes.push(`${companies.length} companies, first=${companyId || "none"}`);
  if (!companyId) note("searchCompanies('') returned no companies — company-scoped checks will be skipped.");
});

await check("listCompanyImpact(demo flag)", async (notes) => {
  expect(detailKey, "no flag key available");
  const impact = await flagsRepository.listCompanyImpact(detailKey, "production", {});
  assertShape(impact, ["rows", "stats", "facets"], "impact", notes);
  assertShape(impact.stats, K_STATS, "impact.stats", notes);
  const facetsMissing = missingKeys(impact.facets, ["plans"], "impact.facets");
  expect(facetsMissing.length === 0, `impact.facets missing ${facetsMissing.join(", ")}`);
  validateEvaluations(impact.rows, "impact.rows", notes);
  notes.push(`${impact.rows.length} companies, ${impact.facets.plans.length} plans`);
});

await probe("targeting filter on impact", async () => {
  expect(detailKey, "no flag key available");
  const plain = await flagsRepository.listCompanyImpact(detailKey, "production", {});
  const matched = await flagsRepository.listCompanyImpact(detailKey, "production", { targeting: "matched" });
  const notMatched = await flagsRepository.listCompanyImpact(detailKey, "production", { targeting: "not_matched" });
  const matchedCount = plain.rows.filter((row) => row.targeted).length;
  if (matched.rows.length === plain.rows.length && matchedCount !== plain.rows.length) {
    note(
      `listCompanyImpact(targeting="matched") returned all ${matched.rows.length} rows while only ${matchedCount} are actually ` +
        `matched — CompanyImpactQueryDto accepts \`targeting\` but super-admin-feature-flags.service.ts:981-993 only reads ` +
        `search/plan/availability/reason. The "Targeting" filter on the Company Impact tab is a no-op in live mode ` +
        `(the mock honours it at data/mock-provider.ts:484).`,
    );
  }
  if (notMatched.rows.length === plain.rows.length && plain.rows.length - matchedCount !== plain.rows.length) {
    note(`listCompanyImpact(targeting="not_matched") also returned all ${notMatched.rows.length} rows.`);
  }
});

if (companyId) {
  await check("getCompanyAccess(companyId)", async (notes) => {
    const access = await flagsRepository.getCompanyAccess(companyId, "production");
    assertShape(access, ["company", "environment", "rows", "counts"], "access", notes);
    const companyMissing = missingKeys(
      access.company,
      ["id", "name", "displayId", "accountActive", "planName", "subscriptionId", "subscriptionStatus"],
      "access.company",
    );
    expect(companyMissing.length === 0, `access.company missing ${companyMissing.join(", ")}`);
    const countsMissing = missingKeys(
      access.counts,
      ["total", "available", "planBlocked", "rolloutBlocked", "dependencyBlocked", "integrationBlocked"],
      "access.counts",
    );
    expect(countsMissing.length === 0, `access.counts missing ${countsMissing.join(", ")}`);
    expect(access.environment === "production", `access.environment is ${access.environment}`);
    access.rows.forEach((row, index) => {
      const rowMissing = missingKeys(row, ["flag", "evaluation", "state"], `access.rows[${index}]`);
      expect(rowMissing.length === 0, `access.row missing ${rowMissing.join(", ")}`);
      const flagMissing = missingKeys(
        row.flag,
        ["key", "name", "category", "type", "implementation", "lifecycle", "entitlement"],
        `access.rows[${index}].flag`,
      );
      expect(flagMissing.length === 0, `access.rows[${index}].flag missing ${flagMissing.join(", ")}`);
    });
    validateEvaluations(
      access.rows.map((row) => row.evaluation),
      "access.rows.evaluation",
      notes,
    );
    expect(access.counts.total === access.rows.length, `counts.total ${access.counts.total} !== rows ${access.rows.length}`);
    notes.push(`${access.rows.length} flags, available=${access.counts.available}`);
  });

  await check("evaluateCompany(flag, companyId)", async (notes) => {
    const detail = await flagsRepository.evaluateCompany(detailKey, "production", companyId);
    assertShape(detail, ["flag", "evaluation", "prerequisites"], "evaluation", notes);
    validateFlag(detail.flag, "evaluation.flag", notes);
    validateEvaluations([detail.evaluation], "evaluation.evaluation", notes);
    detail.prerequisites.forEach((item, index) => {
      const missing = missingKeys(item, ["key", "name", "availability", "ok"], `evaluation.prerequisites[${index}]`);
      expect(missing.length === 0, `prerequisites missing ${missing.join(", ")}`);
    });
    notes.push(`${detail.prerequisites.length} prerequisites`);
  });
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

const failures = outcomes.filter((outcome) => !outcome.ok);
const writes = calls.filter((call) => call.method !== "GET" && call.method !== "HEAD");
const nonOk = calls.filter((call) => call.status >= 400);

console.log("\n──────────────────────────────────────────────────────────────");
console.log(`calls: ${calls.length} (${writes.length} non-GET — must be 0)`);
console.log(`4xx/5xx responses: ${nonOk.length}${nonOk.length ? ` -> ${nonOk.map((call) => `${call.status} ${call.url}`).join(", ")}` : ""}`);
console.log(`checks: ${outcomes.length} | pass ${outcomes.length - failures.length} | fail ${failures.length}`);
for (const failure of failures) console.log(`  FAIL ${failure.name}: ${failure.notes.join("; ")}`);
console.log(`findings: ${findings.length}`);
console.log("──────────────────────────────────────────────────────────────");

if (writes.length > 0) throw new Error(`read-only contract broken: ${writes.map((call) => call.method).join(",")}`);
if (failures.length > 0) process.exitCode = 1;
