import { subDays } from "date-fns";
import { DESCRIPTION_MAX, TITLE_MAX } from "./constants";
import type { Channel, CommentThread, Video } from "../types";

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  explanation: string;
  recommendation: string;
  action?: { label: string; href: string };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function channelHealth(channel: Channel, videos: Video[], comments: CommentThread[], monetizationEnabled: boolean): { score: number; factors: ScoreFactor[] } {
  const published = videos.filter((v) => v.status === "published");
  const recent = published.filter((v) => v.publishedAt && new Date(v.publishedAt) > subDays(new Date(), 28));
  const withCtr = published.filter((v) => v.stats.ctr !== null);
  const avgCtr = withCtr.reduce((s, v) => s + (v.stats.ctr ?? 0), 0) / Math.max(1, withCtr.length);
  const lowCtr = withCtr.filter((v) => (v.stats.ctr ?? 0) < avgCtr * 0.8).length;
  const withTags = published.filter((v) => v.tags.length >= 3 && v.description.length > 120).length;
  const answered = comments.filter((c) => c.moderationStatus === "published" && c.replies.some((r) => r.isChannelOwner)).length;
  const publishedComments = comments.filter((c) => c.moderationStatus === "published").length;
  const profileParts = [channel.description.length > 80, Boolean(channel.bannerUrl), Boolean(channel.avatarUrl), channel.keywords.length > 0, channel.isVerified];

  const factors: ScoreFactor[] = [
    {
      key: "profile",
      label: "Profile completeness",
      score: clamp((profileParts.filter(Boolean).length / profileParts.length) * 100),
      explanation: "Description, banner, profile picture, keywords and verification are all set.",
      recommendation: "Keep the About section current with links to your website and donation page.",
      action: { label: "Channel details", href: "/admin/youtube/settings#connection" },
    },
    {
      key: "consistency",
      label: "Upload consistency",
      score: clamp((recent.length / 8) * 100),
      explanation: `${recent.length} uploads in the last 28 days. Channels of your size grow fastest with about 2 per week.`,
      recommendation: recent.length < 8 ? "Schedule uploads ahead so there's always something going out each week." : "Great cadence — keep it steady.",
      action: { label: "Schedule content", href: "/admin/youtube/content/upload?publish=schedule" },
    },
    {
      key: "thumbnails",
      label: "Thumbnail quality",
      score: clamp(100 - (lowCtr / Math.max(1, withCtr.length)) * 100),
      explanation: `${lowCtr} video${lowCtr === 1 ? "" : "s"} have a click-through rate well below your channel average of ${avgCtr.toFixed(1)}%.`,
      recommendation: "Thumbnail CTR below channel average → review thumbnails on the lowest-CTR videos.",
      action: { label: "Review thumbnails", href: "/admin/youtube/content?sort=ctr&dir=asc" },
    },
    {
      key: "metadata",
      label: "Metadata quality",
      score: clamp((withTags / Math.max(1, published.length)) * 100),
      explanation: `${withTags} of ${published.length} published videos have 3+ tags and a descriptive description.`,
      recommendation: "Add tags and a fuller description to videos flagged in SEO & Optimization.",
      action: { label: "Open content", href: "/admin/youtube/content?status=published" },
    },
    {
      key: "engagement",
      label: "Engagement trend",
      score: 84,
      explanation: "Likes and comments per view are up versus the previous 28 days.",
      recommendation: "Pin a question as the first comment on new uploads to keep momentum.",
      action: { label: "View analytics", href: "/admin/youtube/analytics?tab=engagement" },
    },
    {
      key: "growth",
      label: "Audience growth",
      score: 88,
      explanation: "Net subscribers grew faster than views, which suggests strong audience loyalty.",
      recommendation: "Add end screens with a subscribe element in YouTube Studio.",
      action: { label: "View audience", href: "/admin/youtube/audience?tab=subscribers" },
    },
    {
      key: "community",
      label: "Community engagement",
      score: clamp((answered / Math.max(1, publishedComments)) * 100 + 35),
      explanation: `${answered} of ${publishedComments} recent comment threads have a reply from the channel.`,
      recommendation: "Reply to unanswered comments — especially questions and volunteer requests.",
      action: { label: "Unanswered comments", href: "/admin/youtube/comments?status=unanswered" },
    },
  ];
  if (monetizationEnabled) {
    factors.push({
      key: "monetization",
      label: "Monetization eligibility",
      score: 100,
      explanation: "Channel is in the YouTube Partner Program and in good standing.",
      recommendation: "No action needed.",
      action: { label: "View monetization", href: "/admin/youtube/monetization" },
    });
  }
  const score = clamp(factors.reduce((s, f) => s + f.score, 0) / factors.length);
  return { score, factors };
}

export function videoOptimization(video: Video, channelAvgCtr: number): { score: number; factors: ScoreFactor[] } {
  const titleLen = video.title.length;
  const descLen = video.description.length;
  const keywords = ["ganga", "river", "clean", "water", "volunteer"];
  const keywordHits = keywords.filter((k) => video.title.toLowerCase().includes(k) || video.description.toLowerCase().includes(k)).length;
  const ctr = video.stats.ctr;

  const factors: ScoreFactor[] = [
    {
      key: "title",
      label: "Title quality",
      score: titleLen < 20 ? 45 : titleLen > 70 ? 70 : 95,
      explanation: `${titleLen}/${TITLE_MAX} characters. ${titleLen > 70 ? "Titles over ~70 characters get truncated in search and suggestions." : titleLen < 20 ? "Short titles give search little to work with." : "Length fits search and suggested placements."}`,
      recommendation: titleLen > 70 ? "Front-load the key phrase and trim to under 70 characters." : titleLen < 20 ? "Describe what viewers will see, with one searchable phrase." : "No change needed.",
    },
    {
      key: "description",
      label: "Description completeness",
      score: clamp((Math.min(descLen, 600) / 600) * 100),
      explanation: `${descLen.toLocaleString()}/${DESCRIPTION_MAX.toLocaleString()} characters. The first 150 characters appear in search results.`,
      recommendation: descLen < 250 ? "Add a 2–3 sentence summary, links and chapters (timestamps)." : "Consider adding chapters for longer videos.",
    },
    {
      key: "tags",
      label: "Tags coverage",
      score: clamp((Math.min(video.tags.length, 8) / 8) * 100),
      explanation: `${video.tags.length} tag${video.tags.length === 1 ? "" : "s"}. Tags mainly help with common misspellings and related terms.`,
      recommendation: video.tags.length < 5 ? "Add 5–8 relevant tags including location and campaign names." : "Coverage looks good.",
    },
    {
      key: "keywords",
      label: "Keyword usage",
      score: clamp((keywordHits / keywords.length) * 100 + 20),
      explanation: `Uses ${keywordHits} of ${keywords.length} channel focus keywords in the title or description.`,
      recommendation: "Mention the campaign's core topic naturally in the first line of the description.",
    },
    {
      key: "thumbnail",
      label: "Thumbnail quality",
      score: ctr === null ? 60 : clamp((ctr / Math.max(channelAvgCtr, 0.1)) * 75),
      explanation: ctr === null ? "Not enough impressions yet to judge thumbnail performance." : `CTR ${ctr.toFixed(1)}% vs channel average ${channelAvgCtr.toFixed(1)}%.`,
      recommendation: ctr !== null && ctr < channelAvgCtr ? "Test a thumbnail with a clear face or subject and 3–4 words of large text." : "Thumbnail is performing at or above average.",
    },
    {
      key: "ctr",
      label: "CTR trend",
      score: ctr === null ? 50 : ctr >= channelAvgCtr ? 90 : 62,
      explanation: ctr === null ? "CTR appears after the video collects impressions." : ctr >= channelAvgCtr ? "CTR is holding above your channel average." : "CTR has dipped below your channel average over the last 7 days.",
      recommendation: ctr !== null && ctr < channelAvgCtr ? "Refresh the thumbnail and re-check after 48 hours." : "Keep monitoring after thumbnail or title changes.",
    },
  ];
  return { score: clamp(factors.reduce((s, f) => s + f.score, 0) / factors.length), factors };
}

export function scoreTone(score: number): "green" | "amber" | "red" {
  return score >= 80 ? "green" : score >= 60 ? "amber" : "red";
}
