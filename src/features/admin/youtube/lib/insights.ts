import { subDays } from "date-fns";
import { DESCRIPTION_MAX, TITLE_MAX } from "./constants";
import { hours } from "./format";
import type { Channel, Maybe, Video } from "../types";

/**
 * OmniPlatform's own scores (labelled "OmniPlatform" in the UI, never presented as YouTube metrics). Every factor is computed
 * from data that was actually loaded; a factor whose input is unavailable is left out instead of being filled with a number.
 */

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  explanation: string;
  recommendation: string;
  action?: { label: string; href: string };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface PeriodEngagement {
  views: Maybe<number>;
  likes: Maybe<number>;
  comments: Maybe<number>;
  netSubscribers: Maybe<number>;
  /** Hours, from the Analytics API. */
  watchTime: Maybe<number>;
  /** Seconds, from the Analytics API. */
  avgViewDuration: Maybe<number>;
}

export interface HealthStat {
  label: string;
  value: string;
  hint: string;
}

export function channelHealth(
  channel: Channel,
  videos: Video[],
  analytics?: { current: PeriodEngagement; previous: PeriodEngagement } | null,
): { score: number; factors: ScoreFactor[]; stats: HealthStat[] } {
  const published = videos.filter((v) => v.status === "published");
  const recent = published.filter((v) => v.publishedAt && new Date(v.publishedAt) > subDays(new Date(), 28));
  const withTags = published.filter((v) => v.tags.length >= 3 && v.description.length > 120).length;
  const profileParts = [channel.description.length > 80, Boolean(channel.bannerUrl), Boolean(channel.avatarUrl), channel.keywords.length > 0];

  const factors: ScoreFactor[] = [
    {
      key: "profile",
      label: "Profile Completeness",
      score: clamp((profileParts.filter(Boolean).length / profileParts.length) * 100),
      explanation: "Description, banner, profile picture and keywords are all set.",
      recommendation: "Keep the About section current with links to your website and donation page.",
      action: { label: "Channel Details", href: "/admin/youtube/settings#connection" },
    },
    {
      key: "consistency",
      label: "Upload Consistency",
      score: clamp((recent.length / 8) * 100),
      explanation: `${recent.length} uploads in the last 28 days. Channels of your size grow fastest with about 2 per week.`,
      recommendation: recent.length < 8 ? "Schedule uploads ahead so there's always something going out each week." : "Great cadence — keep it steady.",
      action: { label: "Schedule Content", href: "/admin/youtube/content/upload?publish=schedule" },
    },
  ];

  if (published.length > 0) {
    factors.push({
      key: "metadata",
      label: "Metadata Quality",
      score: clamp((withTags / published.length) * 100),
      explanation: `${withTags} of ${published.length} published videos have 3+ tags and a descriptive description.`,
      recommendation: "Add tags and a fuller description to videos flagged in SEO & Optimization.",
      action: { label: "Open Content", href: "/admin/youtube/content?status=published" },
    });
  }

  // Shorts and long-form reach different surfaces; a library with only one of them leaves reach on the table.
  if (published.length >= 4) {
    const shorts = published.filter((v) => v.type === "short").length;
    const share = (shorts / published.length) * 100;
    factors.push({
      key: "format",
      label: "Format Mix",
      // Best around a third Shorts: enough for discovery without losing watch time.
      score: clamp(100 - Math.abs(share - 35) * 1.6),
      explanation: `${shorts} of ${published.length} published videos are Shorts (${Math.round(share)}%).`,
      recommendation:
        share < 15
          ? "Cut a few Shorts out of existing long-form footage - they reach a different feed."
          : share > 60
            ? "Add longer videos: they carry the watch time that Shorts do not."
            : "The balance between Shorts and long-form looks healthy.",
      action: { label: "Open Content", href: "/admin/youtube/content" },
    });
  }

  if (analytics) {
    const { current: cur, previous: prev } = analytics;
    const rate = (p: PeriodEngagement) => (p.views && p.views > 0 && p.likes !== null && p.comments !== null ? (p.likes + p.comments) / p.views : null);
    const curRate = rate(cur);
    const prevRate = rate(prev);
    if (curRate !== null && prevRate !== null && prevRate > 0) {
      const change = ((curRate - prevRate) / prevRate) * 100;
      factors.push({
        key: "engagement",
        label: "Engagement Trend",
        score: clamp(60 + change * 0.5),
        explanation: `Likes and comments per view ${change >= 0 ? "rose" : "fell"} ${Math.abs(change).toFixed(1)}% versus the previous period.`,
        recommendation: "Pin a question as the first comment on new uploads to keep momentum.",
        action: { label: "View Analytics", href: "/admin/youtube/analytics?tab=engagement" },
      });
    }
    if (cur.watchTime !== null && prev.watchTime !== null && prev.watchTime > 0) {
      const change = ((cur.watchTime - prev.watchTime) / prev.watchTime) * 100;
      factors.push({
        key: "watchTime",
        label: "Watch Time Trend",
        score: clamp(60 + change * 0.5),
        explanation: `${hours(cur.watchTime)} watched, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% on the period before.`,
        recommendation: change < 0 ? "Look at which videos lost views in Analytics and make more of what held up." : "Keep publishing in the formats that are gaining watch time.",
        action: { label: "View Analytics", href: "/admin/youtube/analytics?metric=watchTime" },
      });
    }
    if (cur.avgViewDuration !== null && prev.avgViewDuration !== null && prev.avgViewDuration > 0) {
      const change = ((cur.avgViewDuration - prev.avgViewDuration) / prev.avgViewDuration) * 100;
      const mins = Math.floor(cur.avgViewDuration / 60);
      const secs = Math.round(cur.avgViewDuration % 60);
      factors.push({
        key: "duration",
        label: "Average View Duration",
        score: clamp(60 + change * 0.5),
        explanation: `Viewers stay ${mins}m ${secs}s on average, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% on the period before.`,
        recommendation: change < 0 ? "Tighten the first 30 seconds: that is where most viewers leave." : "Whatever changed in your openings is working.",
        action: { label: "View Analytics", href: "/admin/youtube/analytics?tab=engagement" },
      });
    }
    if (cur.netSubscribers !== null && prev.netSubscribers !== null) {
      const diff = cur.netSubscribers - prev.netSubscribers;
      factors.push({
        key: "growth",
        label: "Audience Growth",
        score: clamp(60 + (prev.netSubscribers > 0 ? (diff / prev.netSubscribers) * 50 : diff > 0 ? 25 : diff < 0 ? -25 : 0)),
        explanation: `Net subscribers: ${cur.netSubscribers.toLocaleString("en-IN")} this period vs ${prev.netSubscribers.toLocaleString("en-IN")} before.`,
        recommendation: "Add end screens with a subscribe element in YouTube Studio.",
        action: { label: "View Audience", href: "/admin/youtube/audience?tab=subscribers" },
      });
    }
  }

  const lastUpload = published
    .map((v) => v.publishedAt)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => b.localeCompare(a))[0];
  const viewsPerVideo = channel.viewCount !== null && published.length > 0 ? channel.viewCount / published.length : null;
  const subsPerThousand =
    analytics && analytics.current.netSubscribers !== null && analytics.current.views !== null && analytics.current.views > 0
      ? (analytics.current.netSubscribers / analytics.current.views) * 1000
      : null;

  // Plain facts from the synced channel, shown next to the score so it is not a number on its own.
  const stats: HealthStat[] = [
    {
      label: "Last Upload",
      value: lastUpload ? `${Math.max(0, Math.round((Date.now() - Date.parse(lastUpload)) / 86_400_000))}d ago` : "\u2014",
      hint: lastUpload ? `Most recent published video: ${lastUpload.slice(0, 10)}` : "Days since the most recent published video",
    },
    {
      label: "Published",
      value: published.length.toLocaleString("en-IN"),
      hint: "Public videos loaded for this channel",
    },
    {
      label: "Views / Video",
      value: viewsPerVideo === null ? "\u2014" : Math.round(viewsPerVideo).toLocaleString("en-IN"),
      hint: "Lifetime channel views divided by published videos",
    },
    {
      label: "Subs / 1k Views",
      value: subsPerThousand === null ? "\u2014" : subsPerThousand.toFixed(1),
      hint: "Net subscribers gained per 1,000 views this period",
    },
  ];

  const score = clamp(factors.reduce((s, f) => s + f.score, 0) / factors.length);
  return { score, factors, stats };
}

export function videoOptimization(video: Video, focusKeywords: string[]): { score: number; factors: ScoreFactor[] } {
  const titleLen = video.title.length;
  const descLen = video.description.length;
  const text = `${video.title} ${video.description}`.toLowerCase();
  const keywords = focusKeywords.map((k) => k.toLowerCase()).filter(Boolean);
  const keywordHits = keywords.filter((k) => text.includes(k)).length;

  const factors: ScoreFactor[] = [
    {
      key: "title",
      label: "Title Quality",
      score: titleLen < 20 ? 45 : titleLen > 70 ? 70 : 95,
      explanation: `${titleLen}/${TITLE_MAX} characters. ${titleLen > 70 ? "Titles over ~70 characters get truncated in search and suggestions." : titleLen < 20 ? "Short titles give search little to work with." : "Length fits search and suggested placements."}`,
      recommendation: titleLen > 70 ? "Front-load the key phrase and trim to under 70 characters." : titleLen < 20 ? "Describe what viewers will see, with one searchable phrase." : "No change needed.",
    },
    {
      key: "description",
      label: "Description Completeness",
      score: clamp((Math.min(descLen, 600) / 600) * 100),
      explanation: `${descLen.toLocaleString()}/${DESCRIPTION_MAX.toLocaleString()} characters. The first 150 characters appear in search results.`,
      recommendation: descLen < 250 ? "Add a 2–3 sentence summary, links and chapters (timestamps)." : "Consider adding chapters for longer videos.",
    },
    {
      key: "tags",
      label: "Tags Coverage",
      score: clamp((Math.min(video.tags.length, 8) / 8) * 100),
      explanation: `${video.tags.length} tag${video.tags.length === 1 ? "" : "s"}. Tags mainly help with common misspellings and related terms.`,
      recommendation: video.tags.length < 5 ? "Add 5–8 relevant tags including location and campaign names." : "Coverage looks good.",
    },
  ];

  if (keywords.length > 0) {
    factors.push({
      key: "keywords",
      label: "Keyword Usage",
      score: clamp((keywordHits / keywords.length) * 100),
      explanation: `Uses ${keywordHits} of ${keywords.length} channel keywords in the title or description.`,
      recommendation: "Mention the channel's core topic naturally in the first line of the description.",
    });
  }

  return { score: clamp(factors.reduce((s, f) => s + f.score, 0) / factors.length), factors };
}

export function scoreTone(score: number): "green" | "amber" | "red" {
  return score >= 80 ? "green" : score >= 60 ? "amber" : "red";
}
