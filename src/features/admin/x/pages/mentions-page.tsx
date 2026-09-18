"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Filter,
  MessageSquare,
  Reply,
  Send,
  Smile,
  Sparkles,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { useHydrated } from "../hooks/use-now";
import { useQueryState } from "../hooks/use-query-state";
import { POST_MAX, PRIORITY_LABEL, PRIORITY_ORDER, QUICK_REPLIES, SENTIMENT_LABEL, xRoutes } from "../lib/constants";
import { compact, countCharacters, minutes, percent, postSummary, relative } from "../lib/format";
import { DEFAULT_MENTION_FILTERS, countMentions, filterMentions, sortMentions } from "../x-data/selectors";
import { useMention } from "../x-data/hooks";
import { useX } from "../store/x-store";
import type { MentionStatus, Priority, XMention } from "../x-data/types";
import { AssignDialog } from "../components/dialogs";
import { PageSkeleton, CapabilityState } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  InternalBadge,
  MentionStatusBadge,
  PriorityBadge,
  SearchField,
  SelectMenu,
  SourceBadge,
  VerifiedMark,
  buttonClass,
  useDebounced,
  x,
} from "../components/ui";
import { UnderlineTabs } from "../components/ui";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="p-6 text-center text-[12px] text-[#98A2B3]">Loading emoji…</div>,
});

const DEFAULTS = {
  status: "all",
  q: "",
  priority: "all",
  assignee: "all",
  post: "all",
  range: "all",
  mention: "",
};

const TAB_ITEMS: { value: string; label: string; alert?: boolean }[] = [
  { value: "all", label: "All" },
  { value: "unanswered", label: "Unanswered", alert: true },
  { value: "replied", label: "Replied" },
  { value: "resolved", label: "Resolved" },
  { value: "high_priority", label: "High priority" },
  { value: "ignored", label: "Ignored" },
];

export function MentionsPage() {
  const { ready, can } = useX();
  if (!ready) return <PageSkeleton variant="inbox" />;
  if (!can.canReadMentions.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadMentions} title="Mentions unavailable" />
      </Card>
    );
  }
  return <Mentions />;
}

function Mentions() {
  const { mentions, team, posts } = useX();
  const { values, set, reset } = useQueryState(useMemo(() => DEFAULTS, []));
  const { value: search, pending: searching } = useDebounced(values.q, 220);

  const counts = useMemo(() => countMentions(mentions), [mentions]);

  const filtered = useMemo(
    () =>
      sortMentions(
        filterMentions(mentions, {
          ...DEFAULT_MENTION_FILTERS,
          search,
          status: values.status as MentionStatus | "all" | "high_priority",
          priority: values.priority as Priority | "all",
          assignee: values.assignee,
          post: values.post,
          range: values.range as "all" | "1" | "7" | "30",
        }),
      ),
    [mentions, search, values],
  );

  const activeFilters =
    (values.q ? 1 : 0) + (values.priority !== "all" ? 1 : 0) + (values.assignee !== "all" ? 1 : 0) + (values.post !== "all" ? 1 : 0) + (values.range !== "all" ? 1 : 0);

  const relatedPosts = useMemo(() => posts.filter((post) => mentions.some((mention) => mention.relatedPostId === post.id)), [posts, mentions]);

  const tabCounts: Record<string, number> = {
    all: counts.all,
    unanswered: counts.unanswered,
    replied: counts.replied,
    resolved: counts.resolved,
    high_priority: counts.highPriority,
    ignored: counts.ignored,
  };

  return (
    <div className="space-y-1">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Total mentions" value={compact(counts.total)} hint="Every mention, reply and quote post X has sent us." source />
        <Kpi
          label="Unanswered"
          value={compact(counts.unanswered)}
          tone={counts.unanswered > 0 ? "amber" : "green"}
          hint="Mentions with no reply from this account yet."
          detail={counts.needsAttention > 0 ? `${counts.needsAttention} high priority` : "None urgent"}
        />
        <Kpi
          label="Avg. response time"
          value={counts.avgResponseMinutes === null ? "—" : minutes(counts.avgResponseMinutes)}
          hint="Average time between a mention arriving and our first reply. Measured by OmniPlatform."
          internal
        />
        <Kpi label="Replies sent" value={compact(counts.repliesSent)} hint="Replies sent from OmniPlatform in this workspace." internal />
        <Kpi
          label="Resolved rate"
          value={percent(counts.resolvedRate, 0)}
          tone={counts.resolvedRate >= 70 ? "green" : "amber"}
          hint="Share of actionable mentions marked resolved. Resolution is an OmniPlatform concept."
          internal
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[#E4E9F0] px-3 pt-2">
          <UnderlineTabs
            label="Mention status"
            value={values.status}
            onChange={(value) => set({ status: value })}
            items={TAB_ITEMS.map((tab) => ({ ...tab, count: tabCounts[tab.value] ?? 0 }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EEF1F5] px-3 py-2.5">
          <SearchField
            value={values.q}
            onChange={(value) => set({ q: value })}
            loading={searching}
            placeholder="Search mentions and accounts"
            className="min-w-[200px] flex-1 sm:max-w-[280px]"
          />
          <SelectMenu
            label="Priority"
            prefix="Priority:"
            value={values.priority}
            onChange={(value) => set({ priority: value })}
            options={[{ value: "all", label: "Any" }, ...PRIORITY_ORDER.map((priority) => ({ value: priority, label: PRIORITY_LABEL[priority] }))]}
          />
          <SelectMenu
            label="Assigned to"
            prefix="Assigned:"
            value={values.assignee}
            onChange={(value) => set({ assignee: value })}
            options={[
              { value: "all", label: "Anyone" },
              { value: "unassigned", label: "Unassigned" },
              ...team.map((member) => ({ value: member.id, label: member.name })),
            ]}
          />
          <SelectMenu
            label="Related post"
            prefix="Post:"
            value={values.post}
            onChange={(value) => set({ post: value })}
            options={[
              { value: "all", label: "Any post" },
              ...relatedPosts.map((post) => ({ value: post.id, label: postSummary(post.text, 38) })),
            ]}
          />
          <SelectMenu
            label="Date"
            prefix="Date:"
            value={values.range}
            onChange={(value) => set({ range: value })}
            options={[
              { value: "all", label: "All time" },
              { value: "1", label: "Last 24 hours" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
            ]}
          />
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" icon={Filter} onClick={() => reset(["status"])}>
              Clear filters ({activeFilters})
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <MentionsEmptyState status={values.status} filtered={activeFilters > 0} onClear={() => reset(["status"])} />
        ) : (
          <ul className="divide-y divide-[#EEF1F5]">
            {filtered.map((mention) => (
              <MentionRow key={mention.id} mention={mention} onOpen={() => set({ mention: mention.id })} />
            ))}
          </ul>
        )}
      </Card>

      <MentionDrawer id={values.mention || null} onClose={() => set({ mention: "" })} />
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
  detail,
  internal,
  source,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "amber" | "green";
  detail?: string;
  internal?: boolean;
  source?: boolean;
}) {
  return (
    <div className={cn(x.card, "p-3.5")} title={hint}>
      <p className="flex items-center justify-between gap-2 text-[12px] font-medium text-[#6B7890]">
        <span className="truncate">{label}</span>
        {internal ? <InternalBadge label="Internal" hint={hint} /> : source ? <SourceBadge hint={hint} /> : null}
      </p>
      <p
        className={cn(
          "mt-1.5 text-[21px] font-semibold leading-7 tracking-[-0.02em] tabular-nums",
          tone === "amber" ? "text-[#B54708]" : tone === "green" ? "text-[#067647]" : "text-[#0F1B3D]",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11.5px] text-[#98A2B3]">{detail ?? hint}</p>
    </div>
  );
}

function MentionsEmptyState({ status, filtered, onClear }: { status: string; filtered: boolean; onClear: () => void }) {
  if (filtered) {
    return (
      <EmptyState
        icon={Filter}
        title="No mentions match these filters"
        description="Try a different search term, or clear the filters to see everything in this tab."
        action={
          <Button variant="primary" onClick={onClear}>
            Clear filters
          </Button>
        }
      />
    );
  }
  const copy: Record<string, { title: string; description: string }> = {
    all: { title: "No mentions yet", description: "When someone mentions, replies to or quotes this account, the conversation lands here." },
    unanswered: { title: "Inbox zero", description: "Every mention has a reply or has been resolved. New ones appear here as they arrive." },
    replied: { title: "No replies sent yet", description: "Conversations you have replied to but not yet resolved show up here." },
    resolved: { title: "Nothing resolved yet", description: "Mark a conversation resolved once it needs no more attention." },
    high_priority: { title: "Nothing high priority", description: "Raise a mention's priority when it needs a fast, careful answer." },
    ignored: { title: "Nothing ignored", description: "Ignoring hides spam and noise from the working views. Nothing is deleted on X." },
  };
  const meta = copy[status] ?? copy.all!;
  return <EmptyState icon={MessageSquare} title={meta.title} description={meta.description} secondary={<Button variant="secondary" href={xRoutes.content}>View content</Button>} />;
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function MentionRow({ mention, onOpen }: { mention: XMention; onOpen: () => void }) {
  const { can, memberName, posts, setMentionStatus, setMentionPriority } = useX();
  const [assignOpen, setAssignOpen] = useState(false);
  const { assignMention } = useX();
  const hydrated = useHydrated();
  const related = posts.find((post) => post.id === mention.relatedPostId);

  return (
    <li className="group px-4 py-3 transition-colors hover:bg-[#FAFBFD]">
      <div className="flex items-start gap-3">
        <Avatar name={mention.user.name} src={mention.user.avatarUrl} className="size-9" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12.5px]">
              <b className="truncate font-semibold text-[#0F1B3D]">{mention.user.name}</b>
              <VerifiedMark kind={mention.user.verified} className="[&_svg]:size-3.5" />
              <span className="truncate text-[#6B7890]">{mention.user.handle}</span>
              <span className="text-[#98A2B3]">· {hydrated ? relative(mention.at) : "…"}</span>
              {mention.user.isFollower && <Badge tone="blue">Follows you</Badge>}
              {mention.kind !== "mention" && <Badge tone="neutral">{mention.kind === "quote" ? "Quote post" : "Reply"}</Badge>}
            </p>
            <span className="flex shrink-0 items-center gap-1.5">
              <PriorityBadge priority={mention.priority} />
              <MentionStatusBadge status={mention.status} />
            </span>
          </div>

          <button type="button" onClick={onOpen} className={cn("mt-1 block w-full rounded text-left", x.focus)}>
            <span className="line-clamp-2 text-[12.5px] leading-5 text-[#3C4A66]">{mention.text}</span>
          </button>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#98A2B3]">
            <span>{compact(mention.user.followers)} followers</span>
            {related && (
              <Link href={xRoutes.post(related.id)} className="max-w-[240px] truncate text-[#2563EB] hover:underline">
                On: {postSummary(related.text, 40)}
              </Link>
            )}
            {mention.assigneeId && (
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {memberName(mention.assigneeId)}
              </span>
            )}
            {mention.conversation.filter((message) => message.isUs).length > 0 && (
              <span className="flex items-center gap-1 text-[#067647]">
                <CheckCircle2 className="size-3" />
                {mention.conversation.filter((message) => message.isUs).length} reply sent
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Button size="xs" variant="primary" icon={Reply} gate={can.canReplyMention} onClick={onOpen}>
              Reply
            </Button>
            <Button size="xs" variant="secondary" onClick={onOpen}>
              Open thread
            </Button>
            {mention.status !== "resolved" && (
              <Button size="xs" variant="secondary" onClick={() => void setMentionStatus(mention.id, "resolved")}>
                Mark resolved
              </Button>
            )}
            <Button size="xs" variant="secondary" icon={UserPlus} onClick={() => setAssignOpen(true)}>
              Assign
            </Button>
            <ActionMenu
              label="More actions for this mention"
              width={210}
              items={[
                { label: "View profile on X", icon: ExternalLink, href: xRoutes.userOnX(mention.user.handle), external: true },
                { label: "Open related post", icon: MessageSquare, href: related ? xRoutes.post(related.id) : "", hidden: !related },
                "separator",
                ...PRIORITY_ORDER.map((priority) => ({
                  label: `Priority: ${PRIORITY_LABEL[priority]}`,
                  onSelect: () => void setMentionPriority(mention.id, priority),
                  hidden: mention.priority === priority,
                })),
                "separator",
                { label: "Reopen", icon: Reply, onSelect: () => void setMentionStatus(mention.id, "unanswered"), hidden: mention.status === "unanswered" },
                { label: "Ignore", icon: EyeOff, onSelect: () => void setMentionStatus(mention.id, "ignored"), hidden: mention.status === "ignored" },
              ]}
              trigger={
                <button type="button" className={buttonClass("ghost", "iconSm")}>
                  <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">
                    ⋯
                  </span>
                </button>
              }
            />
          </div>
        </div>
      </div>

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign this mention"
        description={`Who should handle the conversation with ${mention.user.handle}?`}
        currentId={mention.assigneeId}
        onAssign={(id) => assignMention(mention.id, id)}
      />
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Detail drawer                                                       */
/* ------------------------------------------------------------------ */

function MentionDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const mention = useMention(id);
  return (
    <Sheet open={mention !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-[560px] border-[#E4E9F0] bg-white p-0">
        {mention && <MentionDetail mention={mention} />}
      </SheetContent>
    </Sheet>
  );
}

function MentionDetail({ mention }: { mention: XMention }) {
  const { account, can, posts, memberName, replyToMention, setMentionStatus, setMentionPriority, addMentionNote, assignMention } = useX();
  const hydrated = useHydrated();
  const [reply, setReply] = useState("");
  const [resolveAfter, setResolveAfter] = useState(true);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const related = posts.find((post) => post.id === mention.relatedPostId);
  const over = countCharacters(reply) > POST_MAX;

  const send = async () => {
    if (!reply.trim() || over) return;
    setSending(true);
    const ok = await replyToMention(mention.id, reply.trim(), resolveAfter);
    setSending(false);
    if (ok) setReply("");
  };

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-[#EEF1F5] pr-12">
        <SheetTitle className="flex flex-wrap items-center gap-2 text-[15px] text-[#0F1B3D]">
          Conversation
          <MentionStatusBadge status={mention.status} />
          <PriorityBadge priority={mention.priority} />
        </SheetTitle>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <SelectMenu
            label="Priority"
            prefix="Priority:"
            value={mention.priority}
            onChange={(value) => void setMentionPriority(mention.id, value as Priority)}
            options={PRIORITY_ORDER.map((priority) => ({ value: priority, label: PRIORITY_LABEL[priority] }))}
          />
          <Button size="sm" variant="secondary" icon={UserPlus} onClick={() => setAssignOpen(true)}>
            {mention.assigneeId ? memberName(mention.assigneeId) : "Assign"}
          </Button>
          {mention.status !== "resolved" ? (
            <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => void setMentionStatus(mention.id, "resolved")}>
              Resolve
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => void setMentionStatus(mention.id, "unanswered")}>
              Reopen
            </Button>
          )}
          <ActionMenu
            label="More actions"
            items={[
              { label: "View profile on X", icon: ExternalLink, href: xRoutes.userOnX(mention.user.handle), external: true },
              { label: "Ignore conversation", icon: EyeOff, onSelect: () => void setMentionStatus(mention.id, "ignored"), hidden: mention.status === "ignored" },
            ]}
            trigger={
              <button type="button" className={buttonClass("secondary", "icon", "size-8")}>
                <span aria-hidden="true" className="text-[15px] font-bold leading-none tracking-[0.08em]">
                  ⋯
                </span>
              </button>
            }
          />
        </div>
      </SheetHeader>

      <SheetBody className="flex-1">
        {/* User */}
        <div className="rounded-sm border border-[#E4E9F0] p-3">
          <div className="flex items-start gap-3">
            <Avatar name={mention.user.name} src={mention.user.avatarUrl} className="size-10" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[#0F1B3D]">
                {mention.user.name}
                <VerifiedMark kind={mention.user.verified} className="[&_svg]:size-3.5" />
              </p>
              <p className="text-[12px] text-[#6B7890]">{mention.user.handle}</p>
              {mention.user.bio && <p className="mt-1 text-[12px] leading-4 text-[#3C4A66]">{mention.user.bio}</p>}
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-[#98A2B3]">
                <span>
                  <b className="font-semibold text-[#3C4A66]">{compact(mention.user.followers)}</b> followers
                </span>
                <span>
                  <b className="font-semibold text-[#3C4A66]">{compact(mention.user.following)}</b> following
                </span>
                {mention.user.location && <span>{mention.user.location}</span>}
                {mention.user.isFollower && <Badge tone="blue">Follows you</Badge>}
              </p>
            </div>
            <Button size="xs" variant="secondary" icon={ExternalLink} href={xRoutes.userOnX(mention.user.handle)} external>
              View
            </Button>
          </div>
        </div>

        {/* Related post */}
        {related && (
          <div className="mt-3 rounded-sm border border-[#E4E9F0] bg-[#F8FAFC] p-3">
            <p className="mb-1 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
              In reply to your post
              <SourceBadge />
            </p>
            <Link href={xRoutes.post(related.id)} className="block text-[12.5px] leading-5 text-[#24324F] hover:text-[#2563EB]">
              {postSummary(related.text, 140)}
            </Link>
            <p className="mt-1 text-[11.5px] text-[#98A2B3]">
              {compact(related.metrics.impressions)} impressions · {compact(related.metrics.replies)} replies
            </p>
          </div>
        )}

        {/* Conversation */}
        <div className="mt-4">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Conversation</p>
          <ol className="space-y-2.5">
            <li className="flex gap-2.5">
              <Avatar name={mention.user.name} src={mention.user.avatarUrl} className="size-8" />
              <div className="min-w-0 flex-1 rounded-sm rounded-tl-none border border-[#E4E9F0] bg-white p-2.5">
                <p className="flex flex-wrap items-center gap-x-1.5 text-[12px]">
                  <b className="font-semibold text-[#0F1B3D]">{mention.user.name}</b>
                  <span className="text-[#98A2B3]">{hydrated ? relative(mention.at) : "…"}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] leading-5 text-[#24324F]">{mention.text}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[#98A2B3]">
                  <span>{compact(mention.metrics.likes)} likes</span>
                  <span>{compact(mention.metrics.reposts)} reposts</span>
                  <Badge tone={mention.sentiment === "negative" ? "red" : mention.sentiment === "positive" ? "green" : "neutral"}>
                    {SENTIMENT_LABEL[mention.sentiment]}
                  </Badge>
                </p>
              </div>
            </li>

            {mention.conversation.map((message) => (
              <li key={message.id} className={cn("flex gap-2.5", message.isUs && "flex-row-reverse")}>
                <Avatar name={message.authorName} src={message.isUs ? account.avatarUrl : mention.user.avatarUrl} className="size-8" />
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-sm p-2.5",
                    message.isUs ? "rounded-tr-none border border-[#D5E1FD] bg-[#F5F8FF]" : "rounded-tl-none border border-[#E4E9F0] bg-white",
                  )}
                >
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[12px]">
                    <b className="font-semibold text-[#0F1B3D]">{message.isUs ? "You" : message.authorName}</b>
                    <span className="text-[#98A2B3]">{hydrated ? relative(message.at) : "…"}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-[#24324F]">{message.text}</p>
                </div>
              </li>
            ))}
          </ol>

          {mention.responseMinutes !== null && (
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#98A2B3]">
              <Timer className="size-3.5" />
              First replied in {minutes(mention.responseMinutes)}
              <InternalBadge label="Internal" hint="Response time is measured by OmniPlatform." />
            </p>
          )}
        </div>

        {/* Internal notes */}
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
            Internal notes
            <InternalBadge hint="Private to your team. Never sent to X or visible to the other account." />
          </p>
          {mention.notes.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {mention.notes.map((item) => (
                <li key={item.id} className="rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] p-2.5">
                  <p className="text-[12px] leading-4 text-[#3C4A66]">{item.text}</p>
                  <p className="mt-1 text-[11px] text-[#98A2B3]">
                    {item.author} · {hydrated ? relative(item.at) : "…"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && note.trim()) {
                  event.preventDefault();
                  void (async () => {
                    setSavingNote(true);
                    const ok = await addMentionNote(mention.id, note.trim());
                    setSavingNote(false);
                    if (ok) setNote("");
                  })();
                }
              }}
              placeholder="Add a note for your team…"
              aria-label="Internal note"
              className={cn(x.input, "h-8 text-[12.5px]")}
            />
            <Button
              size="sm"
              variant="secondary"
              loading={savingNote}
              disabled={!note.trim()}
              disabledReason="Write a note first."
              onClick={async () => {
                setSavingNote(true);
                const ok = await addMentionNote(mention.id, note.trim());
                setSavingNote(false);
                if (ok) setNote("");
              }}
            >
              Save note
            </Button>
          </div>
        </div>
      </SheetBody>

      {/* Reply editor */}
      <div className="border-t border-[#EEF1F5] bg-white p-3">
        {!can.canReplyMention.allowed ? (
          <p className="flex items-start gap-2 rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] px-3 py-2.5 text-[12px] leading-4 text-[#3C4A66]">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-[#B54708]" />
            {can.canReplyMention.reason}
          </p>
        ) : (
          <>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <ActionMenu
                label="Quick replies"
                width={240}
                align="start"
                items={QUICK_REPLIES.map((template) => ({
                  label: template.label,
                  icon: Sparkles,
                  onSelect: () => setReply(template.text),
                }))}
                trigger={
                  <button type="button" className={buttonClass("secondary", "xs")}>
                    <Sparkles className="size-3" />
                    Quick reply
                  </button>
                }
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Insert emoji" className={buttonClass("secondary", "xs")}>
                    <Smile className="size-3" />
                    Emoji
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto border-[#E4E9F0] p-0">
                  <EmojiPicker
                    onEmojiClick={(emoji: EmojiClickData) => setReply((current) => current + emoji.emoji)}
                    width={300}
                    height={360}
                    skinTonesDisabled
                    lazyLoadEmojis
                  />
                </PopoverContent>
              </Popover>
              <span className={cn("ml-auto text-[11px] tabular-nums", over ? "font-semibold text-[#C81E2B]" : "text-[#98A2B3]")}>
                {countCharacters(reply)}/{POST_MAX}
              </span>
            </div>

            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={3}
              placeholder={`Reply to ${mention.user.handle}…`}
              aria-label={`Reply to ${mention.user.handle}`}
              className={cn(x.textarea, "resize-y")}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#3C4A66]">
                <Switch checked={resolveAfter} onCheckedChange={setResolveAfter} aria-label="Resolve after replying" />
                Mark resolved after replying
                <InternalBadge label="Internal" hint="Resolution status lives in OmniPlatform." />
              </label>
              <Button
                variant="primary"
                icon={Send}
                loading={sending}
                disabled={!reply.trim() || over}
                disabledReason={over ? "The reply is over the character limit." : "Write a reply first."}
                onClick={send}
              >
                Send reply
              </Button>
            </div>
          </>
        )}
      </div>

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign this mention"
        description={`Who should handle the conversation with ${mention.user.handle}?`}
        currentId={mention.assigneeId}
        onAssign={(id) => assignMention(mention.id, id)}
      />
    </div>
  );
}
