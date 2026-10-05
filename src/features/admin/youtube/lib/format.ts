import { differenceInMinutes, format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import type { Maybe, MetricKey } from "../types";

export const DASH = "—";

export function compact(value: Maybe<number>): string {
  if (value === null || Number.isNaN(value)) return DASH;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(value / 1_000)}K`;
  return Math.round(value).toLocaleString("en-IN");
}

function trim(n: number) {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
}

export function full(value: Maybe<number>): string {
  if (value === null) return DASH;
  return Math.round(value).toLocaleString("en-IN");
}

export function percent(value: Maybe<number>, digits = 1): string {
  if (value === null) return DASH;
  return `${value.toFixed(digits)}%`;
}

export function duration(seconds: Maybe<number>): string {
  if (seconds === null) return DASH;
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Watch time. The input is in hours (the API's minutes are converted once in the mapper); under an hour it is shown in minutes so small numbers don't round to "0 hrs". */
export function hours(value: Maybe<number>): string {
  if (value === null || Number.isNaN(value)) return DASH;
  const minutes = value * 60;
  if (minutes < 60) {
    if (minutes > 0 && minutes < 0.5) return "<1 min";
    return `${Math.round(minutes)} min`;
  }
  // One decimal under 100 hours (compact() would round 1.5 up to 2); thousands abbreviate like the other counters.
  return `${value < 100 ? trim(value) : compact(value)} hrs`;
}

/** Amounts are shown in the currency YouTube reported them in (ISO 4217); there is no hardcoded currency. */
export function money(value: Maybe<number>, currency: string, digits = 0): string {
  if (value === null || Number.isNaN(value)) return DASH;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  } catch {
    return `${value.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${currency}`;
  }
}

function toDate(iso: Maybe<string>) {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

export function date(iso: Maybe<string>, pattern = "MMM d, yyyy"): string {
  const d = toDate(iso);
  return d ? format(d, pattern) : DASH;
}

export function dateTime(iso: Maybe<string>): string {
  return date(iso, "MMM d, yyyy · h:mm a");
}

export function relative(iso: Maybe<string>): string {
  const d = toDate(iso);
  if (!d) return DASH;
  if (Math.abs(differenceInMinutes(new Date(), d)) < 1) return "just now";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function changePct(current: Maybe<number>, previous: Maybe<number>): Maybe<number> {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatMetric(key: MetricKey, value: Maybe<number>): string {
  switch (key) {
    case "watchTime":
      return hours(value);
    case "avgViewDuration":
      return duration(value);
    default:
      return compact(value);
  }
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function pluralize(count: number, noun: string, plural = `${noun}s`) {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? noun : plural}`;
}
