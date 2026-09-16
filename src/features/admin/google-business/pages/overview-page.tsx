"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Star,
  Store,
  TriangleAlert,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BarList, ChartLegend, KpiCard, TrendChart } from "../components/charts";
import { IssueRow, NeedsAttentionDrawer, ProfileHealthDrawer, ReviewReplyDrawer, ScoreRing, UploadMediaDialog, CreatePostShortcut } from "../components/dialogs";
import { CapabilityState } from "../components/states";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  InternalBadge,
  Meter,
  Segmented,
  Stars,
  Thumb,
  UnderlineTabs,
  ViewLink,
  tdClass,
  thClass,
  gb,
} from "../components/ui";
import { useAccountHealth, useAttention, useKeywords, useLocationScope, useMetrics, usePeriod, useWithContext } from "../data/hooks";
import { filterReviews, profileCompletion, reviewSummary } from "../data/selectors";
import { METRICS, POST_STATE_LABEL, POST_TYPE_LABEL, VERIFICATION_LABEL, gbRoutes, type MetricKey } from "../lib/constants";
import { compact, date as fmtDate, formatAddress, rating as fmtRating, relative } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { PostState } from "../types";

const KPI_ICONS: Record<MetricKey, typeof Eye> = {
  searchImpressions: Search,
  mapsImpressions: MapPin,
  callClicks: Phone,
  websiteClicks: LinkIcon,
  directionRequests: Navigation,
  bookings: CalendarDays,
};

export function OverviewPage() {
  const { locations, reviews, can } = useGbp();
  const { scopedIds, selected, location } = useLocationScope();
  const { period, days, label } = usePeriod();
  const metrics = useMetrics(scopedIds, period);
  const [metric, setMetric] = useState<MetricKey>("searchImpressions");
  const [healthOpen, setHealthOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);

  const scopedReviews = useMemo(() => reviews.filter((review) => scopedIds.includes(review.locationId)), [reviews, scopedIds]);
  const summary = useMemo(() => reviewSummary(scopedReviews), [scopedReviews]);
  const scopedLocations = selected === "all" ? locations : locations.filter((item) => item.locationId === selected);
  const hasBookings = metrics.total("bookings") > 0;

  return (
    <div className="space-y-1">
      <QuickActions />

      <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard
          label="Connected locations"
          value={scopedLocations.length}
          hint={`${scopedLocations.filter((item) => item.verification === "verified").length} verified`}
          icon={Store}
          color="#188038"
          spark={[10, 10, 10, 12, 12, 14, 14]}
          format={(value) => String(value ?? 0)}
        />
        <KpiCard
          label="Average rating"
          value={summary.average}
          hint={`Across ${compact(summary.total)} reviews`}
          icon={Star}
          color="#F29900"
          spark={[3.8, 3.8, 3.9, 3.9, 3.9, 3.9, 4.0]}
          format={(value) => fmtRating(value)}
        />
        <KpiCard label="Total reviews" value={summary.total} hint={`${summary.unanswered} unanswered`} icon={MessageSquare} color="#9334E6" spark={[20, 22, 24, 25, 27, 28, 28]} format={(value) => compact(value)} />
        {can.canViewPerformance.allowed ? (
          <>
            {(["searchImpressions", "mapsImpressions", "callClicks", "websiteClicks", "directionRequests"] as MetricKey[]).map((key) => (
              <KpiCard
                key={key}
                label={METRICS[key].label}
                value={metrics.total(key)}
                previous={metrics.previousTotal(key)}
                spark={metrics.spark(key)}
                color={METRICS[key].color}
                icon={KPI_ICONS[key]}
                active={metric === key}
                onClick={() => setMetric(key)}
              />
            ))}
          </>
        ) : (
          <div className={cn(gb.card, "col-span-2 md:col-span-4 xl:col-span-5")}>
            <CapabilityState compact capability={can.canViewPerformance} title="Performance data unavailable" />
          </div>
        )}
      </div>

      <div className="grid gap-1 xl:grid-cols-12">
        {can.canViewPerformance.allowed ? (
          <Card className="xl:col-span-8">
            <CardHeader
              title="Performance overview"
              description={`${label} compared with the previous ${days} days`}
              actions={
                <Segmented<MetricKey>
                  label="Chart metric"
                  value={metric}
                  onChange={setMetric}
                  className="max-w-full overflow-x-auto"
                  items={(["searchImpressions", "mapsImpressions", "callClicks", "websiteClicks", "directionRequests"] as MetricKey[]).map((key) => ({
                    value: key,
                    label: METRICS[key].short,
                  }))}
                />
              }
            />
            <div className="px-4 pb-4">
              <ChartLegend items={[{ label: METRICS[metric].label, color: METRICS[metric].color }, { label: "Previous period", color: "#DADCE0", dashed: true }]} />
              <div className="mt-2">
                <TrendChart current={metrics.current} previous={metrics.previous} metrics={[metric]} granularity={days > 45 ? "weekly" : "daily"} height={190} />
              </div>
            </div>
          </Card>
        ) : null}
        <NeedsAttentionCard className={can.canViewPerformance.allowed ? "xl:col-span-4" : "xl:col-span-12"} onOpenAll={() => setAttentionOpen(true)} />
      </div>

      <div className="grid gap-1 xl:grid-cols-12">
        <LocationsOverview className="xl:col-span-7" />
        <ProfileHealthCard className="xl:col-span-5" onOpenDetails={() => setHealthOpen(true)} />
      </div>

      <div className="grid gap-1 xl:grid-cols-2">
        <RecentReviews />
        <RecentPosts />
      </div>

      <div className="grid gap-1 xl:grid-cols-12">
        <SearchQueriesCard className="xl:col-span-5" />
        <CustomerActionsCard className="xl:col-span-4" hasBookings={hasBookings} />
        <RecentActivityCard className="xl:col-span-3" />
      </div>

      <ProfileHealthDrawer open={healthOpen} onOpenChange={setHealthOpen} locationId={location?.locationId ?? null} />
      <NeedsAttentionDrawer open={attentionOpen} onOpenChange={setAttentionOpen} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions                                                       */
/* ------------------------------------------------------------------ */

function QuickActions() {
  const { can, syncLocations } = useGbp();
  const router = useRouter();
  const withContext = useWithContext();
  const [postOpen, setPostOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const actions = [
    { label: "Create post", icon: MessageSquare, gate: can.canCreatePosts, onClick: () => setPostOpen(true) },
    { label: "Reply to reviews", icon: Star, gate: can.canReadReviews, onClick: () => router.push(withContext(`${gbRoutes.reviews}?tab=unanswered`)) },
    { label: "Update profile", icon: Store, gate: can.canEditProfile, onClick: () => router.push(withContext(gbRoutes.profile)) },
    { label: "Add photos", icon: ImageIcon, gate: can.canManageMedia, onClick: () => setUploadOpen(true) },
    { label: "View performance", icon: BarChart3, gate: can.canViewPerformance, onClick: () => router.push(withContext(gbRoutes.performance)) },
    {
      label: "Sync locations",
      icon: RefreshCw,
      gate: can.canSyncLocations,
      onClick: async () => {
        setSyncing(true);
        await syncLocations();
        setSyncing(false);
      },
    },
  ];

  return (
    <Card className="flex flex-wrap items-center gap-2 px-3 py-2.5">
      <span className="text-[12px] font-medium text-[#5F6368]">Quick actions</span>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant="secondary"
            icon={action.icon}
            gate={action.gate}
            loading={action.label === "Sync locations" && syncing}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <CreatePostShortcut open={postOpen} onOpenChange={setPostOpen} />
      <UploadMediaDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Needs attention                                                     */
/* ------------------------------------------------------------------ */

function NeedsAttentionCard({ className, onOpenAll }: { className?: string; onOpenAll: () => void }) {
  const issues = useAttention();
  const high = issues.filter((issue) => issue.severity === "high").length;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Needs attention"
        badge={<InternalBadge hint="Issues detected by OmniPlatform from your synced Google data." />}
        description={issues.length ? `${high} high priority of ${issues.length} open issues` : "Everything looks healthy"}
        actions={
          <Button size="xs" variant="link" onClick={onOpenAll}>
            View all
          </Button>
        }
      />
      {issues.length === 0 ? (
        <EmptyState compact icon={CheckCircle2} title="Nothing needs attention" description="Every location is verified, synced and answered." />
      ) : (
        <ul className="scrollbar-thin border-t border-[#F1F3F4] max-h-[210px] overflow-y-auto">
          {issues.slice(0, 4).map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Locations overview                                                  */
/* ------------------------------------------------------------------ */

function LocationsOverview({ className }: { className?: string }) {
  const { locations, attributeDefinitions } = useGbp();
  const withContext = useWithContext();

  return (
    <Card className={className}>
      <CardHeader title="Locations" description="Verification, rating and sync at a glance" actions={<ViewLink href={gbRoutes.locations}>View all</ViewLink>} />
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr>
              <th className={cn(thClass, "static pl-4")}>Location</th>
              <th className={cn(thClass, "static")}>Verification</th>
              <th className={cn(thClass, "static text-right")}>Rating</th>
              <th className={cn(thClass, "static text-right")}>Reviews</th>
              <th className={cn(thClass, "static")}>Profile</th>
              <th className={cn(thClass, "static pr-4")}>Last sync</th>
            </tr>
          </thead>
          <tbody>
            {locations.slice(0, 5).map((location) => {
              const completion = profileCompletion(location, attributeDefinitions);
              return (
                <tr key={location.locationId} className="group hover:bg-[#F8F9FA]">
                  <td className={cn(tdClass, "max-w-[280px] pl-4")}>
                    <Link href={withContext(gbRoutes.location(location.locationId))} className="block">
                      <span className="block truncate text-[12.5px] font-medium text-[#202124] group-hover:text-[#1A73E8]">{location.profile.title}</span>
                      <span className="block truncate text-[11.5px] text-[#5F6368]">{formatAddress(location.profile.address, { short: true })}</span>
                    </Link>
                  </td>
                  <td className={tdClass}>
                    <Badge tone={location.verification === "verified" ? "green" : location.verification === "pending" ? "amber" : "red"}>
                      {VERIFICATION_LABEL[location.verification]}
                    </Badge>
                  </td>
                  <td className={cn(tdClass, "text-right")}>
                    {location.rating === null ? (
                      <span className="text-[#80868B]">No reviews</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-[#202124]">
                        {location.rating.toFixed(1)}
                        <Star className="size-3 fill-[#FBBC04] text-[#FBBC04]" />
                      </span>
                    )}
                  </td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{location.reviewCount}</td>
                  <td className={tdClass}>
                    <span className="flex items-center gap-2">
                      <Meter value={completion} tone={completion >= 80 ? "green" : completion >= 60 ? "amber" : "red"} className="w-16" />
                      <span className="tabular-nums text-[#3C4043]">{completion}%</span>
                    </span>
                  </td>
                  <td className={cn(tdClass, "pr-4 text-[12px]")}>
                    {location.sync.state === "failed" ? (
                      <Badge tone="amber" icon={TriangleAlert}>Failed</Badge>
                    ) : (
                      <span className="text-[#5F6368]">{relative(location.sync.lastSyncedAt)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Profile health                                                      */
/* ------------------------------------------------------------------ */

function ProfileHealthCard({ className, onOpenDetails }: { className?: string; onOpenDetails: () => void }) {
  const { location } = useLocationScope();
  const accountHealth = useAccountHealth();
  const health = accountHealth;

  if (!health) return null;
  const weakest = [...health.factors].sort((a, b) => a.score - b.score).slice(0, 5);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Profile health"
        badge={<InternalBadge label="OmniPlatform Profile Health" hint="Calculated by OmniPlatform. Not a Google score." />}
        description={location ? location.profile.title : "Average across all locations"}
        actions={
          <Button size="xs" variant="link" onClick={onOpenDetails}>
            View details
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-1 px-4 pb-4">
        <div className="flex items-center gap-1">
          <ScoreRing score={health.score} />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#202124]">{health.score >= 80 ? "Healthy profile" : health.score >= 60 ? "Room to improve" : "Needs attention"}</p>
            <p className="mt-0.5 text-[12px] leading-4 text-[#5F6368]">Biggest opportunity: {weakest[0]?.label.toLowerCase()}.</p>
          </div>
        </div>
        <ul className="space-y-2">
          {weakest.map((factor) => (
            <li key={factor.key} className="grid grid-cols-[1fr_64px_auto] items-center gap-2 text-[12px]">
              <span className="truncate text-[#3C4043]">{factor.label}</span>
              <Meter value={factor.score} tone={factor.status === "good" ? "green" : factor.status === "warning" ? "amber" : "red"} />
              {factor.href && factor.actionLabel ? (
                <Button size="xs" variant="ghost" href={factor.href} external={factor.href.startsWith("http")} className="text-[#1A73E8]">
                  {factor.actionLabel}
                </Button>
              ) : (
                <span className="text-right text-[11.5px] font-medium tabular-nums text-[#137333]">{factor.score}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Recent reviews                                                      */
/* ------------------------------------------------------------------ */

type ReviewFilterTab = "all" | "unanswered" | "low";

function RecentReviews() {
  const { reviews, locations, can } = useGbp();
  const { scopedIds } = useLocationScope();
  const withContext = useWithContext();
  const [tab, setTab] = useState<ReviewFilterTab>("all");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const scoped = useMemo(() => reviews.filter((review) => scopedIds.includes(review.locationId)), [reviews, scopedIds]);
  const lists = useMemo(
    () => ({
      all: filterReviews(scoped, { tab: "all" }),
      unanswered: filterReviews(scoped, { tab: "unanswered" }),
      low: filterReviews(scoped, { tab: "low" }),
    }),
    [scoped],
  );
  const list = lists[tab].slice(0, 3);

  return (
    <Card className="flex flex-col">
      <CardHeader title="Recent reviews" actions={<ViewLink href={withContext(gbRoutes.reviews)}>View all</ViewLink>} />
      <div className="border-b border-[#F1F3F4] px-4">
        <UnderlineTabs<ReviewFilterTab>
          label="Review filter"
          size="sm"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: lists.all.length },
            { value: "unanswered", label: "Unanswered", count: lists.unanswered.length },
            { value: "low", label: "Low rating", count: lists.low.length },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState compact icon={MessageSquare} title={tab === "unanswered" ? "Every review has a reply" : "No reviews yet"} description="Reviews appear here as customers leave them on Google." />
      ) : (
        <ul className="divide-y divide-[#F1F3F4]">
          {list.map((review) => {
            const location = locations.find((item) => item.locationId === review.locationId);
            return (
              <li key={review.reviewId} className="flex gap-2.5 px-4 py-2.5">
                <Avatar name={review.reviewer.displayName} src={review.reviewer.profilePhotoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <b className="text-[12.5px] font-medium text-[#202124]">{review.reviewer.displayName}</b>
                    <Stars rating={review.starRating} size={12} />
                    <span className="text-[11.5px] text-[#80868B]">{relative(review.createTime)}</span>
                    {review.reply ? <Badge tone="green" icon={CheckCircle2}>Replied</Badge> : <Badge tone="amber">Needs reply</Badge>}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-[#3C4043]">{review.comment}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-[#5F6368]">{location?.profile.title}</p>
                </div>
                <Button size="xs" variant="secondary" gate={can.canReplyReviews} onClick={() => setReplyTo(review.reviewId)}>
                  {review.reply ? "Edit reply" : "Reply"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <ReviewReplyDrawer reviewId={replyTo} onClose={() => setReplyTo(null)} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Recent posts                                                        */
/* ------------------------------------------------------------------ */

const POST_TONE: Record<PostState, "green" | "blue" | "amber" | "red" | "neutral" | "violet"> = {
  published: "green",
  scheduled: "blue",
  approved: "blue",
  pending_approval: "violet",
  publishing: "blue",
  draft: "neutral",
  failed: "red",
  rejected: "red",
};

function RecentPosts() {
  const { posts, can } = useGbp();
  const { scopedIds } = useLocationScope();
  const withContext = useWithContext();
  const [postOpen, setPostOpen] = useState(false);

  const list = useMemo(
    () =>
      posts
        .filter((post) => post.locationIds.some((id) => scopedIds.includes(id)))
        .sort((a, b) => (b.publishedAt ?? b.scheduledAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.scheduledAt ?? a.createdAt))
        .slice(0, 4),
    [posts, scopedIds],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Posts and updates"
        actions={
          <>
            <Button size="xs" variant="secondary" gate={can.canCreatePosts} onClick={() => setPostOpen(true)}>
              Create post
            </Button>
            <ViewLink href={withContext(gbRoutes.posts)}>View all</ViewLink>
          </>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          compact
          icon={MessageSquare}
          title="No posts yet"
          description="Posts show up in your profile on Search and Maps for seven days."
          action={
            <Button size="sm" variant="primary" gate={can.canCreatePosts} onClick={() => setPostOpen(true)}>
              Create your first post
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-[#F1F3F4]">
          {list.map((post) => (
            <li key={post.id}>
              <Link href={`${gbRoutes.posts}?post=${post.id}`} className="flex gap-3 px-4 py-2.5 hover:bg-[#F8F9FA]">
                {post.media[0] ? (
                  <Thumb src={post.media[0]} className="w-[72px]" sizes="72px" />
                ) : (
                  <span className="grid h-[54px] w-[72px] shrink-0 place-items-center rounded-md bg-[#F1F3F4] text-[#80868B]">
                    <MessageSquare className="size-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[12.5px] font-medium leading-4 text-[#202124]">{post.event?.title ?? post.summary}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">{POST_TYPE_LABEL[post.type]}</Badge>
                    <Badge tone={POST_TONE[post.state]}>{POST_STATE_LABEL[post.state]}</Badge>
                    <span className="text-[11.5px] text-[#80868B]">
                      {post.publishedAt ? fmtDate(post.publishedAt) : post.scheduledAt ? `for ${fmtDate(post.scheduledAt)}` : "Not scheduled"}
                    </span>
                  </span>
                </span>
                {post.metrics && (
                  <span className="shrink-0 text-right text-[11.5px] text-[#5F6368]">
                    <b className="block text-[12.5px] font-medium tabular-nums text-[#202124]">{compact(post.metrics.views)}</b>
                    views
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreatePostShortcut open={postOpen} onOpenChange={setPostOpen} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Search queries & customer actions                                   */
/* ------------------------------------------------------------------ */

function SearchQueriesCard({ className }: { className?: string }) {
  const { scopedIds } = useLocationScope();
  const { can } = useGbp();
  const keywords = useKeywords(scopedIds);
  const withContext = useWithContext();

  return (
    <Card className={className}>
      <CardHeader
        title="Top search queries"
        description="Searches that showed your profile"
        actions={<ViewLink href={withContext(`${gbRoutes.performance}?tab=search`)}>Details</ViewLink>}
      />
      <div className="px-4 pb-4">
        {!can.canViewPerformance.allowed ? (
          <CapabilityState compact capability={can.canViewPerformance} />
        ) : keywords.length === 0 ? (
          <EmptyState compact icon={Search} title="No search data yet" description="Google reports search keywords monthly once a profile has enough impressions." />
        ) : (
          <BarList
            data={keywords.slice(0, 6).map((keyword) => ({ label: keyword.query, value: keyword.impressions }))}
            format={(value) => compact(value)}
          />
        )}
      </div>
    </Card>
  );
}

function CustomerActionsCard({ className, hasBookings }: { className?: string; hasBookings: boolean }) {
  const { scopedIds } = useLocationScope();
  const { period } = usePeriod();
  const { can } = useGbp();
  const metrics = useMetrics(scopedIds, period);

  const rows: { key: MetricKey; icon: typeof Phone }[] = [
    { key: "callClicks", icon: Phone },
    { key: "websiteClicks", icon: LinkIcon },
    { key: "directionRequests", icon: Navigation },
  ];

  return (
    <Card className={className}>
      <CardHeader title="Customer actions" description="What people did after finding you" />
      <div className="space-y-1.5 px-4 pb-4">
        {!can.canViewPerformance.allowed ? (
          <CapabilityState compact capability={can.canViewPerformance} />
        ) : (
          <>
            {rows.map((row) => {
              const value = metrics.total(row.key);
              const previous = metrics.previousTotal(row.key);
              const change = previous ? ((value - previous) / previous) * 100 : null;
              return (
                <div key={row.key} className="flex items-center gap-1 rounded-lg border border-[#F1F3F4] px-3 py-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#E8F0FE] text-[#1A73E8]">
                    <row.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] text-[#5F6368]">{METRICS[row.key].label}</span>
                    <span className="block text-[17px] font-medium leading-6 tabular-nums text-[#202124]">{compact(value)}</span>
                  </span>
                  <span className={cn("text-[11.5px] font-medium tabular-nums", (change ?? 0) >= 0 ? "text-[#137333]" : "text-[#C5221F]")}>
                    {change === null ? "-" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
                  </span>
                </div>
              );
            })}
            <div className="rounded-lg border border-dashed border-[#DADCE0] px-3 py-2">
              <p className="text-[12px] font-medium text-[#3C4043]">Bookings</p>
              <p className="mt-0.5 text-[11.5px] leading-4 text-[#5F6368]">
                {hasBookings ? `${compact(metrics.total("bookings"))} in this period.` : "Google only reports bookings for businesses with a connected booking provider."}
              </p>
            </div>
            <p className="text-[11.5px] leading-4 text-[#80868B]">Messages are not available through the Business Profile API and are managed in the Google app.</p>
          </>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Recent activity                                                     */
/* ------------------------------------------------------------------ */

function RecentActivityCard({ className }: { className?: string }) {
  const { activity } = useGbp();
  return (
    <Card className={className}>
      <CardHeader
        title="Recent activity"
        badge={<InternalBadge label="OmniPlatform log" />}
        actions={<ViewLink href={`${gbRoutes.settings}#activity`}>Full log</ViewLink>}
      />
      <ul className="space-y-2.5 px-4 pb-4">
        {activity.slice(0, 6).map((event) => (
          <li key={event.id} className="flex items-start gap-2.5">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#DADCE0]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] leading-4 text-[#3C4043]">
                <b className="font-medium text-[#202124]">{event.actor}</b> {event.summary.toLowerCase()}
              </span>
              <span className="block text-[11px] text-[#80868B]">
                {event.entity.label} · {relative(event.at)}
              </span>
            </span>
          </li>
        ))}
        {activity.length === 0 && <li className="py-6 text-center text-[12.5px] text-[#5F6368]">No activity recorded yet.</li>}
      </ul>
    </Card>
  );
}
