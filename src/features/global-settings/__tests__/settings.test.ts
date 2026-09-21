/**
 * Behaviour of Global Settings through the demo provider: what a save does and
 * refuses to do, how the resolver layers overrides, and that the registry is
 * consistent enough for forms, search and history to be derived from it.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// The provider simulates latency; the tests do not need to wait for it.
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";
const { settingsRepository: repo } = await import("../data/repository");
const { ApiError } = await import("@/types/api");
const { ROLE_PERMISSIONS } = await import("@/types/domain/team");
const registry = await import("../data/registry");
const { SETTING_DEFINITIONS, SETTING_BY_KEY, EXTERNAL_SETTINGS, defaultValues } = registry;
const { SECTION_ACCESS, SECTION_LAYOUT, SECTIONS } = await import("../data/config");
const { resolveSetting, resolveNewCompanyDefaults, changeDirection } = await import("../data/effective-config");
const { validateValues, validateSetting, legalErrors } = await import("../data/validators");
const selectors = await import("../data/selectors");
const formatting = await import("../data/formatting");
const { titleCase } = await import("../data/text");
const { deriveGlobalSettingsCapabilities } = await import("../data/capabilities");
const { buildSeed } = await import("../data/mock/seed");

const actor = { id: "stf_001", name: "Aditya Raghunath" };
const NOW = Date.parse("2026-09-09T09:30:00.000Z");

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => ApiError.isApiError(error) && error.code === code, `expected ${code}`);
}

beforeEach(async () => {
  await repo.resetDemoData?.();
});

const def = (key: string) => {
  const found = SETTING_BY_KEY.get(key);
  assert.ok(found, `missing definition ${key}`);
  return found;
};

describe("registry", () => {
  it("has unique keys and a valid default for every editable setting", () => {
    const keys = SETTING_DEFINITIONS.map((item) => item.key);
    assert.equal(new Set(keys).size, keys.length);
    const defaults = defaultValues();
    const invalid = SETTING_DEFINITIONS.filter((item) => item.valueType !== "readonly" && !item.locked).flatMap((item) => {
      const message = validateSetting(item, defaults[item.key]);
      return message ? [`${item.key}: ${message}`] : [];
    });
    assert.deepEqual(invalid, []);
  });

  it("places every setting in a group that exists in its section", () => {
    const missing = SETTING_DEFINITIONS.filter((item) => {
      const groups = SECTION_LAYOUT[item.section].map((group) => group.id);
      return !groups.includes(item.group) && !["branding", "legal"].includes(item.group);
    });
    assert.deepEqual(missing.map((item) => item.key), []);
  });

  it("never pairs contradictory policy badges", () => {
    for (const item of SETTING_DEFINITIONS) {
      if (item.policyKind === "mandatory_minimum") assert.notEqual(item.override, "allowed", `${item.key} is a mandatory minimum but company-replaceable`);
      if (item.override === "stricter_only") assert.ok(item.strictness, `${item.key} needs a strictness order`);
      if (item.overrideGate) assert.equal(SETTING_BY_KEY.get(item.overrideGate)?.valueType, "boolean", `${item.key} gate must be a boolean setting`);
      if (item.override === "allowed" || item.override === "stricter_only") assert.ok(item.overrideGate, `${item.key} needs a governance switch`);
    }
  });

  it("marks security-critical settings as held for review and states their enforcement", () => {
    for (const item of SETTING_DEFINITIONS.filter((entry) => entry.sensitivity === "critical")) {
      assert.equal(item.approval, "sensitive_review", item.key);
      assert.notEqual(item.enforcement, "not_security_critical", item.key);
    }
  });

  it("keeps commercial, usage and integration settings out of Global Settings", () => {
    const forbidden = /trial|price|renewal|quota|metering|oauth|webhook|invoice|refund|feature_flag/i;
    assert.deepEqual(SETTING_DEFINITIONS.filter((item) => forbidden.test(item.key)).map((item) => item.key), []);
    assert.ok(EXTERNAL_SETTINGS.every((item) => item.href.startsWith("/super-admin/")));
  });

  it("derives access from one table, so the matrix matches the capabilities", () => {
    for (const section of SECTIONS) assert.ok(SECTION_ACCESS[section.key], section.key);
    for (const item of SETTING_DEFINITIONS) {
      assert.equal(item.editCapability, SECTION_ACCESS[item.section].edit);
      assert.equal(item.viewCapability, SECTION_ACCESS[item.section].view);
    }
  });

  it("stores no secrets or credentials", () => {
    const secretLike = /secret|token|seed|recovery_code|password_hash/i;
    assert.deepEqual(SETTING_DEFINITIONS.filter((item) => secretLike.test(item.key) && item.valueType !== "select").map((item) => item.key), []);
  });
});

describe("capabilities", () => {
  const can = (role: keyof typeof ROLE_PERMISSIONS) => (permission: (typeof ROLE_PERMISSIONS)["super_admin"][number]) => ROLE_PERMISSIONS[role].includes(permission);

  it("gives a super admin everything", () => {
    assert.ok(Object.values(deriveGlobalSettingsCapabilities(can("super_admin"))).every(Boolean));
  });

  it("lets technical admins view but not change identity or governance", () => {
    const caps = deriveGlobalSettingsCapabilities(can("technical_admin"));
    assert.equal(caps.canViewGlobalSettings, true);
    assert.equal(caps.canManageIdentity, false);
    assert.equal(caps.canManageGlobalSecurityPolicies, false);
    assert.equal(caps.canViewConfigurationHistory, true);
  });

  it("gives finance nothing in this module", () => {
    const caps = deriveGlobalSettingsCapabilities(can("finance"));
    assert.equal(caps.canViewGlobalSettings, false);
    assert.equal(caps.canManageMaintenance, false);
  });
});

describe("resolver", () => {
  const platform = () => ({ ...defaultValues() });

  it("lets a company replace an overridable default", () => {
    const resolved = resolveSetting(def("localization.default_timezone"), platform(), { company: "Europe/London" });
    assert.equal(resolved.value, "Europe/London");
    assert.equal(resolved.source, "company_override");
  });

  it("ignores the override when governance switches it off", () => {
    const values = { ...platform(), "governance.company_override.timezone": false };
    const resolved = resolveSetting(def("localization.default_timezone"), values, { company: "Europe/London" });
    assert.equal(resolved.value, "Asia/Kolkata");
    assert.equal(resolved.ignored[0]?.layer, "company");
  });

  it("rejects an invalid company value instead of merging it", () => {
    const resolved = resolveSetting(def("localization.default_timezone"), platform(), { company: "IST" });
    assert.equal(resolved.value, "Asia/Kolkata");
    assert.equal(resolved.ignored.length, 1);
  });

  it("lets a company strengthen but never weaken an MFA minimum", () => {
    const strengthened = resolveSetting(def("security.company_users.mfa_minimum"), platform(), { company: "required_for_all" });
    assert.equal(strengthened.value, "required_for_all");
    const weakened = resolveSetting(def("security.company_users.mfa_minimum"), platform(), { company: "optional" });
    assert.equal(weakened.value, "required_for_admins");
    assert.equal(weakened.source, "platform_minimum");
    assert.match(weakened.ignored[0]?.reason ?? "", /weaker/i);
  });

  it("treats a shorter timeout as stricter and a longer one as weaker", () => {
    const key = "security.sessions.company_idle_timeout_minutes";
    assert.equal(resolveSetting(def(key), platform(), { company: 30 }).value, 30);
    assert.equal(resolveSetting(def(key), platform(), { company: 600 }).value, 120);
  });

  it("never lets anything override platform identity", () => {
    const resolved = resolveSetting(def("identity.platform_name"), platform(), { company: "Acme", user: "Me" });
    assert.equal(resolved.value, "EnCodency omniPlatform");
    assert.equal(resolved.ignored.length, 2);
  });

  it("applies a permitted user preference after the company value", () => {
    const resolved = resolveSetting(def("localization.time_format"), platform(), { company: "24h", user: "12h" });
    assert.equal(resolved.value, "12h");
    assert.equal(resolved.source, "user_preference");
  });

  it("reports direction of change for policies", () => {
    assert.equal(changeDirection(def("security.sessions.idle_timeout_minutes"), 60, 30), "stricter");
    assert.equal(changeDirection(def("security.sessions.idle_timeout_minutes"), 30, 60), "weaker");
    assert.equal(changeDirection(def("security.platform_staff.mfa_required"), true, false), "weaker");
    assert.equal(changeDirection(def("localization.default_timezone"), "UTC", "Asia/Kolkata"), "neutral");
  });

  it("resolves new-company defaults from the source the setting names", () => {
    const values = platform();
    assert.equal(resolveNewCompanyDefaults(values, "v7").timezone, "Asia/Kolkata");
    assert.equal(resolveNewCompanyDefaults({ ...values, "localization.default_timezone": "Europe/London" }, "v7").timezone, "Europe/London");
    const configured = { ...values, "onboarding.timezone_source": "configured", "onboarding.configured_timezone": "Asia/Dubai" };
    assert.equal(resolveNewCompanyDefaults(configured, "v7").timezone, "Asia/Dubai");
    assert.equal(resolveNewCompanyDefaults(values, "v7").language, "English");
    assert.equal(resolveNewCompanyDefaults({ ...values, "localization.default_locale": "hi-IN" }, "v7").language, "Hindi");
  });
});

describe("validation", () => {
  it("rejects ambiguous timezone abbreviations and accepts IANA identifiers", () => {
    assert.ok(validateSetting(def("localization.default_timezone"), "IST"));
    assert.equal(validateSetting(def("localization.default_timezone"), "Asia/Kolkata"), null);
    assert.ok(validateSetting(def("localization.default_timezone"), "Mars/Olympus"));
  });

  it("checks required, format and range", () => {
    assert.match(validateSetting(def("identity.platform_name"), "  ") ?? "", /required/i);
    assert.ok(validateSetting(def("identity.support_email"), "nope"));
    assert.ok(validateSetting(def("identity.website_url"), "not a url"));
    assert.ok(validateSetting(def("security.password.min_length"), 4));
    assert.ok(validateSetting(def("security.password.min_length"), 12.5));
    assert.equal(validateSetting(def("security.password.min_length"), 12), null);
    assert.ok(validateSetting(def("localization.default_locale"), "english"));
  });

  it("refuses to change a locked or read-only setting", () => {
    assert.ok(validateSetting(def("security.sensitive.require_audit"), false));
    assert.ok(validateSetting(def("identity.platform_id"), "hacked"));
  });

  it("checks rules that span settings", () => {
    const values = { ...defaultValues(), "maintenance.announcement.ends_at": "2026-09-11T19:00:00.000Z" };
    assert.match(validateValues(values, ["maintenance.announcement.ends_at"])["maintenance.announcement.ends_at"] ?? "", /after the start/i);
    const methods = { ...defaultValues(), "security.mfa.allowed_methods": ["webauthn"] };
    assert.ok(validateValues(methods, ["security.mfa.allowed_methods"])["security.mfa.allowed_methods"]);
    const reminder = { ...defaultValues(), "onboarding.invite_reminder_days": 9 };
    assert.ok(validateValues(reminder, ["onboarding.invite_reminder_days"])["onboarding.invite_reminder_days"]);
  });

  it("does not validate a hidden conditional field", () => {
    const values = { ...defaultValues(), "onboarding.configured_timezone": "" };
    assert.deepEqual(validateValues(values, ["onboarding.configured_timezone"]), {});
    const shown = { ...values, "onboarding.timezone_source": "configured" };
    assert.ok(validateValues(shown, ["onboarding.configured_timezone"])["onboarding.configured_timezone"]);
  });

  it("requires the terms and privacy references to be complete", () => {
    const errors = legalErrors("communications.legal.terms", { title: "Terms", url: "", version: "", effectiveDate: "", lastReviewed: "", status: "published", owner: "Legal" });
    assert.ok(errors.url && errors.version && errors.effectiveDate);
    assert.deepEqual(legalErrors("communications.legal.cookies", { title: "Cookies", url: "", version: "", effectiveDate: "", lastReviewed: "", status: "not_published", owner: "Legal" }), {});
  });

  it("validates uploaded branding against the asset rules", () => {
    const asset = def("identity.branding.favicon");
    assert.ok(validateSetting(asset, { source: "uploaded", fileName: "x.gif", mimeType: "image/gif", sizeBytes: 100, width: 32, height: 32, dataUrl: "data:" }));
    assert.ok(validateSetting(asset, { source: "uploaded", fileName: "x.png", mimeType: "image/png", sizeBytes: 900_000, width: 32, height: 32, dataUrl: "data:" }));
    assert.equal(validateSetting(asset, { source: "uploaded", fileName: "x.png", mimeType: "image/png", sizeBytes: 2_000, width: 32, height: 32, dataUrl: "data:" }), null);
  });
});

describe("previews", () => {
  const sample = { timezone: "Asia/Kolkata", locale: "en-IN", dateFormat: "DD MMM YYYY", timeFormat: "12h" };

  it("formats the example instant from the selected settings, not a clock", () => {
    assert.equal(formatting.formatDatePreview(sample), "19 Sep 2026");
    assert.equal(formatting.formatTimePreview(sample), "05:30 PM");
    assert.equal(formatting.formatTimePreview({ ...sample, timeFormat: "24h" }), "17:30");
    assert.equal(formatting.formatDatePreview({ ...sample, dateFormat: "MM/DD/YYYY" }), "09/19/2026");
    assert.equal(formatting.formatDatePreview({ ...sample, timezone: "Pacific/Auckland" }), "20 Sep 2026");
  });

  it("formats currency by locale and reports separators", () => {
    assert.match(formatting.formatCurrencyPreview({ currency: "INR", locale: "en-IN", display: "symbol" }), /12,34,567\.89/);
    assert.match(formatting.formatCurrencyPreview({ currency: "USD", locale: "en-US", display: "code" }), /USD/);
    assert.deepEqual(formatting.separatorsOf("de-DE"), { group: ".", decimal: "," });
  });

  it("shows offsets for IANA zones", () => {
    assert.equal(formatting.timezoneOffset("Asia/Kolkata"), "UTC+05:30");
  });
});

describe("configuration and seed", () => {
  it("starts from the registry defaults", async () => {
    const config = await repo.getConfiguration();
    assert.deepEqual(config.values, defaultValues());
    assert.equal(config.version.number, 7);
  });

  it("builds snapshots that match the recorded changes", () => {
    const seed = buildSeed();
    for (const change of seed.changes.filter((item) => item.result === "applied")) {
      const version = seed.versions.find((item) => item.id === change.versionId);
      assert.ok(version, change.id);
      assert.deepEqual(version.snapshot[change.key], change.next, `${change.id} next`);
      const earlier = seed.versions.find((item) => item.number === version.number - 1);
      assert.deepEqual(earlier?.snapshot[change.key], change.previous, `${change.id} previous`);
    }
    assert.equal(seed.versions.filter((item) => item.status === "current").length, 1);
    assert.deepEqual(seed.versions[seed.versions.length - 1]?.snapshot, defaultValues());
  });

  it("keeps pending and planned records out of the effective configuration", async () => {
    const config = await repo.getConfiguration();
    assert.equal(config.values["security.company_users.mfa_minimum"], "required_for_admins");
    assert.equal(config.pendingCount, 2);
    assert.equal(config.pendingSensitiveCount, 1);
  });
});

describe("saving", () => {
  it("applies a low-impact change, bumps the version and records history", async () => {
    const result = await repo.saveSection({ section: "localization", values: { "localization.first_day_of_week": "sunday" } }, actor);
    assert.equal(result.applied.length, 1);
    assert.equal(result.version?.number, 8);
    const config = await repo.getConfiguration();
    assert.equal(config.values["localization.first_day_of_week"], "sunday");
    assert.equal(config.version.number, 8);
    const history = await repo.listChanges({ section: "localization", pageSize: 5 });
    assert.equal(history.rows[0]?.settingName, "First Day of Week");
    assert.equal(history.rows[0]?.result, "applied");
    assert.equal(history.rows[0]?.demo, true);
  });

  it("does nothing, and does not bump the version, when nothing changed", async () => {
    const result = await repo.saveSection({ section: "localization", values: { "localization.default_timezone": "Asia/Kolkata" } }, actor);
    assert.equal(result.version, null);
    assert.equal((await repo.getConfiguration()).version.number, 7);
  });

  it("requires a reason for a moderate-or-higher change", async () => {
    await rejects(repo.saveSection({ section: "identity", values: { "identity.platform_name": "Renamed Platform" } }, actor), "VALIDATION_FAILED");
    const ok = await repo.saveSection({ section: "identity", values: { "identity.platform_name": "Renamed Platform" }, reason: "Rebrand" }, actor);
    assert.equal(ok.applied.length, 1);
    assert.equal((await repo.getConfiguration()).values["identity.platform_name"], "Renamed Platform");
  });

  it("returns field errors and saves nothing when a value is invalid", async () => {
    const error = await repo
      .saveSection({ section: "identity", values: { "identity.support_email": "bad", "identity.platform_short_name": "Short" }, reason: "x" }, actor)
      .catch((failure: unknown) => failure);
    assert.ok(ApiError.isApiError(error));
    assert.ok(error.fieldErrors?.["identity.support_email"]);
    assert.equal((await repo.getConfiguration()).values["identity.platform_short_name"], "omniPlatform");
  });

  it("refuses to change a locked setting or one from another section", async () => {
    await rejects(repo.saveSection({ section: "security", values: { "security.sensitive.require_audit": false }, reason: "x" }, actor), "VALIDATION_FAILED");
    await rejects(repo.saveSection({ section: "identity", values: { "localization.default_timezone": "UTC" }, reason: "x" }, actor), "BAD_REQUEST");
    await rejects(repo.saveSection({ section: "identity", values: { "made.up.key": "x" }, reason: "x" }, actor), "BAD_REQUEST");
  });

  it("holds a security-critical change as a pending draft instead of applying it", async () => {
    const result = await repo.saveSection({ section: "security", values: { "security.platform_staff.mfa_required": false }, reason: "Testing" }, actor);
    assert.equal(result.applied.length, 0);
    assert.equal(result.pending.length, 1);
    assert.equal(result.version, null);
    const config = await repo.getConfiguration();
    assert.equal(config.values["security.platform_staff.mfa_required"], true, "the effective value must not change");
    assert.equal(config.version.number, 7);
    assert.equal(config.pendingSensitiveCount, 2);
    assert.match(result.pending[0]?.approvalNote ?? "", /demo draft/i);
  });

  it("splits one save into applied and pending rows", async () => {
    const result = await repo.saveSection(
      { section: "security", values: { "security.sessions.idle_timeout_minutes": 30, "security.mfa.reset_requires_approval": false }, reason: "Review" },
      actor,
    );
    assert.equal(result.applied.length, 1);
    assert.equal(result.pending.length, 1);
    assert.equal((await repo.getConfiguration()).values["security.sessions.idle_timeout_minutes"], 30);
  });

  it("supersedes an earlier pending request for the same setting", async () => {
    await repo.saveSection({ section: "security", values: { "security.company_users.mfa_minimum": "optional" }, reason: "first" }, actor);
    const pending = await repo.listPending();
    const forKey = pending.filter((item) => item.key === "security.company_users.mfa_minimum" && item.result === "pending_approval");
    assert.equal(forKey.length, 1, "only the newest request stays pending");
    assert.equal(forKey[0]?.next, "optional");
  });

  it("withdraws a pending change but not an applied one", async () => {
    const [pending] = await repo.listPending();
    assert.ok(pending);
    await rejects(repo.withdrawPending(pending.id, "", actor), "VALIDATION_FAILED");
    const updated = await repo.withdrawPending(pending.id, "No longer needed", actor);
    assert.equal(updated.result, "withdrawn");
    const applied = (await repo.listChanges({ result: "applied", pageSize: 1 })).rows[0];
    assert.ok(applied);
    await rejects(repo.withdrawPending(applied.id, "why", actor), "CONFLICT");
    await rejects(repo.withdrawPending("cfg_chg_9999", "why", actor), "NOT_FOUND");
  });

  it("keeps uploaded image data out of history records", async () => {
    const asset = { source: "uploaded" as const, fileName: "logo.png", mimeType: "image/png", sizeBytes: 4_000, width: 400, height: 112, dataUrl: "data:image/png;base64,AAAA" };
    const result = await repo.saveSection({ section: "identity", values: { "identity.branding.primary_logo": asset }, reason: "New logo" }, actor);
    const record = result.applied[0];
    assert.ok(record);
    assert.equal((record.next as { dataUrl: string | null }).dataUrl, null);
    assert.equal(record.changeType, "asset");
    const config = await repo.getConfiguration();
    assert.equal((config.values["identity.branding.primary_logo"] as { dataUrl: string | null }).dataUrl, asset.dataUrl, "the preview still has the image");
  });
});

describe("shared effects", () => {
  it("updates new-company defaults when localization changes, without touching an explicit source", async () => {
    await repo.saveSection({ section: "localization", values: { "localization.default_timezone": "Europe/London" } }, actor);
    assert.equal((await repo.getNewCompanyDefaults()).timezone, "Europe/London");
    await repo.saveSection({ section: "onboarding", values: { "onboarding.timezone_source": "configured", "onboarding.configured_timezone": "Asia/Dubai" }, reason: "Pin" }, actor);
    await repo.saveSection({ section: "localization", values: { "localization.default_timezone": "America/New_York" } }, actor);
    assert.equal((await repo.getNewCompanyDefaults()).timezone, "Asia/Dubai");
  });

  it("shows a new invitation default only to new invitations", async () => {
    await repo.saveSection({ section: "onboarding", values: { "onboarding.owner_invite_expiry_days": 10 } , reason: "Longer" }, actor);
    assert.equal((await repo.getNewCompanyDefaults()).ownerInviteExpiryDays, 10);
  });

  it("changes display currency without converting anything", async () => {
    await repo.saveSection({ section: "localization", values: { "localization.display_currency": "USD" }, reason: "Display" }, actor);
    const review = selectors.buildChangeReview({ ...defaultValues() }, { "localization.display_currency": "GBP" });
    assert.match(def("localization.display_currency").description, /never converted/i);
    assert.ok(review.rows[0]);
  });
});

describe("review", () => {
  it("lists current and proposed values with the affected scope", () => {
    const review = selectors.buildChangeReview(defaultValues(), { "security.sessions.idle_timeout_minutes": 30 });
    const row = review.rows[0];
    assert.equal(row?.previousText, "60 minutes");
    assert.equal(row?.nextText, "30 minutes");
    assert.equal(row?.scope, "platform_staff");
    assert.equal(row?.direction, "stricter");
    assert.match(row?.existingImpact ?? "", /not ended|unchanged/i);
    assert.equal(review.requiresReason, true);
  });

  it("warns that shortening retention deletes nothing now but exposes older records later", () => {
    const review = selectors.buildChangeReview(defaultValues(), { "privacy.retention.audit_logs": 120 });
    assert.match(review.rows[0]?.warning ?? "", /nothing is deleted/i);
  });

  it("requires backend checks for sensitive changes and never marks them performed", () => {
    const review = selectors.buildChangeReview(defaultValues(), { "security.platform_staff.mfa_required": false });
    const backend = review.checks.filter((check) => check.state === "backend_required").map((check) => check.id);
    assert.deepEqual(backend.sort(), ["approval", "mfa", "reauth"]);
    assert.equal(review.hasPending, true);
    assert.equal(review.rows[0]?.direction, "weaker");
  });

  it("has no checks for a standard change", () => {
    const review = selectors.buildChangeReview(defaultValues(), { "localization.first_day_of_week": "sunday" });
    assert.deepEqual(review.checks, []);
    assert.equal(review.requiresReason, false);
  });
});

describe("search", () => {
  it("finds every timezone setting across sections", () => {
    const hits = selectors.searchSettings("timezone").filter((hit) => !hit.external);
    const names = hits.map((hit) => hit.name);
    assert.ok(names.includes("Default Timezone"));
    assert.ok(names.includes("Company Timezone Override Permission"));
    assert.ok(hits.some((hit) => hit.sectionLabel === "Company Onboarding"));
  });

  it("sends trial duration to Plans & Subscriptions, labelled as managed elsewhere", () => {
    const hit = selectors.searchSettings("trial duration")[0];
    assert.equal(hit?.external, true);
    assert.equal(hit?.ownerModule, "Plans & Subscriptions");
    assert.match(hit?.href ?? "", /^\/super-admin\/plans/);
  });

  it("deep-links to the right section, tab and setting", () => {
    const hit = selectors.searchSettings("staff idle session timeout")[0];
    assert.equal(hit?.key, "security.sessions.idle_timeout_minutes");
    assert.match(hit?.href ?? "", /^\/super-admin\/settings\/security\?tab=session&focus=security\.sessions\.idle_timeout_minutes$/);
    assert.equal(selectors.searchSettings("favicon")[0]?.href, "/super-admin/settings?focus=identity.branding.favicon");
  });

  it("matches by internal key and returns nothing for gibberish", () => {
    assert.equal(selectors.searchSettings("security.platform_staff.mfa_required")[0]?.key, "security.platform_staff.mfa_required");
    assert.deepEqual(selectors.searchSettings("zzzzqqq"), []);
    assert.deepEqual(selectors.searchSettings("   "), []);
  });
});

describe("history and versions", () => {
  it("filters by category, actor, result, type and date range", async () => {
    const all = await repo.listChanges({ pageSize: 100 });
    assert.ok(all.total >= 12);
    assert.ok(all.rows.every((row, index) => index === 0 || Date.parse(all.rows[index - 1]!.at) >= Date.parse(row.at)), "newest first");
    const security = await repo.listChanges({ section: "security", pageSize: 100 });
    assert.ok(security.rows.length > 0 && security.rows.every((row) => row.section === "security"));
    const recent = await repo.listChanges({ range: "7d", pageSize: 100 });
    assert.ok(recent.rows.every((row) => Date.parse(row.at) >= NOW - 8 * 86_400_000));
    const pending = await repo.listChanges({ result: "pending_approval", pageSize: 100 });
    assert.ok(pending.rows.every((row) => row.result === "pending_approval"));
    const references = await repo.listChanges({ changeType: "reference", pageSize: 100 });
    assert.ok(references.rows.every((row) => row.changeType === "reference"));
    const page = await repo.listChanges({ pageSize: 3, page: 2 });
    assert.equal(page.rows.length, 3);
  });

  it("compares two versions in human terms", async () => {
    const comparison = await repo.compareVersions("cfg_v6", "cfg_v7");
    const idle = await repo.compareVersions("cfg_v2", "cfg_v3");
    const row = idle.rows.find((item) => item.key === "security.sessions.idle_timeout_minutes");
    assert.equal(row?.previousText, "120 minutes");
    assert.equal(row?.nextText, "60 minutes");
    assert.equal(row?.direction, "stricter");
    assert.deepEqual(comparison.rows.map((item) => item.key).sort(), ["security.login.lockout_minutes", "security.login.max_failed_attempts"]);
    await rejects(repo.compareVersions("cfg_v1", "cfg_v99"), "NOT_FOUND");
  });

  it("exposes exactly one current version", async () => {
    const versions = await repo.listVersions();
    assert.equal(versions.filter((item) => item.status === "current").length, 1);
    assert.equal(versions[0]?.number, 7);
  });
});

describe("security review", () => {
  it("reports explainable states, never a score", async () => {
    const review = await repo.getSecurityReview();
    assert.ok(["configured", "needs_review"].includes(review.status));
    assert.ok(review.configured.length > 0);
    assert.ok(review.backendDependencies.length > 0);
    assert.equal(review.pendingSensitive.length, 1);
    assert.ok(review.incomplete.some((item) => item.key === "pending"), "pending changes are listed as an open item");
    assert.ok(!JSON.stringify(review).match(/secure|score|%/i));
  });
});

describe("maintenance", () => {
  it("evaluates windows deterministically against the demo clock", () => {
    assert.equal(selectors.windowStatus("2026-09-13T20:00:00Z", "2026-09-13T22:00:00Z", NOW), "upcoming");
    assert.equal(selectors.windowStatus("2026-09-09T09:00:00Z", "2026-09-09T10:00:00Z", NOW), "active");
    assert.equal(selectors.windowStatus("2026-09-01T09:00:00Z", "2026-09-01T10:00:00Z", NOW), "completed");
    assert.equal(selectors.windowStatus("2026-09-09T09:00:00Z", "2026-09-09T10:00:00Z", NOW, false), "disabled");
  });

  it("shows no banner while the announcement is off, even with a window set", () => {
    assert.equal(selectors.bannerFor(defaultValues(), NOW, "platform_staff"), null);
  });

  it("shows an enabled banner only to its audience, and only near or during the window", () => {
    const enabled = { ...defaultValues(), "maintenance.announcement.enabled": true, "maintenance.announcement.starts_at": "2026-09-10T20:00:00.000Z", "maintenance.announcement.ends_at": "2026-09-10T22:00:00.000Z" };
    assert.equal(selectors.bannerFor(enabled, NOW, "platform_staff")?.status, "upcoming");
    assert.equal(selectors.bannerFor(enabled, NOW, "public_visitors"), null, "audience not selected");
    const far = { ...enabled, "maintenance.announcement.starts_at": "2026-10-20T20:00:00.000Z", "maintenance.announcement.ends_at": "2026-10-20T22:00:00.000Z" };
    assert.equal(selectors.bannerFor(far, NOW, "platform_staff"), null, "not yet near");
    const past = { ...enabled, "maintenance.announcement.starts_at": "2026-09-01T20:00:00.000Z", "maintenance.announcement.ends_at": "2026-09-01T22:00:00.000Z" };
    assert.equal(selectors.bannerFor(past, NOW, "platform_staff"), null, "completed");
  });

  it("keeps announcement and access restriction independent", async () => {
    await repo.saveSection({ section: "maintenance", values: { "maintenance.announcement.enabled": true }, reason: "Notice" }, actor);
    const config = await repo.getConfiguration();
    assert.equal(config.values["maintenance.announcement.enabled"], true);
    assert.equal(config.values["maintenance.access.enabled"], false, "an announcement never restricts access");
  });

  it("holds an access restriction as pending and never applies it", async () => {
    const result = await repo.saveSection({ section: "maintenance", values: { "maintenance.access.enabled": true }, reason: "Planned upgrade" }, actor);
    assert.equal(result.pending.length, 1);
    const config = await repo.getConfiguration();
    assert.equal(config.values["maintenance.access.enabled"], false);
    assert.ok(!config.maintenance.some((entry) => entry.kind === "access_restriction"), "a pending restriction is not listed as configured");
  });

  it("lists configured, upcoming and completed records with evaluated status", async () => {
    const { maintenance } = await repo.getConfiguration();
    const statuses = new Set(maintenance.map((entry) => entry.status));
    assert.ok(statuses.has("completed") && statuses.has("upcoming"));
    const configured = maintenance.find((entry) => entry.editable);
    assert.equal(configured?.status, "disabled", "a disabled announcement is not shown as live");
  });

  it("rejects an end before the start", async () => {
    await rejects(
      repo.saveSection({ section: "maintenance", values: { "maintenance.announcement.ends_at": "2026-09-11T19:00:00.000Z" }, reason: "x" }, actor),
      "VALIDATION_FAILED",
    );
  });
});

describe("label casing", () => {
  it("title-cases labels but keeps acronyms and small words", () => {
    assert.equal(titleCase("Needs review"), "Needs Review");
    assert.equal(titleCase("public identity preview"), "Public Identity Preview");
    assert.equal(titleCase("default asset"), "Default Asset");
    assert.equal(titleCase("first day of week"), "First Day of Week");
    assert.equal(titleCase("staff MFA requirement"), "Staff MFA Requirement");
    assert.equal(titleCase("read-only"), "Read-Only");
  });

  it("gives every setting name, and every option label, Title Case", () => {
    const bad = SETTING_DEFINITIONS.flatMap((item) => [item.name, ...(item.options ?? []).map((option) => option.label)]).filter((text) => text !== titleCase(text));
    assert.deepEqual(bad, []);
  });

  it("describes branding assets in Title Case", () => {
    assert.equal(formatting.describeAsset({ source: "default", fileName: "x", mimeType: "", sizeBytes: 0, width: null, height: null, dataUrl: null }), "Default Asset");
  });
});
