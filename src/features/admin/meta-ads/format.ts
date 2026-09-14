import type { EntityStatus, Metrics } from "./types";

/**
 * Meta Ads Manager formatting. The ad account bills in INR, so money uses
 * Indian digit grouping (₹1,24,532) everywhere in the workspace.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const indianNumber = new Intl.NumberFormat("en-IN");

/** Money is stored in paise. */
export function money(paise: number): string {
  return inr.format(paise / 100);
}

export function moneyPrecise(paise: number): string {
  return inrPrecise.format(paise / 100);
}

export function num(value: number): string {
  return indianNumber.format(Math.round(value));
}

export function compactNum(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return indianNumber.format(Math.round(value));
}

export function pct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export const ctr = (m: Metrics) =>
  m.impressions ? (m.clicks / m.impressions) * 100 : 0;

export const cpl = (m: Metrics) => (m.leads ? m.spend / m.leads : 0);

export const cpc = (m: Metrics) => (m.clicks ? m.spend / m.clicks : 0);

export const conversionRate = (m: Metrics) =>
  m.clicks ? (m.leads / m.clicks) * 100 : 0;

export const frequency = (m: Metrics) =>
  m.reach ? m.impressions / m.reach : 0;

export const orDash = (value: number, render: (v: number) => string) =>
  value > 0 ? render(value) : "—";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const TIME = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export const date = (iso: string) => DATE.format(new Date(iso));
export const dateTime = (iso: string) => DATE_TIME.format(new Date(iso));
export const time = (iso: string) => TIME.format(new Date(iso));

/**
 * The dataset is pinned to a demo "today" so relative labels stay stable
 * instead of drifting to "8 months ago" as real time passes.
 */
export const DEMO_NOW = new Date("2026-09-14T15:00:00+05:30").getTime();

export function relative(iso: string, now: number = DEMO_NOW): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return date(iso);
}

/* ------------------------------------------------------------------ */
/* Status vocabulary — one set of labels and colours for every page.    */
/* ------------------------------------------------------------------ */

export const STATUS_LABEL: Record<EntityStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  scheduled: "Scheduled",
  active: "Active",
  learning: "Learning",
  paused: "Paused",
  completed: "Completed",
  rejected: "Rejected",
  error: "Error",
  archived: "Archived",
};

export type StatusTone = "green" | "blue" | "amber" | "red" | "slate" | "violet";

export const STATUS_TONE: Record<EntityStatus, StatusTone> = {
  draft: "slate",
  in_review: "amber",
  scheduled: "blue",
  active: "green",
  learning: "violet",
  paused: "amber",
  completed: "slate",
  rejected: "red",
  error: "red",
  archived: "slate",
};

/** What Meta would show in the Delivery column for a given status. */
export const DELIVERY_LABEL: Record<EntityStatus, string> = {
  draft: "Not delivering",
  in_review: "Pending review",
  scheduled: "Scheduled",
  active: "Delivering",
  learning: "Learning",
  paused: "Paused",
  completed: "Completed",
  rejected: "Rejected",
  error: "Error",
  archived: "Archived",
};

export const TONE_CLASS: Record<StatusTone, { chip: string; dot: string; text: string }> = {
  green: { chip: "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold", dot: "bg-emerald-500", text: "text-emerald-700" },
  blue: { chip: "border-blue-300 bg-blue-50 text-blue-800 font-semibold", dot: "bg-blue-600", text: "text-blue-700" },
  amber: { chip: "border-amber-300 bg-amber-50 text-amber-900 font-semibold", dot: "bg-amber-500", text: "text-amber-800" },
  red: { chip: "border-rose-300 bg-rose-50 text-rose-900 font-semibold", dot: "bg-rose-500", text: "text-rose-700" },
  slate: { chip: "border-slate-300 bg-slate-100 text-slate-800 font-semibold", dot: "bg-slate-500", text: "text-slate-700" },
  violet: { chip: "border-purple-300 bg-purple-50 text-purple-900 font-semibold", dot: "bg-purple-600", text: "text-purple-700" },
};

export const LEAD_STAGE_TONE: Record<string, StatusTone> = {
  New: "blue",
  Contacted: "violet",
  Qualified: "green",
  "Meeting Scheduled": "amber",
  Converted: "green",
  Lost: "slate",
  Spam: "red",
};

export function scoreTone(score: number): StatusTone {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}
