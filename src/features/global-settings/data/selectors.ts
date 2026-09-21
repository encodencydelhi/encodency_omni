/**
 * Pure derivations over the registry and the configuration: search, change
 * review, history filtering, version comparison, security review and maintenance
 * status. Nothing here reads a clock or a store - callers pass `now` and the
 * values in - so every result is deterministic and unit-testable.
 */
import { ENFORCEMENT_LABEL, MODULE_LINKS, SCOPE_LABEL, SECTION_BY_KEY, SECTION_LAYOUT, TIMING_LABEL, routes } from "./config";
import { changeDirection } from "./effective-config";
import { formatSettingValue, formatUtc } from "./formatting";
import { EXTERNAL_SETTINGS, SETTING_BY_KEY, SETTING_DEFINITIONS, sameValue } from "./registry";
import type {
  ChangeListResult,
  ChangeQuery,
  ChangeReview,
  ConfigurationChange,
  ConfigurationVersion,
  EditableSectionKey,
  GlobalSettingDefinition,
  MaintenanceEntry,
  MaintenanceEntryStatus,
  RequiredCheck,
  ReviewRow,
  SearchHit,
  SecurityReviewData,
  SettingValue,
  SettingValues,
  VersionComparison,
} from "./types";

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ */
/* Where a setting lives                                               */
/* ------------------------------------------------------------------ */

/** The sub-navigation tab a setting is shown under, when its section has tabs. */
export function tabOf(definition: GlobalSettingDefinition): string | undefined {
  if (definition.section === "security") return SECTION_LAYOUT.security.find((group) => group.id === definition.group)?.tab;
  if (definition.section === "privacy") return { retention: "retention", export: "export", deletion: "deletion" }[definition.group];
  if (definition.section === "governance") return "customization";
  return undefined;
}

export function hrefFor(definition: GlobalSettingDefinition): string {
  return routes.section(definition.section, { tab: tabOf(definition), focus: definition.key });
}

export function groupTitle(definition: GlobalSettingDefinition): string | null {
  const groups = SECTION_LAYOUT[definition.section];
  const found = groups.find((group) => group.id === definition.group);
  if (found) return found.title;
  return { branding: "Branding", legal: "Legal documents" }[definition.group] ?? null;
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

function score(haystacks: Array<{ text: string; weight: number }>, terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const { text, weight } of haystacks) {
      const lower = text.toLowerCase();
      if (lower === term) best = Math.max(best, weight * 2);
      else if (lower.startsWith(term)) best = Math.max(best, weight * 1.5);
      else if (lower.includes(term)) best = Math.max(best, weight);
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/** Searches Global Settings and the settings owned by other modules. Every term must match somewhere. */
export function searchSettings(query: string, limit = 12): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const hits: Array<SearchHit & { rank: number }> = [];

  for (const definition of SETTING_DEFINITIONS) {
    const section = SECTION_BY_KEY[definition.section];
    const rank = score(
      [
        { text: definition.name, weight: 10 },
        { text: definition.key, weight: 6 },
        { text: definition.description, weight: 4 },
        { text: (definition.keywords ?? []).join(" "), weight: 5 },
        { text: section.label, weight: 3 },
        { text: groupTitle(definition) ?? "", weight: 3 },
      ],
      terms,
    );
    if (rank > 0) {
      hits.push({
        id: definition.key,
        name: definition.name,
        description: definition.description,
        sectionLabel: section.label,
        groupLabel: groupTitle(definition),
        href: hrefFor(definition),
        external: false,
        ownerModule: "Global Settings",
        key: definition.key,
        rank,
      });
    }
  }

  for (const external of EXTERNAL_SETTINGS) {
    const rank = score(
      [
        { text: external.name, weight: 10 },
        { text: external.keywords.join(" "), weight: 7 },
        { text: external.description, weight: 4 },
        { text: external.ownerModule, weight: 3 },
      ],
      terms,
    );
    if (rank > 0) {
      hits.push({ id: external.id, name: external.name, description: external.description, sectionLabel: external.ownerModule, groupLabel: null, href: external.href, external: true, ownerModule: external.ownerModule, key: null, rank });
    }
  }

  return hits
    .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((hit) => {
      const copy: SearchHit & { rank?: number } = { ...hit };
      delete copy.rank;
      return copy as SearchHit;
    });
}

/* ------------------------------------------------------------------ */
/* Change review                                                       */
/* ------------------------------------------------------------------ */

const TIMING_IMPACT: Record<GlobalSettingDefinition["timing"], { existing: string; created: string }> = {
  immediate: { existing: "Takes effect for everyone as soon as it is saved.", created: "Used from now on." },
  new_companies_only: { existing: "Existing companies are not changed.", created: "Companies created after this change start with the new value." },
  fallback: { existing: "Companies with their own value keep it; companies without one follow the new default.", created: "New companies follow the new default." },
  next_session: { existing: "Sessions already open are not ended. The value applies to sessions started after enforcement.", created: "New sessions use the new value once enforced." },
  on_enforcement: { existing: "Existing accounts are unchanged until the backend service enforces the policy.", created: "New accounts follow it once enforced." },
  on_schedule: { existing: "Nothing changes until the configured start time.", created: "Shown or applied within the configured window." },
};

export function requiresReason(definition: GlobalSettingDefinition): boolean {
  return definition.approval !== "none";
}

export function isHeldForReview(definition: GlobalSettingDefinition): boolean {
  return definition.approval === "sensitive_review";
}

function retentionWarning(definition: GlobalSettingDefinition, previous: SettingValue, next: SettingValue): string | undefined {
  if (!definition.key.startsWith("privacy.retention.") || typeof previous !== "number" || typeof next !== "number") return undefined;
  return next < previous ? "Shortening retention makes older records eligible for removal once a lifecycle service enforces it. Nothing is deleted by saving this in the demo." : undefined;
}

export function buildReviewRow(definition: GlobalSettingDefinition, previous: SettingValue, next: SettingValue): ReviewRow {
  const impact = TIMING_IMPACT[definition.timing];
  const direction = changeDirection(definition, previous, next);
  const warning =
    retentionWarning(definition, previous, next) ??
    (direction === "weaker" && definition.sensitivity !== "low" ? "This weakens a policy. Confirm it is intended." : undefined) ??
    (definition.key === "maintenance.access.enabled" && next === true ? "Turning this on restricts operations when the backend enforces it. The announcement is a separate setting." : undefined);
  return {
    key: definition.key,
    name: definition.name,
    section: definition.section,
    previous,
    next,
    previousText: formatSettingValue(definition, previous),
    nextText: formatSettingValue(definition, next),
    scope: definition.scope,
    sensitivity: definition.sensitivity,
    timing: definition.timing,
    enforcement: definition.enforcement,
    direction,
    existingImpact: impact.existing,
    newImpact: impact.created,
    pending: isHeldForReview(definition),
    warning,
  };
}

/** The review shown before saving: what changes, who it affects, and what still needs a backend. */
export function buildChangeReview(current: SettingValues, patch: SettingValues): ChangeReview {
  const rows: ReviewRow[] = [];
  for (const [key, next] of Object.entries(patch)) {
    const definition = SETTING_BY_KEY.get(key);
    if (!definition) continue;
    const previous = current[key] ?? definition.defaultValue;
    if (sameValue(previous, next)) continue;
    rows.push(buildReviewRow(definition, previous, next));
  }

  const definitions = rows.map((row) => SETTING_BY_KEY.get(row.key)).filter((item): item is GlobalSettingDefinition => Boolean(item));
  const sensitive = definitions.some((item) => item.sensitivity === "high" || item.sensitivity === "critical");
  const critical = definitions.some((item) => item.sensitivity === "critical");
  const needsBackend = definitions.some((item) => ENFORCEMENT_LABEL[item.enforcement].backend);

  const flag = (key: string, fallback = true) => (current[key] === undefined ? fallback : current[key] === true);
  const checks: RequiredCheck[] = [];
  if (sensitive) {
    checks.push({ id: "reason", label: "Change Reason", state: "recorded", note: "Recorded with the change." });
    checks.push({ id: "audit", label: "Audit Event", state: "recorded", note: "Recorded in configuration history. The backend writes the Audit Logs event." });
    if (flag("security.sensitive.require_reauth")) checks.push({ id: "reauth", label: "Recent Reauthentication", state: "backend_required", note: "Not performed by this frontend demo. The backend must verify it." });
    if (flag("security.sensitive.require_mfa")) checks.push({ id: "mfa", label: "MFA Verification", state: "backend_required", note: "Not simulated. A real challenge needs the authentication backend." });
    if (critical && flag("security.sensitive.require_secondary_approval")) checks.push({ id: "approval", label: "Secondary Approval", state: "backend_required", note: "No approval workflow exists in this phase, so the change is held as a pending draft." });
  }

  const warnings: string[] = [];
  if (needsBackend) warnings.push("Nothing here changes real accounts or services. It is recorded as configuration until the backend enforces it.");
  if (rows.some((row) => row.pending)) warnings.push("Security-critical changes are held as pending drafts. They are not part of the effective configuration.");

  return { rows, requiresReason: definitions.some(requiresReason), hasPending: rows.some((row) => row.pending), checks, warnings };
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function filterChanges(changes: readonly ConfigurationChange[], query: ChangeQuery, now: number): ChangeListResult {
  const search = query.search?.trim().toLowerCase();
  const window = query.range ? RANGE_DAYS[query.range] : undefined;
  const filtered = changes.filter((change) => {
    if (query.section && change.section !== query.section) return false;
    if (query.actor && change.actorId !== query.actor) return false;
    if (query.changeType && change.changeType !== query.changeType) return false;
    if (query.result && change.result !== query.result) return false;
    if (window && Date.parse(change.at) < now - window * DAY_MS) return false;
    if (search && !`${change.settingName} ${change.key} ${change.actorName} ${change.reason}`.toLowerCase().includes(search)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const pageSize = query.pageSize ?? 10;
  const page = Math.max(1, query.page ?? 1);
  const actors = new Map<string, string>();
  for (const change of changes) actors.set(change.actorId, change.actorName);
  return {
    rows: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageSize,
    actors: [...actors].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

export function compareVersions(from: ConfigurationVersion, to: ConfigurationVersion): VersionComparison {
  const rows: VersionComparison["rows"] = [];
  for (const definition of SETTING_DEFINITIONS) {
    const previous = from.snapshot[definition.key];
    const next = to.snapshot[definition.key];
    if (previous === undefined && next === undefined) continue;
    if (sameValue(previous, next)) continue;
    const direction = changeDirection(definition, previous ?? definition.defaultValue, next ?? definition.defaultValue);
    rows.push({
      key: definition.key,
      name: definition.name,
      section: definition.section,
      previousText: formatSettingValue(definition, previous),
      nextText: formatSettingValue(definition, next),
      scope: definition.scope,
      direction,
      impact: `${SCOPE_LABEL[definition.scope].label} - ${TIMING_LABEL[definition.timing].label.toLowerCase()}`,
    });
  }
  return { from, to, rows };
}

/* ------------------------------------------------------------------ */
/* Security review                                                     */
/* ------------------------------------------------------------------ */

export function buildSecurityReview(values: SettingValues, changes: readonly ConfigurationChange[]): SecurityReviewData {
  const value = (key: string) => values[key];
  const security = SETTING_DEFINITIONS.filter((item) => item.section === "security");
  const pendingSensitive = changes.filter((change) => change.section === "security" && change.result === "pending_approval");

  const configured: SecurityReviewData["configured"] = security
    .filter((item) => item.policyKind === "mandatory_minimum" && isVisibleValue(item, values))
    .map((item) => ({ key: item.key, label: item.name, value: formatSettingValue(item, value(item.key)) }));

  const incomplete: SecurityReviewData["incomplete"] = [];
  const flag = (key: string, label: string, detail: string) => incomplete.push({ key, label, detail });
  if (value("security.platform_staff.mfa_required") !== true) flag("security.platform_staff.mfa_required", "Staff MFA is not required", "Platform staff can sign in without a second factor.");
  const methods = value("security.mfa.allowed_methods");
  if (!Array.isArray(methods) || methods.length === 0) flag("security.mfa.allowed_methods", "No MFA method is allowed", "Choose at least one method.");
  if (value("security.company_users.mfa_minimum") === "optional") flag("security.company_users.mfa_minimum", "No company MFA baseline", "The platform sets no MFA minimum for company users.");
  if (value("security.sensitive.require_secondary_approval") !== true) flag("security.sensitive.require_secondary_approval", "Secondary approval is off", "Security-critical changes need only one person.");
  if (value("security.password.recovery_verification") === "email_only") flag("security.password.recovery_verification", "Recovery verifies by email only", "Consider adding an MFA check to account recovery.");
  if (pendingSensitive.length > 0) flag("pending", `${pendingSensitive.length} sensitive change${pendingSensitive.length === 1 ? "" : "s"} awaiting review`, "Pending changes are not part of the effective configuration.");

  const seen = new Set<string>();
  const backendDependencies: SecurityReviewData["backendDependencies"] = [];
  for (const item of security) {
    if (!ENFORCEMENT_LABEL[item.enforcement].backend || seen.has(item.group)) continue;
    seen.add(item.group);
    backendDependencies.push({ key: item.group, label: `${SECTION_LAYOUT.security.find((group) => group.id === item.group)?.title ?? item.group} - ${ENFORCEMENT_LABEL[item.enforcement].label}` });
  }

  const lastUpdatedAt = changes.filter((change) => change.section === "security" && change.result === "applied").sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.at ?? null;
  return { configured, incomplete, backendDependencies, pendingSensitive: [...pendingSensitive], lastUpdatedAt, status: incomplete.length === 0 ? "configured" : "needs_review" };
}

function isVisibleValue(definition: GlobalSettingDefinition, values: SettingValues): boolean {
  const gate = definition.visibleWhen;
  return !gate || sameValue(gate.equals as SettingValue, values[gate.key]);
}

/* ------------------------------------------------------------------ */
/* Maintenance                                                         */
/* ------------------------------------------------------------------ */

export function windowStatus(startsAt: string, endsAt: string, now: number, enabled = true): MaintenanceEntryStatus {
  if (!enabled) return "disabled";
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return "disabled";
  if (now < start) return "upcoming";
  if (now < end) return "active";
  return "completed";
}

/** Configured announcement and access restriction, plus read-only records, each with a status evaluated at `now`. */
export function buildMaintenanceEntries(values: SettingValues, records: readonly MaintenanceEntry[], now: number): MaintenanceEntry[] {
  const text = (key: string) => String(values[key] ?? "");
  const list = (key: string) => (Array.isArray(values[key]) ? (values[key] as string[]) : []);
  const areaLabel = (key: string) => SETTING_BY_KEY.get(key)?.options?.find((option) => option.value === values[key])?.label ?? text(key);
  const entries: MaintenanceEntry[] = [];

  const announcement = "maintenance.announcement";
  if (text(`${announcement}.title`)) {
    entries.push({
      id: "configured-announcement",
      kind: "announcement",
      title: text(`${announcement}.title`),
      audience: list(`${announcement}.audience`),
      area: areaLabel(`${announcement}.area`),
      startsAt: text(`${announcement}.starts_at`),
      endsAt: text(`${announcement}.ends_at`),
      status: windowStatus(text(`${announcement}.starts_at`), text(`${announcement}.ends_at`), now, values[`${announcement}.enabled`] === true),
      editable: true,
    });
  }
  if (values["maintenance.access.enabled"] === true) {
    entries.push({
      id: "configured-restriction",
      kind: "access_restriction",
      title: "Access Restriction",
      audience: list("maintenance.access.audience"),
      area: areaLabel("maintenance.access.area"),
      startsAt: text("maintenance.access.starts_at"),
      endsAt: text("maintenance.access.ends_at"),
      status: windowStatus(text("maintenance.access.starts_at"), text("maintenance.access.ends_at"), now),
      editable: true,
    });
  }
  for (const record of records) entries.push({ ...record, status: windowStatus(record.startsAt, record.endsAt, now) });
  return entries.sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
}

export interface BannerState {
  title: string;
  message: string;
  status: "active" | "upcoming";
  startsAt: string;
  endsAt: string;
  audience: string[];
  dismissible: boolean;
  statusPageUrl: string;
}

const UPCOMING_WINDOW_MS = 3 * DAY_MS;

/**
 * The banner a given audience should currently see, or `null`. It is display
 * only: the presence of a banner says nothing about platform availability.
 */
export function bannerFor(values: SettingValues, now: number, audience: string): BannerState | null {
  if (values["maintenance.announcement.enabled"] !== true) return null;
  const audiences = values["maintenance.announcement.audience"];
  if (!Array.isArray(audiences) || !audiences.includes(audience)) return null;
  const startsAt = String(values["maintenance.announcement.starts_at"] ?? "");
  const endsAt = String(values["maintenance.announcement.ends_at"] ?? "");
  const status = windowStatus(startsAt, endsAt, now);
  if (status === "completed" || status === "disabled") return null;
  if (status === "upcoming" && Date.parse(startsAt) - now > UPCOMING_WINDOW_MS) return null;
  return {
    title: String(values["maintenance.announcement.title"] ?? ""),
    message: String(values["maintenance.announcement.message"] ?? ""),
    status,
    startsAt,
    endsAt,
    audience: audiences as string[],
    dismissible: values["maintenance.announcement.dismissible"] !== false,
    statusPageUrl: String(values["maintenance.announcement.status_page_url"] ?? ""),
  };
}

export function describeWindow(startsAt: string, endsAt: string): string {
  return `${formatUtc(startsAt)} to ${formatUtc(endsAt)}`;
}

/** Module shortcuts relevant to a section, shown as links rather than duplicated editors. */
export function relatedModules(section: EditableSectionKey): typeof MODULE_LINKS[number][] {
  const map: Record<EditableSectionKey, string[]> = {
    identity: ["notifications"],
    localization: ["billing", "plans"],
    onboarding: ["plans", "team"],
    security: ["team", "audit"],
    governance: ["team", "audit"],
    privacy: ["audit", "notifications", "usage"],
    communications: ["notifications"],
    maintenance: ["health", "jobs", "api"],
  };
  return MODULE_LINKS.filter((item) => map[section].includes(item.id));
}
