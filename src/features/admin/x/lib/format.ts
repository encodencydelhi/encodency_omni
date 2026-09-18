import { differenceInMinutes, format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { LINK_WEIGHT, POST_MAX } from "./constants";
import type { Maybe, MetricKey } from "../x-data/types";

export const DASH = "—";

export function compact(value: Maybe<number>): string {
  if (value === null || Number.isNaN(value)) return DASH;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(value / 1_000)}K`;
  return Math.round(value).toLocaleString("en-IN");
}

function trim(n: number) {
  return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
}

export function full(value: Maybe<number>): string {
  if (value === null) return DASH;
  return Math.round(value).toLocaleString("en-IN");
}

export function percent(value: Maybe<number>, digits = 1): string {
  if (value === null || Number.isNaN(value)) return DASH;
  return `${value.toFixed(digits)}%`;
}

/** Signed value for deltas that can legitimately be negative (net follower growth). */
export function signed(value: Maybe<number>): string {
  if (value === null) return DASH;
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${compact(rounded)}`;
}

export function minutes(value: Maybe<number>): string {
  if (value === null) return DASH;
  if (value < 60) return `${Math.round(value)}m`;
  const h = Math.floor(value / 60);
  const m = Math.round(value % 60);
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function seconds(value: Maybe<number>): string {
  if (value === null) return DASH;
  const s = Math.max(0, Math.round(value));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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

export function time(iso: Maybe<string>): string {
  return date(iso, "h:mm a");
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
  if (key === "engagementRate") return percent(value, 2);
  if (key === "followerGrowth") return signed(value);
  return compact(value);
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function pluralize(count: number, noun: string, plural = `${noun}s`) {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? noun : plural}`;
}

/* ------------------------------------------------------------------ */
/* Post text                                                           */
/* ------------------------------------------------------------------ */

const URL_PATTERN = /https?:\/\/[^\s]+/g;

/**
 * X counts every link as a fixed 23 characters regardless of its real length,
 * so the composer counter has to do the same or it will disagree with X.
 */
export function countCharacters(text: string): number {
  const links = text.match(URL_PATTERN) ?? [];
  const linkChars = links.reduce((sum, link) => sum + link.length, 0);
  return [...text].length - linkChars + links.length * LINK_WEIGHT;
}

export function remainingCharacters(text: string): number {
  return POST_MAX - countCharacters(text);
}

export function firstUrl(text: string): string | null {
  const match = text.match(URL_PATTERN);
  return match?.[0] ?? null;
}

export function extractHashtags(text: string): string[] {
  return (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.toLowerCase());
}

export function extractHandles(text: string): string[] {
  return (text.match(/@[A-Za-z0-9_]{1,15}/g) ?? []).map((t) => t.toLowerCase());
}

/** A single-line summary of a post for tables, drawers and confirmations. */
export function postSummary(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled post";
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Splits post text into plain/entity runs so previews can style mentions and tags. */
export type TextToken = { kind: "text" | "hashtag" | "handle" | "link"; value: string };

export function tokenize(text: string): TextToken[] {
  const pattern = /(https?:\/\/[^\s]+|#[\p{L}\p{N}_]+|@[A-Za-z0-9_]{1,15})/gu;
  const tokens: TextToken[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: "text", value: text.slice(last, index) });
    const value = match[0];
    tokens.push({
      kind: value.startsWith("#") ? "hashtag" : value.startsWith("@") ? "handle" : "link",
      value,
    });
    last = index + value.length;
  }
  if (last < text.length) tokens.push({ kind: "text", value: text.slice(last) });
  return tokens;
}
