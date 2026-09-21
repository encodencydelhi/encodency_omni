/**
 * Formatting, locale data and previews. Pure and deterministic: every preview is
 * computed from the selected settings and a fixed example instant, never from a
 * running clock, so it cannot be mistaken for the live time.
 */
import { relativeTime } from "@/features/companies/data/clock";
import { PREVIEW_AMOUNT, PREVIEW_TIMESTAMP, UNIT_LABEL } from "./config";
import { SETTING_BY_KEY } from "./registry";
import { titleCase } from "./text";
import type { AssetValue, GlobalSettingDefinition, LegalDocValue, SettingOption, SettingValue } from "./types";

/* ------------------------------------------------------------------ */
/* Locale data                                                         */
/* ------------------------------------------------------------------ */

/** Valid IANA identifiers only. Ambiguous abbreviations such as "IST" are deliberately absent. */
export const TIMEZONE_IDS = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Jakarta",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Warsaw",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
] as const;

export const LOCALE_OPTIONS: readonly SettingOption[] = [
  { value: "en-IN", label: "English (India) - En-IN" },
  { value: "en-US", label: "English (United States) - En-US" },
  { value: "en-GB", label: "English (United Kingdom) - En-GB" },
  { value: "en-AU", label: "English (Australia) - En-AU" },
  { value: "en-CA", label: "English (Canada) - En-CA" },
  { value: "hi-IN", label: "Hindi (India) - Hi-IN" },
  { value: "de-DE", label: "German (Germany) - De-DE" },
  { value: "fr-FR", label: "French (France) - Fr-FR" },
  { value: "es-ES", label: "Spanish (Spain) - Es-ES" },
  { value: "pt-BR", label: "Portuguese (Brazil) - Pt-BR" },
  { value: "ar-AE", label: "Arabic (UAE) - Ar-AE" },
  { value: "ja-JP", label: "Japanese (Japan) - Ja-JP" },
];

export function isValidTimezone(value: string): boolean {
  if (!value || /^[A-Z]{2,5}$/.test(value) && value !== "UTC") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isValidLocale(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length === 1 && value.includes("-");
  } catch {
    return false;
  }
}

/** "UTC+05:30" for an IANA zone at the fixed example instant. */
export function timezoneOffset(timezone: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" })
      .formatToParts(new Date(PREVIEW_TIMESTAMP))
      .find((item) => item.type === "timeZoneName")?.value;
    if (!part) return "UTC";
    return part === "GMT" ? "UTC+00:00" : part.replace("GMT", "UTC");
  } catch {
    return "";
  }
}

export const TIMEZONE_OPTIONS: readonly SettingOption[] = TIMEZONE_IDS.map((id) => ({ value: id, label: `${id} (${timezoneOffset(id)})` }));

/* ------------------------------------------------------------------ */
/* Date, time and currency previews                                    */
/* ------------------------------------------------------------------ */

export interface RegionalSample {
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
}

function safeFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDatePreview(sample: RegionalSample, iso: string = PREVIEW_TIMESTAMP): string {
  const date = new Date(iso);
  const numeric = safeFormatter("en-US", { timeZone: sample.timezone, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(date);
  const pick = (list: Intl.DateTimeFormatPart[], type: string) => list.find((item) => item.type === type)?.value ?? "";
  const [dd, mm, yyyy] = [pick(numeric, "day"), pick(numeric, "month"), pick(numeric, "year")];
  // Abbreviations are fixed (not ICU-derived) so "Sep" never becomes "Sept" in some locales.
  const month = MONTHS[Number(mm) - 1] ?? mm;
  switch (sample.dateFormat) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    default:
      return `${dd} ${month} ${yyyy}`;
  }
}

export function formatTimePreview(sample: RegionalSample, iso: string = PREVIEW_TIMESTAMP): string {
  const twelve = sample.timeFormat !== "24h";
  const parts = safeFormatter("en-US", { timeZone: sample.timezone, hour: "2-digit", minute: "2-digit", hour12: twelve, hourCycle: twelve ? "h12" : "h23" }).formatToParts(new Date(iso));
  const pick = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const clock = `${pick("hour")}:${pick("minute")}`;
  return twelve ? `${clock} ${pick("dayPeriod").toUpperCase()}` : clock;
}

export function weekdayPreview(first: string): string[] {
  const order = first === "sunday" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : first === "saturday" ? ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return order;
}

export interface CurrencySample {
  currency: string;
  locale: string;
  display: string;
}

export function formatCurrencyPreview(sample: CurrencySample, amount: number = PREVIEW_AMOUNT): string {
  const currencyDisplay = sample.display === "code" ? "code" : sample.display === "name" ? "name" : "symbol";
  try {
    return new Intl.NumberFormat(sample.locale, { style: "currency", currency: sample.currency, currencyDisplay }).format(amount);
  } catch {
    return `${sample.currency} ${amount.toFixed(2)}`;
  }
}

export function separatorsOf(locale: string): { group: string; decimal: string } {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(PREVIEW_AMOUNT);
    return { group: parts.find((item) => item.type === "group")?.value ?? "", decimal: parts.find((item) => item.type === "decimal")?.value ?? "." };
  } catch {
    return { group: ",", decimal: "." };
  }
}

/** An ISO instant shown as UTC, e.g. "13 Sep 2026, 08:30 PM UTC". */
export function formatUtc(iso: string): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "Not Set";
  const sample: RegionalSample = { timezone: "UTC", locale: "en-US", dateFormat: "DD MMM YYYY", timeFormat: "12h" };
  return `${formatDatePreview(sample, iso)}, ${formatTimePreview(sample, iso)} UTC`;
}

/** The same instant in a platform timezone with the platform's date and time formats. */
export function formatInZone(iso: string, sample: RegionalSample): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "Not Set";
  return `${formatDatePreview(sample, iso)}, ${formatTimePreview(sample, iso)}`;
}

/* ------------------------------------------------------------------ */
/* Value text                                                          */
/* ------------------------------------------------------------------ */

export function formatDuration(value: number, unit: GlobalSettingDefinition["unit"]): string {
  if (!unit || unit === "count") return String(value);
  const labels = UNIT_LABEL[unit];
  return `${value} ${value === 1 ? labels.singular : labels.plural}`;
}

export function describeAsset(value: AssetValue): string {
  if (value.source === "default") return "Default Asset";
  if (value.source === "removed") return "Removed";
  const size = value.sizeBytes ? `${Math.max(1, Math.round(value.sizeBytes / 1024))} KB` : "size unknown";
  return `Uploaded: ${value.fileName} (${size})`;
}

export function describeLegal(value: LegalDocValue): string {
  if (!value.url && !value.version) return "Not published";
  return `v${value.version || "?"} · ${value.url || "no URL"} · ${value.status.replace(/_/g, " ")}`;
}

function optionLabel(definition: GlobalSettingDefinition, raw: string): string {
  return definition.options?.find((option) => option.value === raw)?.label ?? raw;
}

/** A short, human-readable form of a value, safe for tables, history and reviews. */
export function formatSettingValue(definition: GlobalSettingDefinition | undefined, value: SettingValue | undefined): string {
  if (value === undefined || value === null || value === "") return "Not Set";
  if (!definition) return typeof value === "object" && !Array.isArray(value) ? "Updated" : String(value);
  switch (definition.valueType) {
    case "boolean":
      return value === true ? (definition.booleanLabels?.[1] ?? "On") : (definition.booleanLabels?.[0] ?? "Off");
    case "number":
      return formatDuration(Number(value), definition.unit);
    case "select":
      return optionLabel(definition, String(value));
    case "multiselect":
      return (value as string[]).length === 0 ? "None" : (value as string[]).map((item) => optionLabel(definition, item)).join(", ");
    case "asset":
      return describeAsset(value as AssetValue);
    case "legal_document":
      return describeLegal(value as LegalDocValue);
    case "datetime":
      return formatUtc(String(value));
    case "timezone":
    case "locale":
    case "text":
    case "textarea":
    case "email":
    case "url":
    case "readonly":
    default:
      return String(value);
  }
}

export function formatKeyedValue(key: string, value: SettingValue | undefined): string {
  return formatSettingValue(SETTING_BY_KEY.get(key), value);
}

/** Removes anything that must not appear in a history record (image data). */
export function sanitizeForHistory(value: SettingValue): SettingValue {
  if (value && typeof value === "object" && !Array.isArray(value) && "dataUrl" in value) return { ...(value as AssetValue), dataUrl: null };
  return value;
}

/** Relative time in Title Case, e.g. "4 Days Ago". Evaluated against the demo clock. */
export function relativeLabel(iso: string): string {
  return titleCase(relativeTime(iso));
}
