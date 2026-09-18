"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { usePeriod, useQueryState } from "../hooks/use-query-state";
import { ANALYTICS_METRICS, METRICS, TREND_METRICS, TYPE_LABEL, xRoutes } from "../lib/constants";
import { compact, date, formatMetric, percent, signed } from "../lib/format";
import { contentInsights, timingInsight } from "../lib/insights";
import {
  downloadFile,
  engagementRate,
  groupPerformance,
  lowPerformingPosts,
  performanceByHour,
  performanceByWeekday,
  toCsv,
  topPosts,
  type PerformanceRow,
} from "../x-data/selectors";
import { useXAnalytics } from "../x-data/hooks";
import { useX } from "../store/x-store";
import type { MetricKey, XPost } from "../x-data/types";
import { BarList, ColumnChart, KpiCard, KpiSkeleton, TrendChart, granularityFor } from "../components/charts";
import { PeriodSegmented } from "../components/date-range";
import { CapabilityState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  InternalBadge,
  PostText,
  Segmented,
  SourceBadge,
  TypeBadge,
  UnderlineTabs,
  buttonClass,
  numClass,
  tdClass,
  thClass,
  x,
} from "../components/ui";

const DEFAULTS = { metric: "impressions", breakdown: "type", compare: "1" };

export function AnalyticsPage() {
  const { ready, can } = useX();
  if (!ready) return <PageSkeleton />;
  if (!can.canReadAnalytics.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadAnalytics} title="Analytics unavailable" />
      </Card>
    );
  }
  return <Analytics />;
}

function Analytics() {
  const { posts, account, audience } = useX();
  const { days, label } = usePeriod();
  const analytics = useXAnalytics(days);
  const { values, set } = useQueryState(useMemo(() => DEFAULTS, []));

  const metric = (TREND_METRICS.includes(values.metric as MetricKey) ? values.metric : "impressions") as MetricKey;
  const compare = values.compare !== "0";

  const published = useMemo(() => posts.filter((post) => post.status === "published"), [posts]);
  const insights = useMemo(() => contentInsights(posts), [posts]);
  const timing = useMemo(() => timingInsight(posts), [posts]);

  const series = useMemo(() => audience.followerSeries.slice(-days), [audience.followerSeries, days]);
  const gained = series.reduce((sum, point) => sum + point.gained, 0);
  const lost = series.reduce((sum, point) => sum + point.lost, 0);

  if (analytics.error) {
    return (
      <Card>
        <EmptyState
          icon={AlertTriangle}
          title="Analytics are unavailable"
          description={analytics.error}
          action={
            <Button variant="primary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
          secondary={<Button variant="secondary" href={`${xRoutes.settings}#connection`}>Check connection</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSegmented size="md" />
          <Button size="sm" variant={compare ? "primary" : "secondary"} aria-pressed={compare} onClick={() => set({ compare: compare ? "0" : "1" })}>
            Compare previous period
          </Button>
          <span className="text-[12px] text-[#6B7890]">{label}</span>
        </div>
        <ExportMenu posts={published} analytics={analytics} periodLabel={label} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-5">
        {analytics.loading ? (
          <KpiSkeleton count={10} />
        ) : (
          ANALYTICS_METRICS.map((key) => (
            <KpiCard
              key={key}
              metric={key}
              value={analytics.totals[key].value}
              previous={compare ? analytics.totals[key].previous : null}
              spark={analytics.spark[key]}
              active={metric === key}
              onClick={TREND_METRICS.includes(key) ? () => set({ metric: key }) : undefined}
              comparisonLabel="prev."
            />
          ))
        )}
      </div>

      {/* Trend */}
      <Card>
        <CardHeader
          title="Performance trend"
          description={`${METRICS[metric].label} · ${label}`}
          badge={<SourceBadge />}
          actions={
            <Segmented
              label="Trend metric"
              value={metric}
              onChange={(value) => set({ metric: value })}
              items={TREND_METRICS.map((key) => ({ value: key, label: METRICS[key].short }))}
            />
          }
        />
        <div className="px-4 pb-4">
          {analytics.loading ? (
            <div className="h-[300px] animate-pulse rounded-sm bg-[#F5F7FA]" aria-busy="true" aria-label="Loading chart" />
          ) : (
            <>
              <TrendChart
                current={analytics.current}
                previous={analytics.previous}
                metric={metric}
                granularity={granularityFor(days)}
                compare={compare}
                height={300}
              />
              {compare && (
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#6B7890]">
                  <span className="flex items-center gap-1.5">
                    <i className="h-0.5 w-3.5 rounded" style={{ background: METRICS[metric].color }} />
                    Current period
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-0 w-3.5 border-t-2 border-dashed border-[#C9D1DC]" />
                    Previous {days} days
                  </span>
                  <span className="ml-auto">
                    {formatMetric(metric, analytics.totals[metric].value)} vs {formatMetric(metric, analytics.totals[metric].previous)}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Content performance */}
      <ContentPerformance posts={published} breakdown={values.breakdown} onBreakdown={(value) => set({ breakdown: value })} />

      {/* Top & low posts */}
      <div className="grid gap-1 xl:grid-cols-2">
        <PostTable
          title="Top performing posts"
          description="Highest engagement rate with enough impressions to judge"
          icon={TrendingUp}
          rows={topPosts(published, 6, "engagementRate")}
          emptyText="Publish a few posts to see which formats work best."
        />
        <PostTable
          title="Lowest performing posts"
          description="Posts with 5,000+ impressions and the weakest engagement"
          icon={TrendingDown}
          rows={lowPerformingPosts(published, 6)}
          emptyText="Not enough posts with meaningful reach yet to rank the weakest."
          invert
        />
      </div>

      {/* Timing */}
      <div className="grid gap-1 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader
            title="Posting time insights"
            description="Average engagement rate of your published posts"
            icon={Clock}
            badge={<InternalBadge label="OmniPlatform insight" hint="Calculated by OmniPlatform from your own published posts, not supplied by X." />}
          />
          <div className="grid gap-4 px-4 pb-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] font-semibold text-[#24324F]">By day of week</p>
              {timing.byDay.length ? (
                <ColumnChart
                  data={timing.byDay.map((row) => ({ label: row.label, value: Number(row.value.toFixed(2)) }))}
                  valueLabel="% engagement"
                  formatValue={(value) => value.toFixed(2)}
                  height={168}
                />
              ) : (
                <p className="py-8 text-center text-[12.5px] text-[#98A2B3]">Not enough published posts yet.</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold text-[#24324F]">By hour published</p>
              {timing.byHour.length ? (
                <BarList
                  data={[...timing.byHour].sort((a, b) => b.value - a.value).slice(0, 6).map((row) => ({ label: row.label, value: row.value }))}
                  format={(value) => `${value.toFixed(2)}%`}
                />
              ) : (
                <p className="py-8 text-center text-[12.5px] text-[#98A2B3]">Not enough published posts yet.</p>
              )}
            </div>
          </div>
          <div className="mx-4 mb-4 flex items-start gap-2.5 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] px-3 py-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#6D28D9]" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#0F1B3D]">OmniPlatform recommendation</p>
              <p className="mt-0.5 text-[12px] leading-4 text-[#3C4A66]">{timing.headline}</p>
              {timing.bestDays.length > 0 && (
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {timing.bestDays.map((day) => (
                    <Badge key={day} tone="violet">
                      Best day: {day}
                    </Badge>
                  ))}
                  {timing.bestHours.map((hour) => (
                    <Badge key={hour} tone="violet">
                      Best hour: {hour}
                    </Badge>
                  ))}
                </p>
              )}
            </div>
            <Button size="sm" variant="secondary" href={xRoutes.scheduling} className="shrink-0">
              Plan content
            </Button>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader
            title="Audience growth"
            description={label}
            badge={<SourceBadge />}
            actions={<Button size="xs" variant="secondary" href={xRoutes.audience}>Audience</Button>}
          />
          <div className="space-y-3 px-4 pb-4">
            <GrowthRow label="New followers" value={compact(gained)} tone="green" />
            <GrowthRow label="Unfollows" value={compact(lost)} tone="red" />
            <GrowthRow label="Net growth" value={signed(gained - lost)} tone={gained - lost >= 0 ? "green" : "red"} emphasis />
            <GrowthRow label="Follower total" value={compact(account.followers)} />
            <GrowthRow
              label="Growth rate"
              value={percent(account.followers ? ((gained - lost) / account.followers) * 100 : null, 2)}
              hint="Net growth as a share of your current follower count."
            />
            {!analytics.loading && (
              <div className="rounded-sm border border-[#E4E9F0] bg-[#F8FAFC] p-3">
                <p className="text-[11.5px] leading-4 text-[#3C4A66]">
                  Profile visits in this period:{" "}
                  <b className="font-semibold text-[#0F1B3D]">{compact(analytics.totals.profileVisits.value)}</b>. Roughly{" "}
                  <b className="font-semibold text-[#0F1B3D]">
                    {percent(analytics.totals.profileVisits.value ? ((gained) / analytics.totals.profileVisits.value) * 100 : null, 1)}
                  </b>{" "}
                  of visitors went on to follow.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* What is working */}
      {insights.length > 0 && (
        <Card>
          <CardHeader
            title="What's working"
            description="Patterns OmniPlatform found in your published posts"
            icon={Sparkles}
            badge={<InternalBadge label="OmniPlatform insight" hint="Derived by OmniPlatform from your own posts." />}
          />
          <div className="grid gap-1 px-4 pb-4 md:grid-cols-3">
            {insights.map((insight) => (
              <div key={insight.id} className="rounded-sm border border-[#E4E9F0] p-3">
                <p className="text-[12.5px] font-semibold text-[#0F1B3D]">{insight.title}</p>
                <p className="mt-1 text-[12px] leading-4 text-[#3C4A66]">{insight.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function GrowthRow({ label, value, tone, emphasis, hint }: { label: string; value: string; tone?: "green" | "red"; emphasis?: boolean; hint?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-[#EEF1F5] pb-2.5 last:border-0", emphasis && "font-semibold")} title={hint}>
      <span className="text-[12.5px] text-[#3C4A66]">{label}</span>
      <span className={cn("text-[14px] font-semibold tabular-nums", tone === "green" ? "text-[#067647]" : tone === "red" ? "text-[#C81E2B]" : "text-[#0F1B3D]")}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Content performance                                                 */
/* ------------------------------------------------------------------ */

const BREAKDOWNS = [
  { value: "type", label: "Post type" },
  { value: "media", label: "Media type" },
  { value: "day", label: "Day of week" },
  { value: "hour", label: "Time of day" },
  { value: "campaign", label: "Campaign" },
  { value: "tag", label: "Internal tag" },
];

function ContentPerformance({ posts, breakdown, onBreakdown }: { posts: XPost[]; breakdown: string; onBreakdown: (value: string) => void }) {
  const { campaignName } = useX();

  const rows = useMemo<PerformanceRow[]>(() => {
    switch (breakdown) {
      case "media":
        return groupPerformance(
          posts,
          (post) => (post.media.length === 0 ? "none" : (post.media[0]!.kind as string)),
          (key) => (key === "none" ? "Text only" : key === "video" ? "Video" : key === "gif" ? "GIF" : "Image"),
        );
      case "day":
        return performanceByWeekday(posts);
      case "hour":
        return performanceByHour(posts);
      case "campaign":
        return groupPerformance(posts, (post) => post.campaignId, (key) => campaignName(key));
      case "tag": {
        // A post can carry several tags, so it contributes to each of them.
        const expanded = posts.flatMap((post) => post.internalTags.map((tag) => ({ ...post, internalTags: [tag] })));
        return groupPerformance(expanded, (post) => post.internalTags[0] ?? null, (key) => key);
      }
      default:
        return groupPerformance(posts, (post) => post.type, (key) => TYPE_LABEL[key]);
    }
  }, [posts, breakdown, campaignName]);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Content performance"
        description="Where your engagement actually comes from"
        icon={BarChart3}
        badge={<SourceBadge hint="Metrics from X, grouped by OmniPlatform fields." />}
        actions={
          <div className="scrollbar-thin max-w-full overflow-x-auto">
            <UnderlineTabs label="Break down by" size="sm" value={breakdown} onChange={onBreakdown} items={BREAKDOWNS} />
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={BarChart3} compact title="No data for this breakdown" description="Publish more posts, or add campaigns and tags to your content, to see this split." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto border-t border-[#E4E9F0]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={cn(thClass, "min-w-[160px]")}>
                  {BREAKDOWNS.find((item) => item.value === breakdown)?.label}
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Posts
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Impressions
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Engagements
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Eng. rate
                </th>
                <th scope="col" className={cn(thClass, "min-w-[140px]")}>
                  Share of impressions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = rows.reduce((sum, item) => sum + item.impressions, 0);
                const share = total ? (row.impressions / total) * 100 : 0;
                return (
                  <tr key={row.label} className="transition-colors hover:bg-[#FAFBFD]">
                    <td className={cn(tdClass, "font-medium text-[#0F1B3D]")}>{row.label}</td>
                    <td className={cn(tdClass, numClass)}>{row.posts}</td>
                    <td className={cn(tdClass, numClass)}>{compact(row.impressions)}</td>
                    <td className={cn(tdClass, numClass)}>{compact(row.engagements)}</td>
                    <td className={cn(tdClass, numClass, "font-semibold text-[#0F1B3D]")}>{percent(row.engagementRate, 2)}</td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-sm bg-[#EEF1F5]">
                          <span className="block h-full rounded-sm bg-[#2563EB]" style={{ width: `${share}%` }} />
                        </span>
                        <span className="w-10 shrink-0 text-right text-[11.5px] tabular-nums text-[#6B7890]">{share.toFixed(0)}%</span>
                      </span>
                    </td>
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
/* Post tables                                                         */
/* ------------------------------------------------------------------ */

function PostTable({
  title,
  description,
  icon,
  rows,
  emptyText,
  invert,
}: {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  rows: XPost[];
  emptyText: string;
  invert?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} description={description} icon={icon} badge={<SourceBadge />} />
      {rows.length === 0 ? (
        <EmptyState icon={icon} compact title="Not enough data yet" description={emptyText} />
      ) : (
        <div className="scrollbar-thin overflow-x-auto border-t border-[#E4E9F0]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={cn(thClass, "min-w-[220px]")}>
                  Post
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Impr.
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Eng. rate
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Likes
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Replies
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Reposts
                </th>
                <th scope="col" className={cn(thClass, "text-right")}>
                  Clicks
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((post) => (
                <tr key={post.id} className="transition-colors hover:bg-[#FAFBFD]">
                  <td className={cn(tdClass, "max-w-[280px]")}>
                    <Link href={xRoutes.post(post.id)} className={cn("block rounded", x.focus)}>
                      <PostText text={post.text} clamp={2} className="text-[12px]" />
                    </Link>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <TypeBadge type={post.type} />
                      <span className="text-[11px] text-[#98A2B3]">{date(post.publishedAt, "MMM d")}</span>
                    </span>
                  </td>
                  <td className={cn(tdClass, numClass)}>{compact(post.metrics.impressions)}</td>
                  <td className={cn(tdClass, numClass, "font-semibold", invert ? "text-[#C81E2B]" : "text-[#067647]")}>
                    {percent(engagementRate(post), 2)}
                  </td>
                  <td className={cn(tdClass, numClass)}>{compact(post.metrics.likes)}</td>
                  <td className={cn(tdClass, numClass)}>{compact(post.metrics.replies)}</td>
                  <td className={cn(tdClass, numClass)}>{compact(post.metrics.reposts)}</td>
                  <td className={cn(tdClass, numClass)}>{compact(post.metrics.linkClicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function ExportMenu({
  posts,
  analytics,
  periodLabel,
}: {
  posts: XPost[];
  analytics: ReturnType<typeof useXAnalytics>;
  periodLabel: string;
}) {
  const { account, memberName, campaignName } = useX();
  const stamp = new Date().toISOString().slice(0, 10);

  const postRows = () =>
    posts.map((post) => ({
      id: post.id,
      published_at: post.publishedAt ?? "",
      type: post.type,
      text: post.text.replace(/\s+/g, " ").trim(),
      owner: memberName(post.ownerId),
      campaign: campaignName(post.campaignId),
      internal_tags: post.internalTags.join("|"),
      impressions: post.metrics.impressions,
      engagements: post.metrics.engagements,
      engagement_rate: engagementRate(post).toFixed(3),
      likes: post.metrics.likes,
      replies: post.metrics.replies,
      reposts: post.metrics.reposts,
      quotes: post.metrics.quotes,
      bookmarks: post.metrics.bookmarks,
      link_clicks: post.metrics.linkClicks,
      profile_visits: post.metrics.profileVisits,
      video_views: post.metrics.videoViews ?? "",
    }));

  const seriesRows = () => analytics.current.map((point) => ({ ...point, date: point.date.slice(0, 10) }));

  const done = (filename: string) => toast.success("Export ready", { description: `${filename} has been downloaded.` });

  return (
    <ActionMenu
      label="Export analytics"
      width={250}
      items={[
        {
          label: "Post data (CSV)",
          icon: FileSpreadsheet,
          onSelect: () => {
            const name = `x-posts-${stamp}.csv`;
            downloadFile(name, toCsv(postRows()), "text/csv;charset=utf-8");
            done(name);
          },
          disabledReason: posts.length === 0 ? "There are no published posts to export." : undefined,
        },
        {
          label: "Daily metrics (CSV)",
          icon: FileSpreadsheet,
          onSelect: () => {
            const name = `x-daily-metrics-${stamp}.csv`;
            downloadFile(name, toCsv(seriesRows()), "text/csv;charset=utf-8");
            done(name);
          },
          disabledReason: analytics.loading ? "Wait for the metrics to finish loading." : undefined,
        },
        "separator",
        {
          label: "Full report (JSON)",
          icon: FileJson,
          onSelect: () => {
            const name = `x-report-${stamp}.json`;
            downloadFile(
              name,
              JSON.stringify(
                {
                  account: { handle: account.handle, name: account.name, followers: account.followers },
                  period: periodLabel,
                  generatedAt: new Date().toISOString(),
                  totals: analytics.totals,
                  daily: seriesRows(),
                  posts: postRows(),
                },
                null,
                2,
              ),
              "application/json",
            );
            done(name);
          },
          disabledReason: analytics.loading ? "Wait for the metrics to finish loading." : undefined,
        },
        {
          label: "Print / save as PDF",
          icon: Download,
          onSelect: () => window.print(),
        },
      ]}
      trigger={
        <button type="button" className={buttonClass("secondary", "md", "h-8")}>
          <Download className="size-3.5" />
          Export
        </button>
      }
    />
  );
}
