import { formatRelativeTime } from "@/lib/utils/format";
import { MOCK_NOW } from "@/mocks/lib/random";
import { COMPANIES_MOCK_MODE } from "./config";

const DAY_MS = 86_400_000;
const LOADED_AT = Date.now();

/**
 * The workspace clock.
 *
 * Demo timestamps are anchored to a fixed instant so the dataset is identical on
 * every load. The clock starts there and advances in real time, so a record
 * created during the session lands "just now" rather than ten days in the
 * future of the fixtures. A real backend replaces this with `Date.now()`.
 */
export function platformNow(): number {
  return COMPANIES_MOCK_MODE ? MOCK_NOW + (Date.now() - LOADED_AT) : Date.now();
}

export function nowIso(): string {
  return new Date(platformNow()).toISOString();
}

export function isoDaysFromNow(days: number): string {
  return new Date(platformNow() + days * DAY_MS).toISOString();
}

export function daysUntil(iso: string): number {
  return Math.ceil((Date.parse(iso) - platformNow()) / DAY_MS);
}

export function daysSince(iso: string): number {
  return Math.floor((platformNow() - Date.parse(iso)) / DAY_MS);
}

export function relativeTime(iso: string): string {
  return formatRelativeTime(iso, platformNow());
}

export function startOfMonth(offsetMonths = 0): number {
  const now = new Date(platformNow());
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1);
}
