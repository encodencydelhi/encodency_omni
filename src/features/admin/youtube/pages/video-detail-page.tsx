"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  History,
  ImageIcon,
  ListPlus,
  MessageSquare,
  MoreHorizontal,
  MousePointerClick,
  Pencil,
  RotateCcw,
  Send,
  SendHorizonal,
  ThumbsUp,
  Timer,
  Trash2,
  Upload,
  UserPlus,
  VideoOff,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buildRetention, buildSeries, mockAudience, trafficSources } from "../data/mock";
import { BarList, ChartLegend, RetentionChart, TrendChart, summarize, type Granularity } from "../components/charts";
import {
  AddToPlaylistDialog,
  DeleteVideosDialog,
  EditMetadataSheet,
  FactorRow,
  ScheduleDialog,
  ScoreRing,
  ThumbnailManager,
  VersionHistorySheet,
} from "../components/dialogs";
import { CapabilityState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  ApprovalBadge,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DefinitionRow,
  EmptyState,
  FormField,
  InternalBadge,
  Notice,
  Segmented,
  StatusBadge,
  Thumb,
  TypeBadge,
  UnderlineTabs,
  VisibilityLabel,
  buttonClass,
  copyText,
  yt,
} from "../components/ui";
import { useQueryState } from "../hooks/use-query-state";
import { APPROVAL_LABEL, METRICS, VISIBILITY_LABEL, categoryLabel, languageLabel, ytRoutes } from "../lib/constants";
import { compact, date, dateTime, duration, full, hours, percent, relative } from "../lib/format";
import { videoOptimization } from "../lib/insights";
import { useYouTube } from "../store/youtube-store";
import { CommentInbox } from "./comments-page";
import type { MetricKey, Video } from "../types";

type DetailTab = "overview" | "analytics" | "comments" | "seo" | "details";

const DEFAULTS = { tab: "overview", confirm: "" };

export function VideoDetailPage() {
  const { ready, videos } = useYouTube();
  const params = useParams<{ videoId: string }>();
  const video = videos.find((v) => v.id === params?.videoId);
  if (!ready) return <PageSkeleton variant="detail" />;
  if (!video) {
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
  const store = useYouTube();
  const { can, settings, playlists, publishNow, submitForApproval } = store;
  const router = useRouter();
  const { values, set } = useQueryState(DEFAULTS);
  const tab = values.tab as DetailTab;

  const [editOpen, setEditOpen] = useState(false);
  const [thumbOpen, setThumbOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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
  const needsApproval = settings.moderation.requireApproval && !can.canPublish.allowed;
  const approvalBlocksPublish = settings.moderation.requireApproval && video.approval !== "approved" && video.approval !== "none";

  return (
    <div className="space-y-1">
      <Link href={ytRoutes.content} className="inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-[#6B7890] hover:text-[#0F1B3D]">
        <ArrowLeft className="size-3.5" /> Content
      </Link>

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <button type="button" onClick={() => setThumbOpen(true)} disabled={!can.canEditVideo.allowed} className="group relative w-full shrink-0 rounded-lg md:w-[220px]" aria-label="Change thumbnail">
            <Thumb src={video.thumbnailUrl} durationSec={video.durationSec} className="rounded-lg" sizes="220px" />
            {can.canEditVideo.allowed && (
              <span className="absolute inset-0 grid place-items-center rounded-lg bg-[#0F1B3D]/55 text-[12px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                <span className="flex items-center gap-1.5"><ImageIcon className="size-4" />Change thumbnail</span>
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={video.status} />
              <TypeBadge type={video.type} />
              <ApprovalBadge state={video.approval} />
            </div>
            <h2 className="mt-2 text-[18px] font-semibold leading-6 tracking-[-0.01em] text-[#0F1B3D]">{video.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#6B7890]">
              <VisibilityLabel visibility={video.visibility} />
              <span>·</span>
              <span>{published ? `Published ${date(video.publishedAt)}` : video.status === "scheduled" ? `Scheduled for ${dateTime(video.scheduledAt)}` : `Last edited ${relative(video.updatedAt)}`}</span>
              <span>·</span>
              <button type="button" onClick={() => copyText(video.id, "Video ID copied")} className="inline-flex items-center gap-1 rounded font-mono text-[12px] hover:text-[#0F1B3D]">{video.id}<Copy className="size-3" /></button>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon={Pencil} gate={can.canEditVideo} onClick={() => setEditOpen(true)}>Edit details</Button>
              <Button size="sm" variant="secondary" icon={ImageIcon} gate={can.canEditVideo} onClick={() => setThumbOpen(true)}>Change thumbnail</Button>
              {published && <Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.watch(video.id)} external>Open on YouTube</Button>}
              {unpublished && !needsApproval && (
                <Button size="sm" variant="secondary" icon={SendHorizonal} gate={can.canPublish} disabled={approvalBlocksPublish} disabledReason={`Can't publish while ${APPROVAL_LABEL[video.approval].toLowerCase()}`} onClick={() => setPublishOpen(true)}>Publish now</Button>
              )}
              <ActionMenu
                label="More video actions"
                trigger={<button type="button" className={buttonClass("secondary", "sm")}><MoreHorizontal className="size-4" />More</button>}
                items={[
                  { label: "View analytics", icon: BarChart3, onSelect: () => set({ tab: "analytics" }), hidden: !published },
                  { label: "View comments", icon: MessageSquare, onSelect: () => set({ tab: "comments" }), hidden: !published },
                  { label: "Add to playlist", icon: ListPlus, onSelect: () => setPlaylistOpen(true), gate: can.canManagePlaylists },
                  { label: video.status === "scheduled" ? "Reschedule" : "Schedule", icon: CalendarClock, onSelect: () => setScheduleOpen(true), hidden: published || video.status === "processing" || (needsApproval && video.approval !== "approved"), gate: can.canSchedule },
                  { label: "Version history", icon: History, onSelect: () => setHistoryOpen(true) },
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
      {video.approval === "changes_requested" && (
        <Notice tone="amber" title="Changes requested" actions={<Button size="sm" variant="secondary" onClick={() => set({ tab: "details" })}>View feedback</Button>}>
          A reviewer asked for changes before this can be published.
        </Notice>
      )}

      <div className="border-b border-[#E4E9F0]">
        <UnderlineTabs<DetailTab>
          label="Video sections"
          value={tab}
          onChange={(v) => set({ tab: v })}
          items={[
            { value: "overview", label: "Overview" },
            { value: "analytics", label: "Analytics" },
            { value: "comments", label: "Comments", count: store.comments.filter((c) => c.videoId === video.id).length },
            { value: "seo", label: "SEO & Optimization" },
            { value: "details", label: "Details" },
          ]}
        />
      </div>

      {tab === "overview" && <OverviewTab video={video} playlists={playlists.filter((p) => video.playlistIds.includes(p.id)).map((p) => ({ id: p.id, title: p.title }))} />}
      {tab === "analytics" && <AnalyticsTab video={video} />}
      {tab === "comments" && (published ? <CommentInbox videoId={video.id} /> : <Card><EmptyState icon={MessageSquare} title="No comments yet" description="Comments will appear here once the video is published and viewers engage." /></Card>)}
      {tab === "seo" && <SeoTab video={video} onEdit={() => setEditOpen(true)} onThumb={() => setThumbOpen(true)} />}
      {tab === "details" && <DetailsTab video={video} onEdit={() => setEditOpen(true)} onHistory={() => setHistoryOpen(true)} />}

      <EditMetadataSheet open={editOpen} onOpenChange={setEditOpen} video={video} />
      <ThumbnailManager open={thumbOpen} onOpenChange={setThumbOpen} video={video} />
      <VersionHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} video={video} />
      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} video={video} />
      <AddToPlaylistDialog open={playlistOpen} onOpenChange={setPlaylistOpen} videoIds={[video.id]} />
      <DeleteVideosDialog open={deleteOpen} onOpenChange={setDeleteOpen} videos={[video]} onDeleted={() => router.push(ytRoutes.content)} />
      <ConfirmDialog
        open={publishOpen && unpublished}
        onOpenChange={setPublishOpen}
        destructive={false}
        title={`Publish “${video.title}” now?`}
        description="The video becomes public on YouTube immediately and subscribers may be notified. Any scheduled time is cancelled."
        affected={[`Visibility: ${VISIBILITY_LABEL[video.visibility]} → Public`, ...(video.scheduledAt ? [`Cancels schedule for ${dateTime(video.scheduledAt)}`] : [])]}
        confirmLabel="Publish now"
        onConfirm={() => (needsApproval ? submitForApproval(video.id) : publishNow(video.id))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Stat({ label, value, icon: Icon, sub }: { label: string; value: string; icon: typeof Eye; sub?: string }) {
  return (
    <div className={cn(yt.card, "p-3.5")}>
      <p className="flex items-center gap-1.5 text-[12px] text-[#6B7890]"><Icon className="size-3.5" />{label}</p>
      <p className="mt-1.5 text-[19px] font-semibold tabular-nums tracking-[-0.02em] text-[#0F1B3D]">{value}</p>
      {sub && <p className="text-[11.5px] text-[#98A2B3]">{sub}</p>}
    </div>
  );
}

function useVideoSeries(video: Video) {
  return useMemo(() => {
    const share = video.stats.views / 290_000;
    const scale = (days: number, offset = 0) =>
      buildSeries(days, offset).map((p) => ({ ...p, views: Math.round(p.views * share), watchTime: Math.round(p.watchTime * share), subscribers: Math.round(p.subscribers * share), impressions: Math.round(p.impressions * share) }));
    return { current: scale(28), previous: scale(28, 28) };
  }, [video.stats.views]);
}

function OverviewTab({ video, playlists }: { video: Video; playlists: { id: string; title: string }[] }) {
  const { can } = useYouTube();
  const published = video.status === "published";
  const series = useVideoSeries(video);
  const [metric, setMetric] = useState<MetricKey>("views");
  const s = video.stats;

  return (
    <div className="space-y-1">
      {published ? (
        can.canViewAnalytics.allowed ? (
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-7">
            <Stat label="Views" icon={Eye} value={full(s.views)} />
            <Stat label="Watch time" icon={Clock} value={hours(s.watchTimeHours)} />
            <Stat label="Avg. view duration" icon={Timer} value={duration(s.avgViewDurationSec)} sub={s.avgViewDurationSec ? `${Math.round((s.avgViewDurationSec / Math.max(1, video.durationSec)) * 100)}% of video` : undefined} />
            <Stat label="Impressions CTR" icon={MousePointerClick} value={percent(s.ctr)} sub={s.impressions ? `${compact(s.impressions)} impressions` : undefined} />
            <Stat label="Likes" icon={ThumbsUp} value={full(s.likes)} />
            <Stat label="Comments" icon={MessageSquare} value={full(s.comments)} />
            <Stat label="Subscribers gained" icon={UserPlus} value={s.subscribersGained === null ? "—" : `+${full(s.subscribersGained)}`} />
          </div>
        ) : (
          <Card><CapabilityState capability={can.canViewAnalytics} title="Video analytics unavailable" compact /></Card>
        )
      ) : (
        <Card>
          <EmptyState compact icon={BarChart3} title="Performance appears after publishing" description={video.status === "scheduled" ? `This video goes public ${dateTime(video.scheduledAt)}.` : "Views, watch time and engagement show up once the video is public."} />
        </Card>
      )}

      <div className="grid gap-1 xl:grid-cols-12">
        {published && can.canViewAnalytics.allowed && (
          <Card className="xl:col-span-8">
            <CardHeader
              title="Performance — last 28 days"
              actions={<Segmented<MetricKey> label="Metric" value={metric} onChange={setMetric} items={(["views", "watchTime", "subscribers"] as MetricKey[]).map((m) => ({ value: m, label: METRICS[m].short }))} />}
            />
            <div className="px-4 pb-4">
              <ChartLegend items={[{ label: METRICS[metric].label, color: METRICS[metric].color }, { label: "Previous 28 days", color: "#C9D1DC", dashed: true }]} />
              <div className="mt-2"><TrendChart current={series.current} previous={series.previous} metric={metric} granularity="daily" height={240} /></div>
            </div>
          </Card>
        )}
        <Card className={cn(published && can.canViewAnalytics.allowed ? "xl:col-span-4" : "xl:col-span-12")}>
          <CardHeader title="Video info" />
          <dl className="px-4 pb-3">
            <DefinitionRow label="Video ID" mono>{video.id}</DefinitionRow>
            <DefinitionRow label="URL">
              {published ? <a href={ytRoutes.watch(video.id)} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">youtu.be/{video.id}</a> : "Available after publishing"}
            </DefinitionRow>
            <DefinitionRow label="Visibility">{VISIBILITY_LABEL[video.visibility]}</DefinitionRow>
            <DefinitionRow label="Category">{categoryLabel(video.categoryId)}</DefinitionRow>
            <DefinitionRow label="Language">{languageLabel(video.language)}</DefinitionRow>
            <DefinitionRow label="Duration">{duration(video.durationSec)}</DefinitionRow>
            <DefinitionRow label="Published">{published ? dateTime(video.publishedAt) : video.status === "scheduled" ? `Scheduled · ${dateTime(video.scheduledAt)}` : "Not published"}</DefinitionRow>
            <DefinitionRow label="Playlists">
              {playlists.length ? (
                <span className="flex flex-col items-end gap-0.5">{playlists.map((p) => <Link key={p.id} href={ytRoutes.playlist(p.id)} className="text-[#2563EB] hover:underline">{p.title}</Link>)}</span>
              ) : "None"}
            </DefinitionRow>
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
  const series = useVideoSeries(video);
  const retention = useMemo(() => buildRetention(video.id.length * 131 + video.durationSec), [video.id, video.durationSec]);
  const [metric, setMetric] = useState<MetricKey>("views");
  const [granularity, setGranularity] = useState<Granularity>("daily");

  if (video.status !== "published") {
    return <Card><EmptyState icon={BarChart3} title="No analytics yet" description="Analytics become available after the video is published and collects views." /></Card>;
  }
  if (!can.canViewAnalytics.allowed) return <Card><CapabilityState capability={can.canViewAnalytics} title="Analytics unavailable" /></Card>;

  const subsGained = summarize(series.current, "subscribers");
  return (
    <div className="space-y-1">
      <Card>
        <CardHeader
          title="Views & watch time"
          description="Last 28 days vs previous 28 days"
          actions={
            <>
              <Segmented<MetricKey> label="Metric" value={metric} onChange={setMetric} items={(["views", "watchTime", "impressions", "ctr"] as MetricKey[]).map((m) => ({ value: m, label: METRICS[m].short }))} />
              <Segmented<Granularity> label="Granularity" value={granularity} onChange={setGranularity} items={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]} />
            </>
          }
        />
        <div className="px-4 pb-4"><TrendChart current={series.current} previous={series.previous} metric={metric} granularity={granularity} height={260} /></div>
      </Card>
      <div className="grid gap-1 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="Audience retention" description="How long viewers keep watching compared with typical videos of similar length" />
          <div className="px-4 pb-4">
            <ChartLegend items={[{ label: "This video", color: "#7C3AED" }, { label: "Typical", color: "#C9D1DC", dashed: true }]} />
            <div className="mt-2"><RetentionChart data={retention} durationSec={video.durationSec} height={230} /></div>
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader title="Traffic sources" />
          <div className="px-4 pb-4"><BarList data={trafficSources.slice(0, 6)} color="#2563EB" /></div>
        </Card>
      </div>
      <div className="grid gap-1 md:grid-cols-3">
        <Card>
          <CardHeader title="Audience" description="Age" />
          <div className="px-4 pb-4">{mockAudience.age ? <BarList data={mockAudience.age.slice(0, 5)} color="#0891B2" /> : null}</div>
        </Card>
        <Card>
          <CardHeader title="Devices" />
          <div className="px-4 pb-4">{mockAudience.devices ? <BarList data={mockAudience.devices} color="#7C3AED" /> : null}</div>
        </Card>
        <Card>
          <CardHeader title="Subscriber impact" />
          <div className="space-y-3 px-4 pb-4">
            <div className="rounded-lg bg-[#ECFAF3] px-3 py-2.5">
              <p className="text-[12px] text-[#067647]">Subscribers from this video</p>
              <p className="text-[22px] font-semibold tabular-nums text-[#0F1B3D]">+{full(subsGained)}</p>
            </div>
            <p className="text-[12.5px] leading-5 text-[#3C4A66]">
              That&apos;s <b>{((subsGained / Math.max(1, summarize(series.current, "views"))) * 1000).toFixed(1)}</b> subscribers per 1,000 views over 28 days.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SEO                                                                 */
/* ------------------------------------------------------------------ */

function SeoTab({ video, onEdit, onThumb }: { video: Video; onEdit: () => void; onThumb: () => void }) {
  const { videos, can } = useYouTube();
  const avg = useMemo(() => {
    const list = videos.filter((v) => v.stats.ctr !== null);
    return list.reduce((s, v) => s + (v.stats.ctr ?? 0), 0) / Math.max(1, list.length);
  }, [videos]);
  const { score, factors } = useMemo(() => videoOptimization(video, avg), [video, avg]);

  return (
    <div className="grid gap-1 xl:grid-cols-12">
      <Card className="h-fit p-4 xl:col-span-4">
        <div className="flex items-center gap-2"><h3 className="text-[13.5px] font-semibold text-[#0F1B3D]">Optimization score</h3><InternalBadge label="OmniPlatform Optimization" /></div>
        <div className="mt-4 flex items-center gap-4">
          <ScoreRing score={score} />
          <p className="text-[12.5px] leading-5 text-[#6B7890]">Based on OmniPlatform&apos;s analysis of your metadata and synced performance. YouTube doesn&apos;t publish an SEO score.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" icon={Pencil} gate={can.canEditVideo} onClick={onEdit}>Improve details</Button>
          <Button size="sm" variant="secondary" icon={ImageIcon} gate={can.canEditVideo} onClick={onThumb}>Test new thumbnail</Button>
        </div>
      </Card>
      <ul className="grid gap-1 md:grid-cols-2 xl:col-span-8">
        {factors.map((f) => <FactorRow key={f.key} factor={f} />)}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Details (metadata, approval, history, audit)                        */
/* ------------------------------------------------------------------ */

function DetailsTab({ video, onEdit, onHistory }: { video: Video; onEdit: () => void; onHistory: () => void }) {
  const { approvals, versions, audit, can, settings, submitForApproval, reviewApproval } = useYouTube();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const history = approvals.filter((a) => a.videoId === video.id);
  const lastChanges = versions.filter((v) => v.videoId === video.id).slice(0, 3);
  const events = audit.filter((a) => a.entity.id === video.id).slice(0, 6);
  const reviewable = video.approval === "pending";
  const canSubmit = (video.approval === "none" || video.approval === "changes_requested" || video.approval === "rejected") && video.status === "draft";

  const act = async (key: string, fn: () => Promise<boolean>) => {
    setBusy(key);
    const ok = await fn();
    setBusy(null);
    if (ok) setNote("");
  };

  return (
    <div className="grid gap-1 xl:grid-cols-12">
      <Card className="xl:col-span-7">
        <CardHeader title="Metadata" actions={<Button size="sm" variant="secondary" icon={Pencil} gate={can.canEditVideo} onClick={onEdit}>Edit</Button>} />
        <dl className="px-4 pb-3">
          <DefinitionRow label="Title">{video.title}</DefinitionRow>
          <DefinitionRow label="Description"><span className="block max-h-40 overflow-y-auto whitespace-pre-line text-left font-normal text-[#3C4A66]">{video.description || "—"}</span></DefinitionRow>
          <DefinitionRow label="Visibility">{VISIBILITY_LABEL[video.visibility]}</DefinitionRow>
          <DefinitionRow label="Audience">{video.madeForKids ? "Made for kids" : "Not made for kids"}{video.ageRestricted ? " · Age-restricted (18+)" : ""}</DefinitionRow>
          <DefinitionRow label="Category">{categoryLabel(video.categoryId)}</DefinitionRow>
          <DefinitionRow label="Language">{languageLabel(video.language)}</DefinitionRow>
          <DefinitionRow label="License">{video.license === "youtube" ? "Standard YouTube License" : "Creative Commons – Attribution"}</DefinitionRow>
          <DefinitionRow label="Embedding">{video.embeddable ? "Allowed" : "Not allowed"}</DefinitionRow>
          <DefinitionRow label="Comments">{video.commentsEnabled && !video.madeForKids ? "On" : "Off"}</DefinitionRow>
          <DefinitionRow label="Paid promotion">{video.paidPromotion ? "Yes — disclosure shown" : "No"}</DefinitionRow>
          <DefinitionRow label="Recording date">{date(video.recordingDate)}</DefinitionRow>
        </dl>
      </Card>

      <div className="space-y-1 xl:col-span-5">
        <Card>
          <CardHeader
            title="Approval"
            badge={<InternalBadge hint="Internal OmniPlatform workflow. Separate from the video's YouTube status." />}
            description={settings.moderation.requireApproval ? "Contributors submit content for review before it's published." : "Approval is optional for this workspace."}
          />
          <div className="space-y-3 px-4 pb-4">
            <div className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-3 py-2">
              <span className="text-[12px] text-[#6B7890]">Internal status</span>
              {video.approval === "none" ? <Badge>Not submitted</Badge> : <ApprovalBadge state={video.approval} />}
            </div>

            {(reviewable || canSubmit) && (
              <FormField label={reviewable ? "Reviewer note" : "Note for reviewer"} htmlFor="appr-note" hint={reviewable ? "Required when requesting changes or rejecting." : undefined}>
                <textarea id="appr-note" rows={2} className={yt.textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder={reviewable ? "What needs to change?" : "Anything the reviewer should know?"} />
              </FormField>
            )}

            {reviewable && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" icon={CheckCircle2} gate={can.canApprove} loading={busy === "approve"} onClick={() => act("approve", () => reviewApproval(video.id, "approved", note || undefined))}>Approve</Button>
                <Button size="sm" variant="secondary" icon={RotateCcw} gate={can.canApprove} loading={busy === "changes"} disabled={!note.trim()} disabledReason="Add a note describing the changes" onClick={() => act("changes", () => reviewApproval(video.id, "changes_requested", note))}>Request changes</Button>
                <Button size="sm" variant="danger" icon={XCircle} gate={can.canApprove} loading={busy === "reject"} disabled={!note.trim()} disabledReason="Add a note explaining why" onClick={() => act("reject", () => reviewApproval(video.id, "rejected", note))}>Reject</Button>
              </div>
            )}
            {canSubmit && (
              <Button size="sm" variant="secondary" icon={Send} gate={can.canUpload} loading={busy === "submit"} onClick={() => act("submit", () => submitForApproval(video.id, note || undefined))}>
                {video.approval === "none" ? "Submit for approval" : "Resubmit for approval"}
              </Button>
            )}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]">Approval history</p>
              {history.length === 0 ? (
                <p className="text-[12px] text-[#98A2B3]">No approval activity.</p>
              ) : (
                <ol className="space-y-2.5">
                  {history.map((h) => (
                    <li key={h.id} className="flex gap-2.5">
                      <Avatar name={h.actor} className="size-7" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-[#3C4A66]">
                          <b className="font-semibold text-[#0F1B3D]">{h.actor}</b> {h.action === "submitted" ? "submitted for approval" : h.action === "approved" ? "approved" : h.action === "rejected" ? "rejected" : "requested changes"}
                          <span className="text-[#98A2B3]"> · {relative(h.at)}</span>
                        </p>
                        {h.note && <p className="mt-0.5 rounded-md bg-[#F8FAFC] px-2 py-1 text-[12px] text-[#24324F]">“{h.note}”</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent changes" badge={<InternalBadge label="OmniPlatform history" />} actions={<Button size="xs" variant="link" onClick={onHistory}>View history</Button>} />
          <ul className="space-y-2 px-4 pb-4">
            {lastChanges.length === 0 && <li className="text-[12px] text-[#98A2B3]">No tracked changes yet.</li>}
            {lastChanges.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-[#3C4A66]"><b className="font-semibold text-[#0F1B3D]">{c.actor}</b> changed {c.field}</span>
                <span className="shrink-0 text-[11.5px] text-[#98A2B3]">{relative(c.at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Activity" badge={<InternalBadge label="Audit log" />} actions={<Button size="xs" variant="link" href={`${ytRoutes.settings}#audit`}>Full audit log</Button>} />
          <ul className="space-y-2 px-4 pb-4">
            {events.length === 0 && <li className="text-[12px] text-[#98A2B3]">No recorded activity.</li>}
            {events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2 text-[12.5px]">
                <span className="min-w-0 text-[#3C4A66]"><b className="font-semibold text-[#0F1B3D]">{e.actor}</b> · {e.summary}</span>
                <span className="shrink-0 text-[11.5px] text-[#98A2B3]" title={dateTime(e.at)}>{relative(e.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

