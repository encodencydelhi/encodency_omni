/**
 * The shared configuration resolver.
 *
 * Conceptually: mandatory platform policy -> platform default -> permitted
 * company override -> permitted user preference. But a setting does not use every
 * layer - its definition says which apply - so this is deliberately not an object
 * spread. A company may replace a timezone but may only strengthen an MFA minimum,
 * and platform identity ignores overrides entirely.
 */
import { validateSetting } from "./validators";
import { SETTING_BY_KEY } from "./registry";
import type { ChangeDirection, GlobalSettingDefinition, NewCompanyDefaults, SettingValue, SettingValues } from "./types";

export type ConfigSource = "platform_minimum" | "platform_default" | "company_override" | "user_preference";

export interface ResolvedSetting {
  key: string;
  value: SettingValue;
  source: ConfigSource;
  /** Layers that were offered but not honoured, with the reason. */
  ignored: Array<{ layer: "company" | "user"; reason: string }>;
}

export interface OverrideLayers {
  company?: SettingValue;
  user?: SettingValue;
}

/** Is `candidate` at least as strict as `baseline` for this setting? `null` when strictness is not defined. */
export function isAtLeastAsStrict(definition: GlobalSettingDefinition, candidate: SettingValue, baseline: SettingValue): boolean | null {
  switch (definition.strictness) {
    case "higher_is_stricter":
      return typeof candidate === "boolean" && typeof baseline === "boolean" ? Number(candidate) >= Number(baseline) : Number(candidate) >= Number(baseline);
    case "lower_is_stricter":
      return Number(candidate) <= Number(baseline);
    case "option_order": {
      const order = definition.options?.map((option) => option.value) ?? [];
      const a = order.indexOf(String(candidate));
      const b = order.indexOf(String(baseline));
      return a < 0 || b < 0 ? null : a >= b;
    }
    default:
      return null;
  }
}

/** Whether moving from `previous` to `next` tightens or loosens a policy. */
export function changeDirection(definition: GlobalSettingDefinition, previous: SettingValue, next: SettingValue): ChangeDirection {
  if (!definition.strictness || previous === next) return "neutral";
  const nextIsStricter = isAtLeastAsStrict(definition, next, previous);
  const prevIsStricter = isAtLeastAsStrict(definition, previous, next);
  if (nextIsStricter === null || prevIsStricter === null) return "neutral";
  if (nextIsStricter && !prevIsStricter) return "stricter";
  if (prevIsStricter && !nextIsStricter) return "weaker";
  return "neutral";
}

export function resolveSetting(definition: GlobalSettingDefinition, platform: SettingValues, layers: OverrideLayers = {}): ResolvedSetting {
  const base = platform[definition.key] ?? definition.defaultValue;
  const baseSource: ConfigSource = definition.policyKind === "mandatory_minimum" ? "platform_minimum" : "platform_default";
  const ignored: ResolvedSetting["ignored"] = [];
  let value = base;
  let source: ConfigSource = baseSource;

  const refuse = (layer: "company" | "user", reason: string) => ignored.push({ layer, reason });
  const offered = (["company", "user"] as const).filter((layer) => layers[layer] !== undefined);

  if (definition.override === "not_allowed" || definition.override === "not_applicable") {
    for (const layer of offered) refuse(layer, "This setting cannot be overridden.");
    return { key: definition.key, value, source, ignored };
  }

  if (definition.overrideGate && platform[definition.overrideGate] !== true) {
    for (const layer of offered) refuse(layer, "Company customisation of this setting is switched off in Access & Governance.");
    return { key: definition.key, value, source, ignored };
  }

  if (definition.override === "stricter_only") {
    // Only a company layer exists for policies a company may tighten.
    if (layers.user !== undefined) refuse("user", "Individual users cannot change a platform policy.");
    if (layers.company !== undefined) {
      const invalid = validateSetting(definition, layers.company);
      if (invalid) refuse("company", invalid);
      else if (isAtLeastAsStrict(definition, layers.company, base) === false) refuse("company", "Weaker than the platform minimum. A company may only strengthen it.");
      else if (layers.company !== base) {
        value = layers.company;
        source = "company_override";
      }
    }
    return { key: definition.key, value, source, ignored };
  }

  // "allowed": company replaces the platform default; a permitted user preference replaces that.
  for (const layer of ["company", "user"] as const) {
    const candidate = layers[layer];
    if (candidate === undefined) continue;
    const invalid = validateSetting(definition, candidate);
    if (invalid) {
      refuse(layer, invalid);
      continue;
    }
    value = candidate;
    source = layer === "company" ? "company_override" : "user_preference";
  }
  return { key: definition.key, value, source, ignored };
}

/** Resolves several settings at once from per-key override layers. */
export function resolveEffectiveConfiguration(platform: SettingValues, overrides: Record<string, OverrideLayers> = {}): Record<string, ResolvedSetting> {
  const result: Record<string, ResolvedSetting> = {};
  for (const [key, layers] of Object.entries(overrides)) {
    const definition = SETTING_BY_KEY.get(key);
    if (definition) result[key] = resolveSetting(definition, platform, layers);
  }
  return result;
}

/** Whether a company may currently replace this setting's platform value. */
export function companyMayOverride(definition: GlobalSettingDefinition, platform: SettingValues): boolean {
  if (definition.override === "not_allowed" || definition.override === "not_applicable") return false;
  return !definition.overrideGate || platform[definition.overrideGate] === true;
}

/* ------------------------------------------------------------------ */
/* New-company defaults                                                */
/* ------------------------------------------------------------------ */

const LANGUAGE_BY_PREFIX: Record<string, string> = { en: "English", hi: "Hindi", es: "Spanish", fr: "French", de: "German", ar: "Arabic" };

export function languageFromLocale(locale: string): string {
  return LANGUAGE_BY_PREFIX[locale.split("-")[0] ?? ""] ?? "English";
}

/** What a company created right now starts with. Existing companies are never touched. */
export function resolveNewCompanyDefaults(values: SettingValues, versionLabel: string): NewCompanyDefaults {
  const text = (key: string) => String(values[key] ?? SETTING_BY_KEY.get(key)?.defaultValue ?? "");
  return {
    timezone: values["onboarding.timezone_source"] === "configured" ? text("onboarding.configured_timezone") : text("localization.default_timezone"),
    language: values["onboarding.language_source"] === "configured" ? text("onboarding.configured_language") : languageFromLocale(text("localization.default_locale")),
    currency: values["onboarding.currency_source"] === "configured" ? text("onboarding.configured_currency") : text("localization.display_currency"),
    region: text("onboarding.default_workspace_region"),
    accountStatus: "active",
    ownerInviteExpiryDays: Number(values["onboarding.owner_invite_expiry_days"] ?? 7),
    memberInviteExpiryDays: Number(values["onboarding.member_invite_expiry_days"] ?? 14),
    configurationVersion: versionLabel,
  };
}
