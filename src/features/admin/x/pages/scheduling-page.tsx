"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  List,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryState } from "../hooks/use-query-state";
import { xRoutes } from "../lib/constants";
import { date as fmtDate, postSummary, time } from "../lib/format";
import { timingInsight } from "../lib/insights";
import { awaitingApproval, failedPosts, postsOnDay, queueHealth, scheduledPosts } from "../x-data/selectors";
import { useX } from "../store/x-store";
import type { XPost } from "../x-data/types";
import type { QueueInsight } from "../x-data/selectors";
import { FailureDetail } from "../components/dialogs";
import { usePostActions } from "../components/post-actions";
import { CapabilityState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  ApprovalBadge,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  InternalBadge,
  PostText,
  Segmented,
  StatusBadge,
  TypeBadge,
  UnderlineTabs,
  buttonClass,
  tdClass,
  thClass,
  x,
} from "../components/ui";

const DEFAULTS = { view: "calendar", cal: "month", cursor: "" };

type View = "calendar" | "queue" | "upcoming" | "failed";
type CalendarMode = "month" | "week" | "list";

export function SchedulingPage() {
  const { ready, can } = useX();
  if (!ready) return <PageSkeleton variant="table" />;
  if (!can.canReadPosts.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadPosts} title="Scheduling unavailable" />
      </Card>
    );
  }
  return <Scheduling />;
}

function Scheduling() {
  const { posts, settings, connection, can } = useX();
  const { values, set } = useQueryState(useMemo(() => DEFAULTS, []));
  const view = values.view as View;
  const actions = usePostActions();

  const health = useMemo(() => queueHealth(posts, settings), [posts, settings]);
  const queue = useMemo(() => scheduledPosts(posts), [posts]);
  const failed = useMemo(() => failedPosts(posts), [posts]);
  const pending = useMemo(() => awaitingApproval(posts), [posts]);
  const insights = useMemo(() => buildInsights(health, posts), [health, posts]);

  const connectionBroken = connection.state !== "connected" && connection.state !== "syncing";

  return (
    <div className="space-y-1">
      {/* Queue health */}
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        <HealthTile label="Scheduled" value={health.scheduled} icon={Clock3} tone="blue" onClick={() => set({ view: "queue" })} hint="Posts waiting in the OmniPlatform queue." />
        <HealthTile label="Failed" value={health.failed} icon={XCircle} tone={health.failed ? "red" : "neutral"} onClick={() => set({ view: "failed" })} hint="Posts X rejected. They stay here until you retry or discard them." />
        <HealthTile label="Awaiting approval" value={health.awaitingApproval} icon={ListChecks} tone={health.awaitingApproval ? "amber" : "neutral"} onClick={() => set({ view: "queue" })} hint="Scheduled posts that can't publish until a reviewer approves them." />
        <HealthTile label="Publishing" value={health.publishing} icon={Loader2} tone="amber" hint="Posts currently being sent to X." />
        <HealthTile label="Crowded slots" value={health.crowded.length} icon={AlertTriangle} tone={health.crowded.length ? "amber" : "neutral"} hint={`Pairs of posts less than ${settings.publishing.minimumGapMinutes} minutes apart.`} />
        <HealthTile label="Posting gaps" value={health.gaps.length} icon={CalendarDays} tone={health.gaps.length ? "amber" : "neutral"} hint="Runs of two or more empty days in the next fortnight." />
      </div>

      {connectionBroken && queue.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 border-[#FBE3B6] bg-[#FFFAF0] px-3.5 py-2.5">
          <AlertTriangle className="size-4 shrink-0 text-[#B54708]" />
          <p className="min-w-[240px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
            <b className="font-semibold text-[#0F1B3D]">Queued posts won&apos;t publish right now.</b> The queue is OmniPlatform&apos;s, but
            publishing needs a working X connection. {queue.length} post{queue.length === 1 ? "" : "s"} will fail at their scheduled time
            unless the account is reconnected.
          </p>
          <Button size="sm" variant="primary" href={`${xRoutes.settings}#connection`} gate={can.canManageConnection}>
            Fix connection
          </Button>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader
            title="Recommendations"
            icon={Sparkles}
            badge={<InternalBadge label="OmniPlatform recommendation" hint="Generated by OmniPlatform from your queue and past performance. Not from X." />}
            description="What your queue looks like from the outside"
          />
          <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
            {insights.map((insight) => (
              <li key={insight.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                <span
                  className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm",
                    insight.tone === "amber" ? "bg-[#FFF7E8] text-[#B54708]" : insight.tone === "violet" ? "bg-[#F4F0FF] text-[#6D28D9]" : "bg-[#EFF4FF] text-[#1D4ED8]",
                  )}
                >
                  <Sparkles className="size-3" />
                </span>
                <div className="min-w-[220px] flex-1">
                  <p className="text-[12.5px] font-semibold text-[#0F1B3D]">{insight.title}</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-[#3C4A66]">{insight.detail}</p>
                </div>
                {insight.action && (
                  <Button size="xs" variant="secondary" href={insight.action.href}>
                    {insight.action.label}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Views */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E9F0] px-3 pt-2">
          <UnderlineTabs
            label="Scheduling views"
            value={view}
            onChange={(value) => set({ view: value })}
            items={[
              { value: "calendar" as View, label: "Calendar", icon: CalendarDays },
              { value: "queue" as View, label: "Queue", count: queue.length, icon: List },
              { value: "upcoming" as View, label: "Upcoming", count: queue.filter((post) => parseISO(post.scheduledAt!) <= addDays(new Date(), 7)).length, icon: Clock3 },
              { value: "failed" as View, label: "Failed", count: failed.length, alert: true, icon: XCircle },
            ]}
          />
          <div className="mb-2 flex items-center gap-1.5">
            <Button size="sm" variant="primary" icon={Plus} gate={can.canSchedulePost} href={`${xRoutes.content}?compose=new&intent=schedule`}>
              Schedule post
            </Button>
          </div>
        </div>

        {view === "calendar" && (
          <CalendarView mode={values.cal as CalendarMode} onMode={(mode) => set({ cal: mode })} cursor={values.cursor} onCursor={(value) => set({ cursor: value })} actions={actions} />
        )}
        {view === "queue" && <QueueView rows={queue} actions={actions} />}
        {view === "upcoming" && <QueueView rows={queue.filter((post) => parseISO(post.scheduledAt!) <= addDays(new Date(), 7))} actions={actions} upcoming />}
        {view === "failed" && <FailedView rows={failed} actions={actions} />}
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader
            title="Waiting for approval"
            badge={<InternalBadge hint="Approvals are an OmniPlatform workflow." />}
            description={`${pending.length} post${pending.length === 1 ? "" : "s"} can't publish until a reviewer signs off`}
            icon={ListChecks}
          />
          <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
            {pending.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-[220px] flex-1">
                  <Link href={xRoutes.post(post.id)} className="block">
                    <PostText text={post.text} clamp={1} className="text-[12.5px]" />
                  </Link>
                  <p className="mt-0.5 text-[11.5px] text-[#98A2B3]">
                    {post.scheduledAt ? `Scheduled for ${fmtDate(post.scheduledAt, "EEE, MMM d")} at ${time(post.scheduledAt)}` : "Not scheduled yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="xs" variant="secondary" gate={can.canApprove} onClick={() => actions.openReview(post, "changes_requested")}>
                    Request changes
                  </Button>
                  <Button size="xs" variant="primary" gate={can.canApprove} onClick={() => actions.openReview(post, "approved")}>
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {actions.dialogs}
    </div>
  );
}

function HealthTile({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
  hint,
}: {
  label: string;
  value: number;
  icon: typeof Clock3;
  tone: "blue" | "amber" | "red" | "neutral";
  onClick?: () => void;
  hint: string;
}) {
  const content = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-[#6B7890]">{label}</span>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "red" ? "text-[#C81E2B]" : tone === "amber" ? "text-[#B54708]" : tone === "blue" ? "text-[#2563EB]" : "text-[#98A2B3]",
            label === "Publishing" && value > 0 && "animate-spin",
          )}
        />
      </span>
      <span className={cn("mt-1 block text-[21px] font-semibold leading-7 tabular-nums", tone === "red" && value > 0 ? "text-[#C81E2B]" : tone === "amber" && value > 0 ? "text-[#B54708]" : "text-[#0F1B3D]")}>
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={hint} className={cn(x.card, "p-3.5 text-left transition hover:border-[#C9D1DC]", x.focus)}>
        {content}
      </button>
    );
  }
  return (
    <div className={cn(x.card, "p-3.5")} title={hint}>
      {content}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

function buildInsights(health: ReturnType<typeof queueHealth>, posts: XPost[]): QueueInsight[] {
  const insights: QueueInsight[] = [];

  health.gaps.slice(0, 2).forEach((gap, index) => {
    insights.push({
      id: `gap-${index}`,
      tone: "amber",
      title: `Nothing scheduled ${gap.days === 1 ? "on" : "from"} ${format(parseISO(gap.from), "EEEE d MMM")}${gap.days > 1 ? ` to ${format(parseISO(gap.to), "EEEE d MMM")}` : ""}`,
      detail: `That's ${gap.days} consecutive day${gap.days === 1 ? "" : "s"} with no posts queued. Accounts that go quiet lose reach when they come back.`,
      action: { label: "Fill the gap", href: `${xRoutes.content}?compose=new&intent=schedule` },
    });
  });

  if (health.crowded.length) {
    const first = health.crowded[0]!;
    insights.push({
      id: "crowded",
      tone: "amber",
      title: `${health.crowded.length} pair${health.crowded.length === 1 ? "" : "s"} of posts scheduled close together`,
      detail: `“${postSummary(first.second.text, 40)}” ${
        first.minutesApart <= 0
          ? "goes out at the same moment as the post before it"
          : `goes out just ${first.minutesApart} minute${first.minutesApart === 1 ? "" : "s"} after the post before it`
      }. Posting in bursts splits your own audience and risks hitting X's rate limit.`,
      action: { label: "Open queue", href: `${xRoutes.scheduling}?view=queue` },
    });
  }

  health.overloadedDays.slice(0, 1).forEach((day) => {
    insights.push({
      id: `overloaded-${day.date}`,
      tone: "amber",
      title: `${day.count} posts scheduled on ${format(parseISO(day.date), "EEEE d MMM")}`,
      detail: "Spreading these across nearby days usually earns more total impressions than stacking them on one day.",
      action: { label: "Open queue", href: `${xRoutes.scheduling}?view=queue` },
    });
  });

  const timing = timingInsight(posts);
  if (timing.bestHours.length) {
    insights.push({
      id: "timing",
      tone: "violet",
      title: `Your audience engages most around ${timing.bestHours[0]}`,
      detail: `${timing.headline} Scheduling near that window has historically done better for this account.`,
      action: { label: "See the data", href: xRoutes.analytics },
    });
  }

  if (health.scheduled === 0) {
    insights.unshift({
      id: "empty",
      tone: "blue",
      title: "The queue is empty",
      detail: "Nothing is scheduled, so the account goes quiet as soon as today's post is out. A week of runway is a good target.",
      action: { label: "Schedule a post", href: `${xRoutes.content}?compose=new&intent=schedule` },
    });
  }

  return insights.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

function CalendarView({
  mode,
  onMode,
  cursor,
  onCursor,
  actions,
}: {
  mode: CalendarMode;
  onMode: (mode: CalendarMode) => void;
  cursor: string;
  onCursor: (value: string) => void;
  actions: ReturnType<typeof usePostActions>;
}) {
  const { posts } = useX();
  // Memoised so the derived range and day list don't rebuild on every render.
  const anchor = useMemo(() => (cursor ? parseISO(cursor) : new Date()), [cursor]);
  const scheduled = useMemo(() => scheduledPosts(posts), [posts]);

  const range = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return { start, end: endOfWeek(anchor, { weekStartsOn: 1 }) };
    }
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    return { start, end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }) };
  }, [anchor, mode]);

  const days = useMemo(() => eachDayOfInterval(range), [range]);

  const step = (direction: -1 | 1) => {
    const next = mode === "week" ? addWeeks(anchor, direction) : addMonths(anchor, direction);
    onCursor(format(next, "yyyy-MM-dd"));
  };

  const title = mode === "week" ? `${format(range.start, "d MMM")} – ${format(range.end, "d MMM yyyy")}` : format(anchor, "MMMM yyyy");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF1F5] px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="secondary" aria-label={mode === "week" ? "Previous week" : "Previous month"} onClick={() => step(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="icon" variant="secondary" aria-label={mode === "week" ? "Next week" : "Next month"} onClick={() => step(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <p className="ml-1 text-[13.5px] font-semibold text-[#0F1B3D]">{title}</p>
          <Button size="sm" variant="ghost" onClick={() => onCursor("")}>
            Today
          </Button>
        </div>
        <Segmented
          label="Calendar view"
          value={mode}
          onChange={onMode}
          items={[
            { value: "month" as CalendarMode, label: "Month", icon: LayoutGrid },
            { value: "week" as CalendarMode, label: "Week", icon: CalendarDays },
            { value: "list" as CalendarMode, label: "List", icon: List },
          ]}
        />
      </div>

      {mode === "list" ? (
        <ListCalendar rows={scheduled} actions={actions} />
      ) : (
        <div className="scrollbar-thin overflow-x-auto p-3">
          <div className="min-w-[740px]">
            <div className="grid grid-cols-7 gap-1 pb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="px-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayPosts = postsOnDay(scheduled, day);
                const outside = mode === "month" && !isSameMonth(day, anchor);
                const crowded = dayPosts.length >= 3;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex min-h-[112px] flex-col gap-1 rounded-sm border p-1.5 transition",
                      outside ? "border-[#F1F4F8] bg-[#FCFDFE]" : "border-[#E4E9F0] bg-white",
                      isToday(day) && "border-[#2563EB] ring-[2px] ring-[#2563EB]/10",
                      mode === "week" && "min-h-[260px]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn("text-[11.5px] font-semibold tabular-nums", isToday(day) ? "text-[#2563EB]" : outside ? "text-[#C9D1DC]" : "text-[#3C4A66]")}>
                        {format(day, "d")}
                      </span>
                      <span className="flex items-center gap-1">
                        {crowded && (
                          <span title={`${dayPosts.length} posts on this day`} className="rounded-sm bg-[#FFF7E8] px-1 text-[10px] font-bold text-[#B54708]">
                            {dayPosts.length}
                          </span>
                        )}
                        <Link
                          href={`${xRoutes.content}?compose=new&intent=schedule`}
                          aria-label={`Schedule a post on ${format(day, "d MMMM")}`}
                          className={cn("grid size-4 place-items-center rounded text-[#C9D1DC] opacity-0 transition hover:bg-[#EFF4FF] hover:text-[#2563EB] focus-visible:opacity-100 group-hover:opacity-100", x.focus)}
                        >
                          <Plus className="size-3" />
                        </Link>
                      </span>
                    </div>

                    {dayPosts.length === 0 ? (
                      <Link
                        href={`${xRoutes.content}?compose=new&intent=schedule`}
                        className={cn("flex flex-1 items-center justify-center rounded-sm border border-dashed border-transparent text-[11px] text-transparent transition hover:border-[#DCE2EA] hover:text-[#98A2B3]", x.focus)}
                      >
                        + Add post
                      </Link>
                    ) : (
                      dayPosts.map((post) => <CalendarCard key={post.id} post={post} actions={actions} />)
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarCard({ post, actions }: { post: XPost; actions: ReturnType<typeof usePostActions> }) {
  const { memberName, campaignName } = useX();
  return (
    <div className="group/card rounded-sm border border-[#D5E1FD] bg-[#F5F8FF] p-1.5 transition hover:border-[#2563EB]">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[10.5px] font-bold tabular-nums text-[#1D4ED8]">{time(post.scheduledAt)}</span>
        <ActionMenu
          label="Actions for this post"
          items={actions.menuItems(post)}
          trigger={
            <button type="button" className="grid size-4 shrink-0 place-items-center rounded text-[#98A2B3] opacity-0 transition hover:bg-white hover:text-[#3C4A66] focus-visible:opacity-100 group-hover/card:opacity-100">
              <span aria-hidden="true" className="text-[12px] font-bold leading-none tracking-[0.08em]">
                ⋯
              </span>
            </button>
          }
        />
      </div>
      <Link href={xRoutes.post(post.id)} className="mt-0.5 block">
        <span className="line-clamp-2 text-[11px] leading-[1.35] text-[#24324F]">{postSummary(post.text, 64)}</span>
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="rounded-sm bg-white px-1 text-[9.5px] font-semibold text-[#6B7890] ring-1 ring-inset ring-[#E4E9F0]">{post.type}</span>
        {post.approval === "pending" && <span className="rounded-sm bg-[#FFF7E8] px-1 text-[9.5px] font-semibold text-[#B54708]">Approval</span>}
        <span className="truncate text-[9.5px] text-[#98A2B3]" title={`${memberName(post.ownerId)} · ${campaignName(post.campaignId)}`}>
          {memberName(post.ownerId).split(" ")[0]}
        </span>
      </div>
    </div>
  );
}

function ListCalendar({ rows, actions }: { rows: XPost[]; actions: ReturnType<typeof usePostActions> }) {
  const { memberName } = useX();
  const grouped = useMemo(() => {
    const map = new Map<string, XPost[]>();
    rows.forEach((post) => {
      const key = format(parseISO(post.scheduledAt!), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), post]);
    });
    return [...map.entries()];
  }, [rows]);

  if (rows.length === 0) return <EmptyQueue />;

  return (
    <ul className="divide-y divide-[#EEF1F5]">
      {grouped.map(([day, dayPosts]) => (
        <li key={day}>
          <p className="sticky top-0 z-[1] flex items-center gap-2 border-b border-[#EEF1F5] bg-[#F8FAFC] px-4 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
            {format(parseISO(day), "EEEE, d MMMM")}
            {isToday(parseISO(day)) && <Badge tone="blue">Today</Badge>}
            {dayPosts.length >= 3 && <Badge tone="amber">{dayPosts.length} posts</Badge>}
          </p>
          <ul>
            {dayPosts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#FAFBFD]">
                <span className="w-16 shrink-0 text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{time(post.scheduledAt)}</span>
                <div className="min-w-[200px] flex-1">
                  <Link href={xRoutes.post(post.id)} className="block">
                    <PostText text={post.text} clamp={1} className="text-[12.5px]" />
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <TypeBadge type={post.type} />
                    <ApprovalBadge state={post.approval} />
                    <span className="text-[11.5px] text-[#98A2B3]">{memberName(post.ownerId)}</span>
                  </p>
                </div>
                <RowActions post={post} actions={actions} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

function QueueView({ rows, actions, upcoming }: { rows: XPost[]; actions: ReturnType<typeof usePostActions>; upcoming?: boolean }) {
  const { memberName, campaignName } = useX();

  if (rows.length === 0) return <EmptyQueue upcoming={upcoming} />;

  return (
    <>
      <div className="scrollbar-thin hidden overflow-x-auto xl:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={cn(thClass, "min-w-[280px]")}>
                Post
              </th>
              <th scope="col" className={thClass}>
                Date
              </th>
              <th scope="col" className={thClass}>
                Time
              </th>
              <th scope="col" className={thClass}>
                Type
              </th>
              <th scope="col" className={thClass}>
                Owner
              </th>
              <th scope="col" className={cn(thClass, "hidden 2xl:table-cell")}>
                Campaign
              </th>
              <th scope="col" className={thClass}>
                Status
              </th>
              <th scope="col" className={cn(thClass, "w-px")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((post) => (
              <tr key={post.id} className="transition-colors hover:bg-[#FAFBFD]">
                <td className={cn(tdClass, "max-w-[420px]")}>
                  <Link href={xRoutes.post(post.id)} className={cn("block rounded", x.focus)}>
                    <PostText text={post.text} clamp={2} className="text-[12.5px]" />
                  </Link>
                </td>
                <td className={cn(tdClass, "whitespace-nowrap font-medium text-[#0F1B3D]")}>{fmtDate(post.scheduledAt, "EEE, MMM d")}</td>
                <td className={cn(tdClass, "whitespace-nowrap tabular-nums")}>{time(post.scheduledAt)}</td>
                <td className={tdClass}>
                  <TypeBadge type={post.type} />
                </td>
                <td className={cn(tdClass, "whitespace-nowrap")}>{memberName(post.ownerId)}</td>
                <td className={cn(tdClass, "hidden max-w-[160px] truncate 2xl:table-cell")} title={campaignName(post.campaignId)}>
                  {campaignName(post.campaignId)}
                </td>
                <td className={tdClass}>
                  <span className="flex flex-col gap-1">
                    <StatusBadge status={post.status} />
                    <ApprovalBadge state={post.approval} />
                  </span>
                </td>
                <td className={cn(tdClass, "text-right")}>
                  <RowActions post={post} actions={actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[#EEF1F5] xl:hidden">
        {rows.map((post) => (
          <li key={post.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[#0F1B3D]">
                {fmtDate(post.scheduledAt, "EEE, MMM d")} · {time(post.scheduledAt)}
              </span>
              <StatusBadge status={post.status} />
            </div>
            <Link href={xRoutes.post(post.id)} className="mt-1 block">
              <PostText text={post.text} clamp={2} className="text-[12.5px]" />
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <TypeBadge type={post.type} />
              <ApprovalBadge state={post.approval} />
              <Badge tone="neutral">{memberName(post.ownerId)}</Badge>
            </div>
            <div className="mt-2">
              <RowActions post={post} actions={actions} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function RowActions({ post, actions }: { post: XPost; actions: ReturnType<typeof usePostActions> }) {
  const { can } = useX();
  return (
    <span className="flex flex-wrap items-center justify-end gap-1">
      <Button size="xs" variant="secondary" icon={CalendarClock} gate={can.canSchedulePost} onClick={() => actions.openSchedule(post)}>
        Reschedule
      </Button>
      <Button size="xs" variant="secondary" gate={can.canCreatePost} onClick={() => actions.confirmPublish(post)}>
        Publish now
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
  );
}

function EmptyQueue({ upcoming }: { upcoming?: boolean }) {
  const { can } = useX();
  return (
    <EmptyState
      icon={CalendarClock}
      title={upcoming ? "Nothing going out in the next 7 days" : "The queue is empty"}
      description={
        upcoming
          ? "Nothing is scheduled for the week ahead. A week of runway keeps the account consistent without daily effort."
          : "Queue posts ahead so the account keeps a steady rhythm. The queue lives in OmniPlatform and publishes to X at the times you set."
      }
      action={
        <Button variant="primary" icon={Plus} gate={can.canSchedulePost} href={`${xRoutes.content}?compose=new&intent=schedule`}>
          Schedule a post
        </Button>
      }
      secondary={
        <Button variant="secondary" href={`${xRoutes.content}?status=draft`}>
          Schedule an existing draft
        </Button>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Failed                                                              */
/* ------------------------------------------------------------------ */

function FailedView({ rows, actions }: { rows: XPost[]; actions: ReturnType<typeof usePostActions> }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing has failed"
        description="Posts X rejects appear here with the reason, how many times we retried and what to do about it."
        action={
          <Button variant="secondary" href={`${xRoutes.scheduling}?view=queue`}>
            View the queue
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-1 p-3">
      {rows.map((post) => (
        <div key={post.id} className="rounded-sm border border-[#E4E9F0] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <Link href={xRoutes.post(post.id)} className="block">
                <PostText text={post.text} clamp={2} className="text-[12.5px]" />
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                <TypeBadge type={post.type} />
                <StatusBadge status={post.status} />
                <span className="text-[11.5px] text-[#98A2B3]">
                  Was due {post.scheduledAt ? `${fmtDate(post.scheduledAt, "EEE, MMM d")} at ${time(post.scheduledAt)}` : "immediately"}
                </span>
              </p>
            </div>
            <Button size="sm" variant="secondary" href={xRoutes.post(post.id)}>
              View details
            </Button>
          </div>

          <div className="mt-2.5">
            <FailureDetail
              post={post}
              onRetry={() => actions.retry(post)}
              onEdit={() => actions.openEdit(post)}
              onReschedule={() => actions.openSchedule(post)}
              onDiscard={() => actions.confirmDelete(post)}
              compact
            />
          </div>
        </div>
      ))}
    </div>
  );
}
