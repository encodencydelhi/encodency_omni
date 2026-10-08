"use client";

import Link from "next/link";
import { ArrowLeft, CalendarRange, Link2, RefreshCcw, Send, UsersRound } from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { cn } from "@/lib/utils/cn";
import { metaProvider, useMetaCampaigns, useMetaOverview, useMetaScheduledPosts } from "../live/meta-instagram-hooks";

type PlatformName = "Facebook" | "Instagram";

const platformConfig = {
  Facebook: {
    provider: "META" as const,
    channel: "FACEBOOK_PAGE",
    title: "Facebook",
    subtitle: "Facebook Page overview, publishing status, mapped resources and content for this Client.",
    accent: "text-[#1877F2]",
    bg: "bg-[#EAF3FF]",
  },
  Instagram: {
    provider: "INSTAGRAM" as const,
    channel: "INSTAGRAM_ACCOUNT",
    title: "Instagram",
    subtitle: "Instagram Business overview, publishing status, mapped resources and reels for this Client.",
    accent: "text-[#E4405F]",
    bg: "bg-[#FFF0F5]",
  },
};

export function MetaPlatformPage({ platform }: { platform: PlatformName }) {
  const config = platformConfig[platform];
  const { companyId, clientId, isReady } = useTenancyContext();
  const enabled = isReady && Boolean(companyId) && Boolean(clientId);
  const overviewQuery = useMetaOverview(companyId, clientId, enabled);
  const postsQuery = useMetaScheduledPosts(companyId, clientId, enabled);
  const campaignsQuery = useMetaCampaigns(companyId, clientId, enabled);
  const provider = metaProvider(overviewQuery.data, config.provider);
  const posts = (postsQuery.data?.items ?? []).filter((post) => post.channel === config.channel);
  const mapped = provider?.resources ?? [];
  const connection = provider?.connections[0] ?? null;

  const stats = [
    { label: "Connection", value: provider?.state ? provider.state.replace("_", " ") : "setup required", icon: Link2 },
    { label: "Mapped Accounts", value: String(provider?.mappedResourceCount ?? 0), icon: UsersRound },
    { label: "Scheduled", value: String(posts.filter((post) => post.status === "SCHEDULED").length), icon: CalendarRange },
    { label: "Published", value: String(posts.filter((post) => post.status === "PUBLISHED").length), icon: Send },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/meta" className="grid size-9 shrink-0 place-items-center rounded-sm border border-[#DDE4ED] text-[#52617D] hover:bg-[#F8FAFD]">
            <ArrowLeft className="size-4" />
          </Link>
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-sm", config.bg)}>
            <ChannelLogo channel={platform} className="size-7 bg-transparent" />
          </span>
          <div className="min-w-0">
            <h1 className={cn("text-[20px] font-semibold leading-6", config.accent)}>{config.title}</h1>
            <p className="truncate text-[12px] text-[#687797]">{config.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => {
            void overviewQuery.refetch();
            void postsQuery.refetch();
            void campaignsQuery.refetch();
          }}
          className="grid size-10 shrink-0 place-items-center rounded-sm border border-[#D7E0EB] bg-white text-[#425273] hover:bg-[#F8FAFD]"
          aria-label="Refresh"
        >
          <RefreshCcw className="size-4" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
            <Icon className={cn("mb-2 size-4", config.accent)} />
            <p className="text-[11px] font-semibold text-[#7C89A2]">{label}</p>
            <b className="mt-1 block text-[18px] capitalize text-[#172044]">{overviewQuery.isLoading || postsQuery.isLoading ? "..." : value}</b>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
          <h2 className="text-[13px] font-semibold text-[#172044]">Connected Account</h2>
          <div className="mt-3 space-y-2 text-[12px] text-[#52617D]">
            <Row label="Login" value={connection?.accountName ?? connection?.accountEmail ?? "Not connected"} />
            <Row label="Health" value={provider?.health?.replace("_", " ") ?? "not connected"} />
            <Row label="Publishing" value={provider?.publishingSupported ? "Supported" : "Not supported"} />
            <Row label="Updated" value={provider?.lastUpdatedAt ? new Date(provider.lastUpdatedAt).toLocaleString("en-GB") : "-"} />
          </div>
          <div className="mt-4 rounded-sm bg-[#F8FAFD] p-2">
            <p className="text-[11px] font-semibold text-[#172044]">Mapped resources</p>
            {mapped.length === 0 ? (
              <p className="mt-1 text-[11px] text-[#7C89A2]">No {platform} resource is mapped to this Client yet. Use Map on the main Meta overview.</p>
            ) : (
              mapped.map((resource) => (
                <p key={resource.mappingId} className="mt-1 truncate text-[11px] text-[#52617D]">{resource.externalResourceId}</p>
              ))
            )}
          </div>
        </section>

        <section className="rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
          <h2 className="text-[13px] font-semibold text-[#172044]">Content</h2>
          <div className="mt-3 divide-y divide-[#EDF1F5]">
            {posts.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[#7C89A2]">No {platform} posts for this Client yet.</p>
            ) : (
              posts.slice(0, 8).map((post) => (
                <div key={post.id} className="grid grid-cols-[1fr_90px_90px] gap-2 py-2 text-[12px]">
                  <span className="truncate font-semibold text-[#172044]">{post.content || "(empty post)"}</span>
                  <span className="text-[#52617D]">{post.status}</span>
                  <span className="text-[#7C89A2]">{new Date(post.scheduledFor).toLocaleDateString("en-GB")}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#7C89A2]">{label}</span>
      <b className="truncate text-right font-semibold capitalize text-[#172044]">{value}</b>
    </div>
  );
}
