/**
 * Registry-driven validation. One implementation checks a single value against
 * its definition; a second pass checks rules that span several settings.
 * The same functions run in the form (instant feedback) and in the provider
 * (the authoritative check a backend would repeat).
 */
import { formatDuration, isValidLocale, isValidTimezone } from "./formatting";
import { ASSET_KEYS, ASSET_SPECS, LEGAL_DOCUMENT_IDS, SETTING_BY_KEY, SETTING_DEFINITIONS, sameValue } from "./registry";
import type { AssetKind, AssetValue, GlobalSettingDefinition, LegalDocValue, SettingValue, SettingValues } from "./types";

export type FieldErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function isValidDateOnly(value: string): boolean {
  return DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isVisible(definition: GlobalSettingDefinition, values: SettingValues): boolean {
  const gate = definition.visibleWhen;
  if (!gate) return true;
  const current = values[gate.key];
  return Array.isArray(gate.equals) ? (gate.equals as readonly SettingValue[]).some((item) => sameValue(item, current)) : sameValue(gate.equals as SettingValue, current);
}

const isEmpty = (value: SettingValue | undefined) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

/** The first problem with one value, or `null`. */
export function validateSetting(definition: GlobalSettingDefinition, value: SettingValue | undefined): string | null {
  const name = definition.name;

  if (definition.valueType === "readonly" || definition.locked) {
    return sameValue(value, definition.defaultValue) ? null : `${name} cannot be changed here.`;
  }

  if (definition.valueType === "asset") return validateAsset(definition, value as AssetValue);
  if (definition.valueType === "legal_document") return validateLegal(definition, value as LegalDocValue);

  if (isEmpty(value)) return definition.required ? `${name} is required.` : null;

  switch (definition.valueType) {
    case "text":
    case "textarea": {
      const text = String(value);
      if (definition.required && !text.trim()) return `${name} is required.`;
      if (definition.maxLength && text.length > definition.maxLength) return `Keep ${name.toLowerCase()} under ${definition.maxLength} characters.`;
      return null;
    }
    case "email":
      return isValidEmail(String(value)) ? null : "Enter a valid email address.";
    case "url":
      return isValidHttpUrl(String(value)) ? null : "Enter a valid URL starting with https://";
    case "number": {
      const number = Number(value);
      if (!Number.isInteger(number)) return `${name} must be a whole number.`;
      if (definition.min !== undefined && number < definition.min) return `${name} must be at least ${formatDuration(definition.min, definition.unit)}.`;
      if (definition.max !== undefined && number > definition.max) return `${name} must be at most ${formatDuration(definition.max, definition.unit)}.`;
      return null;
    }
    case "boolean":
      return typeof value === "boolean" ? null : `${name} must be on or off.`;
    case "select":
      return definition.options?.some((option) => option.value === value) ? null : `Choose a valid option for ${name.toLowerCase()}.`;
    case "multiselect": {
      const list = value as string[];
      const allowed = new Set(definition.options?.map((option) => option.value));
      return list.every((item) => allowed.has(item)) ? null : `Choose valid options for ${name.toLowerCase()}.`;
    }
    case "timezone":
      return isValidTimezone(String(value)) ? null : "Use a valid IANA timezone such as Asia/Kolkata. Abbreviations like IST are ambiguous.";
    case "locale":
      return isValidLocale(String(value)) ? null : "Use a valid locale such as en-IN.";
    case "datetime":
      return Number.isNaN(Date.parse(String(value))) ? "Enter a valid date and time." : null;
    default:
      return null;
  }
}

function assetKindOf(key: string): AssetKind | null {
  return (Object.entries(ASSET_KEYS).find(([, assetKey]) => assetKey === key)?.[0] as AssetKind | undefined) ?? null;
}

function validateAsset(definition: GlobalSettingDefinition, value: AssetValue): string | null {
  if (!value || typeof value !== "object") return `${definition.name} is invalid.`;
  if (value.source !== "uploaded") return null;
  const kind = assetKindOf(definition.key);
  if (!kind) return null;
  const spec = ASSET_SPECS[kind];
  if (!(spec.types as readonly string[]).includes(value.mimeType)) return `Use one of: ${spec.types.map((type) => type.replace("image/", "").replace("svg+xml", "svg").replace("x-icon", "ico").replace("vnd.microsoft.icon", "ico")).join(", ")}.`;
  if (value.sizeBytes > spec.maxBytes) return `File is too large. Keep it under ${Math.round(spec.maxBytes / 1024)} KB.`;
  if (value.width !== null && value.width < spec.minWidth) return `Image is too small. Use at least ${spec.minWidth} px wide.`;
  return null;
}

function validateLegal(definition: GlobalSettingDefinition, value: LegalDocValue): string | null {
  const errors = legalErrors(definition.key, value);
  return Object.values(errors)[0] ?? null;
}

/** Field-level problems inside one legal document reference (used by its editor). */
export function legalErrors(key: string, value: LegalDocValue): Record<string, string> {
  const errors: Record<string, string> = {};
  const id = key.split(".").pop() ?? "";
  const required = id === "terms" || id === "privacy";
  const touched = value.url || value.version || value.effectiveDate || value.status !== "not_published";
  if (!required && !touched) return errors;
  if (!value.title.trim()) errors.title = "Document title is required.";
  if (value.url && !isValidHttpUrl(value.url)) errors.url = "Enter a valid URL starting with https://";
  if ((required || value.status === "published") && !value.url) errors.url = "A published document needs a URL.";
  if ((required || value.status === "published") && !value.version.trim()) errors.version = "Add a version label, e.g. 2.1.";
  if (value.version && value.version.length > 20) errors.version = "Keep the version label short.";
  if ((required || value.status === "published") && !value.effectiveDate) errors.effectiveDate = "Add an effective date.";
  if (value.effectiveDate && !isValidDateOnly(value.effectiveDate)) errors.effectiveDate = "Enter a valid date.";
  if (value.lastReviewed && !isValidDateOnly(value.lastReviewed)) errors.lastReviewed = "Enter a valid date.";
  if (!value.owner.trim()) errors.owner = "Name the document owner.";
  return errors;
}

/* ------------------------------------------------------------------ */
/* Whole-configuration validation                                      */
/* ------------------------------------------------------------------ */

const valueOf = (values: SettingValues, key: string) => values[key];
const iso = (values: SettingValues, key: string) => Date.parse(String(valueOf(values, key) ?? ""));

/** Rules that span several settings. Only keys the caller is saving are reported. */
export function validateCrossField(values: SettingValues, scope: ReadonlySet<string>): FieldErrors {
  const errors: FieldErrors = {};
  const add = (key: string, message: string) => {
    if (scope.has(key) && !errors[key]) errors[key] = message;
  };

  // Maintenance windows
  for (const prefix of ["maintenance.announcement", "maintenance.access"]) {
    const start = iso(values, `${prefix}.starts_at`);
    const end = iso(values, `${prefix}.ends_at`);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) add(`${prefix}.ends_at`, "The end must be after the start.");
  }
  if (values["maintenance.access.enabled"] === true) {
    const audience = values["maintenance.access.audience"];
    if (Array.isArray(audience) && audience.length === 0) add("maintenance.access.audience", "Choose who the restriction applies to.");
  }
  if (values["maintenance.announcement.enabled"] === true) {
    for (const key of ["title", "message"]) {
      if (isEmpty(values[`maintenance.announcement.${key}`])) add(`maintenance.announcement.${key}`, "Required while the announcement is enabled.");
    }
  }

  // MFA
  const methods = values["security.mfa.allowed_methods"];
  if (values["security.mfa.totp_enrollment"] !== "optional" && Array.isArray(methods) && !methods.includes("totp")) {
    add("security.mfa.allowed_methods", "TOTP enrolment is required, so authenticator apps must be an allowed method.");
  }
  if (values["security.platform_staff.mfa_required"] === true && Array.isArray(methods) && methods.length === 0) {
    add("security.mfa.allowed_methods", "Staff MFA is required, so at least one method must be allowed.");
  }

  // Invitations
  const reminder = Number(valueOf(values, "onboarding.invite_reminder_days"));
  const owner = Number(valueOf(values, "onboarding.owner_invite_expiry_days"));
  const member = Number(valueOf(values, "onboarding.member_invite_expiry_days"));
  if (reminder > 0 && (reminder >= owner || reminder >= member)) add("onboarding.invite_reminder_days", "The reminder must fall before the invitation expires.");

  // Session windows
  const idle = Number(valueOf(values, "security.sessions.idle_timeout_minutes"));
  const reauth = Number(valueOf(values, "security.sessions.reauth_minutes"));
  if (reauth > idle && idle > 0) add("security.sessions.reauth_minutes", "The reauthentication window cannot be longer than the idle timeout.");

  // Conditional sources
  for (const [source, target] of [
    ["onboarding.timezone_source", "onboarding.configured_timezone"],
    ["onboarding.language_source", "onboarding.configured_language"],
    ["onboarding.currency_source", "onboarding.configured_currency"],
  ] as const) {
    if (values[source] === "configured" && isEmpty(values[target])) add(target, "Choose the value new companies should start with.");
  }
  return errors;
}

/** Validates the given keys (or every setting) and returns messages keyed by setting key. */
export function validateValues(values: SettingValues, keys?: readonly string[]): FieldErrors {
  const targets = keys ? keys.map((key) => SETTING_BY_KEY.get(key)).filter((item): item is GlobalSettingDefinition => Boolean(item)) : SETTING_DEFINITIONS;
  const scope = new Set(targets.map((item) => item.key));
  const errors: FieldErrors = {};
  for (const definition of targets) {
    if (!isVisible(definition, values)) continue;
    const message = validateSetting(definition, values[definition.key]);
    if (message) errors[definition.key] = message;
  }
  return { ...validateCrossField(values, scope), ...errors };
}

export { LEGAL_DOCUMENT_IDS };
