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
  ShieldX,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { subDays } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageTitle,
  Pagination,
  SearchField,
  SelectMenu,
  Thumb,
  UnderlineTabs,
  buttonClass,
  useDebounced,
  type MenuItem,
} from "../components/ui";
import { useQueryState } from "../hooks/use-query-state";
import { MODERATION_LABEL, ytRoutes } from "../lib/constants";
import { dateTime, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { CommentThread, ModerationStatus } from "../types";

type InboxTab = "all" | "unanswered" | "published" | "held" | "spam";

const DEFAULTS = { status: "all", video: "all", date: "all", q: "", reply: "all", sort: "newest", page: "1", thread: "" };
const PAGE_SIZE = 8;

const isAnswered = (c: CommentThread) => c.replies.some((r) => r.isChannelOwner);

export function CommentsPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="table" />;
  return (
    <div className="space-y-1">
      <PageTitle title="Comments" description="Reply to viewers and keep conversations healthy across every video." />
      <AttentionSummary />
      <CommentInbox />
    </div>
  );
}

function AttentionSummary() {
  const { comments } = useYouTube();
  const { values, set } = useQueryState(DEFAULTS);
  const tiles = [
    { status: "unanswered", label: "Unanswered", hint: "Waiting for a reply", count: comments.filter((c) => c.moderationStatus === "published" && !isAnswered(c)).length, icon: MessageSquareReply, tone: "text-[#1D4ED8] bg-[#EFF4FF]" },
    { status: "all", label: "Priority", hint: "Questions & requests", count: comments.filter((c) => c.priority && !isAnswered(c)).length, icon: Clock3, tone: "text-[#6D28D9] bg-[#F4F0FF]", reply: "unanswered" },
    { status: "held", label: "Held for review", hint: "Hidden until approved", count: comments.filter((c) => c.moderationStatus === "heldForReview").length, icon: PauseCircle, tone: "text-[#B54708] bg-[#FFF7E8]" },
    { status: "spam", label: "Likely spam", hint: "Review or remove", count: comments.filter((c) => c.moderationStatus === "likelySpam").length, icon: ShieldX, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 xl:grid-cols-4">
      {tiles.map((t) => {
        const active = values.status === t.status && (t.reply ? values.reply === t.reply : values.reply === "all");
        return (
          <button
            key={t.label}
            type="button"
            aria-pressed={active}
            onClick={() => set({ status: t.status, reply: t.reply ?? "all", page: "1" })}
            className={cn("flex items-center gap-3 rounded-[10px] border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition hover:border-[#C9D1DC] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E5202E]/25", active ? "border-[#0F1B3D]/25 ring-[3px] ring-[#0F1B3D]/6" : "border-[#E4E9F0]")}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", t.tone)}><t.icon className="size-4" /></span>
            <span className="min-w-0">
              <span className="block text-[20px] font-semibold leading-6 tabular-nums text-[#0F1B3D]">{t.count}</span>
              <span className="block truncate text-[12px] font-medium text-[#3C4A66]">{t.label}</span>
              <span className="block truncate text-[11px] text-[#98A2B3]">{t.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CommentInbox({ videoId }: { videoId?: string }) {
  const { comments, videos, can, settings, moderateComments, deleteComments, toggleCommentLike } = useYouTube();
  const keywordMatch = (c: CommentThread) => settings.moderation.blockedKeywords.find((k) => c.text.toLowerCase().includes(k.toLowerCase()));
  const { values, set, reset } = useQueryState(DEFAULTS);
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounced(search, 300);
  useEffect(() => {
    if (debounced.value !== values.q) set({ q: debounced.value, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced.value]);

  const [rawSelected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const video = videoId ?? (values.video !== "all" ? values.video : undefined);
  const tab = values.status as InboxTab;

  const scoped = useMemo(() => comments.filter((c) => !video || c.videoId === video), [comments, video]);

  const counts = useMemo(
    () => ({
      all: scoped.filter((c) => c.moderationStatus !== "rejected").length,
      unanswered: scoped.filter((c) => c.moderationStatus === "published" && !isAnswered(c)).length,
      published: scoped.filter((c) => c.moderationStatus === "published").length,
      held: scoped.filter((c) => c.moderationStatus === "heldForReview").length,
      spam: scoped.filter((c) => c.moderationStatus === "likelySpam").length,
    }),
    [scoped],
  );

  const filtered = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    const since = values.date === "all" ? null : subDays(new Date(), Number(values.date.replace("d", "")));
    const list = scoped.filter((c) => {
      if (tab === "all" && c.moderationStatus === "rejected") return false;
      if (tab === "unanswered" && !(c.moderationStatus === "published" && !isAnswered(c))) return false;
      if (tab === "published" && c.moderationStatus !== "published") return false;
      if (tab === "held" && c.moderationStatus !== "heldForReview") return false;
      if (tab === "spam" && c.moderationStatus !== "likelySpam") return false;
      if (values.reply === "answered" && !isAnswered(c)) return false;
      if (values.reply === "unanswered" && isAnswered(c)) return false;
      if (q && !c.text.toLowerCase().includes(q) && !c.author.toLowerCase().includes(q)) return false;
      if (since && new Date(c.publishedAt) < since) return false;
      return true;
    });
    return list.sort((a, b) =>
      values.sort === "oldest" ? a.publishedAt.localeCompare(b.publishedAt) : values.sort === "likes" ? b.likeCount - a.likeCount : b.publishedAt.localeCompare(a.publishedAt),
    );
  }, [scoped, tab, values]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(values.page) || 1), pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const openThread = comments.find((c) => c.id === values.thread) ?? null;

  const selected = rawSelected.filter((id) => filtered.some((c) => c.id === id));

  const activeFilters = (["video", "date", "q", "reply"] as const).filter((k) => !(videoId && k === "video") && values[k] !== DEFAULTS[k]).length;

  const moderationItems = (c: CommentThread): (MenuItem | "separator")[] => [
    { label: "Open thread", icon: MessageSquareReply, onSelect: () => set({ thread: c.id }) },
    { label: "Open video", icon: ExternalLink, href: ytRoutes.video(c.videoId), hidden: Boolean(videoId) },
    { label: "View video analytics", icon: BarChart3, href: `${ytRoutes.video(c.videoId)}?tab=analytics`, gate: can.canViewAnalytics },
    "separator",
    { label: "Approve & publish", icon: CheckCircle2, onSelect: () => void moderateComments([c.id], "published"), hidden: c.moderationStatus === "published", gate: can.canModerateComments },
    { label: "Hold for review", icon: PauseCircle, onSelect: () => void moderateComments([c.id], "heldForReview"), hidden: c.moderationStatus === "heldForReview", gate: can.canModerateComments },
    { label: "Mark as spam", icon: ShieldX, onSelect: () => void moderateComments([c.id], "likelySpam"), hidden: c.moderationStatus === "likelySpam", gate: can.canModerateComments },
    "separator",
    { label: "Remove comment", icon: Trash2, danger: true, onSelect: () => setConfirmDelete([c.id]), gate: can.canModerateComments },
  ];

  return (
    <Card>
      <div className="border-b border-[#EEF1F5] px-3 pt-1">
        <UnderlineTabs<InboxTab>
          label="Comment status"
          value={tab}
          onChange={(v) => set({ status: v, page: "1" })}
          items={[
            { value: "all", label: "All", count: counts.all },
            { value: "unanswered", label: "Unanswered", count: counts.unanswered },
            { value: "published", label: "Published", count: counts.published },
            { value: "held", label: "Held for review", count: counts.held },
            { value: "spam", label: "Likely spam", count: counts.spam },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF1F5] px-3 py-2.5">
        <SearchField value={search} onChange={setSearch} loading={debounced.pending} placeholder="Search comments or authors" className="w-full sm:w-[240px]" />
        {!videoId && (
          <SelectMenu label="Video" prefix="Video:" className="max-w-[260px]" value={values.video} onChange={(v) => set({ video: v, page: "1" })} options={[{ value: "all", label: "All videos" }, ...videos.filter((v) => v.status === "published").map((v) => ({ value: v.id, label: v.title }))]} />
        )}
        <SelectMenu label="Date" prefix="Date:" value={values.date} onChange={(v) => set({ date: v, page: "1" })} options={[{ value: "all", label: "Any time" }, { value: "1d", label: "Last 24 hours" }, { value: "7d", label: "Last 7 days" }, { value: "28d", label: "Last 28 days" }]} />
        <SelectMenu label="Reply status" prefix="Reply:" value={values.reply} onChange={(v) => set({ reply: v, page: "1" })} options={[{ value: "all", label: "Any" }, { value: "unanswered", label: "Not replied" }, { value: "answered", label: "Replied" }]} />
        <SelectMenu label="Sort" prefix="Sort:" value={values.sort} onChange={(v) => set({ sort: v })} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "likes", label: "Most liked" }]} />
        {activeFilters > 0 && (
          <Button size="sm" variant="ghost" icon={X} className="ml-auto" onClick={() => { setSearch(""); reset(videoId ? ["tab", "status"] : ["status"]); }}>
            Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF1F5] bg-[#FFF8F8] px-3 py-2">
          <span className="text-[12.5px] font-semibold text-[#0F1B3D]">{selected.length} selected</span>
          <Button size="xs" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
          <span className="mx-1 h-4 w-px bg-[#F5C2C7]" />
          <Button size="sm" variant="secondary" icon={CheckCircle2} gate={can.canModerateComments} onClick={async () => (await moderateComments(selected, "published")) && setSelected([])}>Approve</Button>
          <Button size="sm" variant="secondary" icon={PauseCircle} gate={can.canModerateComments} onClick={async () => (await moderateComments(selected, "heldForReview")) && setSelected([])}>Hold</Button>
          <Button size="sm" variant="secondary" icon={ShieldX} gate={can.canModerateComments} onClick={async () => (await moderateComments(selected, "likelySpam")) && setSelected([])}>Spam</Button>
          <Button size="sm" variant="danger" icon={Trash2} gate={can.canModerateComments} onClick={() => setConfirmDelete(selected)}>Remove</Button>
        </div>
      )}

      {scoped.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No comments yet" description="Comments will appear here once viewers engage." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={tab === "unanswered" ? CheckCircle2 : Filter}
          title={tab === "unanswered" && !activeFilters ? "You've replied to everything" : tab === "held" && !activeFilters ? "Nothing held for review" : tab === "spam" && !activeFilters ? "No likely spam" : "No comments match"}
          description={activeFilters ? "Try a different search or clear filters." : "New comments that need attention will show up here."}
          action={activeFilters ? <Button variant="secondary" icon={X} onClick={() => { setSearch(""); reset(["status"]); }}>Clear filters</Button> : undefined}
        />
      ) : (
        <ul className="divide-y divide-[#EEF1F5]">
          {visible.map((c) => {
            const v = videos.find((x) => x.id === c.videoId);
            const isSel = selected.includes(c.id);
            return (
              <li key={c.id} className={cn("flex gap-3 px-3 py-3 sm:px-4", isSel && "bg-[#FFF8F8]")}>
                <Checkbox className="mt-2" aria-label={`Select comment by ${c.author}`} checked={isSel} onCheckedChange={(ch) => setSelected((prev) => (ch ? [...prev, c.id] : prev.filter((x) => x !== c.id)))} />
                <Avatar name={c.author} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <b className="text-[12.5px] font-semibold text-[#0F1B3D]">{c.author}</b>
                    <time className="text-[11.5px] text-[#98A2B3]" dateTime={c.publishedAt} title={dateTime(c.publishedAt)}>{relative(c.publishedAt)}</time>
                    {c.moderationStatus !== "published" && <ModerationBadge status={c.moderationStatus} />}
                    {c.priority && <Badge tone="blue">Priority</Badge>}
                    {keywordMatch(c) && <Badge tone="amber" icon={ShieldX}>Blocked keyword: {keywordMatch(c)}</Badge>}
                    {isAnswered(c) && <Badge tone="green" icon={CheckCircle2}>Replied</Badge>}
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-[#24324F]">{c.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Button size="xs" variant="ghost" aria-pressed={c.likedByChannel} gate={can.canReplyComments} onClick={() => toggleCommentLike(c.id)} className={cn("px-1.5", c.likedByChannel && "text-[#2563EB]")}>
                      <ThumbsUp className={cn("size-3.5", c.likedByChannel && "fill-current")} />
                      {c.likeCount}
                    </Button>
                    <Button size="xs" variant="ghost" icon={MessageSquareReply} onClick={() => set({ thread: c.id })} className="px-1.5">
                      {c.replies.length ? `${c.replies.length} ${c.replies.length === 1 ? "reply" : "replies"}` : "Reply"}
                    </Button>
                    {!videoId && v && (
                      <Link href={ytRoutes.video(v.id)} className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[#6B7890] hover:text-[#2563EB]">
                        <Thumb src={v.thumbnailUrl} className="w-9" sizes="36px" />
                        <span className="max-w-[260px] truncate">{v.title}</span>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  {c.moderationStatus !== "published" && (
                    <Button size="xs" variant="secondary" icon={CheckCircle2} gate={can.canModerateComments} onClick={() => void moderateComments([c.id], "published")} className="max-sm:hidden">Approve</Button>
                  )}
                  <ActionMenu label={`Moderate comment by ${c.author}`} items={moderationItems(c)} trigger={<button type="button" className={buttonClass("ghost", "icon")}><MoreHorizontal className="size-4" /></button>} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > 0 && (
        <div className="border-t border-[#EEF1F5]">
          <Pagination page={page} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} noun="comments" onPage={(p) => set({ page: String(p) })} />
        </div>
      )}

      <ThreadDrawer key={openThread?.id ?? "none"} thread={openThread} onClose={() => set({ thread: "" })} onDelete={(id) => setConfirmDelete([id])} />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={confirmDelete?.length === 1 ? "Remove this comment?" : `Remove ${confirmDelete?.length ?? 0} comments?`}
        description="Removed comments are deleted from YouTube for everyone, including their replies. This can't be undone."
        affected={comments.filter((c) => confirmDelete?.includes(c.id)).slice(0, 5).map((c) => `${c.author}: “${c.text.slice(0, 80)}${c.text.length > 80 ? "…" : ""}”${c.replies.length ? ` · ${c.replies.length} replies` : ""}`)}
        confirmLabel="Remove"
        onConfirm={async () => {
          const ids = confirmDelete ?? [];
          const ok = await deleteComments(ids);
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

function ModerationBadge({ status }: { status: ModerationStatus }) {
  const tone = status === "heldForReview" ? "amber" : status === "likelySpam" ? "red" : "neutral";
  const icon = status === "heldForReview" ? Clock3 : status === "likelySpam" ? ShieldX : undefined;
  return <Badge tone={tone} icon={icon}>{MODERATION_LABEL[status]}</Badge>;
}

function ThreadDrawer({ thread, onClose, onDelete }: { thread: CommentThread | null; onClose: () => void; onDelete: (id: string) => void }) {
  const { videos, channel, can, replyToComment, moderateComments } = useYouTube();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const video = thread ? videos.find((v) => v.id === thread.videoId) : undefined;
  const canReply = can.canReplyComments.allowed && thread?.moderationStatus === "published";

  const send = async () => {
    if (!thread || !text.trim()) return;
    setBusy(true);
    const ok = await replyToComment(thread.id, text.trim());
    setBusy(false);
    if (ok) setText("");
  };

  return (
    <Sheet open={thread !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-[520px] sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="text-[15px] text-[#0F1B3D]">Comment thread</SheetTitle>
          {video && (
            <SheetDescription asChild>
              <Link href={ytRoutes.video(video.id)} onClick={onClose} className="flex items-center gap-2 text-[12.5px] text-[#6B7890] hover:text-[#2563EB]">
                <Thumb src={video.thumbnailUrl} className="w-12" sizes="48px" />
                <span className="truncate">{video.title}</span>
              </Link>
            </SheetDescription>
          )}
        </SheetHeader>
        {thread && (
          <>
            <SheetBody className="space-y-4">
              {thread.moderationStatus !== "published" && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#FBE3B6] bg-[#FFFAF0] px-3 py-2">
                  <span className="text-[12.5px] text-[#3C4A66]"><b className="font-semibold text-[#0F1B3D]">{MODERATION_LABEL[thread.moderationStatus]}.</b> Not visible to viewers.</span>
                  <Button size="xs" variant="primary" icon={CheckCircle2} gate={can.canModerateComments} onClick={() => void moderateComments([thread.id], "published")}>Approve</Button>
                </div>
              )}
              <div className="flex gap-3">
                <Avatar name={thread.author} />
                <div className="min-w-0 flex-1 rounded-[10px] bg-[#F8FAFC] px-3 py-2.5">
                  <p className="text-[12px]"><b className="font-semibold text-[#0F1B3D]">{thread.author}</b> <span className="text-[#98A2B3]">· {relative(thread.publishedAt)}</span></p>
                  <p className="mt-1 text-[13px] leading-5 text-[#24324F]">{thread.text}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-[#6B7890]"><ThumbsUp className="size-3" />{thread.likeCount}</p>
                </div>
              </div>
              {thread.replies.length > 0 ? (
                <ul className="ml-11 space-y-3 border-l border-[#E4E9F0] pl-3">
                  {thread.replies.map((r) => (
                    <li key={r.id} className="flex gap-2.5">
                      <Avatar name={r.author} src={r.isChannelOwner ? channel.avatarUrl : undefined} className="size-7" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px]">
                          <b className="font-semibold text-[#0F1B3D]">{r.author}</b>
                          {r.isChannelOwner && <span className="ml-1.5 rounded bg-[#F1F4F8] px-1 text-[10.5px] font-semibold text-[#475467]">Creator</span>}
                          <span className="text-[#98A2B3]"> · {relative(r.publishedAt)}</span>
                        </p>
                        <p className="mt-0.5 text-[12.5px] leading-5 text-[#24324F]">{r.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-11 text-[12px] text-[#98A2B3]">No replies yet.</p>
              )}
            </SheetBody>
            <SheetFooter className="flex-col items-stretch gap-2">
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" icon={PauseCircle} gate={can.canModerateComments} onClick={() => void moderateComments([thread.id], "heldForReview")} disabled={thread.moderationStatus === "heldForReview"}>Hold</Button>
                <Button size="sm" variant="ghost" icon={ShieldX} gate={can.canModerateComments} onClick={() => void moderateComments([thread.id], "likelySpam")} disabled={thread.moderationStatus === "likelySpam"}>Spam</Button>
                <Button size="sm" variant="ghost" icon={Trash2} gate={can.canModerateComments} onClick={() => onDelete(thread.id)} className="ml-auto text-[#C81E2B] hover:bg-[#FEF1F2] hover:text-[#C81E2B]">Remove</Button>
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
                  disabled={!canReply}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
                  }}
                  placeholder={canReply ? `Reply publicly as ${channel.title}…` : thread.moderationStatus !== "published" ? "Approve the comment before replying." : can.canReplyComments.reason}
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

