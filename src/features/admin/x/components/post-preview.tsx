"use client";

/**
 * A familiar social-post preview: avatar, name, handle, body, media, then a
 * row of engagement placeholders. Deliberately not a pixel copy of X — it uses
 * OmniPlatform's type scale and surfaces so it reads as part of this product.
 */

import { BarChart3, Bookmark, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { compact } from "../lib/format";
import type { PostMetrics, XAccount, XMedia, XPoll } from "../x-data/types";
import { Avatar, PostText, VerifiedMark } from "./ui";

export function PostPreview({
  account,
  text,
  thread = [],
  media = [],
  poll = null,
  metrics,
  timestamp = "now",
  className,
}: {
  account: XAccount;
  text: string;
  thread?: string[];
  media?: XMedia[];
  poll?: XPoll | null;
  metrics?: PostMetrics;
  timestamp?: string;
  className?: string;
}) {
  const parts = [text, ...thread];

  return (
    <article className={cn("rounded-[10px] border border-[#E4E9F0] bg-white p-3.5", className)}>
      {parts.map((part, index) => (
        <div key={index} className={cn("flex gap-2.5", index > 0 && "mt-1")}>
          {/* Avatar column doubles as the thread connector. */}
          <div className="flex shrink-0 flex-col items-center">
            {index === 0 ? (
              <Avatar name={account.name} src={account.avatarUrl} className="size-9" />
            ) : (
              <span className="size-9 shrink-0" aria-hidden="true" />
            )}
            {index < parts.length - 1 && <span className="mt-1 w-px flex-1 bg-[#E4E9F0]" aria-hidden="true" />}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            {index === 0 && (
              <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] leading-5">
                <b className="font-semibold text-[#0F1B3D]">{account.name}</b>
                <VerifiedMark kind={account.verified} className="[&_svg]:size-3.5" />
                <span className="text-[#6B7890]">{account.handle}</span>
                <span className="text-[#C9D1DC]">·</span>
                <span className="text-[#6B7890]">{timestamp}</span>
              </p>
            )}

            <div className={cn(index === 0 ? "mt-1" : "mt-0.5")}>
              {part.trim() ? (
                <PostText text={part} className="text-[13.5px]" />
              ) : (
                <span className="text-[13px] italic text-[#98A2B3]">
                  {index === 0 ? "Your post will appear here." : `Post ${index + 1} is empty.`}
                </span>
              )}
            </div>

            {index === 0 && media.length > 0 && <MediaGrid media={media} />}
            {index === 0 && poll && <PollPreview poll={poll} />}

            {index === parts.length - 1 && <EngagementRow metrics={metrics} />}
          </div>
        </div>
      ))}
    </article>
  );
}

function MediaGrid({ media }: { media: XMedia[] }) {
  return (
    <div
      className={cn(
        "mt-2 grid gap-0.5 overflow-hidden rounded-[10px] border border-[#E4E9F0]",
        media.length === 1 ? "grid-cols-1" : media.length === 3 ? "grid-cols-2" : "grid-cols-2",
      )}
    >
      {media.map((item, index) => (
        <span
          key={item.id}
          className={cn(
            "relative block bg-[#E9EDF3]",
            media.length === 1 ? "aspect-[16/9]" : media.length === 3 && index === 0 ? "row-span-2 aspect-[9/16]" : "aspect-square",
          )}
        >
          {/* Object URLs and local paths both work with a plain img here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.altText} className="size-full object-cover" />
          {item.kind === "video" && (
            <span className="absolute bottom-1.5 left-1.5 rounded bg-[#0F1B3D]/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">Video</span>
          )}
          {!item.altText.trim() && item.state === "ready" && (
            <span className="absolute right-1.5 top-1.5 rounded bg-[#B54708]/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">No alt text</span>
          )}
        </span>
      ))}
    </div>
  );
}

function PollPreview({ poll }: { poll: XPoll }) {
  const options = poll.options.filter((option) => option.trim());
  const totalVotes = poll.votes?.reduce((sum, count) => sum + count, 0) ?? 0;

  return (
    <div className="mt-2 space-y-1.5">
      {options.length === 0 && <p className="text-[12px] italic text-[#98A2B3]">Add poll choices to see them here.</p>}
      {options.map((option, index) => {
        const votes = poll.votes?.[index] ?? 0;
        const share = totalVotes ? (votes / totalVotes) * 100 : 0;
        return (
          <div key={index} className="relative overflow-hidden rounded-sm border border-[#DCE2EA] bg-white">
            {poll.votes && <span className="absolute inset-y-0 left-0 bg-[#EFF4FF]" style={{ width: `${share}%` }} aria-hidden="true" />}
            <span className="relative flex items-center justify-between gap-2 px-2.5 py-1.5 text-[12.5px]">
              <span className="min-w-0 truncate text-[#24324F]">{option}</span>
              {poll.votes && <b className="shrink-0 font-semibold tabular-nums text-[#0F1B3D]">{share.toFixed(0)}%</b>}
            </span>
          </div>
        );
      })}
      <p className="text-[11.5px] text-[#6B7890]">
        {poll.votes ? `${compact(totalVotes)} votes · final results` : `Runs for ${formatDuration(poll.durationMinutes)}`}
      </p>
    </div>
  );
}

function formatDuration(durationMinutes: number) {
  if (durationMinutes < 60) return `${durationMinutes} minutes`;
  if (durationMinutes < 1440) return `${durationMinutes / 60} hour${durationMinutes === 60 ? "" : "s"}`;
  const days = durationMinutes / 1440;
  return `${days} day${days === 1 ? "" : "s"}`;
}

function EngagementRow({ metrics }: { metrics?: PostMetrics }) {
  const items = [
    { icon: MessageCircle, value: metrics?.replies, label: "Replies" },
    { icon: Repeat2, value: metrics?.reposts, label: "Reposts" },
    { icon: Heart, value: metrics?.likes, label: "Likes" },
    { icon: BarChart3, value: metrics?.impressions, label: "Impressions" },
    { icon: Bookmark, value: metrics?.bookmarks, label: "Bookmarks" },
  ];
  return (
    <div className="mt-2.5 flex items-center gap-5 border-t border-[#F3F5F9] pt-2">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11.5px] text-[#98A2B3]" title={item.label}>
          <item.icon className="size-3.5" />
          <span className="tabular-nums">{metrics ? compact(item.value ?? 0) : "—"}</span>
        </span>
      ))}
    </div>
  );
}
