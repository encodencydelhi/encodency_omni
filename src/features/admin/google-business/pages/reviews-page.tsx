"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Star,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { RatingBars } from "../components/charts";
import { ReviewReplyDrawer, downloadCsv } from "../components/dialogs";
import { CapabilityState } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  PageTitle,
  Pagination,
  SearchField,
  SelectMenu,
  Stars,
  Thumb,
  UnderlineTabs,
  buttonClass,
  useDebouncedSearch,
  type MenuItem,
} from "../components/ui";
import { useLocationScope, useQueryState } from "../data/hooks";
import { ALL_LOCATIONS, filterReviews, isAnswered, reviewSummary, type ReviewTab } from "../data/selectors";
import { gbRoutes } from "../lib/constants";
import { date as fmtDate, dateTime, relative } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { Review } from "../types";

const DEFAULTS = { tab: "all", location: ALL_LOCATIONS, rating: "all", date: "all", q: "", sort: "newest", page: "1", review: "" };
const PAGE_SIZE = 8;

export function ReviewsPage() {
  return (
    <div className="space-y-1">
      <PageTitle title="Reviews" description="Reply to customers across every location and keep the response rate high." />
      <ReviewsWorkspace />
    </div>
  );
}

export function ReviewsWorkspace({ lockedLocationId }: { lockedLocationId?: string }) {
  const { reviews, locations, can, deleteReviewReply } = useGbp();
  const { selected: scopeLocation } = useLocationScope();
  const { values, set, reset } = useQueryState(DEFAULTS);
  const { search, setSearch, pending } = useDebouncedSearch(values.q, (next) => set({ q: next, page: "1" }));
  // The open reply drawer lives in `?review=`, so the link is shareable and
  // Back closes the drawer instead of leaving the page.
  const replyTo = values.review || null;
  const setReplyTo = (reviewId: string | null) => set({ review: reviewId ?? "" });
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);

  // The page-level location selector scopes this list unless a location owns it.
  const locationFilter = lockedLocationId ?? (values.location !== ALL_LOCATIONS ? values.location : scopeLocation);

  const scoped = useMemo(
    () => (locationFilter === ALL_LOCATIONS ? reviews : reviews.filter((review) => review.locationId === locationFilter)),
    [reviews, locationFilter],
  );

  const counts = useMemo(
    () => ({
      all: scoped.length,
      unanswered: scoped.filter((review) => !isAnswered(review)).length,
      replied: scoped.filter(isAnswered).length,
      low: scoped.filter((review) => review.starRating <= 2).length,
      high: scoped.filter((review) => review.starRating >= 4).length,
      policy: scoped.filter((review) => review.policyStatus !== null).length,
    }),
    [scoped],
  );

  const rows = useMemo(() => filterReviews(scoped, { ...values, tab: values.tab as ReviewTab }), [scoped, values]);
  const summary = useMemo(() => reviewSummary(scoped), [scoped]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(values.page) || 1), pageCount);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filtersActive = (["rating", "date", "q"] as const).filter((key) => values[key] !== DEFAULTS[key]).length + (!lockedLocationId && values.location !== ALL_LOCATIONS ? 1 : 0);

  const rowMenu = (review: Review): (MenuItem | "separator")[] => {
    const location = locations.find((item) => item.locationId === review.locationId);
    return [
      { label: review.reply ? "Edit reply" : "Reply", icon: MessageSquare, onSelect: () => setReplyTo(review.reviewId), gate: can.canReplyReviews },
      { label: "Delete reply", icon: Trash2, danger: true, hidden: !review.reply, onSelect: () => setConfirmDelete(review), gate: can.canDeleteReviewReply },
      "separator",
      { label: "Open location", icon: Star, href: gbRoutes.location(review.locationId), hidden: Boolean(lockedLocationId) },
      { label: "View on Google", icon: ExternalLink, href: location ? gbRoutes.mapsSearch(location.placeId) : gbRoutes.businessProfileManager, external: true },
    ];
  };

  const exportReviews = () => {
    downloadCsv(
      [
        ["Review ID", "Location", "Reviewer", "Rating", "Comment", "Created", "Replied", "Reply"],
        ...rows.map((review) => [
          review.reviewId,
          locations.find((item) => item.locationId === review.locationId)?.profile.title ?? "",
          review.reviewer.displayName,
          review.starRating,
          review.comment,
          fmtDate(review.createTime),
          review.reply ? "Yes" : "No",
          review.reply?.comment ?? "",
        ]),
      ],
      "google-business-reviews.csv",
    );
  };

  if (!can.canReadReviews.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadReviews} title="Reviews unavailable" />
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <Card className="grid grid-cols-1 overflow-hidden divide-y divide-[#F3F4F6] md:grid-cols-2 md:divide-x xl:grid-cols-4 xl:divide-y-0">
        <div className="relative p-4 sm:p-5 bg-[#FFFAED]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FFEDD5]">
              <Star className="h-4 w-4 text-[#F59E0B]" fill="currentColor" />
            </div>
            <p className="text-[13px] font-medium text-[#4B5563]">Average rating</p>
          </div>
          <div className="relative z-10 mt-3 flex items-center gap-2">
            <span className="text-[32px] font-bold leading-none tracking-tight tabular-nums text-[#111827]">{summary.average === null ? "-" : summary.average.toFixed(1)}</span>
            {summary.average !== null && <Stars rating={summary.average} size={16} />}
          </div>
          <p className="relative z-10 mt-1.5 text-[12.5px] text-[#6B7280]">{summary.total} reviews</p>
          <div className="relative z-10 mt-4 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-[#FDE68A]">
            <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: `${summary.average ? (summary.average / 5) * 100 : 0}%` }} />
          </div>
          <Star className="absolute -right-3 -bottom-3 h-24 w-24 text-[#FDE68A] opacity-40 rotate-12 pointer-events-none" fill="currentColor" />
        </div>

        <div className="relative p-4 sm:p-5 bg-[#F0F7FF]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#DBEAFE]">
              <MessageSquare className="h-4 w-4 text-[#3B82F6]" fill="currentColor" />
            </div>
            <p className="text-[13px] font-medium text-[#4B5563]">Response rate</p>
          </div>
          <div className="relative z-10 mt-3 text-[32px] font-bold leading-none tracking-tight tabular-nums text-[#111827]">{summary.responseRate === null ? "-" : `${summary.responseRate}%`}</div>
          <p className="relative z-10 mt-1.5 text-[12.5px] text-[#6B7280]">{summary.answered} replied of {summary.total}</p>
          <div className="relative z-10 mt-4 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-[#BFDBFE]">
            <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${summary.responseRate || 0}%` }} />
          </div>
          <MessageSquare className="absolute -right-3 -bottom-3 h-24 w-24 text-[#BFDBFE] opacity-40 -rotate-12 pointer-events-none" fill="currentColor" />
        </div>

        <div className="relative p-4 sm:p-5 bg-[#FFF5F5]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FEE2E2]">
              <Clock className="h-4 w-4 text-[#EF4444]" />
            </div>
            <p className="text-[13px] font-medium text-[#4B5563]">Awaiting reply</p>
          </div>
          <div className="relative z-10 mt-3 text-[32px] font-bold leading-none tracking-tight tabular-nums text-[#111827]">{summary.unanswered}</div>
          <Button size="xs" variant="link" onClick={() => set({ tab: "unanswered", page: "1" })} className="relative z-10 mt-1 -ml-1.5 h-auto p-0 justify-start text-[#3B82F6]">
            Show unanswered &rarr;
          </Button>
          <div className="relative z-10 mt-2 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-[#FECACA]">
            <div className="h-full rounded-full bg-[#EF4444]" style={{ width: `${summary.total ? (summary.unanswered / summary.total) * 100 : 0}%` }} />
          </div>
          <Clock className="absolute -right-4 -bottom-4 h-24 w-24 text-[#FECACA] opacity-40 rotate-12 pointer-events-none" fill="currentColor" />
        </div>

        <div className="relative p-4 sm:p-5 bg-[#F0FDF4]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#DCFCE7]">
              <BarChart2 className="h-4 w-4 text-[#22C55E]" />
            </div>
            <p className="text-[13px] font-medium text-[#4B5563]">Rating breakdown</p>
          </div>
          <div className="relative z-10 mt-3">
            <RatingBars distribution={summary.distribution} total={summary.total} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-[#F1F3F4] px-3 pt-1">
          <UnderlineTabs<ReviewTab>
            label="Review status"
            value={values.tab as ReviewTab}
            onChange={(value) => set({ tab: value, page: "1" })}
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "unanswered", label: "Unanswered", count: counts.unanswered },
              { value: "replied", label: "Replied", count: counts.replied },
              { value: "low", label: "Low rating", count: counts.low },
              { value: "high", label: "High rating", count: counts.high },
              { value: "policy", label: "Policy issues", count: counts.policy },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#F1F3F4] px-3 py-2.5">
          <SearchField value={search} onChange={setSearch} loading={pending} placeholder="Search reviews or reviewers" className="w-full sm:w-[240px]" />
          {!lockedLocationId && (
            <SelectMenu
              label="Location"
              prefix="Location:"
              className="max-w-[240px]"
              value={values.location}
              onChange={(value) => set({ location: value, page: "1" })}
              options={[{ value: ALL_LOCATIONS, label: "All locations" }, ...locations.map((item) => ({ value: item.locationId, label: item.profile.title }))]}
            />
          )}
          <SelectMenu
            label="Rating"
            prefix="Rating:"
            value={values.rating}
            onChange={(value) => set({ rating: value, page: "1" })}
            options={[{ value: "all", label: "All" }, ...[5, 4, 3, 2, 1].map((star) => ({ value: String(star), label: `${star} star${star > 1 ? "s" : ""}` }))]}
          />
          <SelectMenu
            label="Date"
            prefix="Date:"
            value={values.date}
            onChange={(value) => set({ date: value, page: "1" })}
            options={[
              { value: "all", label: "Any time" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
            ]}
          />
          <SelectMenu
            label="Sort"
            prefix="Sort:"
            value={values.sort}
            onChange={(value) => set({ sort: value })}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
              { value: "lowest", label: "Lowest rating" },
              { value: "highest", label: "Highest rating" },
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={Download} onClick={exportReviews} disabled={!rows.length} disabledReason="No reviews to export">
              Export
            </Button>
            {filtersActive > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={X}
                onClick={() => {
                  setSearch("");
                  reset(["tab", "location"]);
                }}
              >
                Clear {filtersActive} filter{filtersActive > 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </div>

        {scoped.length === 0 ? (
          <EmptyState icon={Star} title="No reviews yet" description="Reviews appear here as customers leave them on your Google Business Profile." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={values.tab === "unanswered" ? CheckCircle2 : Filter}
            title={values.tab === "unanswered" && !filtersActive ? "Every review has a reply" : "No reviews match"}
            description={filtersActive ? "Try a different search or clear the filters." : "Reviews that need attention will show up here."}
            action={
              filtersActive ? (
                <Button
                  variant="secondary"
                  icon={X}
                  onClick={() => {
                    setSearch("");
                    reset(["tab", "location"]);
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-[#F1F3F4]">
            {visible.map((review) => {
              const location = locations.find((item) => item.locationId === review.locationId);
              return (
                <li key={review.reviewId} className="px-3 py-3 sm:px-4">
                  <div className="flex gap-1">
                    <Avatar name={review.reviewer.displayName} src={review.reviewer.profilePhotoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <b className="text-[12.5px] font-medium text-[#202124]">{review.reviewer.displayName}</b>
                        <Stars rating={review.starRating} size={13} />
                        <time className="text-[11.5px] text-[#80868B]" dateTime={review.createTime} title={dateTime(review.createTime)}>
                          {relative(review.createTime)}
                        </time>
                        {review.reply ? (
                          <Badge tone="green" icon={CheckCircle2}>Replied</Badge>
                        ) : (
                          <Badge tone="amber">Needs reply</Badge>
                        )}
                        {review.policyStatus && (
                          <Badge tone="red" icon={TriangleAlert}>
                            Reported to Google
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-5 text-[#3C4043]">{review.comment}</p>
                      {review.media.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {review.media.map((url) => (
                            <Thumb key={url} src={url} className="w-16" sizes="64px" />
                          ))}
                        </div>
                      )}
                      {!lockedLocationId && location && (
                        <Link href={gbRoutes.location(location.locationId)} className="mt-1.5 inline-block truncate text-[11.5px] text-[#5F6368] hover:text-[#1A73E8]">
                          {location.profile.title}
                        </Link>
                      )}
                      {review.reply && (
                        <div className="mt-2.5 rounded-lg border border-[#E8EAED] bg-[#F8F9FA] px-3 py-2">
                          <p className="text-[11.5px] font-medium text-[#5F6368]">
                            Your reply · {relative(review.reply.updateTime)} · {review.reply.author}
                          </p>
                          <p className="mt-1 text-[12.5px] leading-5 text-[#3C4043]">{review.reply.comment}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                      <Button size="xs" variant={review.reply ? "secondary" : "primary"} gate={can.canReplyReviews} onClick={() => setReplyTo(review.reviewId)} className="max-sm:hidden">
                        {review.reply ? "Edit reply" : "Reply"}
                      </Button>
                      <ActionMenu
                        label={`Actions for review by ${review.reviewer.displayName}`}
                        items={rowMenu(review)}
                        trigger={
                          <button type="button" className={buttonClass("ghost", "icon")}>
                            <MoreHorizontal className="size-4" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="border-t border-[#F1F3F4]">
            <Pagination page={page} pageCount={pageCount} total={rows.length} pageSize={PAGE_SIZE} noun="reviews" onPage={(next) => set({ page: String(next) })} />
          </div>
        )}
      </Card>

      <ReviewReplyDrawer
        reviewId={replyTo}
        onClose={() => setReplyTo(null)}
      />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete this reply?"
        description="The reply is removed from Google for everyone. The review itself stays published."
        affected={confirmDelete ? [`Review by ${confirmDelete.reviewer.displayName}`, `${confirmDelete.starRating} stars`] : []}
        confirmLabel="Delete reply"
        onConfirm={async () => {
          if (!confirmDelete) return false;
          return deleteReviewReply(confirmDelete.reviewId);
        }}
      />
    </div>
  );
}

/** Compact review list used inside the location detail tab. */
export function LocationReviewsPanel({ locationId }: { locationId: string }) {
  return <ReviewsWorkspace lockedLocationId={locationId} />;
}

export function ReviewSummaryCard({ locationId, className }: { locationId: string; className?: string }) {
  const { reviews } = useGbp();
  const scoped = useMemo(() => reviews.filter((review) => review.locationId === locationId), [reviews, locationId]);
  const summary = reviewSummary(scoped);
  return (
    <Card className={className}>
      <CardHeader title="Reviews" description={`${summary.total} total · ${summary.unanswered} awaiting reply`} />
      <div className="flex items-center gap-1 px-4 pb-4">
        <div className="text-center">
          <p className="text-[28px] font-medium leading-8 tabular-nums text-[#202124]">{summary.average === null ? "-" : summary.average.toFixed(1)}</p>
          {summary.average !== null && <Stars rating={summary.average} />}
          <p className="mt-1 text-[11.5px] text-[#80868B]">{summary.responseRate ?? 0}% replied</p>
        </div>
        <div className="min-w-0 flex-1">
          <RatingBars distribution={summary.distribution} total={summary.total} />
        </div>
      </div>
    </Card>
  );
}

