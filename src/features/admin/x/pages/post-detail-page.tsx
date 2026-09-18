"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bookmark,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Link2,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Repeat2,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useHydrated } from "../hooks/use-now";
import { useQueryState } from "../hooks/use-query-state";
import { xRoutes } from "../lib/constants";
import { compact, dateTime, percent, postSummary, relative } from "../lib/format";
import { engagementRate } from "../x-data/selectors";
import { usePost } from "../x-data/hooks";
import { useX } from "../store/x-store";
import type { XPost } from "../x-data/types";
import { BarList } from "../components/charts";
import { ApprovalHistory, FailureDetail } from "../components/dialogs";
import { usePostActions } from "../components/post-actions";
import { PostPreview } from "../components/post-preview";
import { PageSkeleton } from "../components/states";
import {
  ActionMenu,
  ApprovalBadge,
  Avatar,
  Badge,
  Button,
  Card,
  DefinitionRow,
  EmptyState,
  InternalBadge,
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  TypeBadge,
  UnderlineTabs,
  VerifiedMark,
  XLogo,
  buttonClass,
} from "../components/ui";

type Tab = "overview" | "analytics" | "replies" | "activity";

export function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const postId = typeof params?.postId === "string" ? params.postId : null;
  const { ready } = useX();
  const post = usePost(postId);

  if (!ready) return <PageSkeleton variant="detail" />;
  if (!post) return <NotFound />;
  return <PostDetail post={post} />;
}

function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={XLogo}
        title="We couldn't find that post"
        description="It may have been deleted from OmniPlatform, or published and given a new id by X. The content list has everything this workspace knows about."
        action={
          <Button variant="primary" href={xRoutes.content}>
            Back to content
          </Button>
        }
      />
    </Card>
  );
}

function PostDetail({ post }: { post: XPost }) {
  const { values, set } = useQueryState(useMemo(() => ({ tab: "overview" }), []));
  const tab = values.tab as Tab;
  const { account, can, memberName, campaignName, mentions, activity } = useX();
  const actions = usePostActions();
  const router = useRouter();

  const replies = useMemo(() => mentions.filter((mention) => mention.relatedPostId === post.id), [mentions, post.id]);
  const postActivity = useMemo(() => activity.filter((event) => event.entity.id === post.id), [activity, post.id]);
  const published = post.status === "published";

  return (
    <div className="space-y-1">
      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button size="xs" variant="link" icon={ArrowLeft} href={xRoutes.content} className="mb-1.5">
              Back to content
            </Button>
            <h2 className="max-w-[720px] text-[16px] font-semibold leading-5 text-[#0F1B3D]">{postSummary(post.text, 110)}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={post.status} />
              <TypeBadge type={post.type} />
              <ApprovalBadge state={post.approval} />
              {post.campaignId && <Badge tone="violet">{campaignName(post.campaignId)}</Badge>}
              {post.internalTags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-[#6B7890]">
              {published ? `Published ${dateTime(post.publishedAt)}` : post.scheduledAt ? `Scheduled for ${dateTime(post.scheduledAt)}` : `Created ${dateTime(post.createdAt)}`} ·
              Owner <b className="font-semibold text-[#3C4A66]">{memberName(post.ownerId)}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {published && (
              <Button size="sm" variant="dark" icon={ExternalLink} href={xRoutes.postOnX(account.handle, post.id)} external>
                Open on X
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={Copy} gate={can.canCreatePost} onClick={() => void actions.duplicate(post)}>
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={Sparkles}
              gate={can.canCreatePost}
              onClick={() => router.push(`${xRoutes.content}?compose=new`)}
              title="Start a new post from scratch in the same format"
            >
              Create similar
            </Button>
            <ActionMenu
              label="Actions for this post"
              items={actions.menuItems(post, { hideView: true })}
              trigger={
                <button type="button" className={buttonClass("secondary", "icon", "size-8")}>
                  <span aria-hidden="true" className="text-[15px] font-bold leading-none tracking-[0.08em]">
                    ⋯
                  </span>
                </button>
              }
            />
          </div>
        </div>
      </Card>

      {post.failure && (
        <FailureDetail
          post={post}
          onRetry={() => void actions.retry(post)}
          onEdit={() => actions.openEdit(post)}
          onReschedule={() => actions.openSchedule(post)}
          onDiscard={() => actions.confirmDelete(post)}
        />
      )}

      {post.approval === "pending" && can.canApprove.allowed && (
        <Card className="flex flex-wrap items-center gap-3 border-[#E2D8FD] bg-[#F9F7FF] px-4 py-3">
          <ListChecks className="size-4 shrink-0 text-[#6D28D9]" />
          <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
            <b className="font-semibold text-[#0F1B3D]">Waiting for your approval.</b> It can&apos;t be scheduled or published until a
            reviewer signs it off.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => actions.openReview(post, "changes_requested")}>
              Request changes
            </Button>
            <Button size="sm" variant="danger" onClick={() => actions.openReview(post, "rejected")}>
              Reject
            </Button>
            <Button size="sm" variant="primary" onClick={() => actions.openReview(post, "approved")}>
              Approve
            </Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Card className="overflow-hidden">
        <div className="border-b border-[#E4E9F0] px-3 pt-2">
          <UnderlineTabs
            label="Post detail sections"
            value={tab}
            onChange={(value) => set({ tab: value })}
            items={[
              { value: "overview" as Tab, label: "Overview" },
              { value: "analytics" as Tab, label: "Analytics" },
              { value: "replies" as Tab, label: "Replies", count: replies.length },
              { value: "activity" as Tab, label: "Activity", count: postActivity.length },
            ]}
          />
        </div>

        <div className="p-4">
          {tab === "overview" && <OverviewTab post={post} />}
          {tab === "analytics" && <AnalyticsTab post={post} />}
          {tab === "replies" && <RepliesTab postId={post.id} />}
          {tab === "activity" && <ActivityTab postId={post.id} />}
        </div>
      </Card>

      {actions.dialogs}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab({ post }: { post: XPost }) {
  const { account, memberName, campaignName } = useX();
  const published = post.status === "published";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">The post</p>
        <PostPreview
          account={account}
          text={post.poll ? post.poll.question : post.text}
          thread={post.thread}
          media={post.media}
          poll={post.poll}
          metrics={published ? post.metrics : undefined}
          timestamp={published ? relative(post.publishedAt) : post.scheduledAt ? `scheduled ${relative(post.scheduledAt)}` : "draft"}
          className="max-w-[560px]"
        />

        {post.linkUrl && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[#6B7890]">
            <Link2 className="size-3.5" />
            <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="truncate text-[#2563EB] hover:underline">
              {post.linkUrl}
            </a>
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
            Details
            <InternalBadge label="Internal" hint="Campaign, owner and tags are OmniPlatform fields." />
          </p>
          <dl className="rounded-sm border border-[#E4E9F0] px-3 py-1">
            <DefinitionRow label="Status">
              <StatusBadge status={post.status} />
            </DefinitionRow>
            <DefinitionRow label="Format">{post.type}</DefinitionRow>
            <DefinitionRow label={published ? "Published" : post.scheduledAt ? "Scheduled for" : "Created"}>
              {dateTime(published ? post.publishedAt : (post.scheduledAt ?? post.createdAt))}
            </DefinitionRow>
            <DefinitionRow label="Owner">{memberName(post.ownerId)}</DefinitionRow>
            <DefinitionRow label="Campaign">{campaignName(post.campaignId)}</DefinitionRow>
            <DefinitionRow label="Internal tags">{post.internalTags.length ? post.internalTags.join(", ") : "None"}</DefinitionRow>
            <DefinitionRow label="Last edited">{relative(post.updatedAt)}</DefinitionRow>
            {published && (
              <DefinitionRow label="Post ID" mono>
                {post.id}
              </DefinitionRow>
            )}
          </dl>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
            Approval history
            <InternalBadge />
          </p>
          <div className="rounded-sm border border-[#E4E9F0] p-3">
            <ApprovalHistory postId={post.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics tab                                                       */
/* ------------------------------------------------------------------ */

function AnalyticsTab({ post }: { post: XPost }) {
  const { posts } = useX();
  const published = post.status === "published";

  const average = useMemo(() => {
    const others = posts.filter((item) => item.status === "published" && item.id !== post.id);
    if (!others.length) return null;
    return {
      impressions: others.reduce((sum, item) => sum + item.metrics.impressions, 0) / others.length,
      engagementRate: others.reduce((sum, item) => sum + engagementRate(item), 0) / others.length,
    };
  }, [posts, post.id]);

  if (!published) {
    return (
      <EmptyState
        icon={BarChart3}
        compact
        title="No performance data yet"
        description="X starts reporting impressions and engagement once the post is live. Publish or schedule it to start collecting numbers."
      />
    );
  }

  const metrics = [
    { label: "Impressions", value: post.metrics.impressions, icon: Eye },
    { label: "Engagements", value: post.metrics.engagements, icon: Heart },
    { label: "Likes", value: post.metrics.likes, icon: Heart },
    { label: "Replies", value: post.metrics.replies, icon: MessageCircle },
    { label: "Reposts", value: post.metrics.reposts, icon: Repeat2 },
    { label: "Quotes", value: post.metrics.quotes, icon: MessageSquare },
    { label: "Bookmarks", value: post.metrics.bookmarks, icon: Bookmark },
    { label: "Link clicks", value: post.metrics.linkClicks, icon: Link2 },
    { label: "Profile visits", value: post.metrics.profileVisits, icon: Users },
    ...(post.metrics.videoViews !== null ? [{ label: "Video views", value: post.metrics.videoViews, icon: BarChart3 }] : []),
  ];

  const rate = engagementRate(post);
  const breakdown = [
    { label: "Likes", value: post.metrics.likes },
    { label: "Reposts", value: post.metrics.reposts },
    { label: "Replies", value: post.metrics.replies },
    { label: "Link clicks", value: post.metrics.linkClicks },
    { label: "Bookmarks", value: post.metrics.bookmarks },
    { label: "Profile visits", value: post.metrics.profileVisits },
  ].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1B3D]">
          Performance
          <SourceBadge />
        </p>
        {average && (
          <p className="text-[12px] text-[#6B7890]">
            Account average: {compact(average.impressions)} impressions · {percent(average.engagementRate, 2)} engagement rate
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-sm border border-[#E4E9F0] p-3">
            <p className="flex items-center gap-1.5 text-[11.5px] text-[#6B7890]">
              <metric.icon className="size-3.5" />
              {metric.label}
            </p>
            <p className="mt-1 text-[18px] font-semibold leading-6 tabular-nums text-[#0F1B3D]">{compact(metric.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-sm border border-[#E4E9F0] p-4">
          <p className="mb-3 text-[12.5px] font-semibold text-[#0F1B3D]">Engagement mix</p>
          <BarList data={breakdown} format={(value) => compact(value)} />
        </div>
        <div className="rounded-sm border border-[#E4E9F0] p-4">
          <p className="mb-2 text-[12.5px] font-semibold text-[#0F1B3D]">How it compares</p>
          <dl className="space-y-0">
            <DefinitionRow label="Engagement rate">{percent(rate, 2)}</DefinitionRow>
            {average && (
              <DefinitionRow label="Vs account average">
                <span className={rate >= average.engagementRate ? "text-[#067647]" : "text-[#C81E2B]"}>
                  {rate >= average.engagementRate ? "▲" : "▼"} {percent(Math.abs(rate - average.engagementRate), 2)}
                </span>
              </DefinitionRow>
            )}
            <DefinitionRow label="Click-through rate">
              {percent(post.metrics.impressions ? (post.metrics.linkClicks / post.metrics.impressions) * 100 : null, 2)}
            </DefinitionRow>
            <DefinitionRow label="Profile visit rate">
              {percent(post.metrics.impressions ? (post.metrics.profileVisits / post.metrics.impressions) * 100 : null, 2)}
            </DefinitionRow>
          </dl>
          {average && (
            <p className="mt-3 flex items-start gap-2 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] px-2.5 py-2 text-[11.5px] leading-4 text-[#3C4A66]">
              <Sparkles className="mt-px size-3.5 shrink-0 text-[#6D28D9]" />
              <span>
                <b className="font-semibold text-[#0F1B3D]">OmniPlatform insight.</b>{" "}
                {rate >= average.engagementRate
                  ? "This post is pulling above your account average — worth revisiting its format and timing."
                  : "This post is below your account average. Compare it against your top posts for format and posting time."}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Replies tab                                                         */
/* ------------------------------------------------------------------ */

function RepliesTab({ postId }: { postId: string }) {
  const { mentions, can, memberName } = useX();
  const hydrated = useHydrated();
  const replies = useMemo(() => mentions.filter((mention) => mention.relatedPostId === postId), [mentions, postId]);

  if (replies.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        compact
        title="No replies or mentions yet"
        description="Replies and quote posts that reference this post appear here, and in the engagement inbox."
        action={<Button variant="secondary" href={xRoutes.mentions}>Open inbox</Button>}
      />
    );
  }

  return (
    <ul className="divide-y divide-[#EEF1F5]">
      {replies.map((mention) => (
        <li key={mention.id} className="flex items-start gap-3 py-3 first:pt-0">
          <Avatar name={mention.user.name} src={mention.user.avatarUrl} className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
              <b className="font-semibold text-[#0F1B3D]">{mention.user.name}</b>
              <VerifiedMark kind={mention.user.verified} className="[&_svg]:size-3.5" />
              <span className="text-[#6B7890]">{mention.user.handle}</span>
              <span className="text-[#98A2B3]">· {hydrated ? relative(mention.at) : "…"}</span>
            </p>
            <p className="mt-0.5 text-[12.5px] leading-5 text-[#3C4A66]">{mention.text}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={mention.priority} />
              <Badge tone={mention.status === "unanswered" ? "amber" : mention.status === "resolved" ? "green" : "blue"}>{mention.status}</Badge>
              {mention.assigneeId && <Badge tone="neutral">{memberName(mention.assigneeId)}</Badge>}
            </div>
          </div>
          <Button size="xs" variant="secondary" href={xRoutes.mention(mention.id)} gate={can.canReadMentions}>
            Open thread
          </Button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Activity tab                                                        */
/* ------------------------------------------------------------------ */

function ActivityTab({ postId }: { postId: string }) {
  const { activity } = useX();
  const hydrated = useHydrated();
  const events = useMemo(() => activity.filter((event) => event.entity.id === postId), [activity, postId]);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        compact
        title="No activity recorded"
        description="Edits, scheduling changes and approvals made in OmniPlatform are logged here."
      />
    );
  }

  return (
    <ol className="space-y-0">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3 border-b border-[#EEF1F5] py-2.5 last:border-0">
          <span className={cn("mt-1.5 size-2 shrink-0 rounded-sm", event.source === "X sync" ? "bg-[#0F1419]" : "bg-[#2563EB]")} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-[#24324F]">
              <b className="font-semibold text-[#0F1B3D]">{event.actor}</b> — {event.summary}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#98A2B3]">
              {hydrated ? relative(event.at) : "…"}
              {event.source === "X sync" && <Badge tone="neutral">From X</Badge>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
