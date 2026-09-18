"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CalendarDays,
  ExternalLink,
  Eye,
  Heart,
  Info,
  Link2,
  ListChecks,
  MessageSquare,
  MousePointerClick,
  Plus,
  RefreshCw,
  Repeat2,
  Settings as SettingsIcon,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useHydrated } from "../hooks/use-now";
import { usePeriod } from "../hooks/use-query-state";
import { OVERVIEW_METRICS, xRoutes } from "../lib/constants";
import { compact, date, percent, relative, time } from "../lib/format";
import { scoreTone } from "../lib/insights";
import { useAccountHealth, useAttention, useXAnalytics } from "../x-data/hooks";
import {
  countMentions,
  engagementRate,
  failedPosts,
  mentionsNeedingAttention,
  scheduledPosts,
  topPosts,
} from "../x-data/selectors";
import { useX } from "../store/x-store";
import type { MetricKey, XPost } from "../x-data/types";
import type { Severity } from "../x-data/selectors";
import { KpiCard, KpiSkeleton, ScoreRing, TrendChart, granularityFor } from "../components/charts";
import { PeriodSegmented } from "../components/date-range";
import { ActivityLogSheet, HealthDetailSheet } from "../components/dialogs";
import { usePostActions } from "../components/post-actions";
import { CapabilityState, ListSkeleton, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  InternalBadge,
  Meter,
  PostText,
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  TypeBadge,
  VerifiedMark,
  ViewLink,
  XLogo,
  buttonClass,
  x,
} from "../components/ui";
import { SyncStatus } from "../components/workspace";

const KPI_ICONS: Record<MetricKey, typeof Eye> = {
  impressions: Eye,
  engagements: Heart,
  engagementRate: MousePointerClick,
  likes: Heart,
  replies: MessageSquare,
  reposts: Repeat2,
  linkClicks: Link2,
  profileVisits: Users,
  followerGrowth: UserPlus,
  videoViews: BarChart3,
};

export function OverviewPage() {
  const { ready } = useX();
  if (!ready) return <PageSkeleton />;
  return <Overview />;
}

function Overview() {
  const { can } = useX();
  const { days, label } = usePeriod();
  const analytics = useXAnalytics(days);
  const [metric, setMetric] = useState<MetricKey>("impressions");
  const actions = usePostActions();

  return (
    <div className="space-y-1">
      <div className="grid gap-1 xl:grid-cols-12">
        <AccountCard className="xl:col-span-8" />
        <HealthCard className="xl:col-span-4" />
      </div>

      <NeedsAttention />

      {can.canReadAnalytics.allowed ? (
        <>
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
            {analytics.loading ? (
              <KpiSkeleton count={6} />
            ) : (
              OVERVIEW_METRICS.map((key) => (
                <KpiCard
                  key={key}
                  metric={key}
                  icon={KPI_ICONS[key]}
                  value={analytics.totals[key].value}
                  previous={analytics.totals[key].previous}
                  spark={analytics.spark[key]}
                  active={metric === key}
                  onClick={key === "engagementRate" || key === "profileVisits" ? undefined : () => setMetric(key)}
                  comparisonLabel="prev. period"
                />
              ))
            )}
          </div>

          <div className="grid gap-1 xl:grid-cols-12">
            <PerformanceCard className="xl:col-span-8" metric={metric} onMetric={setMetric} analytics={analytics} periodLabel={label} days={days} />
            <QuickActions className="xl:col-span-4" />
          </div>
        </>
      ) : (
        <Card>
          <CapabilityState capability={can.canReadAnalytics} title="Analytics unavailable" />
        </Card>
      )}

      <div className="grid gap-1 xl:grid-cols-12">
        <TopPostsCard className="xl:col-span-8" actions={actions} />
        <MentionsCard className="xl:col-span-4" />
      </div>

      <ScheduledCard actions={actions} />

      {actions.dialogs}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A. Account header                                                   */
/* ------------------------------------------------------------------ */

function AccountCard({ className }: { className?: string }) {
  const { account, connection, can, posts, mentions } = useX();
  const hydrated = useHydrated();
  const counts = countMentions(mentions);
  const published = posts.filter((post) => post.status === "published").length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative h-[92px] bg-[#E9EDF3]">
        {account.bannerUrl && (
          <Image src={account.bannerUrl} alt={`${account.name} header image`} fill priority sizes="(min-width: 1280px) 900px, 100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/30 via-transparent to-transparent" />
      </div>

      <div className="px-4 pb-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-3">
            <span className="relative -mt-8 size-[68px] shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_2px_8px_rgba(15,27,61,0.15)]">
              <Image src={account.avatarUrl} alt="" width={68} height={68} className="size-full object-contain bg-white" />
            </span>
            <div className="min-w-0 pt-2">
              <p className="flex items-center gap-1.5 text-[16px] font-semibold leading-5 text-[#0F1B3D]">
                <span className="truncate">{account.name}</span>
                <VerifiedMark kind={account.verified} />
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-[#6B7890]">
                <span>{account.handle}</span>
                <span className="text-[#C9D1DC]">·</span>
                <span>
                  Joined {date(account.joinedAt, "MMM yyyy")}
                </span>
                {account.location && (
                  <>
                    <span className="text-[#C9D1DC]">·</span>
                    <span>{account.location}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="dark" icon={ExternalLink} href={xRoutes.profileOnX(account.handle)} external>
              View on X
            </Button>
            <Button size="sm" variant="secondary" icon={ShieldCheck} href={`${xRoutes.settings}#connection`} gate={can.canManageConnection}>
              Manage connection
            </Button>
          </div>
        </div>

        <p className="mt-2.5 max-w-[640px] text-[12.5px] leading-5 text-[#3C4A66]">{account.bio}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EEF1F5] pt-3">
          <Stat label="Followers" value={compact(account.followers)} href={xRoutes.audience} />
          <Stat label="Following" value={compact(account.following)} href={xRoutes.audience} />
          <Stat label="Posts on X" value={compact(account.posts)} href={xRoutes.content} />
          <Stat label="In OmniPlatform" value={compact(published)} href={`${xRoutes.content}?status=published`} internal />
          <Stat label="Unanswered mentions" value={compact(counts.unanswered)} href={`${xRoutes.mentions}?status=unanswered`} alert={counts.needsAttention > 0} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SyncStatus />
          </div>
        </div>

        {connection.state === "connected" && hydrated && (
          <p className="mt-1.5 text-[11.5px] text-[#98A2B3]">
            Next automatic sync {relative(connection.nextSyncAt)} · account status{" "}
            <b className="font-semibold text-[#3C4A66]">{account.protected ? "Protected" : "Public"}</b>
          </p>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, href, internal, alert }: { label: string; value: string; href: string; internal?: boolean; alert?: boolean }) {
  return (
    <Link href={href} className={cn("group rounded", x.focus)}>
      <span className="flex items-baseline gap-1.5">
        <b className={cn("text-[15px] font-semibold tabular-nums", alert ? "text-[#C81E2B]" : "text-[#0F1B3D]")}>{value}</b>
        <span className="text-[12px] text-[#6B7890] group-hover:text-[#2563EB]">{label}</span>
        {internal && <InternalBadge label="Internal" hint="Counted from the posts OmniPlatform knows about, not X's lifetime total." />}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* G. Account health                                                   */
/* ------------------------------------------------------------------ */

function HealthCard({ className }: { className?: string }) {
  const { score, factors } = useAccountHealth();
  const [open, setOpen] = useState(false);
  // Weakest first — the one to fix is the one you read first.
  const ranked = [...factors].sort((a, b) => a.score - b.score);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="X account health"
        badge={<InternalBadge hint="Computed by OmniPlatform from your connection, posting cadence, inbox and queue. X does not provide this score." />}
        description="Six internal signals for this channel"
        actions={
          <Button size="xs" variant="secondary" onClick={() => setOpen(true)}>
            View breakdown
          </Button>
        }
      />
      <div className="flex flex-1 flex-wrap items-center gap-4 px-4 pb-4">
        <ScoreRing score={score} tone={scoreTone(score)} size={96} label="Account health" />
        <ul className="min-w-[180px] flex-1 space-y-2">
          {ranked.map((factor) => {
            const tone = scoreTone(factor.score);
            return (
              <li key={factor.key}>
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="truncate text-[#3C4A66]">{factor.label}</span>
                  <b className={cn("shrink-0 font-semibold tabular-nums", tone === "green" ? "text-[#067647]" : tone === "amber" ? "text-[#B54708]" : "text-[#C81E2B]")}>
                    {factor.score}
                  </b>
                </div>
                <Meter value={factor.score} tone={tone === "green" ? "green" : tone === "amber" ? "amber" : "red"} className="mt-1" />
              </li>
            );
          })}
        </ul>
      </div>
      <HealthDetailSheet open={open} onOpenChange={setOpen} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* I. Needs attention                                                  */
/* ------------------------------------------------------------------ */

const SEVERITY_META: Record<Severity, { tone: "red" | "amber" | "blue"; label: string; icon: typeof AlertTriangle }> = {
  critical: { tone: "red", label: "Critical", icon: AlertTriangle },
  warning: { tone: "amber", label: "Warning", icon: AlertTriangle },
  info: { tone: "blue", label: "For information", icon: Info },
};

function NeedsAttention() {
  const items = useAttention();
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Needs attention"
        description={`${items.length} item${items.length === 1 ? "" : "s"} to look at, most urgent first`}
        icon={AlertTriangle}
      />
      <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
        {items.map((item) => {
          const meta = SEVERITY_META[item.severity];
          return (
            <li key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBFD]">
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-sm",
                  meta.tone === "red" ? "bg-[#FEF1F2] text-[#C81E2B]" : meta.tone === "amber" ? "bg-[#FFF7E8] text-[#B54708]" : "bg-[#EFF4FF] text-[#1D4ED8]",
                )}
              >
                <meta.icon className="size-3.5" />
              </span>
              <div className="min-w-[200px] flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-[#0F1B3D]">
                  {item.title}
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </p>
                <p className="mt-0.5 text-[12px] leading-4 text-[#3C4A66]">{item.description}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-[#98A2B3]">{item.entity}</p>
              </div>
              <Button size="sm" variant="secondary" href={item.action.href} className="shrink-0">
                {item.action.label}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* C. Performance trend                                                */
/* ------------------------------------------------------------------ */

function PerformanceCard({
  className,
  metric,
  onMetric,
  analytics,
  periodLabel,
  days,
}: {
  className?: string;
  metric: MetricKey;
  onMetric: (metric: MetricKey) => void;
  analytics: ReturnType<typeof useXAnalytics>;
  periodLabel: string;
  days: number;
}) {
  const [compare, setCompare] = useState(true);

  return (
    <Card className={className}>
      <CardHeader
        title="Performance"
        description={periodLabel}
        badge={<SourceBadge />}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <PeriodSegmented />
            <Button size="sm" variant={compare ? "primary" : "secondary"} aria-pressed={compare} onClick={() => setCompare((value) => !value)}>
              Compare previous
            </Button>
            <Button size="sm" variant="secondary" href={xRoutes.analytics}>
              Full analytics
            </Button>
          </div>
        }
      />
      <div className="px-4 pb-4">
        {analytics.loading ? (
          <div className="h-[268px] animate-pulse rounded-sm bg-[#F5F7FA]" aria-busy="true" aria-label="Loading chart" />
        ) : analytics.error ? (
          <EmptyState icon={AlertTriangle} compact title="Analytics unavailable" description={analytics.error} />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {(["impressions", "engagements", "linkClicks", "followerGrowth"] as MetricKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={metric === key}
                    onClick={() => onMetric(key)}
                    className={cn(
                      "rounded-sm px-2 py-1 text-[12px] font-semibold transition",
                      metric === key ? "bg-[#EFF4FF] text-[#1D4ED8]" : "text-[#6B7890] hover:bg-[#F1F4F8] hover:text-[#0F1B3D]",
                      x.focus,
                    )}
                  >
                    {key === "linkClicks" ? "Link clicks" : key === "followerGrowth" ? "Follower growth" : key === "impressions" ? "Impressions" : "Engagements"}
                  </button>
                ))}
              </div>
              {compare && <span className="text-[11.5px] text-[#98A2B3]">Dashed line is the previous {days} days</span>}
            </div>
            <TrendChart
              current={analytics.current}
              previous={analytics.previous}
              metric={metric}
              granularity={granularityFor(days)}
              compare={compare}
              height={256}
            />
          </>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* H. Quick actions                                                    */
/* ------------------------------------------------------------------ */

function QuickActions({ className }: { className?: string }) {
  const router = useRouter();
  const { can, syncNow, mentions } = useX();
  const [syncing, setSyncing] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const counts = countMentions(mentions);

  const items = [
    { label: "Create post", description: "Write a post, thread or poll", icon: Plus, gate: can.canCreatePost, onClick: () => router.push(`${xRoutes.content}?compose=new`) },
    { label: "Schedule a post", description: "Add to the publishing queue", icon: CalendarClock, gate: can.canSchedulePost, onClick: () => router.push(`${xRoutes.content}?compose=new&intent=schedule`) },
    { label: "View mentions", description: `${counts.unanswered} unanswered`, icon: MessageSquare, gate: can.canReadMentions, onClick: () => router.push(`${xRoutes.mentions}?status=unanswered`) },
    { label: "View analytics", description: "Deep performance reporting", icon: BarChart3, gate: can.canReadAnalytics, onClick: () => router.push(xRoutes.analytics) },
    { label: "Open calendar", description: "All channels, one view", icon: CalendarDays, onClick: () => router.push(xRoutes.calendar) },
    { label: "Manage settings", description: "Sync, rules and team access", icon: SettingsIcon, gate: can.canManageSettings, onClick: () => router.push(xRoutes.settings) },
  ];

  return (
    <Card className={className}>
      <CardHeader
        title="Quick actions"
        actions={
          <Button size="xs" variant="secondary" icon={ListChecks} onClick={() => setLogOpen(true)}>
            Activity log
          </Button>
        }
      />
      <div className="grid gap-1 px-4 pb-3 sm:grid-cols-2 xl:grid-cols-1">
        {items.map((item) => {
          const blocked = item.gate && !item.gate.allowed;
          return (
            <button
              key={item.label}
              type="button"
              disabled={blocked}
              title={blocked ? item.gate?.reason : undefined}
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-2.5 rounded-sm border border-transparent px-2.5 py-2 text-left transition",
                blocked ? "cursor-not-allowed opacity-55" : "hover:border-[#E4E9F0] hover:bg-[#F8FAFC]",
                x.focus,
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#EFF4FF] text-[#1D4ED8]">
                <item.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{item.label}</span>
                <span className="block truncate text-[11.5px] text-[#6B7890]">{blocked ? item.gate?.reason : item.description}</span>
              </span>
            </button>
          );
        })}
        <button
          type="button"
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            await syncNow();
            setSyncing(false);
          }}
          className={cn("flex items-center gap-2.5 rounded-sm border border-transparent px-2.5 py-2 text-left transition hover:border-[#E4E9F0] hover:bg-[#F8FAFC]", x.focus)}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#ECFAF3] text-[#067647]">
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{syncing ? "Syncing…" : "Sync account"}</span>
            <span className="block truncate text-[11.5px] text-[#6B7890]">Pull the latest from X</span>
          </span>
        </button>
      </div>
      <ActivityLogSheet open={logOpen} onOpenChange={setLogOpen} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* D. Top performing posts                                             */
/* ------------------------------------------------------------------ */

function TopPostsCard({ className, actions }: { className?: string; actions: ReturnType<typeof usePostActions> }) {
  const { posts, can, ready } = useX();
  const top = useMemo(() => topPosts(posts, 5, "impressions"), [posts]);

  if (!can.canReadPosts.allowed) {
    return (
      <Card className={className}>
        <CardHeader title="Top performing posts" />
        <CapabilityState capability={can.canReadPosts} compact />
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Top performing posts"
        description="Your best posts by impressions in the selected range"
        badge={<SourceBadge />}
        actions={<ViewLink href={`${xRoutes.content}?status=published&sort=impressions`}>View all content</ViewLink>}
      />
      {!ready ? (
        <ListSkeleton rows={4} />
      ) : top.length === 0 ? (
        <EmptyState
          icon={XLogo}
          compact
          title="No published posts yet"
          description="Once you publish your first post, its performance shows up here."
          action={<Button variant="primary" icon={Plus} gate={can.canCreatePost} href={`${xRoutes.content}?compose=new`}>Create a post</Button>}
        />
      ) : (
        <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
          {top.map((post) => (
            <li key={post.id} className="group flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBFD]">
              {post.media[0] ? (
                <span className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-[#E9EDF3] ring-1 ring-inset ring-[#E4E9F0]">
                  <Image src={post.media[0].url} alt="" fill sizes="44px" className="object-cover" />
                </span>
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-sm bg-[#F1F4F8] text-[#98A2B3]">
                  <XLogo className="size-4" />
                </span>
              )}

              <div className="min-w-[180px] flex-1">
                <Link href={xRoutes.post(post.id)} className={cn("block rounded", x.focus)}>
                  <PostText text={post.text} clamp={2} className="text-[12.5px] group-hover:text-[#0F1B3D]" />
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[#6B7890]">
                  <TypeBadge type={post.type} />
                  <span>{date(post.publishedAt)}</span>
                  <span className="text-[#C9D1DC]">·</span>
                  <span>{percent(engagementRate(post), 2)} engagement rate</span>
                </p>
              </div>

              <dl className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
                <Metric label="Impressions" value={compact(post.metrics.impressions)} />
                <Metric label="Likes" value={compact(post.metrics.likes)} />
                <Metric label="Replies" value={compact(post.metrics.replies)} />
                <Metric label="Reposts" value={compact(post.metrics.reposts)} />
                <Metric label="Clicks" value={compact(post.metrics.linkClicks)} />
              </dl>

              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="secondary" href={xRoutes.post(post.id)}>
                  Details
                </Button>
                <ActionMenu
                  label={`Actions for this post`}
                  items={actions.menuItems(post)}
                  trigger={
                    <button type="button" className={buttonClass("ghost", "icon")}>
                      <span aria-hidden="true" className="text-[15px] font-bold leading-none tracking-[0.08em]">
                        ⋯
                      </span>
                    </button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[52px] text-right">
      <dt className="text-[10.5px] uppercase tracking-[0.03em] text-[#98A2B3]">{label}</dt>
      <dd className="text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* E. Mentions needing attention                                       */
/* ------------------------------------------------------------------ */

function MentionsCard({ className }: { className?: string }) {
  const { mentions, can, setMentionStatus, memberName, ready } = useX();
  const items = useMemo(() => mentionsNeedingAttention(mentions, 4), [mentions]);
  const counts = countMentions(mentions);
  const hydrated = useHydrated();

  if (!can.canReadMentions.allowed) {
    return (
      <Card className={className}>
        <CardHeader title="Mentions needing attention" />
        <CapabilityState capability={can.canReadMentions} compact />
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Mentions needing attention"
        description={counts.unanswered ? `${counts.unanswered} unanswered · ${counts.needsAttention} high priority` : "Inbox is clear"}
        badge={<SourceBadge hint="Mentions come from X. Priority and assignment are OmniPlatform's." />}
        actions={<ViewLink href={`${xRoutes.mentions}?status=unanswered`}>Open inbox</ViewLink>}
      />
      {!ready ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          compact
          title="Nothing waiting for a reply"
          description="Every mention has been answered or resolved. New ones appear here as they arrive."
          action={<Button variant="secondary" href={xRoutes.mentions}>View all mentions</Button>}
        />
      ) : (
        <ul className="flex-1 divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
          {items.map((mention) => (
            <li key={mention.id} className="px-4 py-3 transition-colors hover:bg-[#FAFBFD]">
              <div className="flex items-start gap-2.5">
                <Avatar name={mention.user.name} src={mention.user.avatarUrl} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
                    <b className="truncate font-semibold text-[#0F1B3D]">{mention.user.name}</b>
                    <VerifiedMark kind={mention.user.verified} className="[&_svg]:size-3.5" />
                    <span className="truncate text-[#6B7890]">{mention.user.handle}</span>
                    <span className="text-[#98A2B3]">· {hydrated ? relative(mention.at) : "…"}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[#3C4A66]">{mention.text}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={mention.priority} />
                    <Badge tone="amber">Unanswered</Badge>
                    {mention.assigneeId && <Badge tone="neutral">{memberName(mention.assigneeId)}</Badge>}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[42px]">
                <Button size="xs" variant="primary" href={xRoutes.mention(mention.id)} gate={can.canReplyMention}>
                  Reply
                </Button>
                <Button size="xs" variant="secondary" href={xRoutes.mention(mention.id)}>
                  Open thread
                </Button>
                <Button size="xs" variant="secondary" onClick={() => void setMentionStatus(mention.id, "resolved")}>
                  Mark resolved
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* F. Scheduled content                                                */
/* ------------------------------------------------------------------ */

function ScheduledCard({ actions }: { actions: ReturnType<typeof usePostActions> }) {
  const { posts, can, memberName, ready } = useX();
  const queue = useMemo(() => scheduledPosts(posts).slice(0, 5), [posts]);
  const failed = useMemo(() => failedPosts(posts).length, [posts]);

  return (
    <Card>
      <CardHeader
        title="Scheduled content"
        badge={<InternalBadge label="OmniPlatform scheduler" hint="The queue lives in OmniPlatform. Posts are sent to X at their scheduled time." />}
        description={queue.length ? `Next ${queue.length} of ${scheduledPosts(posts).length} queued` : "Nothing queued"}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {failed > 0 && (
              <Button size="xs" variant="danger" href={`${xRoutes.scheduling}?view=failed`}>
                {failed} failed
              </Button>
            )}
            <ViewLink href={`${xRoutes.scheduling}?view=queue`}>Open scheduling</ViewLink>
          </div>
        }
      />
      {!ready ? (
        <ListSkeleton rows={3} />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          compact
          title="Nothing is scheduled"
          description="Queue a few posts so the account keeps a steady rhythm even on busy days."
          action={
            <Button variant="primary" icon={CalendarClock} gate={can.canSchedulePost} href={`${xRoutes.content}?compose=new&intent=schedule`}>
              Schedule a post
            </Button>
          }
          secondary={<Button variant="secondary" href={xRoutes.scheduling}>Open calendar</Button>}
        />
      ) : (
        <ScheduledTable queue={queue} memberName={memberName} actions={actions} />
      )}
    </Card>
  );
}

function ScheduledTable({
  queue,
  memberName,
  actions,
}: {
  queue: XPost[];
  memberName: (id: string | null) => string;
  actions: ReturnType<typeof usePostActions>;
}) {
  const { can } = useX();
  return (
    <>
      {/* Desktop table */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 z-[1] whitespace-nowrap border-y border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Post
              </th>
              <th scope="col" className="sticky top-0 z-[1] whitespace-nowrap border-y border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Scheduled for
              </th>
              <th scope="col" className="sticky top-0 z-[1] whitespace-nowrap border-y border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Type
              </th>
              <th scope="col" className="sticky top-0 z-[1] whitespace-nowrap border-y border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Owner
              </th>
              <th scope="col" className="sticky top-0 z-[1] whitespace-nowrap border-y border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Status
              </th>
              <th scope="col" className="sticky top-0 z-[1] w-px border-y border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {queue.map((post) => (
              <tr key={post.id} className="transition-colors hover:bg-[#FAFBFD]">
                <td className="max-w-[360px] border-b border-[#EEF1F5] px-3 py-2.5">
                  <Link href={xRoutes.post(post.id)} className={cn("block rounded", x.focus)}>
                    <PostText text={post.text} clamp={1} className="text-[12.5px]" />
                  </Link>
                </td>
                <td className="whitespace-nowrap border-b border-[#EEF1F5] px-3 py-2.5 text-[12.5px] text-[#3C4A66]">
                  <span className="font-medium text-[#0F1B3D]">{date(post.scheduledAt, "EEE, MMM d")}</span>
                  <span className="ml-1.5 text-[#6B7890]">{time(post.scheduledAt)}</span>
                </td>
                <td className="border-b border-[#EEF1F5] px-3 py-2.5">
                  <TypeBadge type={post.type} />
                </td>
                <td className="whitespace-nowrap border-b border-[#EEF1F5] px-3 py-2.5 text-[12.5px] text-[#3C4A66]">{memberName(post.ownerId)}</td>
                <td className="border-b border-[#EEF1F5] px-3 py-2.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={post.status} />
                    {post.approval === "pending" && <Badge tone="amber" dot>Pending approval</Badge>}
                  </span>
                </td>
                <td className="border-b border-[#EEF1F5] px-3 py-2.5 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Button size="xs" variant="secondary" gate={can.canSchedulePost} onClick={() => actions.openSchedule(post)}>
                      Reschedule
                    </Button>
                    <ActionMenu
                      label="Actions for this post"
                      items={actions.menuItems(post)}
                      trigger={
                        <button type="button" className={buttonClass("ghost", "iconSm")}>
                          <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">
                            ⋯
                          </span>
                        </button>
                      }
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5] md:hidden">
        {queue.map((post) => (
          <li key={post.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[#0F1B3D]">
                {date(post.scheduledAt, "EEE, MMM d")} · {time(post.scheduledAt)}
              </span>
              <StatusBadge status={post.status} />
            </div>
            <Link href={xRoutes.post(post.id)} className="mt-1 block">
              <PostText text={post.text} clamp={2} className="text-[12.5px]" />
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <TypeBadge type={post.type} />
              <Badge tone="neutral">{memberName(post.ownerId)}</Badge>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button size="xs" variant="secondary" gate={can.canSchedulePost} onClick={() => actions.openSchedule(post)}>
                Reschedule
              </Button>
              <Button size="xs" variant="secondary" href={xRoutes.post(post.id)}>
                Details
              </Button>
              <ActionMenu
                label="Actions for this post"
                items={actions.menuItems(post)}
                trigger={
                  <button type="button" className={buttonClass("ghost", "iconSm")}>
                    <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">
                      ⋯
                    </span>
                  </button>
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
