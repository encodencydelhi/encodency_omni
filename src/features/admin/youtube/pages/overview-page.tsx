"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  ImageIcon,
  Info,
  ListPlus,
  MessageSquare,
  PlugZap,
  Radio,
  Reply,
  Smartphone,
  ThumbsUp,
  Timer,
  Upload,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { BarList, ChartLegend, Donut, KpiCard, KpiSkeleton, LegendList, TrendChart, type Granularity } from "../components/charts";
import { CreatePlaylistDialog, HealthDetailSheet, ScoreRing, ThumbnailManager } from "../components/dialogs";
import { CapabilityState, ErrorState, PageSkeleton } from "../components/states";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  DefinitionRow,
  EmptyState,
  InternalBadge,
  Meter,
  SearchField,
  Segmented,
  SelectMenu,
  Skeleton,
  StatusBadge,
  Thumb,
  TypeBadge,
  UnderlineTabs,
  ViewLink,
  copyText,
  tdClass,
  thClass,
  yt,
} from "../components/ui";
import { SyncStatus } from "../components/workspace";
import { useAnalyticsTopVideos, useCommentsInfinite, useLiveBroadcasts } from "../data/hooks";
import { isAnswered, toCommentThread } from "../data/mappers";
import { useAudienceData, useChannelAnalytics, useTrafficSources, type ChannelAnalytics, type QueryView } from "../data/view-hooks";
import { usePeriod, useWithPeriod } from "../hooks/use-query-state";
import { describeYouTubeError, isLiveNotEnabled } from "../live/youtube-errors";
import { METRICS, ytRoutes } from "../lib/constants";
import { compact, date, duration, full, hours, percent, relative } from "../lib/format";
import { channelHealth, scoreTone } from "../lib/insights";
import { periodRange } from "../lib/period";
import { useYouTube } from "../store/youtube-store";
import type { CommentThread, MetricKey, Video } from "../types";

const KPI_ICONS: Record<MetricKey, typeof Eye> = {
  views: Eye,
  watchTime: Clock,
  subscribers: UsersRound,
  avgViewDuration: Timer,
};

export function OverviewPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton />;
  return <Overview />;
}

function Overview() {
  const { can } = useYouTube();
  const { days, label } = usePeriod();
  const analytics = useChannelAnalytics(days);
  const [metric, setMetric] = useState<MetricKey>("views");

  return (
    <div className="space-y-1">
      <div className="grid gap-1 xl:grid-cols-12">
        <ChannelProfile className="xl:col-span-8" />
        <ChannelHealthCard className="xl:col-span-4" analytics={analytics} />
      </div>

      {can.canViewAnalytics.allowed ? (
        analytics.error ? (
          <Card>
            <ErrorState error={analytics.error} onRetry={analytics.refetch} title="Analytics couldn't load" />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              {analytics.isLoading ? (
                <KpiSkeleton />
              ) : (
                (["views", "watchTime", "subscribers", "avgViewDuration"] as MetricKey[]).map((key) => (
                  <KpiCard
                    key={key}
                    metric={key}
                    icon={KPI_ICONS[key]}
                    value={analytics.data.totals[key].value}
                    previous={analytics.data.totals[key].previous}
                    spark={analytics.data.spark[key]}
                    unavailable={!analytics.data.hasData ? "No data for this period" : undefined}
                    active={metric === key && key !== "avgViewDuration"}
                    onClick={key === "avgViewDuration" ? undefined : () => setMetric(key)}
                  />
                ))
              )}
            </div>
            <div className="grid gap-1 xl:grid-cols-12">
              <PerformanceCard className="xl:col-span-8" metric={metric} onMetric={setMetric} analytics={analytics} periodLabel={label} />
              <TrafficCard className="xl:col-span-4" total={analytics.data.totals.views.value} />
            </div>
          </>
        )
      ) : (
        <Card>
          <CapabilityState capability={can.canViewAnalytics} title="Analytics unavailable" />
        </Card>
      )}

      <div className="grid gap-1 xl:grid-cols-12">
        <TopContentCard className="xl:col-span-8" />
        <AudienceSnapshot className="xl:col-span-4" />
      </div>
      <div className="grid gap-1 xl:grid-cols-2">
        <RecentComments />
        <UpcomingContent />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Channel profile                                                     */
/* ------------------------------------------------------------------ */

function ChannelProfile({ className }: { className?: string }) {
  const { channel, can, videos } = useYouTube();
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [thumbVideo, setThumbVideo] = useState<Video | null>(null);
  // A blocked or dead Google image falls back to the plain avatar instead of a broken-image icon.
  const [bannerFailed, setBannerFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  // Six lines is roughly where the clamp bites; anything shorter needs no dialog.
  const longDescription = channel.description.length > 300 || channel.description.split("\n").length > 6;

  const quick = [
    { label: "Upload video", icon: Upload, onClick: () => router.push(ytRoutes.upload), gate: can.canUpload },
    { label: "Create Short", icon: Smartphone, onClick: () => router.push(`${ytRoutes.upload}?type=short`), gate: can.canUpload },
    { label: "Go live", icon: Radio, onClick: () => router.push(ytRoutes.liveCreate), gate: can.canGoLive },
    { label: "Create playlist", icon: ListPlus, onClick: () => setPlaylistOpen(true), gate: can.canManagePlaylists },
    { label: "Manage thumbnails", icon: ImageIcon, onClick: () => setPickerOpen(true), gate: can.canEditVideo },
  ];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative aspect-[2560/424] min-h-[84px] w-full bg-[#E9EDF3]">
        {channel.bannerUrl && !bannerFailed && (
          <Image
            src={channel.bannerUrl}
            alt={`${channel.title} channel banner`}
            fill
            priority
            sizes="(min-width: 1280px) 900px, 100vw"
            className="object-cover object-center"
            onError={() => setBannerFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/35 via-transparent to-transparent" />
      </div>
      <div className="px-4 pb-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-3">
            <span className="relative -mt-9 grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-sm border-4 border-white bg-white shadow-[0_2px_8px_rgba(15,27,61,0.15)]">
              {channel.avatarUrl && !avatarFailed ? (
                <Image src={channel.avatarUrl} alt="" width={64} height={64} className="size-full object-contain" onError={() => setAvatarFailed(true)} />
              ) : (
                <Avatar name={channel.title} className="size-full text-[18px]" />
              )}
            </span>
            <div className="min-w-0 pt-2">
              <p className="flex items-center gap-1.5 text-[16px] font-semibold leading-5 text-[#0F1B3D]">
                <span className="truncate">{channel.title}</span>
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#6B7890]">
                {channel.handle && <>{channel.handle} · </>}
                <b className="font-semibold text-[#24324F]">{compact(channel.subscriberCount)}</b> subscribers · <b className="font-semibold text-[#24324F]">{full(channel.videoCount)}</b> videos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {channel.id && <Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.channelOnYouTube(channel)} external>View on YouTube</Button>}
            <Button size="sm" variant="secondary" icon={Info} onClick={() => setDetailsOpen(true)}>Channel Details</Button>
            <Button size="sm" variant="secondary" icon={PlugZap} href={`${ytRoutes.settings}#connection`}>Manage connection</Button>
          </div>
        </div>

        <div className="mt-3 max-w-[760px]">
          <p className="line-clamp-6 whitespace-pre-line text-[12.5px] leading-5 text-[#3C4A66]">
            {channel.description || "No channel description."}
          </p>
          {longDescription && (
            <button
              type="button"
              onClick={() => setDescOpen(true)}
              className={cn("mt-1 rounded text-[12px] font-semibold text-[#2563EB] hover:underline", yt.focus)}
            >
              Show more
            </button>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <SyncStatus compact />
          <span className="hidden h-4 w-px bg-[#E4E9F0] sm:block" />
          {channel.id && (
            <button type="button" onClick={() => copyText(channel.id, "Channel ID copied")} className={cn("inline-flex items-center gap-1.5 rounded text-[12px] text-[#6B7890] hover:text-[#0F1B3D]", yt.focus)}>
              ID <code className="font-mono text-[11.5px] text-[#24324F]">{channel.id}</code>
              <Copy className="size-3" />
            </button>
          )}
          <div className="flex flex-wrap gap-1">
            {channel.keywords.map((k) => (
              <Badge key={k}>{k}</Badge>
            ))}
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-1.5 border-t border-[#EEF1F5] pt-3 sm:grid-cols-3 lg:grid-cols-5">
          {quick.map((q) => (
            <Button key={q.label} size="sm" variant="ghost" icon={q.icon} gate={q.gate} onClick={q.onClick} className="justify-start bg-[#F8FAFC] text-[#24324F] hover:bg-[#F1F4F8]">
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Expanding in place made this card much taller than the column beside it, so the rest opens here. */}
      <Dialog open={descOpen} onOpenChange={setDescOpen}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[640px] gap-0 p-0">
          <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
            <DialogTitle className="text-[15px] text-[#0F1B3D]">About {channel.title}</DialogTitle>
            <DialogDescription className="text-[12.5px] text-[#6B7890]">The channel description as it appears on YouTube.</DialogDescription>
          </DialogHeader>
          <div className="scrollbar-thin max-h-[60vh] overflow-y-auto px-5 py-4">
            <p className="whitespace-pre-line text-[13px] leading-6 text-[#3C4A66]">{channel.description || "No channel description."}</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
            {channel.id && (
              <Button variant="secondary" icon={ExternalLink} href={ytRoutes.channelOnYouTube(channel)} external>
                View on YouTube
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDescOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ChannelDetailsSheet open={detailsOpen} onOpenChange={setDetailsOpen} />
      <CreatePlaylistDialog open={playlistOpen} onOpenChange={setPlaylistOpen} onCreated={(p) => router.push(ytRoutes.playlist(p.id))} />
      <VideoPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        videos={videos}
        onPick={(v) => {
          setPickerOpen(false);
          setThumbVideo(v);
        }}
      />
      <ThumbnailManager open={thumbVideo !== null} onOpenChange={(o) => !o && setThumbVideo(null)} video={thumbVideo ? videos.find((v) => v.id === thumbVideo.id) ?? null : null} />
    </Card>
  );
}

function ChannelDetailsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { channel, connection } = useYouTube();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle className="text-[15px] text-[#0F1B3D]">Channel Details</SheetTitle>
          <SheetDescription className="text-[12.5px]">Synced from YouTube. Branding, handle and About links are edited in YouTube Studio.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <dl>
            <DefinitionRow label="Channel Name">{channel.title}</DefinitionRow>
            <DefinitionRow label="Handle">{channel.handle || "—"}</DefinitionRow>
            <DefinitionRow label="Channel ID" mono>{channel.id || "—"}</DefinitionRow>
            <DefinitionRow label="Custom URL">{channel.customUrl || "—"}</DefinitionRow>
            <DefinitionRow label="Subscribers">{channel.subscriberCount === null ? "Hidden by the owner" : channel.subscriberCount.toLocaleString("en-IN")}</DefinitionRow>
            <DefinitionRow label="Videos">{full(channel.videoCount)}</DefinitionRow>
            <DefinitionRow label="Lifetime Views">{full(channel.viewCount)}</DefinitionRow>
            <DefinitionRow label="Country">{channel.country ?? "—"}</DefinitionRow>
            <DefinitionRow label="Joined">{date(channel.createdAt)}</DefinitionRow>
            <DefinitionRow label="Google Account">{channel.googleAccount ?? "—"}</DefinitionRow>
            <DefinitionRow label="Last Synced">{relative(connection.lastSyncedAt)}</DefinitionRow>
          </dl>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Description</p>
          <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-5 text-[#3C4A66]">{channel.description || "No channel description."}</p>
        </SheetBody>
        <SheetFooter>
          <Button variant="secondary" icon={ExternalLink} href={ytRoutes.studio} external>Edit in YouTube Studio</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function VideoPickerDialog({ open, onOpenChange, videos, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; videos: Video[]; onPick: (v: Video) => void }) {
  const [q, setQ] = useState("");
  const list = videos.filter((v) => v.title.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[520px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Manage Thumbnails</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#6B7890]">Choose a video to update its thumbnail.</DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-3"><SearchField value={q} onChange={setQ} placeholder="Search videos" autoFocus /></div>
        <ul className="max-h-[360px] overflow-y-auto px-3 py-2">
          {list.length === 0 && <li className="py-6 text-center text-[12.5px] text-[#6B7890]">{videos.length === 0 ? "No videos to show yet." : <>No videos match “{q}”.</>}</li>}
          {list.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => onPick(v)} className={cn("flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-[#F8FAFC]", yt.focus)}>
                <Thumb src={v.thumbnailUrl} className="w-[72px]" sizes="72px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{v.title}</span>
                  <span className="text-[11.5px] text-[#6B7890]">{v.stats.views === null ? "Views unavailable" : `${compact(v.stats.views)} views`}</span>
                </span>
                <TypeBadge type={v.type} />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Channel health                                                      */
/* ------------------------------------------------------------------ */

function ChannelHealthCard({ className, analytics }: { className?: string; analytics: QueryView<ChannelAnalytics> }) {
  const { channel, videos, videosState } = useYouTube();
  const [open, setOpen] = useState(false);
  const comparison = useMemo(() => {
    const d = analytics.data;
    if (!analytics.enabled || !d.hasData) return null;
    return {
      current: {
        views: d.rawTotals.current.views,
        likes: d.likes.current,
        comments: d.comments.current,
        netSubscribers: d.rawTotals.current.subscribers,
        watchTime: d.rawTotals.current.watchTime,
        avgViewDuration: d.rawTotals.current.avgViewDuration,
      },
      previous: {
        views: d.rawTotals.previous.views,
        likes: d.likes.previous,
        comments: d.comments.previous,
        netSubscribers: d.rawTotals.previous.subscribers,
        watchTime: d.rawTotals.previous.watchTime,
        avgViewDuration: d.rawTotals.previous.avgViewDuration,
      },
    };
  }, [analytics.data, analytics.enabled]);
  const { score, factors, stats } = useMemo(() => channelHealth(channel, videos, comparison), [channel, videos, comparison]);
  const weakest = [...factors].sort((a, b) => a.score - b.score);
  const worst = weakest[0];

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Channel Health"
        badge={<InternalBadge hint="Calculated by OmniPlatform from synced data. Not an official YouTube score." />}
        actions={<Button size="xs" variant="link" onClick={() => setOpen(true)}>View details</Button>}
      />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        {videosState.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <ScoreRing score={score} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#0F1B3D]">{score >= 80 ? "Healthy channel" : score >= 60 ? "Room to improve" : "Needs attention"}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-[#6B7890]">
                  Biggest opportunity: <b className="font-semibold text-[#24324F]">{weakest[0]?.label.toLowerCase()}</b>.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-1 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-sm bg-[#F8FAFC] px-2.5 py-2" title={stat.hint}>
                  <dt className="truncate text-[11px] text-[#6B7890]">{stat.label}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#0F1B3D]">{stat.value}</dd>
                </div>
              ))}
            </dl>
            {/* Side by side with the channel profile this list would run far past it, so it scrolls in place. */}
            <div className="scrollbar-thin -mr-1.5 min-h-0 pr-1.5 xl:max-h-[184px] xl:overflow-y-auto">
              <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
                {factors.map((f) => (
                  <li key={f.key} className="min-w-0">
                    <div className="grid grid-cols-[1fr_72px_28px] items-center gap-2 text-[12px]">
                      <span className="truncate font-medium text-[#3C4A66]">{f.label}</span>
                      <Meter value={f.score} tone={scoreTone(f.score)} />
                      <b className="text-right font-semibold tabular-nums text-[#0F1B3D]">{f.score}</b>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-4 text-[#6B7890]">{f.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
            {worst && (
              <div className="mt-auto rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#B54708]">Do this next</p>
                <p className="mt-1 text-[12px] leading-4 text-[#24324F]">{worst.recommendation}</p>
                {worst.action && (
                  <Button size="xs" variant="secondary" className="mt-2" href={worst.action.href}>
                    {worst.action.label}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <HealthDetailSheet open={open} onOpenChange={setOpen} analytics={analytics} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

function PerformanceCard({
  className,
  metric,
  onMetric,
  analytics,
  periodLabel,
}: {
  className?: string;
  metric: MetricKey;
  onMetric: (m: MetricKey) => void;
  analytics: QueryView<ChannelAnalytics>;
  periodLabel: string;
}) {
  const { days } = usePeriod();
  const [granularity, setGranularity] = useState<Granularity>(days > 90 ? "weekly" : "daily");
  const [compare, setCompare] = useState(true);
  const effective: Granularity = granularity === "monthly" && days < 90 ? "weekly" : granularity;
  const chartMetric: MetricKey = metric === "avgViewDuration" ? "views" : metric;

  return (
    <Card className={className}>
      <CardHeader
        title="Performance Overview"
        description={`${periodLabel} compared with the previous ${days} days`}
        actions={
          <>
            <SelectMenu<Granularity>
              label="Granularity"
              value={effective}
              onChange={setGranularity}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly", disabled: days < 90, description: days < 90 ? "Needs 90+ days" : undefined },
              ]}
            />
            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-[#DCE2EA] bg-white px-2.5 text-[12px] font-medium text-[#24324F]">
              <Switch checked={compare} onCheckedChange={setCompare} className="scale-90" aria-label="Compare with previous period" />
              Compare
            </label>
          </>
        }
      />
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented<MetricKey>
            label="Chart metric"
            value={chartMetric}
            onChange={onMetric}
            className="max-w-full overflow-x-auto"
            items={(["views", "watchTime", "subscribers"] as MetricKey[]).map((m) => ({ value: m, label: METRICS[m].short }))}
          />
          <ChartLegend items={[{ label: METRICS[chartMetric].label, color: METRICS[chartMetric].color }, ...(compare ? [{ label: "Previous period", color: "#C9D1DC", dashed: true }] : [])]} />
        </div>
        <div className="mt-3">
          {analytics.isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : !analytics.data.hasData ? (
            <EmptyState compact icon={BarChart3} title="No data for this period" description="YouTube hasn't reported views for this date range yet. Try a longer range." />
          ) : (
            <TrendChart current={analytics.data.current} previous={analytics.data.previous} metric={chartMetric} granularity={effective} compare={compare} height={250} />
          )}
        </div>
      </div>
    </Card>
  );
}

function TrafficCard({ className, total }: { className?: string; total: number | null }) {
  const withPeriod = useWithPeriod();
  const { days } = usePeriod();
  const traffic = useTrafficSources(days);
  const top = traffic.data.rows.slice(0, 6);
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title="Traffic Sources" description="Where views came from" actions={<ViewLink href={withPeriod(`${ytRoutes.analytics}?tab=reach`)}>View details</ViewLink>} />
      {traffic.isLoading ? (
        <div className="px-4 pb-4"><Skeleton className="mx-auto size-[150px]" /></div>
      ) : traffic.error ? (
        <ErrorState compact error={traffic.error} onRetry={traffic.refetch} />
      ) : top.length === 0 ? (
        <EmptyState compact icon={BarChart3} title="No traffic data" description="YouTube hasn't reported traffic sources for this date range." />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-4 sm:flex-row xl:flex-col 2xl:flex-row">
          <Donut data={top} size={150} thickness={18} centerValue={compact(total)} centerLabel="Total views" />
          <LegendList data={top} className="w-full" />
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Top content                                                         */
/* ------------------------------------------------------------------ */

function TopContentCard({ className }: { className?: string }) {
  const { videos, can, connection } = useYouTube();
  const { days } = usePeriod();
  const range = useMemo(() => periodRange(days), [days]);
  const enabled = can.canViewAnalytics.allowed && connection.state !== "disconnected" && connection.state !== "not_mapped";
  const q = useAnalyticsTopVideos(range, "views", enabled, 5);
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const rows = (q.data?.items ?? []).filter((t) => t.metrics.views !== null);

  return (
    <Card className={className}>
      <CardHeader title="Top Performing Content" description="By views in the selected period" actions={<ViewLink href={`${ytRoutes.content}?status=published&sort=views`}>View all</ViewLink>} />
      {!enabled ? (
        <CapabilityState compact capability={can.canViewAnalytics} />
      ) : q.isPending ? (
        <div className="space-y-2 px-4 pb-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : q.error ? (
        <ErrorState compact error={describeYouTubeError(q.error)} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState compact icon={BarChart3} title="No performance data yet" description="Performance appears here once YouTube reports views for the selected period." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr>
                <th className={cn(thClass, "static w-8 bg-white pl-4")}>#</th>
                <th className={cn(thClass, "static bg-white")}>Content</th>
                <th className={cn(thClass, "static bg-white text-right")}>Views</th>
                <th className={cn(thClass, "static bg-white text-right")}>Watch time</th>
                <th className={cn(thClass, "static bg-white text-right")}>Avg. duration</th>
                <th className={cn(thClass, "static bg-white pr-4 text-right")}>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => {
                const known = byId.get(t.videoId);
                const views = t.metrics.views ?? null;
                const likes = t.metrics.likes ?? null;
                const comments = t.metrics.comments ?? null;
                const engagement = views && views > 0 && likes !== null && comments !== null ? ((likes + comments) / views) * 100 : null;
                const title = known?.title ?? t.video?.title ?? "Video";
                return (
                  <tr key={t.videoId} className="group hover:bg-[#F8FAFC]">
                    <td className={cn(tdClass, "pl-4 text-[12px] font-semibold text-[#98A2B3]")}>{i + 1}</td>
                    <td className={cn(tdClass, "max-w-[340px]")}>
                      <Link href={ytRoutes.video(t.videoId)} className="flex items-center gap-2.5 rounded">
                        <Thumb src={known?.thumbnailUrl ?? t.video?.thumbnail} durationSec={known?.durationSec} className="w-[76px]" sizes="76px" />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D] group-hover:text-[#2563EB]">{title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#6B7890]">{known && <TypeBadge type={known.type} />}{date(known?.publishedAt ?? t.video?.publishedAt ?? null)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={cn(tdClass, "text-right font-semibold tabular-nums text-[#0F1B3D]")}>{compact(views)}</td>
                    <td className={cn(tdClass, "text-right tabular-nums")}>{hours(t.metrics.estimatedMinutesWatched === null || t.metrics.estimatedMinutesWatched === undefined ? null : t.metrics.estimatedMinutesWatched / 60)}</td>
                    <td className={cn(tdClass, "text-right tabular-nums")}>{duration(t.metrics.averageViewDurationSeconds ?? null)}</td>
                    <td className={cn(tdClass, "pr-4 text-right tabular-nums")}>{percent(engagement)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Audience snapshot                                                   */
/* ------------------------------------------------------------------ */

type AudienceTab = "age" | "geo" | "devices";

function AudienceSnapshot({ className }: { className?: string }) {
  const { can } = useYouTube();
  const { days } = usePeriod();
  const audience = useAudienceData(days);
  const a = audience.data;
  const withPeriod = useWithPeriod();
  const [tab, setTab] = useState<AudienceTab>("age");
  const detailTab = tab === "age" ? "demographics" : tab === "geo" ? "geography" : "devices";

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title="Audience Snapshot" actions={<ViewLink href={withPeriod(`${ytRoutes.audience}?tab=${detailTab}`)}>View details</ViewLink>} />
      {!can.canViewAnalytics.allowed ? (
        <CapabilityState compact capability={can.canViewAnalytics} />
      ) : audience.error ? (
        <ErrorState compact error={audience.error} onRetry={audience.refetch} />
      ) : (
        <div className="flex flex-1 flex-col px-4 pb-4">
          <div className="border-b border-[#EEF1F5]">
            <UnderlineTabs<AudienceTab>
              label="Audience breakdown"
              size="sm"
              value={tab}
              onChange={setTab}
              items={[
                { value: "age", label: "Age & gender" },
                { value: "geo", label: "Geography" },
                { value: "devices", label: "Devices" },
              ]}
            />
          </div>
          <div className="flex-1 pt-3.5">
            {audience.isLoading ? (
              <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
            ) : (
              <>
                {tab === "age" &&
                  (a.age && a.gender ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        {a.gender.slice(0, 2).map((g, i) => (
                          <div key={g.label} className="flex-1 rounded-sm bg-[#F8FAFC] px-3 py-2">
                            <p className="text-[11.5px] text-[#6B7890]">{g.label}</p>
                            <p className="text-[17px] font-semibold tabular-nums" style={{ color: i === 0 ? "#2563EB" : "#DB2777" }}>{g.value.toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                      <BarList data={a.age.slice(0, 6)} color="#2563EB" />
                    </div>
                  ) : (
                    <NotEnoughData />
                  ))}
                {tab === "geo" &&
                  (a.geography ? (
                    <BarList data={a.geography.slice(0, 6).map((g) => ({ label: g.country, value: g.views }))} color="#E5202E" format={(v) => compact(v)} />
                  ) : (
                    <NotEnoughData />
                  ))}
                {tab === "devices" && (a.devices ? <BarList data={a.devices} color="#7C3AED" /> : <NotEnoughData />)}
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function NotEnoughData() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-6 text-center">
      <UsersRound className="size-5 text-[#98A2B3]" />
      <p className="mt-2 text-[13px] font-semibold text-[#0F1B3D]">Not enough audience data yet</p>
      <p className="mt-0.5 max-w-[260px] text-[12px] text-[#6B7890]">YouTube hides demographics until enough viewers watch, to protect their privacy.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent comments (comments are per video: the most recent published video)  */
/* ------------------------------------------------------------------ */

type CommentTab = "all" | "unanswered" | "review";

function RecentComments() {
  const { videos, can, connection } = useYouTube();
  const [tab, setTab] = useState<CommentTab>("all");
  const latest = useMemo(() => [...videos].filter((v) => v.status === "published").sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0], [videos]);
  const usable = connection.state === "connected" || connection.state === "syncing";
  const commentsOn = latest ? latest.commentsEnabled !== false : false;
  const published = useCommentsInfinite(latest?.id, { filter: "published", order: "time", enabled: usable && commentsOn });
  const review = useCommentsInfinite(latest?.id, { filter: "heldForReview", order: "time", enabled: usable && commentsOn && tab === "review" && can.canModerateComments.allowed });

  const threads = useMemo<CommentThread[]>(() => (latest ? (published.data?.pages.flatMap((p) => p.items.map((t) => toCommentThread(t, latest.id))) ?? []) : []), [published.data, latest]);
  const reviewThreads = useMemo<CommentThread[]>(() => (latest ? (review.data?.pages.flatMap((p) => p.items.map((t) => toCommentThread(t, latest.id))) ?? []) : []), [review.data, latest]);
  const lists = {
    all: threads,
    unanswered: threads.filter((c) => !isAnswered(c)),
    review: reviewThreads,
  };
  const list = lists[tab].slice(0, 5);
  const href = `${ytRoutes.comments}?video=${latest?.id ?? ""}${tab === "unanswered" ? "&status=unanswered" : tab === "review" ? "&status=held" : ""}`;
  const loading = tab === "review" ? review.isPending && review.fetchStatus !== "idle" : published.isPending && published.fetchStatus !== "idle";
  const error = tab === "review" ? review.error : published.error;

  return (
    <Card className="flex flex-col h-[380px]">
      <CardHeader title="Recent Comments" description={latest ? `On your latest video: ${latest.title}` : undefined} actions={latest ? <ViewLink href={href}>View all</ViewLink> : undefined} />
      <div className="border-b border-[#EEF1F5] px-4 shrink-0">
        <UnderlineTabs<CommentTab>
          label="Comment filter"
          size="sm"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: published.data ? lists.all.length : undefined },
            { value: "unanswered", label: "Unanswered", count: published.data ? lists.unanswered.length : undefined },
            { value: "review", label: "Needs review", count: review.data ? lists.review.length : undefined },
          ]}
        />
      </div>
      {!latest ? (
        <EmptyState compact icon={MessageSquare} title="No published videos yet" description="Comments appear here once a video is public and viewers engage." />
      ) : !commentsOn ? (
        <EmptyState compact icon={MessageSquare} title="Comments are turned off" description="Comments are disabled for your latest video." />
      ) : tab === "review" && !can.canModerateComments.allowed ? (
        <CapabilityState compact capability={can.canModerateComments} />
      ) : loading ? (
        <div className="space-y-3 px-4 py-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : error ? (
        <ErrorState compact error={describeYouTubeError(error)} onRetry={() => void (tab === "review" ? review.refetch() : published.refetch())} />
      ) : list.length === 0 ? (
        <EmptyState compact icon={MessageSquare} title={tab === "unanswered" ? "Every comment has a reply" : tab === "review" ? "Nothing to review" : "No comments yet"} description="Comments will appear here once viewers engage." />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <ul className="divide-y divide-[#EEF1F5]">
            {list.map((c) => (
              <li key={c.id} className="flex gap-3 px-4 py-2.5">
                <Avatar name={c.author} src={c.authorAvatar} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-[12px]">
                    <b className="font-semibold text-[#0F1B3D]">{c.author}</b>
                    <span className="text-[#98A2B3]">{relative(c.publishedAt)}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#24324F]">{c.text}</p>
                  <Link href={ytRoutes.video(latest.id)} className="mt-0.5 block truncate text-[11.5px] text-[#6B7890] hover:text-[#2563EB]">on {latest.title}</Link>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <span className="inline-flex h-7 items-center gap-1 px-1.5 text-[11.5px] text-[#6B7890]" aria-label={`${c.likeCount ?? 0} likes`}>
                    <ThumbsUp className="size-3.5" />
                    {c.likeCount ?? 0}
                  </span>
                  <Button size="xs" variant="secondary" icon={Reply} href={`${ytRoutes.comments}?video=${latest.id}&thread=${c.id}`}>Reply</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming                                                            */
/* ------------------------------------------------------------------ */

function UpcomingContent() {
  const { videos, videosState, can, connection, features, markLiveNotEnabled } = useYouTube();
  const usable = connection.state === "connected" || connection.state === "syncing";
  const live = useLiveBroadcasts("upcoming", usable && features.liveStreamingEnabled);
  const liveError = live.error;
  useEffect(() => {
    if (liveError && isLiveNotEnabled(liveError)) markLiveNotEnabled();
  }, [liveError, markLiveNotEnabled]);

  const items = useMemo(() => {
    const vids = videos
      .filter((v) => v.status === "scheduled" || v.status === "draft" || v.status === "failed")
      .map((v) => ({ id: v.id, title: v.title, thumb: v.thumbnailUrl, type: v.type, when: v.scheduledAt, status: v.status, href: ytRoutes.video(v.id) }));
    const lives = (live.data?.pages.flatMap((p) => p.items) ?? []).map((e) => ({
      id: e.broadcastId,
      title: e.title ?? "Untitled live event",
      thumb: e.thumbnails.medium ?? e.thumbnails.default ?? "",
      type: "live" as const,
      when: e.scheduledStartTime,
      status: "scheduled" as const,
      href: `${ytRoutes.live}?tab=upcoming`,
    }));
    return [...vids, ...lives].sort((a, b) => (a.when ?? "9999").localeCompare(b.when ?? "9999")).slice(0, 6);
  }, [videos, live.data]);

  return (
    <Card className="flex flex-col h-[380px]">
      <CardHeader
        title="Upcoming YouTube Content"
        actions={
          <>
            <Button size="xs" variant="ghost" icon={CalendarDays} href={ytRoutes.calendar}>View calendar</Button>
            <Button size="xs" variant="secondary" gate={can.canSchedule.allowed ? can.canUpload : can.canSchedule} href={`${ytRoutes.upload}?publish=schedule`}>Schedule new</Button>
          </>
        }
      />
      {videosState.isLoading ? (
        <div className="space-y-2 px-4 pb-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : videosState.isError && videosState.error ? (
        <ErrorState compact error={videosState.error} onRetry={videosState.refetch} />
      ) : items.length === 0 ? (
        <EmptyState compact icon={CalendarDays} title="Nothing scheduled" description="Schedule uploads ahead to keep a consistent cadence." />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin border-t border-[#EEF1F5]">
          <ul className="divide-y divide-[#EEF1F5]">
            {items.map((item) => {
              const d = item.when ? parseISO(item.when) : null;
              return (
                <li key={item.id}>
                  <Link href={item.href} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC]">
                    <span className={cn("grid w-11 shrink-0 place-items-center rounded-sm py-1 leading-none", d ? "bg-[#FEF1F2] text-[#C81E2B]" : "bg-[#F1F4F8] text-[#6B7890]")}>
                      <small className="text-[10px] font-semibold uppercase">{d ? format(d, "MMM") : "No"}</small>
                      <b className="text-[15px] font-semibold leading-5">{d ? format(d, "d") : "date"}</b>
                    </span>
                    <Thumb src={item.thumb} className="w-[64px]" sizes="64px" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D] group-hover:text-[#2563EB]">{item.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#6B7890]">
                        <TypeBadge type={item.type} />
                        {d ? format(d, "EEE · h:mm a") : "Not scheduled"}
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

