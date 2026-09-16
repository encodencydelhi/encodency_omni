"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  MessageSquare,
  MoreHorizontal,
  MousePointerClick,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CreatePostShortcut, SchedulePostDialog } from "../components/dialogs";
import { CapabilityState } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  InternalBadge,
  PageTitle,
  SearchField,
  SelectMenu,
  Notice,
  Thumb,
  UnderlineTabs,
  buttonClass,
  gb,
  useDebouncedSearch,
  type MenuItem,
} from "../components/ui";
import { useLocationScope, useQueryState } from "../data/hooks";
import { ALL_LOCATIONS, filterPosts, postCounts, type PostTab } from "../data/selectors";
import { CTA_LABEL, POST_STATE_LABEL, POST_TYPE_LABEL, gbRoutes } from "../lib/constants";
import { compact, date as fmtDate, dateTime, relative } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { Post, PostState } from "../types";

const DEFAULTS = { status: "all", location: ALL_LOCATIONS, type: "all", q: "", post: "" };

export const POST_TONE: Record<PostState, "green" | "blue" | "amber" | "red" | "neutral" | "violet"> = {
  published: "green",
  scheduled: "blue",
  approved: "blue",
  pending_approval: "violet",
  publishing: "blue",
  draft: "neutral",
  failed: "red",
  rejected: "red",
};

export function PostsPage() {
  const { can } = useGbp();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="space-y-1">
      <PageTitle
        title="Posts"
        description="Updates, events, offers and call-to-action posts published to your Google Business Profile."
        actions={
          <Button variant="primary" icon={Plus} gate={can.canCreatePosts} onClick={() => setCreateOpen(true)}>
            Create post
          </Button>
        }
      />
      <PostsWorkspace />
      <CreatePostShortcut open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export function PostsWorkspace({ lockedLocationId }: { lockedLocationId?: string }) {
  const { posts, locations, can, deletePost, publishPost, submitPostForApproval } = useGbp();
  const { selected: scopeLocation } = useLocationScope();
  const { values, set, reset } = useQueryState(DEFAULTS);
  const { search, setSearch, pending } = useDebouncedSearch(values.q, (next) => set({ q: next }));
  // The open post drawer lives in `?post=`, so deep links and Back both work.
  const detail = values.post || null;
  const setDetail = (postId: string | null) => set({ post: postId ?? "" });
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Post | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<Post | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const locationFilter = lockedLocationId ?? (values.location !== ALL_LOCATIONS ? values.location : scopeLocation);
  const scoped = useMemo(
    () => (locationFilter === ALL_LOCATIONS ? posts : posts.filter((post) => post.locationIds.includes(locationFilter))),
    [posts, locationFilter],
  );
  const counts = useMemo(() => postCounts(scoped), [scoped]);
  const rows = useMemo(() => filterPosts(scoped, { tab: values.status, type: values.type, q: values.q }), [scoped, values]);

  const filtersActive = (["type", "q"] as const).filter((key) => values[key] !== DEFAULTS[key]).length + (!lockedLocationId && values.location !== ALL_LOCATIONS ? 1 : 0);
  const openPost = posts.find((post) => post.id === detail) ?? null;

  const menuFor = (post: Post): (MenuItem | "separator")[] => [
    { label: "View details", icon: Eye, onSelect: () => setDetail(post.id) },
    { label: "Edit", icon: Pencil, href: `${gbRoutes.postCreate}?edit=${post.id}`, hidden: post.state === "published", gate: can.canCreatePosts },
    { label: "Duplicate", icon: Copy, href: `${gbRoutes.postCreate}?duplicate=${post.id}`, gate: can.canCreatePosts },
    "separator",
    {
      label: post.scheduledAt ? "Reschedule" : "Schedule",
      icon: CalendarClock,
      onSelect: () => setScheduleId(post.id),
      hidden: post.state === "published" || post.state === "publishing",
      gate: can.canCreatePosts,
    },
    {
      label: "Publish now",
      icon: Send,
      onSelect: () => setConfirmPublish(post),
      hidden: post.state === "published" || post.state === "publishing" || post.state === "pending_approval",
      gate: can.canPublishPosts,
    },
    {
      label: "Submit for approval",
      icon: Check,
      onSelect: () => void submitPostForApproval(post.id),
      hidden: !(post.state === "draft" || post.state === "rejected"),
      gate: can.canCreatePosts,
    },
    { label: "View on Google", icon: ExternalLink, href: post.searchUrl ?? gbRoutes.businessProfileManager, external: true, hidden: post.state !== "published" },
    "separator",
    { label: "Delete post", icon: Trash2, danger: true, onSelect: () => setConfirmDelete(post), gate: can.canCreatePosts },
  ];

  if (!can.canCreatePosts.allowed && !can.canReadLocations.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadLocations} title="Posts unavailable" />
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <Card>
        <div className="border-b border-[#F1F3F4] px-3 pt-1">
          <UnderlineTabs<PostTab>
            label="Post status"
            value={values.status as PostTab}
            onChange={(value) => set({ status: value })}
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "draft", label: "Drafts", count: counts.draft },
              { value: "pending_approval", label: "Pending approval", count: counts.pending_approval },
              { value: "scheduled", label: "Scheduled", count: counts.scheduled },
              { value: "published", label: "Published", count: counts.published },
              { value: "failed", label: "Failed", count: counts.failed },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <SearchField value={search} onChange={setSearch} loading={pending} placeholder="Search post text" className="w-full sm:w-[240px]" />
          {!lockedLocationId && (
            <SelectMenu
              label="Location"
              prefix="Location:"
              className="max-w-[240px]"
              value={values.location}
              onChange={(value) => set({ location: value })}
              options={[{ value: ALL_LOCATIONS, label: "All locations" }, ...locations.map((item) => ({ value: item.locationId, label: item.profile.title }))]}
            />
          )}
          <SelectMenu
            label="Type"
            prefix="Type:"
            value={values.type}
            onChange={(value) => set({ type: value })}
            options={[
              { value: "all", label: "All types" },
              { value: "update", label: "Update" },
              { value: "event", label: "Event" },
              { value: "offer", label: "Offer" },
              { value: "cta", label: "Call to action" },
            ]}
          />
          {filtersActive > 0 && (
            <Button
              size="sm"
              variant="ghost"
              icon={X}
              className="ml-auto"
              onClick={() => {
                setSearch("");
                reset(["status", "location"]);
              }}
            >
              Clear {filtersActive} filter{filtersActive > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </Card>

      {scoped.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="No posts yet"
            description="Posts appear on your profile in Search and Maps. Updates stay visible for seven days; events and offers until they end."
            action={
              <Button variant="primary" icon={Plus} gate={can.canCreatePosts} onClick={() => setCreateOpen(true)}>
                Create your first post
              </Button>
            }
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Filter}
            title="No posts match"
            description="Try another status, type or search term."
            action={
              <Button
                variant="secondary"
                icon={X}
                onClick={() => {
                  setSearch("");
                  reset(["status", "location"]);
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((post) => {
            const postLocations = locations.filter((location) => post.locationIds.includes(location.locationId));
            return (
              <Card key={post.id} className="flex flex-col overflow-hidden">
                <button type="button" onClick={() => setDetail(post.id)} className="block text-left">
                  {post.media[0] ? (
                    <Thumb src={post.media[0]} className="w-full rounded-none" sizes="(min-width: 1280px) 380px, 100vw" />
                  ) : (
                    <span className="grid aspect-[4/3] w-full place-items-center bg-[#F1F3F4] text-[#80868B]">
                      <MessageSquare className="size-6" />
                    </span>
                  )}
                </button>
                <div className="flex flex-1 flex-col p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{POST_TYPE_LABEL[post.type]}</Badge>
                      <Badge tone={POST_TONE[post.state]} dot={post.state === "publishing"}>
                        {POST_STATE_LABEL[post.state]}
                      </Badge>
                      {post.state === "pending_approval" && <InternalBadge label="Approval" />}
                    </div>
                    <ActionMenu
                      label={`Actions for post`}
                      items={menuFor(post)}
                      trigger={
                        <button type="button" className={buttonClass("ghost", "iconSm", "-mr-1 -mt-1")}>
                          <MoreHorizontal className="size-4" />
                        </button>
                      }
                    />
                  </div>
                  <button type="button" onClick={() => setDetail(post.id)} className="mt-2 text-left">
                    {post.event && <p className="text-[13px] font-medium text-[#202124]">{post.event.title}</p>}
                    <p className={cn("line-clamp-3 text-[12.5px] leading-5 text-[#3C4043]", post.event && "mt-0.5")}>{post.summary}</p>
                  </button>
                  {post.failureReason && (
                    <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-4 text-[#C5221F]">
                      <TriangleAlert className="mt-px size-3 shrink-0" />
                      {post.failureReason}
                    </p>
                  )}
                  <div className="mt-auto pt-3">
                    <p className="truncate text-[11.5px] text-[#5F6368]">
                      {postLocations.length === 1 ? postLocations[0]?.profile.title : `${postLocations.length} locations`}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] text-[#80868B]">
                      <span>
                        {post.publishedAt ? `Published ${fmtDate(post.publishedAt)}` : post.scheduledAt ? `Scheduled ${fmtDate(post.scheduledAt)}` : `Created ${fmtDate(post.createdAt)}`}
                      </span>
                      {post.metrics && (
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Eye className="size-3" />
                            {compact(post.metrics.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="size-3" />
                            {compact(post.metrics.clicks)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PostDetailDrawer
        post={openPost}
        onClose={() => setDetail(null)}
        onSchedule={(id) => setScheduleId(id)}
        onPublish={(post) => setConfirmPublish(post)}
        onDelete={(post) => setConfirmDelete(post)}
      />
      <SchedulePostDialog postId={scheduleId} onClose={() => setScheduleId(null)} />
      <CreatePostShortcut open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete this ${confirmDelete ? POST_TYPE_LABEL[confirmDelete.type].toLowerCase() : "post"}?`}
        description={
          confirmDelete?.state === "published"
            ? "The post is removed from your Google Business Profile immediately. Its views and clicks stay in past reports."
            : "The draft is removed from OmniPlatform. Nothing changes on Google."
        }
        affected={confirmDelete ? [confirmDelete.event?.title ?? confirmDelete.summary.slice(0, 80), `${confirmDelete.locationIds.length} location(s)`] : []}
        confirmLabel="Delete post"
        onConfirm={async () => {
          if (!confirmDelete) return false;
          const ok = await deletePost(confirmDelete.id);
          if (ok && detail === confirmDelete.id) setDetail(null);
          return ok;
        }}
      />
      <ConfirmDialog
        open={confirmPublish !== null}
        onOpenChange={(open) => !open && setConfirmPublish(null)}
        destructive={false}
        title="Publish this post now?"
        description="The post goes live on your Google Business Profile immediately and any schedule is cancelled."
        affected={
          confirmPublish
            ? [
                confirmPublish.event?.title ?? confirmPublish.summary.slice(0, 80),
                `${confirmPublish.locationIds.length} location(s)`,
                ...(confirmPublish.scheduledAt ? [`Cancels the schedule for ${dateTime(confirmPublish.scheduledAt)}`] : []),
              ]
            : []
        }
        confirmLabel="Publish now"
        onConfirm={() => (confirmPublish ? publishPost(confirmPublish.id) : false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post detail drawer with approval workflow                           */
/* ------------------------------------------------------------------ */

function PostDetailDrawer({
  post,
  onClose,
  onSchedule,
  onPublish,
  onDelete,
}: {
  post: Post | null;
  onClose: () => void;
  onSchedule: (id: string) => void;
  onPublish: (post: Post) => void;
  onDelete: (post: Post) => void;
}) {
  const { locations, can, reviewPost, submitPostForApproval } = useGbp();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  if (!post) return null;

  const postLocations = locations.filter((location) => post.locationIds.includes(location.locationId));
  const reviewable = post.state === "pending_approval";
  const canSubmit = post.state === "draft" || post.state === "rejected";

  const act = async (key: string, fn: () => Promise<boolean>) => {
    setBusy(key);
    const ok = await fn();
    setBusy(null);
    if (ok) setNote("");
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-[560px] sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2 text-[15px] text-[#202124]">
            {POST_TYPE_LABEL[post.type]}
            <Badge tone={POST_TONE[post.state]}>{POST_STATE_LABEL[post.state]}</Badge>
          </SheetTitle>
          <SheetDescription className="text-[12.5px]">
            {post.publishedAt ? `Published ${dateTime(post.publishedAt)}` : post.scheduledAt ? `Scheduled for ${dateTime(post.scheduledAt)}` : `Created ${dateTime(post.createdAt)} by ${post.createdBy}`}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-1">
          {post.media[0] && <Thumb src={post.media[0]} className="w-full" sizes="520px" />}
          {post.event && (
            <div className="rounded-lg border border-[#E8EAED] bg-[#F8F9FA] px-3 py-2">
              <p className="text-[13px] font-medium text-[#202124]">{post.event.title}</p>
              <p className="mt-0.5 text-[12px] text-[#5F6368]">
                {fmtDate(post.event.startDate)} - {fmtDate(post.event.endDate)}
              </p>
            </div>
          )}
          <p className="whitespace-pre-line text-[13px] leading-5 text-[#3C4043]">{post.summary}</p>
          {post.offer && (
            <div className="rounded-lg border border-[#FEEFC3] bg-[#FEF7E0] px-3 py-2 text-[12.5px] text-[#3C4043]">
              {post.offer.couponCode && (
                <p>
                  Coupon code: <b className="font-mono">{post.offer.couponCode}</b>
                </p>
              )}
              {post.offer.termsConditions && <p className="mt-1 text-[11.5px] text-[#5F6368]">{post.offer.termsConditions}</p>}
            </div>
          )}
          {post.cta && (
            <p className="text-[12.5px] text-[#3C4043]">
              Button: <b className="font-medium">{CTA_LABEL[post.cta.actionType]}</b> to{" "}
              <a href={post.cta.url} target="_blank" rel="noopener noreferrer" className="text-[#1A73E8] hover:underline">
                {post.cta.url}
              </a>
            </p>
          )}
          {post.failureReason && <Notice tone="red" title="This post failed to publish">{post.failureReason}</Notice>}

          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#80868B]">Locations</p>
            <ul className="space-y-1">
              {postLocations.map((location) => (
                <li key={location.locationId}>
                  <Link href={gbRoutes.location(location.locationId)} className="text-[12.5px] text-[#1A73E8] hover:underline">
                    {location.profile.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {post.metrics && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#E8EAED] px-3 py-2">
                <p className="text-[11.5px] text-[#5F6368]">Views</p>
                <p className="text-[17px] font-medium tabular-nums text-[#202124]">{compact(post.metrics.views)}</p>
              </div>
              <div className="rounded-lg border border-[#E8EAED] px-3 py-2">
                <p className="text-[11.5px] text-[#5F6368]">Clicks</p>
                <p className="text-[17px] font-medium tabular-nums text-[#202124]">{compact(post.metrics.clicks)}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-[#E8EAED] p-3.5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-[#202124]">
              Approval <InternalBadge hint="OmniPlatform workflow, separate from the Google post status." />
            </p>
            {(reviewable || canSubmit) && (
              <div className="mt-2">
                <FormField label={reviewable ? "Reviewer note" : "Note for the reviewer"} htmlFor="approval-note" hint={reviewable ? "Required when requesting changes or rejecting." : undefined}>
                  <textarea id="approval-note" rows={2} className={gb.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder={reviewable ? "What needs to change?" : "Anything the reviewer should know?"} />
                </FormField>
              </div>
            )}
            {reviewable && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" icon={CheckCircle2} gate={can.canApproveContent} loading={busy === "approve"} onClick={() => act("approve", () => reviewPost(post.id, "approved", note || undefined))}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={RotateCcw}
                  gate={can.canApproveContent}
                  loading={busy === "changes"}
                  disabled={!note.trim()}
                  disabledReason="Add a note describing the changes"
                  onClick={() => act("changes", () => reviewPost(post.id, "changes_requested", note))}
                >
                  Request changes
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={XCircle}
                  gate={can.canApproveContent}
                  loading={busy === "reject"}
                  disabled={!note.trim()}
                  disabledReason="Add a note explaining why"
                  onClick={() => act("reject", () => reviewPost(post.id, "rejected", note))}
                >
                  Reject
                </Button>
              </div>
            )}
            {canSubmit && (
              <Button size="sm" variant="secondary" icon={Send} className="mt-2" gate={can.canCreatePosts} loading={busy === "submit"} onClick={() => act("submit", () => submitPostForApproval(post.id, note || undefined))}>
                Submit for approval
              </Button>
            )}
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#80868B]">History</p>
              {post.approvals.length === 0 ? (
                <p className="text-[12px] text-[#80868B]">No approval activity.</p>
              ) : (
                <ol className="space-y-2">
                  {post.approvals.map((event) => (
                    <li key={event.id} className="flex gap-2.5">
                      <Avatar name={event.actor} className="size-7" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-[#3C4043]">
                          <b className="font-medium text-[#202124]">{event.actor}</b>{" "}
                          {event.action === "submitted" ? "submitted for approval" : event.action === "approved" ? "approved" : event.action === "rejected" ? "rejected" : "requested changes"}
                          <span className="text-[#80868B]"> · {relative(event.at)}</span>
                        </p>
                        {event.note && <p className="mt-0.5 rounded-md bg-[#F8F9FA] px-2 py-1 text-[12px] text-[#3C4043]">{event.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </SheetBody>
        <SheetFooter className="flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {post.state !== "published" && (
              <Button size="sm" variant="ghost" icon={CalendarClock} gate={can.canCreatePosts} onClick={() => onSchedule(post.id)}>
                {post.scheduledAt ? "Reschedule" : "Schedule"}
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={Trash2} className="text-[#C5221F] hover:bg-[#FCE8E6] hover:text-[#C5221F]" gate={can.canCreatePosts} onClick={() => onDelete(post)}>
              Delete
            </Button>
          </div>
          <div className="flex gap-2">
            {post.state === "published" ? (
              <Button size="sm" variant="secondary" icon={ExternalLink} href={post.searchUrl ?? gbRoutes.businessProfileManager} external>
                View on Google
              </Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" icon={Pencil} href={`${gbRoutes.postCreate}?edit=${post.id}`} gate={can.canCreatePosts}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={Send}
                  gate={can.canPublishPosts}
                  disabled={post.state === "pending_approval"}
                  disabledReason="Approve the post before publishing"
                  onClick={() => onPublish(post)}
                >
                  Publish now
                </Button>
              </>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
