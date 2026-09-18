/**
 * Pure derivations over the snapshot. No React, no fetching — every function
 * here takes data and returns data, so the same logic serves the mock provider
 * today and the real API later, and stays trivially testable.
 */

import {
  differenceInMinutes,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { countCharacters } from "../lib/format";
import { PRIORITY_ORDER } from "../lib/constants";
import type {
  ApprovalEvent,
  MetricKey,
  Period,
  PostStatus,
  PostType,
  Priority,
  SeriesPoint,
  XMention,
  XPost,
  XSettings,
} from "./types";

/* ------------------------------------------------------------------ */
/* Series & metrics                                                    */
/* ------------------------------------------------------------------ */

/** Rate metrics average across the window; volume metrics sum. */
export function summarize(series: SeriesPoint[], key: MetricKey): number {
  if (!series.length) return 0;
  const total = series.reduce((sum, point) => sum + point[key], 0);
  return key === "engagementRate" ? total / series.length : total;
}

export function periodDays(period: Period): number {
  return period === "7d" ? 7 : period === "90d" ? 90 : 30;
}

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

export interface PostFilters {
  search: string;
  status: PostStatus | "all";
  type: PostType | "all";
  media: "all" | "with" | "without";
  owner: string | "all";
  campaign: string | "all";
  /** Days back from today; "all" keeps everything. */
  range: "all" | "7" | "30" | "90";
}

export const DEFAULT_POST_FILTERS: PostFilters = {
  search: "",
  status: "all",
  type: "all",
  media: "all",
  owner: "all",
  campaign: "all",
  range: "all",
};

/** The date a post is "on" — published, scheduled, or last touched. */
export function postDate(post: XPost): string {
  return post.publishedAt ?? post.scheduledAt ?? post.updatedAt;
}

export function postText(post: XPost): string {
  return [post.text, ...post.thread].join(" ");
}

export function filterPosts(posts: XPost[], filters: PostFilters): XPost[] {
  const query = filters.search.trim().toLowerCase();
  const cutoff = filters.range === "all" ? null : subDays(new Date(), Number(filters.range));

  return posts.filter((post) => {
    if (filters.status !== "all" && post.status !== filters.status) return false;
    // "All" hides archived posts — they have their own tab, like a trash folder.
    if (filters.status === "all" && post.status === "archived") return false;
    if (filters.type !== "all" && post.type !== filters.type) return false;
    if (filters.media === "with" && post.media.length === 0) return false;
    if (filters.media === "without" && post.media.length > 0) return false;
    if (filters.owner !== "all" && post.ownerId !== filters.owner) return false;
    if (filters.campaign !== "all" && post.campaignId !== filters.campaign) return false;
    if (cutoff && parseISO(postDate(post)) < cutoff) return false;
    if (query) {
      const haystack = `${postText(post)} ${post.internalTags.join(" ")}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export type PostSortKey = "date" | "impressions" | "engagements" | "engagementRate" | "replies" | "reposts";

export function engagementRate(post: XPost): number {
  if (!post.metrics.impressions) return 0;
  return (post.metrics.engagements / post.metrics.impressions) * 100;
}

export function sortPosts(posts: XPost[], key: PostSortKey, dir: "asc" | "desc"): XPost[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...posts].sort((a, b) => {
    const value =
      key === "date"
        ? parseISO(postDate(a)).getTime() - parseISO(postDate(b)).getTime()
        : key === "engagementRate"
          ? engagementRate(a) - engagementRate(b)
          : a.metrics[key] - b.metrics[key];
    return value * factor;
  });
}

export function countByStatus(posts: XPost[]): Record<PostStatus | "all", number> {
  const counts: Record<string, number> = {
    all: posts.filter((p) => p.status !== "archived").length,
    published: 0,
    draft: 0,
    scheduled: 0,
    publishing: 0,
    failed: 0,
    archived: 0,
  };
  posts.forEach((post) => {
    counts[post.status] = (counts[post.status] ?? 0) + 1;
  });
  return counts as Record<PostStatus | "all", number>;
}

export function topPosts(posts: XPost[], limit: number, key: PostSortKey = "impressions"): XPost[] {
  return sortPosts(
    posts.filter((p) => p.status === "published"),
    key,
    "desc",
  ).slice(0, limit);
}

export function lowPerformingPosts(posts: XPost[], limit: number): XPost[] {
  // Only posts with enough impressions to judge — a post with 40 views is not
  // "low performing", it is just new.
  const eligible = posts.filter((p) => p.status === "published" && p.metrics.impressions > 5_000);
  return [...eligible].sort((a, b) => engagementRate(a) - engagementRate(b)).slice(0, limit);
}

export function scheduledPosts(posts: XPost[]): XPost[] {
  return posts
    .filter((p) => p.status === "scheduled" && p.scheduledAt)
    .sort((a, b) => parseISO(a.scheduledAt!).getTime() - parseISO(b.scheduledAt!).getTime());
}

export function failedPosts(posts: XPost[]): XPost[] {
  return posts
    .filter((p) => p.status === "failed")
    .sort((a, b) => parseISO(b.failure?.at ?? b.updatedAt).getTime() - parseISO(a.failure?.at ?? a.updatedAt).getTime());
}

export function postsOnDay(posts: XPost[], day: Date): XPost[] {
  return posts.filter((p) => p.scheduledAt && isSameDay(parseISO(p.scheduledAt), day));
}

/* ------------------------------------------------------------------ */
/* Content performance breakdowns                                      */
/* ------------------------------------------------------------------ */

export interface PerformanceRow {
  label: string;
  posts: number;
  impressions: number;
  engagements: number;
  engagementRate: number;
}

function summarizeGroup(label: string, group: XPost[]): PerformanceRow {
  const impressions = group.reduce((sum, p) => sum + p.metrics.impressions, 0);
  const engagements = group.reduce((sum, p) => sum + p.metrics.engagements, 0);
  return {
    label,
    posts: group.length,
    impressions,
    engagements,
    engagementRate: impressions ? (engagements / impressions) * 100 : 0,
  };
}

export function groupPerformance<K extends string>(
  posts: XPost[],
  keyOf: (post: XPost) => K | null,
  labelOf: (key: K) => string,
): PerformanceRow[] {
  const groups = new Map<K, XPost[]>();
  posts
    .filter((p) => p.status === "published")
    .forEach((post) => {
      const key = keyOf(post);
      if (key === null) return;
      groups.set(key, [...(groups.get(key) ?? []), post]);
    });
  return [...groups.entries()]
    .map(([key, group]) => summarizeGroup(labelOf(key), group))
    .sort((a, b) => b.engagementRate - a.engagementRate);
}

/** Average engagement rate per weekday (0 = Monday) for posting-time insights. */
export function performanceByWeekday(posts: XPost[]): PerformanceRow[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return groupPerformance(
    posts,
    (post) => {
      if (!post.publishedAt) return null;
      // JS weeks start on Sunday; shift so Monday is index 0.
      return String((parseISO(post.publishedAt).getDay() + 6) % 7) as `${number}`;
    },
    (key) => labels[Number(key)] ?? key,
  ).sort((a, b) => labels.indexOf(a.label) - labels.indexOf(b.label));
}

export function performanceByHour(posts: XPost[]): PerformanceRow[] {
  return groupPerformance(
    posts,
    (post) => (post.publishedAt ? String(parseISO(post.publishedAt).getHours()) : null),
    (key) => `${key.padStart(2, "0")}:00`,
  ).sort((a, b) => Number(a.label.slice(0, 2)) - Number(b.label.slice(0, 2)));
}

/* ------------------------------------------------------------------ */
/* Mentions                                                            */
/* ------------------------------------------------------------------ */

export interface MentionFilters {
  search: string;
  status: XMention["status"] | "all" | "high_priority";
  priority: Priority | "all";
  assignee: string | "all" | "unassigned";
  post: string | "all";
  range: "all" | "1" | "7" | "30";
}

export const DEFAULT_MENTION_FILTERS: MentionFilters = {
  search: "",
  status: "all",
  priority: "all",
  assignee: "all",
  post: "all",
  range: "all",
};

export function filterMentions(mentions: XMention[], filters: MentionFilters): XMention[] {
  const query = filters.search.trim().toLowerCase();
  const cutoff = filters.range === "all" ? null : subDays(new Date(), Number(filters.range));

  return mentions.filter((mention) => {
    if (filters.status === "high_priority") {
      if (mention.priority !== "high" && mention.priority !== "urgent") return false;
    } else if (filters.status !== "all" && mention.status !== filters.status) {
      return false;
    }
    // The default view hides ignored mentions — they are dismissed, not deleted.
    if (filters.status === "all" && mention.status === "ignored") return false;
    if (filters.priority !== "all" && mention.priority !== filters.priority) return false;
    if (filters.assignee === "unassigned" && mention.assigneeId) return false;
    if (filters.assignee !== "all" && filters.assignee !== "unassigned" && mention.assigneeId !== filters.assignee) return false;
    if (filters.post !== "all" && mention.relatedPostId !== filters.post) return false;
    if (cutoff && parseISO(mention.at) < cutoff) return false;
    if (query) {
      const haystack = `${mention.text} ${mention.user.name} ${mention.user.handle}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortMentions(mentions: XMention[]): XMention[] {
  // Urgent first, then oldest unanswered — the queue a human would work.
  return [...mentions].sort((a, b) => {
    const byPriority = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    if (byPriority !== 0) return byPriority;
    const aUnanswered = a.status === "unanswered" ? 0 : 1;
    const bUnanswered = b.status === "unanswered" ? 0 : 1;
    if (aUnanswered !== bUnanswered) return aUnanswered - bUnanswered;
    return parseISO(b.at).getTime() - parseISO(a.at).getTime();
  });
}

export function countMentions(mentions: XMention[]) {
  const unanswered = mentions.filter((m) => m.status === "unanswered");
  const replied = mentions.filter((m) => m.status === "replied");
  const resolved = mentions.filter((m) => m.status === "resolved");
  const ignored = mentions.filter((m) => m.status === "ignored");
  const highPriority = mentions.filter((m) => m.priority === "high" || m.priority === "urgent");
  const responded = mentions.filter((m) => m.responseMinutes !== null);
  const actionable = mentions.filter((m) => m.status !== "ignored");

  return {
    total: mentions.length,
    all: actionable.length,
    unanswered: unanswered.length,
    replied: replied.length,
    resolved: resolved.length,
    ignored: ignored.length,
    highPriority: highPriority.length,
    /** Unanswered mentions that are also high or urgent — the true backlog. */
    needsAttention: unanswered.filter((m) => m.priority === "high" || m.priority === "urgent").length,
    avgResponseMinutes: responded.length
      ? responded.reduce((sum, m) => sum + (m.responseMinutes ?? 0), 0) / responded.length
      : null,
    repliesSent: mentions.reduce((sum, m) => sum + m.conversation.filter((c) => c.isUs).length, 0),
    resolvedRate: actionable.length ? (resolved.length / actionable.length) * 100 : 0,
  };
}

/** Oldest unanswered mentions, highest priority first — for the Overview card. */
export function mentionsNeedingAttention(mentions: XMention[], limit: number): XMention[] {
  return sortMentions(mentions.filter((m) => m.status === "unanswered")).slice(0, limit);
}

export function mentionAge(mention: XMention): number {
  return differenceInMinutes(new Date(), parseISO(mention.at));
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

export function approvalHistory(approvals: ApprovalEvent[], postId: string): ApprovalEvent[] {
  return approvals
    .filter((a) => a.postId === postId)
    .sort((a, b) => parseISO(b.at).getTime() - parseISO(a.at).getTime());
}

export function awaitingApproval(posts: XPost[]): XPost[] {
  return posts.filter((p) => p.approval === "pending" && p.status !== "archived");
}

/* ------------------------------------------------------------------ */
/* Scheduling queue health                                             */
/* ------------------------------------------------------------------ */

export interface QueueInsight {
  id: string;
  tone: "amber" | "blue" | "violet";
  title: string;
  detail: string;
  action?: { label: string; href: string };
}

export interface QueueHealth {
  scheduled: number;
  failed: number;
  awaitingApproval: number;
  publishing: number;
  /** Days in the next fortnight carrying 3 or more posts. */
  overloadedDays: { date: string; count: number }[];
  /** Runs of 2+ consecutive days in the next fortnight with nothing queued. */
  gaps: { from: string; to: string; days: number }[];
  /** Pairs of posts scheduled closer together than the configured minimum gap. */
  crowded: { first: XPost; second: XPost; minutesApart: number }[];
}

export function queueHealth(posts: XPost[], settings: XSettings): QueueHealth {
  const scheduled = scheduledPosts(posts);
  const today = startOfDay(new Date());
  const horizon = 14;

  const byDay = new Map<string, XPost[]>();
  scheduled.forEach((post) => {
    const key = startOfDay(parseISO(post.scheduledAt!)).toISOString();
    byDay.set(key, [...(byDay.get(key) ?? []), post]);
  });

  const overloadedDays = [...byDay.entries()]
    .filter(([, group]) => group.length >= 3)
    .map(([date, group]) => ({ date, count: group.length }));

  const gaps: QueueHealth["gaps"] = [];
  let runStart: Date | null = null;
  for (let i = 0; i < horizon; i += 1) {
    const day = new Date(today.getTime() + i * 86_400_000);
    const empty = !byDay.has(startOfDay(day).toISOString());
    if (empty && !runStart) runStart = day;
    if ((!empty || i === horizon - 1) && runStart) {
      const end = empty ? day : new Date(day.getTime() - 86_400_000);
      const days = Math.round((end.getTime() - runStart.getTime()) / 86_400_000) + 1;
      if (days >= 2) gaps.push({ from: runStart.toISOString(), to: end.toISOString(), days });
      runStart = null;
    }
  }

  const crowded: QueueHealth["crowded"] = [];
  for (let i = 1; i < scheduled.length; i += 1) {
    const first = scheduled[i - 1]!;
    const second = scheduled[i]!;
    const apart = differenceInMinutes(parseISO(second.scheduledAt!), parseISO(first.scheduledAt!));
    if (apart < settings.publishing.minimumGapMinutes) crowded.push({ first, second, minutesApart: apart });
  }

  return {
    scheduled: scheduled.length,
    failed: posts.filter((p) => p.status === "failed").length,
    awaitingApproval: awaitingApproval(posts).length,
    publishing: posts.filter((p) => p.status === "publishing").length,
    overloadedDays,
    gaps,
    crowded,
  };
}

/* ------------------------------------------------------------------ */
/* Composer validation                                                 */
/* ------------------------------------------------------------------ */

export interface DraftShape {
  text: string;
  thread: string[];
  mode: "single" | "thread" | "poll";
  poll: { question: string; options: string[] } | null;
  media: { state: string; altText: string }[];
  scheduledAt: string | null;
  linkUrl: string | null;
}

export interface ValidationIssue {
  field: "text" | "thread" | "poll" | "media" | "schedule" | "link";
  /** Index of the offending thread part or poll option, when relevant. */
  index?: number;
  message: string;
}

/**
 * Every rule the composer enforces before it will let a post leave. Content
 * rules that are OmniPlatform's own (alt text, blocked words) are separated
 * from X's own limits so the messages can say which is which.
 */
export function validateDraft(draft: DraftShape, settings: XSettings, max: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rules = settings.contentRules;

  if (draft.mode === "poll") {
    if (!draft.poll?.question.trim()) issues.push({ field: "poll", message: "Add a question for the poll." });
    const filled = (draft.poll?.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (filled.length < 2) issues.push({ field: "poll", message: "A poll needs at least two choices." });
    (draft.poll?.options ?? []).forEach((option, index) => {
      if (index < 2 && !option.trim()) issues.push({ field: "poll", index, message: `Choice ${index + 1} can't be empty.` });
    });
    if (new Set(filled.map((f) => f.toLowerCase())).size !== filled.length) {
      issues.push({ field: "poll", message: "Poll choices must be different from each other." });
    }
    if (draft.poll && countCharacters(draft.poll.question) > max) {
      issues.push({ field: "poll", message: `The question is ${countCharacters(draft.poll.question) - max} characters over the limit.` });
    }
  } else {
    if (!draft.text.trim() && draft.media.length === 0) {
      issues.push({ field: "text", message: "Write something, or attach media, before publishing." });
    }
    if (countCharacters(draft.text) > max) {
      issues.push({ field: "text", message: `This post is ${countCharacters(draft.text) - max} characters over the limit.` });
    }
  }

  if (draft.mode === "thread") {
    draft.thread.forEach((part, index) => {
      if (!part.trim()) issues.push({ field: "thread", index, message: `Post ${index + 2} of the thread is empty.` });
      else if (countCharacters(part) > max) {
        issues.push({ field: "thread", index, message: `Post ${index + 2} is ${countCharacters(part) - max} characters over the limit.` });
      }
    });
  }

  draft.media.forEach((item, index) => {
    if (item.state === "failed") issues.push({ field: "media", index, message: "Remove or re-upload the failed attachment." });
    if (item.state === "uploading" || item.state === "processing") {
      issues.push({ field: "media", index, message: "Wait for the upload to finish." });
    }
    if (rules.requireAltText && item.state === "ready" && !item.altText.trim()) {
      issues.push({ field: "media", index, message: "Alt text is required by your workspace content rules." });
    }
  });

  if (draft.media.length > rules.maxMedia) {
    issues.push({ field: "media", message: `Your content rules allow up to ${rules.maxMedia} attachments.` });
  }

  if (draft.scheduledAt) {
    const when = parseISO(draft.scheduledAt);
    if (Number.isNaN(when.getTime())) issues.push({ field: "schedule", message: "Pick a valid date and time." });
    else if (when.getTime() < Date.now() + 60_000) {
      issues.push({ field: "schedule", message: "Pick a time at least a minute from now." });
    }
  }

  if (draft.linkUrl) {
    try {
      const url = new URL(draft.linkUrl);
      if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
      if (rules.blockShorteners && /^(bit\.ly|t\.co|tinyurl\.com|goo\.gl)$/i.test(url.hostname)) {
        issues.push({ field: "link", message: "Your content rules block link shorteners — use the full URL." });
      }
    } catch {
      issues.push({ field: "link", message: "That doesn't look like a valid URL." });
    }
  }

  const body = `${draft.text} ${draft.thread.join(" ")} ${draft.poll?.question ?? ""}`.toLowerCase();
  const blocked = rules.blockedWords.filter((word) => body.includes(word.toLowerCase()));
  if (blocked.length) {
    issues.push({ field: "text", message: `Your content rules block: ${blocked.join(", ")}.` });
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/* Attention feed                                                      */
/* ------------------------------------------------------------------ */

export type Severity = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  severity: Severity;
  title: string;
  /** What it affects, named so the user knows where to look. */
  entity: string;
  description: string;
  action: { label: string; href: string };
}

export function attentionItems(
  posts: XPost[],
  mentions: XMention[],
  connectionState: string,
  requestsUsed: number,
  requestsLimit: number,
  accountIncomplete: string[],
): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (connectionState === "token_expired" || connectionState === "needs_reconnect") {
    items.push({
      id: "connection",
      severity: "critical",
      title: "X connection needs reconnecting",
      entity: "Account connection",
      description:
        "Publishing, replies and syncing are paused. Everything on screen is from the last successful sync.",
      action: { label: "Reconnect", href: "/admin/x/settings#connection" },
    });
  }

  if (connectionState === "rate_limited") {
    items.push({
      id: "rate-limit",
      severity: "warning",
      title: "X rate limit reached",
      entity: "API usage",
      description: "Writes are paused until the current 15 minute window resets. Reading cached data is unaffected.",
      action: { label: "View usage", href: "/admin/x/settings#sync" },
    });
  } else if (requestsLimit > 0 && requestsUsed / requestsLimit >= 0.8) {
    items.push({
      id: "rate-warning",
      severity: "warning",
      title: `API usage at ${Math.round((requestsUsed / requestsLimit) * 100)}%`,
      entity: "API usage",
      description: "Bulk syncs and publishing use the most requests. Above the limit, writes pause until the window resets.",
      action: { label: "View usage", href: "/admin/x/settings#sync" },
    });
  }

  const failed = failedPosts(posts);
  const mediaFailures = failed.filter((p) => p.failure?.code === "media_processing");
  if (mediaFailures.length) {
    items.push({
      id: "media-failed",
      severity: "critical",
      title: `Media upload failed on ${mediaFailures.length} post${mediaFailures.length === 1 ? "" : "s"}`,
      entity: mediaFailures[0]!.text.slice(0, 40) || "Untitled post",
      description: "X could not process the attached file, so the post never went out.",
      action: { label: "Review", href: "/admin/x/scheduling?view=failed" },
    });
  }

  const otherFailures = failed.filter((p) => p.failure?.code !== "media_processing");
  if (otherFailures.length) {
    items.push({
      id: "posts-failed",
      severity: "critical",
      title: `${otherFailures.length} scheduled post${otherFailures.length === 1 ? "" : "s"} failed to publish`,
      entity: otherFailures[0]!.text.slice(0, 40) || "Untitled post",
      description: "These posts are still in the queue and can be retried once the cause is fixed.",
      action: { label: "Retry failed", href: "/admin/x/scheduling?view=failed" },
    });
  }

  const counts = countMentions(mentions);
  if (counts.needsAttention > 0) {
    items.push({
      id: "mentions",
      severity: counts.needsAttention >= 3 ? "critical" : "warning",
      title: `${counts.needsAttention} high-priority mention${counts.needsAttention === 1 ? "" : "s"} unanswered`,
      entity: "Engagement inbox",
      description: "Mentions marked high or urgent that nobody has replied to yet.",
      action: { label: "Open inbox", href: "/admin/x/mentions?status=unanswered" },
    });
  }

  const pending = awaitingApproval(posts);
  if (pending.length) {
    items.push({
      id: "approvals",
      severity: "warning",
      title: `${pending.length} post${pending.length === 1 ? "" : "s"} waiting for approval`,
      entity: "Approval queue",
      description: "Scheduled posts will not publish until a reviewer approves them.",
      action: { label: "Review", href: "/admin/x/content?approval=pending" },
    });
  }

  if (accountIncomplete.length) {
    items.push({
      id: "profile",
      severity: "info",
      title: "Profile data is incomplete",
      entity: `Missing: ${accountIncomplete.join(", ")}`,
      description: "A complete profile converts more of the people who visit it from a post.",
      action: { label: "View on X", href: "/admin/x/settings#connection" },
    });
  }

  const order: Severity[] = ["critical", "warning", "info"];
  return items.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}

/* ------------------------------------------------------------------ */
/* Export helpers                                                      */
/* ------------------------------------------------------------------ */

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","))].join("\n");
}

/** Triggers a client-side download. No backend involved. */
export function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function withinPeriod(iso: string, days: number): boolean {
  return isWithinInterval(parseISO(iso), { start: subDays(new Date(), days), end: new Date() });
}
