"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  ImageIcon,
  ListPlus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  SendHorizonal,
  ThumbsUp,
  Timer,
  Trash2,
  Upload,
  UserPlus,
  VideoOff,
  Percent,
} from "lucide-react";
import { ApiError } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { ChartLegend, TrendChart, summarize, type Granularity } from "../components/charts";
import { AddToPlaylistDialog, DeleteVideosDialog, EditMetadataSheet, FactorRow, ScheduleDialog, ScoreRing, ThumbnailManager } from "../components/dialogs";
import { CapabilityState, ErrorState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DefinitionRow,
  EmptyState,
  InternalBadge,
  Notice,
  Segmented,
  Skeleton,
  StatusBadge,
  Thumb,
  TypeBadge,
  UnderlineTabs,
  VisibilityLabel,
  buttonClass,
  copyText,
  yt,
} from "../components/ui";
import { useVideoAnalytics, useVideoQuery } from "../data/hooks";
import { toVideo } from "../data/mappers";
import { fillSeries } from "../lib/series";
import { useQueryState } from "../hooks/use-query-state";
import { describeYouTubeError } from "../live/youtube-errors";
import { METRICS, VISIBILITY_LABEL, categoryLabel, languageLabel, ytRoutes } from "../lib/constants";
import { date, dateTime, duration, full, hours, percent } from "../lib/format";
import { videoOptimization } from "../lib/insights";
import { periodRange, previousPeriodRange } from "../lib/period";
import { useYouTube } from "../store/youtube-store";
import { CommentInbox } from "./comments-page";
import type { MetricKey, Video } from "../types";

type DetailTab = "overview" | "analytics" | "comments" | "seo" | "details";

const DEFAULTS = { tab: "overview", confirm: "" };

export function VideoDetailPage() {
  const { ready, videos, scheduleFor } = useYouTube();
  const params = useParams<{ videoId: string }>();
  const videoId = params?.videoId;
  const query = useVideoQuery(videoId, ready);

  const video = useMemo<Video | null>(() => {
    if (query.data) return toVideo(query.data.video, scheduleFor(query.data.video.id));
    return videos.find((v) => v.id === videoId) ?? null;
  }, [query.data, videos, videoId, scheduleFor]);

  if (!ready || (query.isPending && !video)) return <PageSkeleton variant="detail" />;
  if (!video) {
    const notFound = ApiError.isApiError(query.error) && (query.error.status === 404 || query.error.reason === "youtube_video_not_found" || query.error.reason === "youtube_video_not_owned");
    if (query.error && !notFound) {
      return (
        <Card>
          <ErrorState error={describeYouTubeError(query.error)} onRetry={() => void query.refetch()} title="Video couldn't load" />
        </Card>
      );
    }
    return (
      <Card>
        <EmptyState
          icon={VideoOff}
          title="Video not found"
          description="It may have been deleted on YouTube or from OmniPlatform, or the link is incorrect."
          action={<Button variant="primary" icon={ArrowLeft} href={ytRoutes.content}>Back to content</Button>}
        />
      </Card>
    );
  }
  return <VideoDetail video={video} />;
}

function VideoDetail({ video }: { video: Video }) {
  const { can, publishNow } = useYouTube();
  const router = useRouter();
  const { values, set } = useQueryState(DEFAULTS);
  const tab = values.tab as DetailTab;

  const [editOpen, setEditOpen] = useState(false);
  const [thumbOpen, setThumbOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(values.confirm === "publish");

  useEffect(() => {
    if (values.confirm) set({ confirm: "" });
    // Consume the one-shot query flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const published = video.status === "published";
  const unpublished = video.status === "draft" || video.status === "scheduled";

  return (
    <div className="space-y-1">
      <Link href={ytRoutes.content} className="inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-[#6B7890] hover:text-[#0F1B3D]">
        <ArrowLeft className="size-3.5" /> Content
      </Link>

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <button type="button" onClick={() => setThumbOpen(true)} disabled={!can.canUpload.allowed} className="group relative w-full shrink-0 rounded-sm md:w-[220px]" aria-label="Change thumbnail">
            <Thumb src={video.thumbnailUrl} durationSec={video.durationSec} className="rounded-sm" sizes="220px" />
            {can.canUpload.allowed && (
              <span className="absolute inset-0 grid place-items-center rounded-sm bg-[#0F1B3D]/55 text-[12px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                <span className="flex items-center gap-1.5"><ImageIcon className="size-4" />Change thumbnail</span>
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={video.status} />
              <TypeBadge type={video.type} />
            </div>
            <h2 className="mt-2 text-[18px] font-semibold leading-6 tracking-[-0.01em] text-[#0F1B3D]">{video.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#6B7890]">
              <VisibilityLabel visibility={video.visibility} />
              <span>·</span>
              <span>{published ? `Published ${date(video.publishedAt)}` : video.status === "scheduled" ? `Scheduled for ${dateTime(video.scheduledAt)}` : "Not published"}</span>
              <span>·</span>
              <button type="button" onClick={() => copyText(video.id, "Video ID copied")} className="inline-flex items-center gap-1 rounded font-mono text-[12px] hover:text-[#0F1B3D]">{video.id}<Copy className="size-3" /></button>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon={Pencil} gate={can.canEditVideo} onClick={() => setEditOpen(true)}>Edit details</Button>
              <Button size="sm" variant="secondary" icon={ImageIcon} gate={can.canUpload} onClick={() => setThumbOpen(true)}>Change thumbnail</Button>
              {published && <Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.watch(video.id)} external>Open on YouTube</Button>}
              {unpublished && (
                <Button size="sm" variant="secondary" icon={SendHorizonal} gate={can.canPublish} onClick={() => setPublishOpen(true)}>Publish now</Button>
              )}
              <ActionMenu
                label="More video actions"
                trigger={<button type="button" className={buttonClass("secondary", "sm")}><MoreHorizontal className="size-4" />More</button>}
                items={[
                  { label: "View analytics", icon: BarChart3, onSelect: () => set({ tab: "analytics" }), hidden: !published },
                  { label: "View comments", icon: MessageSquare, onSelect: () => set({ tab: "comments" }), hidden: !published },
                  { label: "Add to playlist", icon: ListPlus, onSelect: () => setPlaylistOpen(true), gate: can.canManagePlaylists },
                  { label: video.scheduleId ? "Reschedule" : "Schedule", icon: CalendarClock, onSelect: () => setScheduleOpen(true), hidden: published || video.status === "processing" || video.status === "failed", gate: can.canSchedule },
                  { label: "Copy video link", icon: Copy, onSelect: () => copyText(ytRoutes.watch(video.id), "Link copied") },
                  "separator",
                  { label: "Delete video", icon: Trash2, danger: true, onSelect: () => setDeleteOpen(true), gate: can.canDeleteVideo },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {video.status === "failed" && (
        <Notice tone="red" title="This upload failed" actions={<><Button size="sm" variant="primary" icon={Upload} gate={can.canUpload} href={ytRoutes.upload}>Re-upload</Button><Button size="sm" variant="danger" icon={Trash2} gate={can.canDeleteVideo} onClick={() => setDeleteOpen(true)}>Delete</Button></>}>
          {video.failureReason ?? "YouTube couldn't process this file."}
        </Notice>
      )}
      {video.status === "processing" && <Notice tone="blue" title="Processing on YouTube">Higher resolutions and analytics become available when processing completes.</Notice>}

      <div className="border-b border-[#E4E9F0]">
        <UnderlineTabs<DetailTab>
          label="Video sections"
          value={tab}
          onChange={(v) => set({ tab: v })}
          items={[
            { value: "overview", label: "Overview" },
            { value: "analytics", label: "Analytics" },
            { value: "comments", label: "Comments", count: video.stats.comments ?? undefined },
            { value: "seo", label: "SEO & Optimization" },
            { value: "details", label: "Details" },
          ]}
        />
      </div>

      {tab === "overview" && <OverviewTab video={video} />}
      {tab === "analytics" && <AnalyticsTab video={video} />}
      {tab === "comments" &&
        (published ? (
          video.commentsEnabled === false ? (
            <Card><EmptyState icon={MessageSquare} title="Comments are turned off" description="Comments are disabled for this video in YouTube Studio." /></Card>
          ) : (
            <CommentInbox videoId={video.id} />
          )
        ) : (
          <Card><EmptyState icon={MessageSquare} title="No comments yet" description="Comments will appear here once the video is published and viewers engage." /></Card>
        ))}
      {tab === "seo" && <SeoTab video={video} onEdit={() => setEditOpen(true)} onThumb={() => setThumbOpen(true)} />}
      {tab === "details" && <DetailsTab video={video} onEdit={() => setEditOpen(true)} />}

      <EditMetadataSheet open={editOpen} onOpenChange={setEditOpen} video={video} />
      <ThumbnailManager open={thumbOpen} onOpenChange={setThumbOpen} video={video} />
      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} video={video} />
      <AddToPlaylistDialog open={playlistOpen} onOpenChange={setPlaylistOpen} videoIds={[video.id]} />
      <DeleteVideosDialog open={deleteOpen} onOpenChange={setDeleteOpen} videos={[video]} onDeleted={() => router.push(ytRoutes.content)} />
      <ConfirmDialog
        open={publishOpen && unpublished}
        onOpenChange={setPublishOpen}
        destructive={false}
        title={`Publish “${video.title}” now?`}
        description="The video becomes public on YouTube and subscribers may be notified. Any scheduled time is cancelled."
        affected={[`Visibility: ${VISIBILITY_LABEL[video.visibility]} → Public`, ...(video.scheduledAt ? [`Cancels schedule for ${dateTime(video.scheduledAt)}`] : [])]}
        confirmLabel="Publish now"
        onConfirm={() => publishNow(video.id, "public")}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Stat({ label, value, icon: Icon, sub, loading }: { label: string; value: string; icon: typeof Eye; sub?: string; loading?: boolean }) {
  return (
    <div className={cn(yt.card, "p-3.5")}>
      <p className="flex items-center gap-1.5 text-[12px] text-[#6B7890]"><Icon className="size-3.5" />{label}</p>
      {loading ? <Skeleton className="mt-2 h-6 w-20" /> : <p className="mt-1.5 text-[19px] font-semibold tabular-nums tracking-[-0.02em] text-[#0F1B3D]">{value}</p>}
      {sub && !loading && <p className="text-[11.5px] text-[#98A2B3]">{sub}</p>}
    </div>
  );
}

/** The last 28 days of the video's own analytics, plus the 28 before for comparison. Real queries; nothing is scaled from channel totals. */
function useVideoPerformance(video: Video, enabled: boolean) {
  const range = useMemo(() => periodRange(28), []);
  const prevRange = useMemo(() => previousPeriodRange(28), []);
  const current = useVideoAnalytics(video.id, range, "day", enabled);
  const previous = useVideoAnalytics(video.id, prevRange, "day", enabled);
  return useMemo(
    () => ({
      isLoading: enabled && current.isPending,
      error: current.error ? describeYouTubeError(current.error) : null,
      refetch: () => {
        void current.refetch();
        void previous.refetch();
      },
      hasData: Boolean(current.data?.hasData),
      metrics: current.data?.metrics ?? null,
      current: fillSeries(range, current.data?.series ?? []),
      previous: fillSeries(prevRange, previous.data?.series ?? []),
    }),
    [enabled, current, previous, range, prevRange],
  );
}

function OverviewTab({ video }: { video: Video }) {
  const { can } = useYouTube();
  const published = video.status === "published";
  const analyticsOn = published && can.canViewAnalytics.allowed;
  const perf = useVideoPerformance(video, analyticsOn);
  const [metric, setMetric] = useState<MetricKey>("views");
  const m = perf.metrics;
  const s = video.stats;
  const minutes = m?.estimatedMinutesWatched ?? null;

  return (
    <div className="space-y-1">
      {published ? (
        can.canViewAnalytics.allowed ? (
          perf.error ? (
            <Card><ErrorState compact error={perf.error} onRetry={perf.refetch} title="Video analytics couldn't load" /></Card>
          ) : (
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-7">
              <Stat label="Views" icon={Eye} value={full(s.views)} sub="Lifetime" />
              <Stat label="Watch time" icon={Clock} value={hours(minutes === null ? null : minutes / 60)} sub="Last 28 days" loading={perf.isLoading} />
              <Stat label="Avg. view duration" icon={Timer} value={duration(m?.averageViewDurationSeconds ?? null)} sub="Last 28 days" loading={perf.isLoading} />
              <Stat label="Avg. % viewed" icon={Percent} value={percent(m?.averageViewPercentage ?? null)} sub="Last 28 days" loading={perf.isLoading} />
              <Stat label="Likes" icon={ThumbsUp} value={full(s.likes)} sub={s.likes === null ? "Hidden by the owner" : "Lifetime"} />
              <Stat label="Comments" icon={MessageSquare} value={full(s.comments)} sub={s.comments === null ? "Comments are off" : "Lifetime"} />
              <Stat label="Subscribers gained" icon={UserPlus} value={m?.subscribersGained === null || m?.subscribersGained === undefined ? "—" : `+${full(m.subscribersGained)}`} sub="Last 28 days" loading={perf.isLoading} />
            </div>
          )
        ) : (
          <Card><CapabilityState capability={can.canViewAnalytics} title="Video analytics unavailable" compact /></Card>
        )
      ) : (
        <Card>
          <EmptyState compact icon={BarChart3} title="Performance appears after publishing" description={video.status === "scheduled" ? `This video goes public ${dateTime(video.scheduledAt)}.` : "Views, watch time and engagement show up once the video is public."} />
        </Card>
      )}

      <div className="grid gap-1 xl:grid-cols-12">
        {analyticsOn && !perf.error && (
          <Card className="xl:col-span-8">
            <CardHeader
              title="Performance — Last 28 Days"
              actions={<Segmented<MetricKey> label="Metric" value={metric} onChange={setMetric} items={(["views", "watchTime", "subscribers"] as MetricKey[]).map((k) => ({ value: k, label: METRICS[k].short }))} />}
            />
            <div className="px-4 pb-4">
              <ChartLegend items={[{ label: METRICS[metric].label, color: METRICS[metric].color }, { label: "Previous 28 days", color: "#C9D1DC", dashed: true }]} />
              <div className="mt-2">
                {perf.isLoading ? <Skeleton className="h-[240px] w-full" /> : !perf.hasData ? (
                  <EmptyState compact icon={BarChart3} title="No data for this period" description="YouTube hasn't reported analytics for this video in the last 28 days yet." />
                ) : (
                  <TrendChart current={perf.current} previous={perf.previous} metric={metric} granularity="daily" height={240} />
                )}
              </div>
            </div>
          </Card>
        )}
        <Card className={cn(analyticsOn && !perf.error ? "xl:col-span-4" : "xl:col-span-12")}>
          <CardHeader title="Video Info" />
          <dl className="px-4 pb-3">
            <DefinitionRow label="Video ID" mono>{video.id}</DefinitionRow>
            <DefinitionRow label="URL">
              {published ? <a href={ytRoutes.watch(video.id)} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">youtu.be/{video.id}</a> : "Available after publishing"}
            </DefinitionRow>
            <DefinitionRow label="Visibility">{VISIBILITY_LABEL[video.visibility]}</DefinitionRow>
            <DefinitionRow label="Category">{video.categoryId ? categoryLabel(video.categoryId) : "—"}</DefinitionRow>
            <DefinitionRow label="Language">{video.language ? languageLabel(video.language) : "—"}</DefinitionRow>
            <DefinitionRow label="Duration">{duration(video.durationSec)}</DefinitionRow>
            <DefinitionRow label="Published">{published ? dateTime(video.publishedAt) : video.status === "scheduled" ? `Scheduled · ${dateTime(video.scheduledAt)}` : "Not published"}</DefinitionRow>
            <DefinitionRow label="Tags">
              {video.tags.length ? <span className="flex flex-wrap justify-end gap-1">{video.tags.map((t) => <Badge key={t}>{t}</Badge>)}</span> : "None"}
            </DefinitionRow>
          </dl>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

function AnalyticsTab({ video }: { video: Video }) {
  const { can } = useYouTube();
  const published = video.status === "published";
  const perf = useVideoPerformance(video, published && can.canViewAnalytics.allowed);
  const [metric, setMetric] = useState<MetricKey>("views");
  const [granularity, setGranularity] = useState<Granularity>("daily");

  if (!published) {
    return <Card><EmptyState icon={BarChart3} title="No analytics yet" description="Analytics become available after the video is published and collects views." /></Card>;
  }
  if (!can.canViewAnalytics.allowed) return <Card><CapabilityState capability={can.canViewAnalytics} title="Analytics unavailable" /></Card>;
  if (perf.error) return <Card><ErrorState error={perf.error} onRetry={perf.refetch} title="Video analytics couldn't load" /></Card>;

  const subsGained = summarize(perf.current, "subscribers");
  const views = summarize(perf.current, "views");
  return (
    <div className="grid gap-1 xl:grid-cols-12">
      <Card className="xl:col-span-8">
        <CardHeader
          title="Views & Watch Time"
          description="Last 28 days vs previous 28 days"
          actions={
            <>
              <Segmented<MetricKey> label="Metric" value={metric} onChange={setMetric} items={(["views", "watchTime", "subscribers"] as MetricKey[]).map((k) => ({ value: k, label: METRICS[k].short }))} />
              <Segmented<Granularity> label="Granularity" value={granularity} onChange={setGranularity} items={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]} />
            </>
          }
        />
        <div className="px-4 pb-4">
          {perf.isLoading ? <Skeleton className="h-[260px] w-full" /> : !perf.hasData ? (
            <EmptyState compact icon={BarChart3} title="No data for this period" description="YouTube hasn't reported analytics for this video in the last 28 days yet." />
          ) : (
            <TrendChart current={perf.current} previous={perf.previous} metric={metric} granularity={granularity} height={260} />
          )}
        </div>
      </Card>
      <Card className="h-fit xl:col-span-4">
        <CardHeader title="Subscriber Impact" />
        <div className="space-y-3 px-4 pb-4">
          <div className="rounded-sm bg-[#ECFAF3] px-3 py-2.5">
            <p className="text-[12px] text-[#067647]">Subscribers from this video</p>
            <p className="text-[22px] font-semibold tabular-nums text-[#0F1B3D]">{subsGained === null ? "—" : `${subsGained >= 0 ? "+" : ""}${full(subsGained)}`}</p>
          </div>
          {subsGained !== null && views !== null && views > 0 ? (
            <p className="text-[12.5px] leading-5 text-[#3C4A66]">
              That&apos;s <b>{((subsGained / views) * 1000).toFixed(1)}</b> subscribers per 1,000 views over 28 days.
            </p>
          ) : (
            <p className="text-[12.5px] leading-5 text-[#6B7890]">Not enough data to compare yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SEO                                                                 */
/* ------------------------------------------------------------------ */

function SeoTab({ video, onEdit, onThumb }: { video: Video; onEdit: () => void; onThumb: () => void }) {
  const { channel, can } = useYouTube();
  const { score, factors } = useMemo(() => videoOptimization(video, channel.keywords), [video, channel.keywords]);

  return (
    <div className="grid gap-1 xl:grid-cols-12">
      <Card className="h-fit p-4 xl:col-span-4">
        <div className="flex items-center gap-2"><h3 className="text-[13.5px] font-semibold text-[#0F1B3D]">Optimization score</h3><InternalBadge label="OmniPlatform Optimization" /></div>
        <div className="mt-4 flex items-center gap-4">
          <ScoreRing score={score} />
          <p className="text-[12.5px] leading-5 text-[#6B7890]">Based on OmniPlatform&apos;s analysis of your metadata. YouTube doesn&apos;t publish an SEO score.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" icon={Pencil} gate={can.canEditVideo} onClick={onEdit}>Improve details</Button>
          <Button size="sm" variant="secondary" icon={ImageIcon} gate={can.canUpload} onClick={onThumb}>New thumbnail</Button>
        </div>
      </Card>
      <ul className="grid gap-1 md:grid-cols-2 xl:col-span-8">
        {factors.map((f) => <FactorRow key={f.key} factor={f} />)}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Details                                                             */
/* ------------------------------------------------------------------ */

function DetailsTab({ video, onEdit }: { video: Video; onEdit: () => void }) {
  const { can } = useYouTube();

  return (
    <div>
      <Card>
        <CardHeader title="Metadata" actions={<Button size="sm" variant="secondary" icon={Pencil} gate={can.canEditVideo} onClick={onEdit}>Edit</Button>} />
        <dl className="px-4 pb-3">
          <DefinitionRow label="Title">{video.title}</DefinitionRow>
          <DefinitionRow label="Description"><span className="block max-h-40 overflow-y-auto whitespace-pre-line text-left font-normal text-[#3C4A66]">{video.description || "—"}</span></DefinitionRow>
          <DefinitionRow label="Visibility">{VISIBILITY_LABEL[video.visibility]}</DefinitionRow>
          <DefinitionRow label="Audience">{video.madeForKids === null ? "Not reported" : video.madeForKids ? "Made for kids" : "Not made for kids"}</DefinitionRow>
          <DefinitionRow label="Category">{video.categoryId ? categoryLabel(video.categoryId) : "—"}</DefinitionRow>
          <DefinitionRow label="Language">{video.language ? languageLabel(video.language) : "—"}</DefinitionRow>
          <DefinitionRow label="Embedding">{video.embeddable === null ? "Not reported" : video.embeddable ? "Allowed" : "Not allowed"}</DefinitionRow>
          <DefinitionRow label="Comments">{video.commentsEnabled === null ? "Not reported" : video.commentsEnabled && !video.madeForKids ? "On" : "Off"}</DefinitionRow>
        </dl>
      </Card>
    </div>
  );
}
