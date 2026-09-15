"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  BadgeCheck,
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
  MousePointerClick,
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
import { BarList, ChartLegend, Donut, KpiCard, LegendList, TrendChart, type Granularity } from "../components/charts";
import { CreatePlaylistDialog, HealthDetailSheet, ScoreRing, ThumbnailManager } from "../components/dialogs";
import { CapabilityState, PageSkeleton } from "../components/states";
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
import { useChannelAnalytics } from "../hooks/use-analytics";
import { usePeriod, useWithPeriod } from "../hooks/use-query-state";
import { trafficSources } from "../data/mock";
import { METRICS, ytRoutes } from "../lib/constants";
import { compact, date, hours, percent, relative } from "../lib/format";
import { channelHealth, scoreTone } from "../lib/insights";
import { useYouTube } from "../store/youtube-store";
import type { MetricKey, Video } from "../types";

const KPI_ICONS: Record<MetricKey, typeof Eye> = {
  views: Eye,
  watchTime: Clock,
  subscribers: UsersRound,
  avgViewDuration: Timer,
  impressions: BarChart3,
  ctr: MousePointerClick,
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
        <ChannelHealthCard className="xl:col-span-4" />
      </div>

      {can.canViewAnalytics.allowed ? (
        <>
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
            {(["views", "watchTime", "subscribers", "avgViewDuration", "impressions", "ctr"] as MetricKey[]).map((key) => (
              <KpiCard
                key={key}
                metric={key}
                icon={KPI_ICONS[key]}
                value={analytics.totals[key].value}
                previous={analytics.totals[key].previous}
                spark={analytics.spark[key]}
                active={metric === key && key !== "avgViewDuration"}
                onClick={key === "avgViewDuration" ? undefined : () => setMetric(key)}
              />
            ))}
          </div>
          <div className="grid gap-1 xl:grid-cols-12">
            <PerformanceCard className="xl:col-span-8" metric={metric} onMetric={setMetric} analytics={analytics} periodLabel={label} />
            <TrafficCard className="xl:col-span-4" total={analytics.totals.views.value} />
          </div>
        </>
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

  const quick = [
    { label: "Upload video", icon: Upload, onClick: () => router.push(ytRoutes.upload), gate: can.canUpload },
    { label: "Create Short", icon: Smartphone, onClick: () => router.push(`${ytRoutes.upload}?type=short`), gate: can.canUpload },
    { label: "Go live", icon: Radio, onClick: () => router.push(ytRoutes.liveCreate), gate: can.canGoLive },
    { label: "Create playlist", icon: ListPlus, onClick: () => setPlaylistOpen(true), gate: can.canManagePlaylists },
    { label: "Manage thumbnails", icon: ImageIcon, onClick: () => setPickerOpen(true), gate: can.canEditVideo },
  ];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative h-[108px] bg-[#E9EDF3]">
        <Image src={channel.bannerUrl} alt={`${channel.title} channel banner`} fill priority sizes="(min-width: 1280px) 900px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/35 via-transparent to-transparent" />
      </div>
      <div className="px-4 pb-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-3">
            <span className="relative -mt-9 grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_2px_8px_rgba(15,27,61,0.15)]">
              <Image src={channel.avatarUrl} alt="" width={64} height={64} className="size-full object-contain" />
            </span>
            <div className="min-w-0 pt-2">
              <p className="flex items-center gap-1.5 text-[16px] font-semibold leading-5 text-[#0F1B3D]">
                <span className="truncate">{channel.title}</span>
                {channel.isVerified && <BadgeCheck className="size-4 shrink-0 text-[#2563EB]" aria-label="Verified channel" />}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#6B7890]">
                {channel.handle} · <b className="font-semibold text-[#24324F]">{compact(channel.subscriberCount)}</b> subscribers · <b className="font-semibold text-[#24324F]">{channel.videoCount}</b> videos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.channelOnYouTube(channel.handle)} external>View on YouTube</Button>
            <Button size="sm" variant="secondary" icon={Info} onClick={() => setDetailsOpen(true)}>Channel details</Button>
            <Button size="sm" variant="secondary" icon={PlugZap} href={`${ytRoutes.settings}#connection`}>Manage connection</Button>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 max-w-[760px] text-[12.5px] leading-5 text-[#3C4A66]">{channel.description}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <SyncStatus compact />
          <span className="hidden h-4 w-px bg-[#E4E9F0] sm:block" />
          <button type="button" onClick={() => copyText(channel.id, "Channel ID copied")} className={cn("inline-flex items-center gap-1.5 rounded text-[12px] text-[#6B7890] hover:text-[#0F1B3D]", yt.focus)}>
            ID <code className="font-mono text-[11.5px] text-[#24324F]">{channel.id}</code>
            <Copy className="size-3" />
          </button>
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
          <SheetTitle className="text-[15px] text-[#0F1B3D]">Channel details</SheetTitle>
          <SheetDescription className="text-[12.5px]">Synced from YouTube. Branding, handle and About links are edited in YouTube Studio.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <dl>
            <DefinitionRow label="Channel name">{channel.title}</DefinitionRow>
            <DefinitionRow label="Handle">{channel.handle}</DefinitionRow>
            <DefinitionRow label="Channel ID" mono>{channel.id}</DefinitionRow>
            <DefinitionRow label="Custom URL">{channel.customUrl}</DefinitionRow>
            <DefinitionRow label="Verified">{channel.isVerified ? "Yes" : "No"}</DefinitionRow>
            <DefinitionRow label="Subscribers">{channel.subscriberCount.toLocaleString("en-IN")}</DefinitionRow>
            <DefinitionRow label="Videos">{channel.videoCount.toLocaleString("en-IN")}</DefinitionRow>
            <DefinitionRow label="Lifetime views">{channel.viewCount.toLocaleString("en-IN")}</DefinitionRow>
            <DefinitionRow label="Country">{channel.country}</DefinitionRow>
            <DefinitionRow label="Joined">{date(channel.createdAt)}</DefinitionRow>
            <DefinitionRow label="Google account">{channel.googleAccount}</DefinitionRow>
            <DefinitionRow label="Last synced">{relative(connection.lastSyncedAt)}</DefinitionRow>
          </dl>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Description</p>
          <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-5 text-[#3C4A66]">{channel.description}</p>
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
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Manage thumbnails</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#6B7890]">Choose a video to update its thumbnail.</DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-3"><SearchField value={q} onChange={setQ} placeholder="Search videos" autoFocus /></div>
        <ul className="max-h-[360px] overflow-y-auto px-3 py-2">
          {list.length === 0 && <li className="py-6 text-center text-[12.5px] text-[#6B7890]">No videos match “{q}”.</li>}
          {list.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => onPick(v)} className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-[#F8FAFC]", yt.focus)}>
                <Thumb src={v.thumbnailUrl} className="w-[72px]" sizes="72px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{v.title}</span>
                  <span className="text-[11.5px] text-[#6B7890]">{v.stats.ctr !== null ? `CTR ${percent(v.stats.ctr)}` : "No CTR data yet"}</span>
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

function ChannelHealthCard({ className }: { className?: string }) {
  const { channel, videos, comments, features } = useYouTube();
  const [open, setOpen] = useState(false);
  const { score, factors } = useMemo(() => channelHealth(channel, videos, comments, features.monetizationEnabled), [channel, videos, comments, features.monetizationEnabled]);
  const weakest = [...factors].sort((a, b) => a.score - b.score);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Channel health"
        badge={<InternalBadge hint="Calculated by OmniPlatform from synced data. Not an official YouTube score." />}
        actions={<Button size="xs" variant="link" onClick={() => setOpen(true)}>View details</Button>}
      />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={score} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#0F1B3D]">{score >= 80 ? "Healthy channel" : score >= 60 ? "Room to improve" : "Needs attention"}</p>
            <p className="mt-0.5 text-[12px] leading-4 text-[#6B7890]">
              Biggest opportunity: <b className="font-semibold text-[#24324F]">{weakest[0]?.label.toLowerCase()}</b>.
            </p>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {factors.slice(0, 7).map((f) => (
            <li key={f.key} className="grid grid-cols-[1fr_72px_28px] items-center gap-2 text-[12px]">
              <span className="truncate text-[#3C4A66]">{f.label}</span>
              <Meter value={f.score} tone={scoreTone(f.score)} />
              <b className="text-right font-semibold tabular-nums text-[#0F1B3D]">{f.score}</b>
            </li>
          ))}
        </ul>
      </div>
      <HealthDetailSheet open={open} onOpenChange={setOpen} />
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
  analytics: ReturnType<typeof useChannelAnalytics>;
  periodLabel: string;
}) {
  const { days } = usePeriod();
  const [granularity, setGranularity] = useState<Granularity>(days > 90 ? "weekly" : "daily");
  const [compare, setCompare] = useState(true);
  const effective: Granularity = granularity === "monthly" && days < 90 ? "weekly" : granularity;

  return (
    <Card className={className}>
      <CardHeader
        title="Performance overview"
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
            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-[#DCE2EA] bg-white px-2.5 text-[12px] font-medium text-[#24324F]">
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
            value={metric === "avgViewDuration" ? "views" : metric}
            onChange={onMetric}
            className="max-w-full overflow-x-auto"
            items={(["views", "watchTime", "subscribers", "impressions", "ctr"] as MetricKey[]).map((m) => ({ value: m, label: METRICS[m].short }))}
          />
          <ChartLegend items={[{ label: METRICS[metric].label, color: METRICS[metric].color }, ...(compare ? [{ label: "Previous period", color: "#C9D1DC", dashed: true }] : [])]} />
        </div>
        <div className="mt-3">
          <TrendChart current={analytics.current} previous={analytics.previous} metric={metric} granularity={effective} compare={compare} height={250} />
        </div>
      </div>
    </Card>
  );
}

function TrafficCard({ className, total }: { className?: string; total: number }) {
  const withPeriod = useWithPeriod();
  const top = trafficSources.slice(0, 6);
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title="Traffic sources" description="Where views came from" actions={<ViewLink href={withPeriod(`${ytRoutes.analytics}?tab=reach`)}>View details</ViewLink>} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-4 sm:flex-row xl:flex-col 2xl:flex-row">
        <Donut data={top} size={150} thickness={18} centerValue={compact(total)} centerLabel="Total views" />
        <LegendList data={top} className="w-full" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Top content                                                         */
/* ------------------------------------------------------------------ */

function TopContentCard({ className }: { className?: string }) {
  const { videos } = useYouTube();
  const top = useMemo(
    () => videos.filter((v) => v.status === "published").sort((a, b) => b.stats.views - a.stats.views).slice(0, 5),
    [videos],
  );
  return (
    <Card className={className}>
      <CardHeader title="Top performing content" description="By views in the selected period" actions={<ViewLink href={`${ytRoutes.content}?status=published&sort=views`}>View all</ViewLink>} />
      {top.length === 0 ? (
        <EmptyState compact icon={BarChart3} title="No published content yet" description="Performance appears here once your first video is public." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr>
                <th className={cn(thClass, "static w-8 bg-white pl-4")}>#</th>
                <th className={cn(thClass, "static bg-white")}>Content</th>
                <th className={cn(thClass, "static bg-white text-right")}>Views</th>
                <th className={cn(thClass, "static bg-white text-right")}>Watch time</th>
                <th className={cn(thClass, "static bg-white text-right")}>CTR</th>
                <th className={cn(thClass, "static bg-white pr-4 text-right")}>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {top.map((v, i) => {
                const engagement = v.stats.views ? ((v.stats.likes + v.stats.comments) / v.stats.views) * 100 : null;
                return (
                  <tr key={v.id} className="group hover:bg-[#F8FAFC]">
                    <td className={cn(tdClass, "pl-4 text-[12px] font-semibold text-[#98A2B3]")}>{i + 1}</td>
                    <td className={cn(tdClass, "max-w-[340px]")}>
                      <Link href={ytRoutes.video(v.id)} className="flex items-center gap-2.5 rounded">
                        <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[76px]" sizes="76px" />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D] group-hover:text-[#2563EB]">{v.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#6B7890]"><TypeBadge type={v.type} />{date(v.publishedAt)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={cn(tdClass, "text-right font-semibold tabular-nums text-[#0F1B3D]")}>{compact(v.stats.views)}</td>
                    <td className={cn(tdClass, "text-right tabular-nums")}>{hours(v.stats.watchTimeHours)}</td>
                    <td className={cn(tdClass, "text-right tabular-nums")}>{percent(v.stats.ctr)}</td>
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
  const { can, audience: a } = useYouTube();
  const withPeriod = useWithPeriod();
  const [tab, setTab] = useState<AudienceTab>("age");
  const detailTab = tab === "age" ? "demographics" : tab === "geo" ? "geography" : "devices";

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title="Audience snapshot" actions={<ViewLink href={withPeriod(`${ytRoutes.audience}?tab=${detailTab}`)}>View details</ViewLink>} />
      {!can.canViewAnalytics.allowed ? (
        <CapabilityState compact capability={can.canViewAnalytics} />
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
            {tab === "age" &&
              (a.age && a.gender ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {a.gender.slice(0, 2).map((g, i) => (
                      <div key={g.label} className="flex-1 rounded-lg bg-[#F8FAFC] px-3 py-2">
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
                <BarList
                  data={a.geography.slice(0, 6).map((g) => ({ label: g.country, value: g.views }))}
                  color="#E5202E"
                  format={(v) => compact(v)}
                />
              ) : (
                <NotEnoughData />
              ))}
            {tab === "devices" && (a.devices ? <BarList data={a.devices} color="#7C3AED" /> : <NotEnoughData />)}
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
/* Recent comments                                                     */
/* ------------------------------------------------------------------ */

type CommentTab = "all" | "unanswered" | "review";

function RecentComments() {
  const { comments, videos, can, toggleCommentLike } = useYouTube();
  const [tab, setTab] = useState<CommentTab>("all");
  const lists = useMemo(() => {
    const sorted = [...comments].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return {
      all: sorted.filter((c) => c.moderationStatus === "published"),
      unanswered: sorted.filter((c) => c.moderationStatus === "published" && !c.replies.some((r) => r.isChannelOwner)),
      review: sorted.filter((c) => c.moderationStatus === "heldForReview" || c.moderationStatus === "likelySpam"),
    };
  }, [comments]);
  const list = lists[tab].slice(0, 5);
  const href = tab === "all" ? ytRoutes.comments : tab === "unanswered" ? `${ytRoutes.comments}?status=unanswered` : `${ytRoutes.comments}?status=held`;

  return (
    <Card className="flex flex-col">
      <CardHeader title="Recent comments" actions={<ViewLink href={href}>View all</ViewLink>} />
      <div className="border-b border-[#EEF1F5] px-4">
        <UnderlineTabs<CommentTab>
          label="Comment filter"
          size="sm"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: lists.all.length },
            { value: "unanswered", label: "Unanswered", count: lists.unanswered.length },
            { value: "review", label: "Needs review", count: lists.review.length },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState compact icon={MessageSquare} title={tab === "unanswered" ? "Every comment has a reply" : tab === "review" ? "Nothing to review" : "No comments yet"} description="Comments will appear here once viewers engage." />
      ) : (
        <ul className="divide-y divide-[#EEF1F5]">
          {list.map((c) => {
            const video = videos.find((v) => v.id === c.videoId);
            return (
              <li key={c.id} className="flex gap-3 px-4 py-2.5">
                <Avatar name={c.author} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-[12px]">
                    <b className="font-semibold text-[#0F1B3D]">{c.author}</b>
                    <span className="text-[#98A2B3]">{relative(c.publishedAt)}</span>
                    {c.priority && <Badge tone="blue">Priority</Badge>}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#24324F]">{c.text}</p>
                  {video && (
                    <Link href={ytRoutes.video(video.id)} className="mt-0.5 block truncate text-[11.5px] text-[#6B7890] hover:text-[#2563EB]">on {video.title}</Link>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <Button
                    size="iconSm"
                    variant="ghost"
                    aria-label={c.likedByChannel ? "Unlike comment" : "Like comment"}
                    aria-pressed={c.likedByChannel}
                    gate={can.canReplyComments}
                    onClick={() => toggleCommentLike(c.id)}
                    className={cn("w-auto gap-1 px-1.5 text-[11.5px]", c.likedByChannel && "text-[#2563EB]")}
                  >
                    <ThumbsUp className={cn("size-3.5", c.likedByChannel && "fill-current")} />
                    {c.likeCount}
                  </Button>
                  <Button size="xs" variant="secondary" icon={Reply} href={`${ytRoutes.comments}?thread=${c.id}`}>Reply</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming                                                            */
/* ------------------------------------------------------------------ */

function UpcomingContent() {
  const { videos, liveEvents, can } = useYouTube();
  const items = useMemo(() => {
    const vids = videos
      .filter((v) => v.status === "scheduled" || v.status === "draft" || v.status === "failed")
      .map((v) => ({ id: v.id, title: v.title, thumb: v.thumbnailUrl, type: v.type, when: v.scheduledAt, status: v.status, href: ytRoutes.video(v.id) }));
    const lives = liveEvents
      .filter((e) => e.lifecycle === "upcoming")
      .map((e) => ({ id: e.id, title: e.title, thumb: e.thumbnailUrl, type: "live" as const, when: e.scheduledStart, status: "scheduled" as const, href: `${ytRoutes.live}?tab=upcoming` }));
    return [...vids, ...lives]
      .sort((a, b) => (a.when ?? "9999").localeCompare(b.when ?? "9999"))
      .slice(0, 6);
  }, [videos, liveEvents]);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Upcoming YouTube content"
        actions={
          <>
            <Button size="xs" variant="ghost" icon={CalendarDays} href={ytRoutes.calendar}>View calendar</Button>
            <Button size="xs" variant="secondary" gate={can.canSchedule.allowed ? can.canUpload : can.canSchedule} href={`${ytRoutes.upload}?publish=schedule`}>Schedule new</Button>
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState compact icon={CalendarDays} title="Nothing scheduled" description="Schedule uploads ahead to keep a consistent cadence." />
      ) : (
        <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
          {items.map((item) => {
            const d = item.when ? parseISO(item.when) : null;
            return (
              <li key={item.id}>
                <Link href={item.href} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC]">
                  <span className={cn("grid w-11 shrink-0 place-items-center rounded-lg py-1 leading-none", d ? "bg-[#FEF1F2] text-[#C81E2B]" : "bg-[#F1F4F8] text-[#6B7890]")}>
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
      )}
    </Card>
  );
}
