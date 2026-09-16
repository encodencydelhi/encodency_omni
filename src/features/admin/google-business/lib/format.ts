import { differenceInMinutes, format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import type { Address, Maybe, RegularHours } from "../types";
import { DAY_SHORT } from "./constants";

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
  return value === null ? DASH : Math.round(value).toLocaleString("en-IN");
}

export function percent(value: Maybe<number>, digits = 1): string {
  return value === null ? DASH : `${value.toFixed(digits)}%`;
}

export function rating(value: Maybe<number>): string {
  return value === null ? DASH : value.toFixed(1);
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

export function fileSize(bytes: Maybe<number>): string {
  if (bytes === null) return DASH;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatAddress(address: Address, { short = false } = {}): string {
  const lines = [...address.addressLines, address.locality, address.administrativeArea, address.postalCode].filter(Boolean);
  return short ? [address.addressLines[0], address.locality].filter(Boolean).join(", ") : lines.join(", ");
}

/** "09:00" to "9:00 AM" without pulling a date object through the UI. */
export function timeLabel(value: string): string {
  const [h = "0", m = "00"] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

/** Condenses regular hours into lines like "Mon-Fri 9:00 AM - 6:00 PM". */
export function summarizeHours(hours: RegularHours): string[] {
  const byDay = new Map<number, string[]>();
  for (const period of hours.periods) {
    byDay.set(period.day, [...(byDay.get(period.day) ?? []), `${timeLabel(period.open)} - ${timeLabel(period.close)}`]);
  }
  const describe = (day: number) => (hours.open24.includes(day) ? "Open 24 hours" : (byDay.get(day) ?? []).join(", ") || "Closed");

  const lines: string[] = [];
  let start = 0;
  for (let day = 1; day <= 7; day++) {
    if (day === 7 || describe(day) !== describe(start)) {
      const range = start === day - 1 ? DAY_SHORT[start] : `${DAY_SHORT[start]}-${DAY_SHORT[day - 1]}`;
      lines.push(`${range} ${describe(start)}`);
      start = day;
    }
  }
  return lines;
}

export function pluralize(count: number, noun: string, plural = `${noun}s`) {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? noun : plural}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
