"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  MessageSquare,
  MessageSquareReply,
  MoreHorizontal,
  PauseCircle,
  Send,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { subDays } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CapabilityState, ErrorState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageTitle,
  SearchField,
  SelectMenu,
  Skeleton,
  Thumb,
  UnderlineTabs,
  buttonClass,
  useDebounced,
  type MenuItem,
} from "../components/ui";
import { useCommentsInfinite, useRepliesInfinite } from "../data/hooks";
import { isAnswered, toCommentThread } from "../data/mappers";
import { useQueryState } from "../hooks/use-query-state";
import { describeYouTubeError } from "../live/youtube-errors";
import { MODERATION_LABEL, ytRoutes } from "../lib/constants";
import { dateTime, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { CommentReply, CommentThread, ModerationStatus, Video } from "../types";

type InboxTab = "all" | "unanswered" | "published" | "held" | "spam";

const DEFAULTS = { status: "all", video: "all", date: "all", q: "", reply: "all", sort: "newest", thread: "" };
const PAGE_STEP = 8;

/** Comments are per video: the selected video, or the most recent published one when none is selected. */
function useSelectedVideo(forced?: string): { video: Video | undefined; published: Video[] } {
  const { videos } = useYouTube();
  const { values } = useQueryState(DEFAULTS);
  const published = useMemo(() => [...videos].filter((v) => v.status === "published").sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")), [videos]);
  const id = forced ?? (values.video !== "all" ? values.video : undefined);
  const video = (id ? videos.find((v) => v.id === id) : undefined) ?? (forced ? undefined : published[0]);
  return { video, published };
}

/** The three comment queues of one video. Held / likely-spam are owner-only, so they load only for people who may moderate. */
function useVideoComments(videoId: string | undefined, commentsOn: boolean) {
  const { can, connection } = useYouTube();
  const usable = connection.state === "connected" || connection.state === "syncing";
  const enabled = Boolean(videoId) && usable && commentsOn;
  const moderate = enabled && can.canModerateComments.allowed;
  const published = useCommentsInfinite(videoId, { filter: "published", order: "time", enabled });
  const held = useCommentsInfinite(videoId, { filter: "heldForReview", order: "time", enabled: moderate });
  const spam = useCommentsInfinite(videoId, { filter: "likelySpam", order: "time", enabled: moderate });
  const map = (q: typeof published): CommentThread[] => (videoId ? (q.data?.pages.flatMap((p) => p.items.map((t) => toCommentThread(t, videoId))) ?? []) : []);
  return {
    published,
    held,
    spam,
    publishedThreads: useMemo(() => map(published), [published.data, videoId]), // eslint-disable-line react-hooks/exhaustive-deps
    heldThreads: useMemo(() => map(held), [held.data, videoId]), // eslint-disable-line react-hooks/exhaustive-deps
    spamThreads: useMemo(() => map(spam), [spam.data, videoId]), // eslint-disable-line react-hooks/exhaustive-deps
    moderate,
  };
}

export function CommentsPage() {
  const { ready, videosState } = useYouTube();
  const { video, published } = useSelectedVideo();
  if (!ready || videosState.isLoading) return <PageSkeleton variant="table" />;
  return (
    <div className="space-y-1">
      <PageTitle title="Comments" description="Reply to viewers and keep conversations healthy. Comments are shown one video at a time." />
      {!video ? (
        <Card>
          <EmptyState icon={MessageSquare} title="No published videos yet" description="Comments belong to videos. Publish a video, then reply to and moderate its comments here." action={<Button variant="primary" href={ytRoutes.content}>Go to content</Button>} />
        </Card>
      ) : (
        <>
          <AttentionSummary video={video} />
          <CommentInbox publishedVideos={published} />
        </>
      )}
    </div>
  );
}

function AttentionSummary({ video }: { video: Video }) {
  const { values, set } = useQueryState(DEFAULTS);
  const commentsOn = video.commentsEnabled !== false;
  const q = useVideoComments(video.id, commentsOn);
  const answered = q.publishedThreads.filter(isAnswered).length;
  const tiles = [
    { status: "unanswered", label: "Unanswered", hint: "Waiting for a reply", count: q.published.data ? q.publishedThreads.length - answered : null, icon: MessageSquareReply, tone: "text-[#1D4ED8] bg-[#EFF4FF]" },
    { status: "published", label: "Replied", hint: "Channel has answered", count: q.published.data ? answered : null, icon: CheckCircle2, tone: "text-[#067647] bg-[#ECFAF3]" },
    { status: "held", label: "Held for review", hint: "Hidden until approved", count: q.held.data ? q.heldThreads.length : null, icon: PauseCircle, tone: "text-[#B54708] bg-[#FFF7E8]" },
    { status: "spam", label: "Likely spam", hint: "Review or remove", count: q.spam.data ? q.spamThreads.length : null, icon: Clock3, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 xl:grid-cols-4">
      {tiles.map((t) => {
        const tab = values.status;
        const active = tab === t.status || (t.status === "published" && tab === "published");
        return (
          <button
            key={t.label}
            type="button"
            aria-pressed={active}
            onClick={() => set({ status: t.status, reply: "all" })}
            className={cn("flex items-center gap-3 rounded-[10px] border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition hover:border-[#C9D1DC] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E5202E]/25", active ? "border-[#0F1B3D]/25 ring-[3px] ring-[#0F1B3D]/6" : "border-[#E4E9F0]")}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm", t.tone)}><t.icon className="size-4" /></span>
            <span className="min-w-0">
              <span className="block text-[20px] font-semibold leading-6 tabular-nums text-[#0F1B3D]">{t.count === null ? "—" : t.count}</span>
              <span className="block truncate text-[12px] font-medium text-[#3C4A66]">{t.label}</span>
              <span className="block truncate text-[11px] text-[#98A2B3]">{t.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CommentInbox({ videoId, publishedVideos }: { videoId?: string; publishedVideos?: Video[] }) {
  const { can, removeComments, moderateComments } = useYouTube();
  const { values, set, reset } = useQueryState(DEFAULTS);
  const { video, published } = useSelectedVideo(videoId);
  const options = publishedVideos ?? published;
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounced(search, 300);
  useEffect(() => {
    if (debounced.value !== values.q) set({ q: debounced.value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced.value]);

  const [rawSelected, setSelected] = useState<string[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<string[] | null>(null);
  const [visible, setVisible] = useState(PAGE_STEP);
  const tab = (values.status as InboxTab) || "all";

  const commentsOn = video ? video.commentsEnabled !== false : false;
  const q = useVideoComments(video?.id, commentsOn);

  const source: CommentThread[] = useMemo(() => {
    switch (tab) {
      case "held":
        return q.heldThreads;
      case "spam":
        return q.spamThreads;
      case "unanswered":
        return q.publishedThreads.filter((c) => !isAnswered(c));
      default:
        return q.publishedThreads;
    }
  }, [tab, q.heldThreads, q.spamThreads, q.publishedThreads]);

  const active = tab === "held" ? q.held : tab === "spam" ? q.spam : q.published;
  const needsModerate = (tab === "held" || tab === "spam") && !can.canModerateComments.allowed;

  const counts = {
    all: q.publishedThreads.length,
    unanswered: q.publishedThreads.filter((c) => !isAnswered(c)).length,
    published: q.publishedThreads.length,
    held: q.heldThreads.length,
    spam: q.spamThreads.length,
  };

  const filtered = useMemo(() => {
    const text = values.q.trim().toLowerCase();
    const since = values.date === "all" ? null : subDays(new Date(), Number(values.date.replace("d", "")));
    const list = source.filter((c) => {
      if (values.reply === "answered" && !isAnswered(c)) return false;
      if (values.reply === "unanswered" && isAnswered(c)) return false;
      if (text && !c.text.toLowerCase().includes(text) && !c.author.toLowerCase().includes(text)) return false;
      if (since && (!c.publishedAt || new Date(c.publishedAt) < since)) return false;
      return true;
    });
    return [...list].sort((a, b) =>
      values.sort === "oldest" ? (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "") : values.sort === "likes" ? (b.likeCount ?? 0) - (a.likeCount ?? 0) : (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
  }, [source, values]);

  const shown = filtered.slice(0, visible);
  const openThread = [...q.publishedThreads, ...q.heldThreads, ...q.spamThreads].find((c) => c.id === values.thread) ?? null;
  const selected = rawSelected.filter((id) => filtered.some((c) => c.id === id));
  const byId = (id: string) => filtered.find((c) => c.id === id);
  const itemsOf = (ids: string[]) => ids.map(byId).filter((c): c is CommentThread => Boolean(c)).map((c) => ({ videoId: c.videoId, commentId: c.commentId, own: c.authoredByChannel }));

  const activeFilters = (["date", "q", "reply"] as const).filter((k) => values[k] !== DEFAULTS[k]).length;

  const moderationItems = (c: CommentThread): (MenuItem | "separator")[] => [
    { label: "Open thread", icon: MessageSquareReply, onSelect: () => set({ thread: c.id }) },
    { label: "Open video", icon: ExternalLink, href: ytRoutes.video(c.videoId), hidden: Boolean(videoId) },
    { label: "View video analytics", icon: BarChart3, href: `${ytRoutes.video(c.videoId)}?tab=analytics`, gate: can.canViewAnalytics },
    "separator",
    { label: "Approve & publish", icon: CheckCircle2, onSelect: () => void moderateComments(itemsOf([c.id]), "published"), hidden: c.moderationStatus === "published", gate: can.canModerateComments },
    { label: "Hold for review", icon: PauseCircle, onSelect: () => void moderateComments(itemsOf([c.id]), "heldForReview"), hidden: c.moderationStatus === "heldForReview", gate: can.canModerateComments },
    "separator",
    { label: c.authoredByChannel ? "Delete comment" : "Remove comment", icon: Trash2, danger: true, onSelect: () => setConfirmRemove([c.id]), gate: can.canRemoveComments },
  ];

  if (!video) {
    return (
      <Card>
        <EmptyState icon={MessageSquare} title="No published videos yet" description="Comments belong to videos. Publish a video, then reply to and moderate its comments here." />
      </Card>
    );
  }

  return (
    <Card>
      <div className="border-b border-[#EEF1F5] px-3 pt-1">
        <UnderlineTabs<InboxTab>
          label="Comment status"
          value={tab}
          onChange={(v) => set({ status: v })}
          items={[
            { value: "all", label: "All", count: q.published.data ? counts.all : undefined },
            { value: "unanswered", label: "Unanswered", count: q.published.data ? counts.unanswered : undefined },
            { value: "published", label: "Published", count: q.published.data ? counts.published : undefined },
            { value: "held", label: "Held for review", count: q.held.data ? counts.held : undefined },
            { value: "spam", label: "Likely spam", count: q.spam.data ? counts.spam : undefined },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF1F5] px-3 py-2.5">
        <SearchField value={search} onChange={setSearch} loading={debounced.pending} placeholder="Search loaded comments or authors" className="w-full sm:w-[240px]" />
        {!videoId && (
          <SelectMenu label="Video" prefix="Video:" className="max-w-[260px]" value={video.id} onChange={(v) => set({ video: v, thread: "" })} options={options.map((v) => ({ value: v.id, label: v.title }))} />
        )}
        <SelectMenu label="Date" prefix="Date:" value={values.date} onChange={(v) => set({ date: v })} options={[{ value: "all", label: "Any time" }, { value: "1d", label: "Last 24 hours" }, { value: "7d", label: "Last 7 days" }, { value: "28d", label: "Last 28 days" }]} />
        <SelectMenu label="Reply status" prefix="Reply:" value={values.reply} onChange={(v) => set({ reply: v })} options={[{ value: "all", label: "Any" }, { value: "unanswered", label: "Not replied" }, { value: "answered", label: "Replied" }]} />
        <SelectMenu label="Sort" prefix="Sort:" value={values.sort} onChange={(v) => set({ sort: v })} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "likes", label: "Most liked" }]} />
        {activeFilters > 0 && (
          <Button size="sm" variant="ghost" icon={X} className="ml-auto" onClick={() => { setSearch(""); reset(videoId ? ["tab", "status"] : ["status", "video"]); }}>
            Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF1F5] bg-[#FFF8F8] px-3 py-2">
          <span className="text-[12.5px] font-semibold text-[#0F1B3D]">{selected.length} selected</span>
          <Button size="xs" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
          <span className="mx-1 h-4 w-px bg-[#F5C2C7]" />
          <Button size="sm" variant="secondary" icon={CheckCircle2} gate={can.canModerateComments} onClick={async () => (await moderateComments(itemsOf(selected), "published")) && setSelected([])}>Approve</Button>
          <Button size="sm" variant="secondary" icon={PauseCircle} gate={can.canModerateComments} onClick={async () => (await moderateComments(itemsOf(selected), "heldForReview")) && setSelected([])}>Hold</Button>
          <Button size="sm" variant="danger" icon={Trash2} gate={can.canRemoveComments} onClick={() => setConfirmRemove(selected)}>Remove</Button>
        </div>
      )}

      {!commentsOn ? (
        <EmptyState icon={MessageSquare} title="Comments are turned off" description="Comments are disabled for this video. You can turn them on in YouTube Studio." action={<Button variant="secondary" href={ytRoutes.studio} external>Open YouTube Studio</Button>} />
      ) : needsModerate ? (
        <CapabilityState capability={can.canModerateComments} title="Moderation queue unavailable" />
      ) : active.isPending && active.fetchStatus !== "idle" ? (
        <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading comments">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : active.error ? (
        isCommentsDisabled(active.error) ? (
          <EmptyState icon={MessageSquare} title="Comments are turned off" description="Comments are disabled for this video. You can turn them on in YouTube Studio." />
        ) : (
          <ErrorState error={describeYouTubeError(active.error)} onRetry={() => void active.refetch()} title="Comments couldn't load" />
        )
      ) : source.length === 0 ? (
        <EmptyState
          icon={tab === "unanswered" ? CheckCircle2 : MessageSquare}
          title={tab === "unanswered" ? "You've replied to everything" : tab === "held" ? "Nothing held for review" : tab === "spam" ? "No likely spam" : "No comments yet"}
          description="New comments that need attention will show up here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Filter} title="No comments match" description="Try a different search or clear filters." action={<Button variant="secondary" icon={X} onClick={() => { setSearch(""); reset(["status", "video"]); }}>Clear filters</Button>} />
      ) : (
        <ul className="divide-y divide-[#EEF1F5]">
          {shown.map((c) => {
            const isSel = selected.includes(c.id);
            return (
              <li key={c.id} className={cn("flex gap-3 px-3 py-3 sm:px-4", isSel && "bg-[#FFF8F8]")}>
                <Checkbox className="mt-2" aria-label={`Select comment by ${c.author}`} checked={isSel} onCheckedChange={(ch) => setSelected((prev) => (ch ? [...prev, c.id] : prev.filter((x) => x !== c.id)))} />
                <Avatar name={c.author} src={c.authorAvatar} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <b className="text-[12.5px] font-semibold text-[#0F1B3D]">{c.author}</b>
                    <time className="text-[11.5px] text-[#98A2B3]" dateTime={c.publishedAt ?? undefined} title={dateTime(c.publishedAt)}>{relative(c.publishedAt)}</time>
                    {c.moderationStatus !== "published" && <ModerationBadge status={c.moderationStatus} />}
                    {isAnswered(c) && <Badge tone="green" icon={CheckCircle2}>Replied</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-5 text-[#24324F]">{c.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 text-[12px] text-[#6B7890]" aria-label={`${c.likeCount ?? 0} likes`}>
                      <ThumbsUp className="size-3.5" />
                      {c.likeCount ?? 0}
                    </span>
                    <Button size="xs" variant="ghost" icon={MessageSquareReply} onClick={() => set({ thread: c.id })} className="px-1.5">
                      {c.totalReplyCount ? `${c.totalReplyCount} ${c.totalReplyCount === 1 ? "reply" : "replies"}` : "Reply"}
                    </Button>
                    {!videoId && (
                      <Link href={ytRoutes.video(video.id)} className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[#6B7890] hover:text-[#2563EB]">
                        <Thumb src={video.thumbnailUrl} className="w-9" sizes="36px" />
                        <span className="max-w-[260px] truncate">{video.title}</span>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  {c.moderationStatus !== "published" && (
                    <Button size="xs" variant="secondary" icon={CheckCircle2} gate={can.canModerateComments} onClick={() => void moderateComments(itemsOf([c.id]), "published")} className="max-sm:hidden">Approve</Button>
                  )}
                  <ActionMenu label={`Moderate comment by ${c.author}`} items={moderationItems(c)} trigger={<button type="button" className={buttonClass("ghost", "icon")}><MoreHorizontal className="size-4" /></button>} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {commentsOn && !needsModerate && !active.error && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF1F5] px-4 py-2.5 text-[12px] text-[#6B7890]">
          <span>
            Showing <b className="font-semibold text-[#0F1B3D]">{shown.length}</b> of <b className="font-semibold text-[#0F1B3D]">{filtered.length}</b> loaded comments
          </span>
          <div className="flex gap-2">
            {filtered.length > visible && <Button size="sm" variant="secondary" onClick={() => setVisible((n) => n + PAGE_STEP)}>Show more</Button>}
            {active.hasNextPage && <Button size="sm" variant="secondary" loading={active.isFetchingNextPage} onClick={() => void active.fetchNextPage()}>Load older comments</Button>}
          </div>
        </div>
      )}

      <ThreadDrawer key={openThread?.id ?? "none"} thread={openThread} video={video} onClose={() => set({ thread: "" })} onRemove={(id) => setConfirmRemove([id])} />
      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title={confirmRemove?.length === 1 ? "Remove this comment?" : `Remove ${confirmRemove?.length ?? 0} comments?`}
        description="Your own comments are deleted from YouTube. Other people's comments are rejected, which is permanent: YouTube cannot republish a rejected comment. This can't be undone."
        affected={filtered.filter((c) => confirmRemove?.includes(c.id)).slice(0, 5).map((c) => `${c.author}: “${c.text.slice(0, 80)}${c.text.length > 80 ? "…" : ""}”${c.totalReplyCount ? ` · ${c.totalReplyCount} replies` : ""}`)}
        confirmLabel="Remove"
        onConfirm={async () => {
          const ids = confirmRemove ?? [];
          const ok = await removeComments(itemsOf(ids));
          if (ok) {
            setSelected((prev) => prev.filter((id) => !ids.includes(id)));
            if (values.thread && ids.includes(values.thread)) set({ thread: "" });
          }
          return ok;
        }}
      />
    </Card>
  );
}

function isCommentsDisabled(error: unknown): boolean {
  return describeYouTubeError(error).reason === "youtube_comments_disabled";
}

function ModerationBadge({ status }: { status: ModerationStatus }) {
  const tone = status === "heldForReview" ? "amber" : status === "likelySpam" ? "red" : "neutral";
  const icon = status === "heldForReview" ? Clock3 : undefined;
  return <Badge tone={tone} icon={icon}>{MODERATION_LABEL[status]}</Badge>;
}

function ThreadDrawer({ thread, video, onClose, onRemove }: { thread: CommentThread | null; video: Video; onClose: () => void; onRemove: (id: string) => void }) {
  const { channel, can, replyToComment, moderateComments } = useYouTube();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const canReply = can.canReplyComments.allowed && thread?.moderationStatus === "published" && thread.canReply;
  // The thread only carries a preview of its replies; the full list comes from the replies endpoint.
  const replies = useRepliesInfinite(thread?.commentId, thread !== null && thread.totalReplyCount > 0);
  const allReplies: CommentReply[] = useMemo(() => {
    const loaded = replies.data?.pages.flatMap((p) => p.items) ?? [];
    if (!loaded.length) return thread?.replies ?? [];
    return loaded.map((r) => ({
      id: r.commentId,
      author: r.authorDisplayName ?? "Viewer",
      authorAvatar: r.authorProfileImageUrl && /^https:\/\//i.test(r.authorProfileImageUrl) ? r.authorProfileImageUrl : undefined,
      isChannelOwner: r.authoredByChannel,
      text: r.textDisplay ?? r.textOriginal ?? "",
      likeCount: r.likeCount,
      publishedAt: r.publishedAt,
    }));
  }, [replies.data, thread]);

  const send = async () => {
    if (!thread || !text.trim() || busy) return;
    setBusy(true);
    const ok = await replyToComment(thread.videoId, thread.commentId, text.trim());
    setBusy(false);
    if (ok) setText("");
  };
  const asItem = thread ? [{ videoId: thread.videoId, commentId: thread.commentId, own: thread.authoredByChannel }] : [];

  return (
    <Sheet open={thread !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-[520px] sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="text-[15px] text-[#0F1B3D]">Comment thread</SheetTitle>
          <SheetDescription asChild>
            <Link href={ytRoutes.video(video.id)} onClick={onClose} className="flex items-center gap-2 text-[12.5px] text-[#6B7890] hover:text-[#2563EB]">
              <Thumb src={video.thumbnailUrl} className="w-12" sizes="48px" />
              <span className="truncate">{video.title}</span>
            </Link>
          </SheetDescription>
        </SheetHeader>
        {thread && (
          <>
            <SheetBody className="space-y-4">
              {thread.moderationStatus !== "published" && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] px-3 py-2">
                  <span className="text-[12.5px] text-[#3C4A66]"><b className="font-semibold text-[#0F1B3D]">{MODERATION_LABEL[thread.moderationStatus]}.</b> Not visible to viewers.</span>
                  <Button size="xs" variant="primary" icon={CheckCircle2} gate={can.canModerateComments} onClick={() => void moderateComments(asItem, "published")}>Approve</Button>
                </div>
              )}
              <div className="flex gap-3">
                <Avatar name={thread.author} src={thread.authorAvatar} />
                <div className="min-w-0 flex-1 rounded-[10px] bg-[#F8FAFC] px-3 py-2.5">
                  <p className="text-[12px]"><b className="font-semibold text-[#0F1B3D]">{thread.author}</b> <span className="text-[#98A2B3]">· {relative(thread.publishedAt)}</span></p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-5 text-[#24324F]">{thread.text}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-[#6B7890]"><ThumbsUp className="size-3" />{thread.likeCount ?? 0}</p>
                </div>
              </div>
              {thread.totalReplyCount > 0 && replies.isPending && replies.fetchStatus !== "idle" ? (
                <div className="ml-11 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : replies.error ? (
                <div className="ml-11"><ErrorState compact error={describeYouTubeError(replies.error)} onRetry={() => void replies.refetch()} /></div>
              ) : allReplies.length > 0 ? (
                <>
                  <ul className="ml-11 space-y-3 border-l border-[#E4E9F0] pl-3">
                    {allReplies.map((r) => (
                      <li key={r.id} className="flex gap-2.5">
                        <Avatar name={r.author} src={r.authorAvatar ?? (r.isChannelOwner ? channel.avatarUrl || undefined : undefined)} className="size-7" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px]">
                            <b className="font-semibold text-[#0F1B3D]">{r.author}</b>
                            {r.isChannelOwner && <span className="ml-1.5 rounded bg-[#F1F4F8] px-1 text-[10.5px] font-semibold text-[#475467]">Creator</span>}
                            <span className="text-[#98A2B3]"> · {relative(r.publishedAt)}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-5 text-[#24324F]">{r.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {replies.hasNextPage && <div className="ml-11"><Button size="xs" variant="secondary" loading={replies.isFetchingNextPage} onClick={() => void replies.fetchNextPage()}>Load more replies</Button></div>}
                </>
              ) : (
                <p className="ml-11 text-[12px] text-[#98A2B3]">No replies yet.</p>
              )}
            </SheetBody>
            <SheetFooter className="flex-col items-stretch gap-2">
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" icon={PauseCircle} gate={can.canModerateComments} onClick={() => void moderateComments(asItem, "heldForReview")} disabled={thread.moderationStatus === "heldForReview"}>Hold</Button>
                <Button size="sm" variant="ghost" icon={Trash2} gate={can.canRemoveComments} onClick={() => onRemove(thread.id)} className="ml-auto text-[#C81E2B] hover:bg-[#FEF1F2] hover:text-[#C81E2B]">{thread.authoredByChannel ? "Delete" : "Remove"}</Button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="rounded-[10px] border border-[#DCE2EA] focus-within:border-[#E5202E] focus-within:ring-[3px] focus-within:ring-[#E5202E]/12"
              >
                <label htmlFor="reply-text" className="sr-only">Reply as {channel.title}</label>
                <textarea
                  id="reply-text"
                  rows={3}
                  value={text}
                  maxLength={10000}
                  disabled={!canReply || busy}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={canReply ? `Reply publicly as ${channel.title}…` : thread.moderationStatus !== "published" ? "Approve the comment before replying." : !thread.canReply ? "Replies are turned off for this comment." : can.canReplyComments.reason}
                  className="block w-full resize-none rounded-t-[10px] bg-transparent px-3 py-2 text-[13px] text-[#0F1B3D] outline-none placeholder:text-[#98A2B3] disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between gap-2 border-t border-[#EEF1F5] px-2 py-1.5">
                  <span className="text-[11px] text-[#98A2B3]">Ctrl + Enter to send</span>
                  <Button type="submit" size="sm" variant="primary" icon={Send} loading={busy} disabled={!text.trim() || !canReply} disabledReason={thread.moderationStatus !== "published" ? "Approve the comment first" : "Write a reply first"} gate={can.canReplyComments}>Reply</Button>
                </div>
              </form>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

