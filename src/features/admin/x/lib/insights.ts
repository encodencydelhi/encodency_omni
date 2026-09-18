/**
 * OmniPlatform-computed scores and recommendations.
 *
 * None of this comes from X. Every surface that renders it carries the
 * "OmniPlatform" badge so nobody mistakes an internal heuristic for a
 * platform-reported metric.
 */

import { differenceInDays, parseISO, subDays } from "date-fns";
import { xRoutes } from "./constants";
import {
  countMentions,
  engagementRate,
  failedPosts,
  performanceByHour,
  performanceByWeekday,
  scheduledPosts,
} from "../x-data/selectors";
import type { ConnectionInfo, XAccount, XMention, XPost } from "../x-data/types";

export interface HealthFactor {
  key: string;
  label: string;
  score: number;
  /** What the number is measuring, in plain words. */
  explanation: string;
  recommendation: string;
  action?: { label: string; href: string };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function accountHealth(
  account: XAccount,
  posts: XPost[],
  mentions: XMention[],
  connection: ConnectionInfo,
): { score: number; factors: HealthFactor[] } {
  const published = posts.filter((p) => p.status === "published");
  const recent = published.filter((p) => p.publishedAt && parseISO(p.publishedAt) > subDays(new Date(), 30));
  const failed = failedPosts(posts);
  const queue = scheduledPosts(posts);
  const counts = countMentions(mentions);

  const connectionScore =
    connection.state === "connected"
      ? 100
      : connection.state === "syncing"
        ? 95
        : connection.state === "sync_failed" || connection.state === "rate_limited"
          ? 60
          : connection.state === "missing_permission"
            ? 45
            : connection.state === "disconnected"
              ? 0
              : 25;

  const profileParts = [
    account.bio.length > 60,
    Boolean(account.website),
    Boolean(account.location),
    Boolean(account.bannerUrl),
    Boolean(account.avatarUrl),
    account.verified !== "none",
  ];

  // 12 posts in 30 days (~3/week) is the cadence this account performs best at.
  const consistencyTarget = 12;

  const answered = mentions.filter((m) => m.status === "replied" || m.status === "resolved").length;
  const actionable = mentions.filter((m) => m.status !== "ignored").length;

  const daysCovered = queue.length
    ? Math.max(...queue.map((p) => differenceInDays(parseISO(p.scheduledAt!), new Date())))
    : 0;

  const factors: HealthFactor[] = [
    {
      key: "connection",
      label: "Connection",
      score: connectionScore,
      explanation:
        connection.state === "connected"
          ? "The X account is connected and syncing on schedule."
          : `The connection is currently "${connection.state.replace(/_/g, " ")}", which limits what the workspace can do.`,
      recommendation:
        connectionScore === 100
          ? "Nothing to do — keep an eye on the sync log."
          : "Reconnect the account so publishing, replies and sync resume.",
      action: { label: "Connection settings", href: `${xRoutes.settings}#connection` },
    },
    {
      key: "profile",
      label: "Profile completeness",
      score: clamp((profileParts.filter(Boolean).length / profileParts.length) * 100),
      explanation: `${profileParts.filter(Boolean).length} of ${profileParts.length} profile fields are filled in — bio, website, location, header, avatar and verification.`,
      recommendation:
        profileParts.every(Boolean)
          ? "Profile is complete. Refresh the header image when campaigns change."
          : "Fill in the remaining profile fields — visitors from a post decide in seconds.",
      action: { label: "View on X", href: xRoutes.profileOnX(account.handle) },
    },
    {
      key: "consistency",
      label: "Posting consistency",
      score: clamp((recent.length / consistencyTarget) * 100),
      explanation: `${recent.length} post${recent.length === 1 ? "" : "s"} published in the last 30 days. Accounts this size hold attention best at around ${consistencyTarget}.`,
      recommendation:
        recent.length >= consistencyTarget
          ? "Good cadence — keep it steady rather than posting in bursts."
          : "Queue a few posts ahead so there is always something going out.",
      action: { label: "Open scheduling", href: xRoutes.scheduling },
    },
    {
      key: "reply",
      label: "Reply rate",
      score: clamp(actionable ? (answered / actionable) * 100 : 100),
      explanation: `${answered} of ${actionable} mentions have had a reply or been resolved.`,
      recommendation:
        counts.unanswered === 0
          ? "Inbox is clear. Keep the response time under a few hours where you can."
          : `${counts.unanswered} mention${counts.unanswered === 1 ? "" : "s"} still need a reply.`,
      action: { label: "Open inbox", href: `${xRoutes.mentions}?status=unanswered` },
    },
    {
      key: "failures",
      label: "Failed posts",
      score: clamp(100 - failed.length * 25),
      explanation: failed.length
        ? `${failed.length} post${failed.length === 1 ? "" : "s"} failed to publish and ${failed.length === 1 ? "is" : "are"} still unresolved.`
        : "No posts have failed to publish.",
      recommendation: failed.length
        ? "Fix the cause and retry, or discard the post so it stops counting against the queue."
        : "Nothing to do.",
      action: { label: "Review failures", href: `${xRoutes.scheduling}?view=failed` },
    },
    {
      key: "queue",
      label: "Scheduled queue health",
      score: clamp(queue.length === 0 ? 20 : Math.min(100, 40 + daysCovered * 8)),
      explanation: queue.length
        ? `${queue.length} post${queue.length === 1 ? "" : "s"} queued, covering the next ${Math.max(daysCovered, 1)} day${daysCovered === 1 ? "" : "s"}.`
        : "Nothing is scheduled, so the account goes quiet as soon as today's post is out.",
      recommendation:
        daysCovered >= 7
          ? "A week of runway is healthy. Check for crowded slots before adding more."
          : "Build at least a week of runway so a busy day never means a silent account.",
      action: { label: "Open queue", href: `${xRoutes.scheduling}?view=queue` },
    },
  ];

  return { score: clamp(factors.reduce((sum, f) => sum + f.score, 0) / factors.length), factors };
}

export function scoreTone(score: number): "green" | "amber" | "red" {
  return score >= 80 ? "green" : score >= 60 ? "amber" : "red";
}

/* ------------------------------------------------------------------ */
/* Posting-time recommendations                                        */
/* ------------------------------------------------------------------ */

export interface TimingInsight {
  bestDays: string[];
  bestHours: string[];
  byDay: { label: string; value: number }[];
  byHour: { label: string; value: number }[];
  /** One-line summary for the recommendation strip. */
  headline: string;
}

export function timingInsight(posts: XPost[]): TimingInsight {
  const byDay = performanceByWeekday(posts).map((row) => ({ label: row.label, value: row.engagementRate }));
  const byHour = performanceByHour(posts).map((row) => ({ label: row.label, value: row.engagementRate }));

  const bestDays = [...byDay].sort((a, b) => b.value - a.value).slice(0, 2).map((d) => d.label);
  const bestHours = [...byHour].sort((a, b) => b.value - a.value).slice(0, 2).map((h) => h.label);

  const headline = bestDays.length
    ? `Your posts have done best on ${bestDays.join(" and ")}, around ${bestHours[0] ?? "the evening"}.`
    : "Not enough published posts yet to recommend a posting time.";

  return { bestDays, bestHours, byDay, byHour, headline };
}

/* ------------------------------------------------------------------ */
/* Content recommendations                                             */
/* ------------------------------------------------------------------ */

export interface ContentInsight {
  id: string;
  title: string;
  detail: string;
}

/** Observations about what is working, derived only from the posts on hand. */
export function contentInsights(posts: XPost[]): ContentInsight[] {
  const published = posts.filter((p) => p.status === "published" && p.metrics.impressions > 0);
  if (published.length < 4) return [];

  const insights: ContentInsight[] = [];
  const average = published.reduce((sum, p) => sum + engagementRate(p), 0) / published.length;

  const withMedia = published.filter((p) => p.media.length > 0);
  const withoutMedia = published.filter((p) => p.media.length === 0);
  if (withMedia.length >= 2 && withoutMedia.length >= 2) {
    const mediaRate = withMedia.reduce((sum, p) => sum + engagementRate(p), 0) / withMedia.length;
    const plainRate = withoutMedia.reduce((sum, p) => sum + engagementRate(p), 0) / withoutMedia.length;
    const delta = ((mediaRate - plainRate) / Math.max(plainRate, 0.01)) * 100;
    if (Math.abs(delta) > 12) {
      insights.push({
        id: "media",
        title: delta > 0 ? "Posts with media outperform plain text" : "Plain text is outperforming media",
        detail:
          delta > 0
            ? `Posts with an image or video average ${mediaRate.toFixed(2)}% engagement against ${plainRate.toFixed(2)}% for text-only posts.`
            : `Text-only posts average ${plainRate.toFixed(2)}% engagement against ${mediaRate.toFixed(2)}% for posts with media — worth testing fewer stock images.`,
      });
    }
  }

  const threads = published.filter((p) => p.type === "thread");
  if (threads.length) {
    const threadRate = threads.reduce((sum, p) => sum + engagementRate(p), 0) / threads.length;
    if (threadRate > average * 1.15) {
      insights.push({
        id: "threads",
        title: "Threads are your strongest format",
        detail: `Threads average ${threadRate.toFixed(2)}% engagement against an account average of ${average.toFixed(2)}%.`,
      });
    }
  }

  const links = published.filter((p) => p.linkUrl);
  if (links.length >= 2) {
    const clickRate = links.reduce((sum, p) => sum + p.metrics.linkClicks / Math.max(p.metrics.impressions, 1), 0) / links.length;
    insights.push({
      id: "links",
      title: "Link performance",
      detail: `Posts with a link are clicked by ${(clickRate * 100).toFixed(2)}% of the accounts that see them. Keep the link on its own line.`,
    });
  }

  return insights.slice(0, 3);
}
