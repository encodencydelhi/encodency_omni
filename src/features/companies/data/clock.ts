import { formatRelativeTime } from "@/lib/utils/format";
import { COMPANIES_MOCK_MODE, DEMO_CLOCK_ANCHOR } from "./config";

const DAY_MS = 86_400_000;
const LOADED_AT = Date.now();
export function platformNow(): number {
  return COMPANIES_MOCK_MODE ? DEMO_CLOCK_ANCHOR + (Date.now() - LOADED_AT) : Date.now();
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
