"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, type ComponentType } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  FileText,
  Filter,
  Image as ImageIcon,
  ListChecks,
  Plus,
  RotateCcw,
  Video,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryState } from "../hooks/use-query-state";
import { TYPE_LABEL, xRoutes } from "../lib/constants";
import { compact, date, percent, time } from "../lib/format";
import {
  DEFAULT_POST_FILTERS,
  countByStatus,
  engagementRate,
  filterPosts,
  postDate,
  sortPosts,
  type PostSortKey,
} from "../x-data/selectors";
import { useX } from "../store/x-store";
import type { PostStatus, PostType, XPost } from "../x-data/types";
import { usePostActions } from "../components/post-actions";
import { CapabilityState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  ApprovalBadge,
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  PostText,
  SearchField,
  SelectMenu,
  SortHeader,
  StatusBadge,
  TypeBadge,
  UnderlineTabs,
  XLogo,
  buttonClass,
  numClass,
  tdClass,
  thClass,
  useDebounced,
  x,
} from "../components/ui";

const PAGE_SIZE = 12;

const TAB_ITEMS: { value: PostStatus | "all"; label: string; alert?: boolean }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "failed", label: "Failed", alert: true },
  { value: "archived", label: "Archived" },
];

const DEFAULTS = {
  status: "all",
  q: "",
  type: "all",
  media: "all",
  owner: "all",
  campaign: "all",
  range: "all",
  approval: "all",
  sort: "date",
  dir: "desc",
  page: "1",
};

export function ContentPage() {
  const { ready, can } = useX();
  if (!ready) return <PageSkeleton variant="table" />;
  if (!can.canReadPosts.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadPosts} title="Content unavailable" />
      </Card>
    );
  }
  return <Content />;
}

function Content() {
  const { posts, team, campaigns, can, memberName, campaignName } = useX();
  const { values, set, reset, activeCount } = useQueryState(useMemo(() => DEFAULTS, []));
  const actions = usePostActions();

  const { value: search, pending: searching } = useDebounced(values.q, 220);
  const counts = useMemo(() => countByStatus(posts), [posts]);

  const filtered = useMemo(() => {
    const base = filterPosts(posts, {
      ...DEFAULT_POST_FILTERS,
      search,
      status: values.status as PostStatus | "all",
      type: values.type as PostType | "all",
      media: values.media as "all" | "with" | "without",
      owner: values.owner,
      campaign: values.campaign,
      range: values.range as "all" | "7" | "30" | "90",
    });
    return values.approval === "all" ? base : base.filter((post) => post.approval === values.approval);
  }, [posts, search, values]);

  const sorted = useMemo(
    () => sortPosts(filtered, values.sort as PostSortKey, values.dir as "asc" | "desc"),
    [filtered, values.sort, values.dir],
  );

  const page = Math.max(1, Number(values.page) || 1);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: PostSortKey) => {
    if (values.sort === key) set({ dir: values.dir === "asc" ? "desc" : "asc", page: "1" });
    else set({ sort: key, dir: "desc", page: "1" });
  };

  // Filters other than the tab and the page — what "Clear filters" resets.
  const filterCount = activeCount - (values.status !== "all" ? 1 : 0) - (safePage > 1 ? 1 : 0) - (values.sort !== "date" ? 1 : 0) - (values.dir !== "desc" ? 1 : 0);

  return (
    <div className="space-y-1">
      <Card className="overflow-hidden">
        <div className="border-b border-[#E4E9F0] px-3 pt-2">
          <UnderlineTabs
            label="Content status"
            value={values.status}
            onChange={(value) => set({ status: value, page: "1" })}
            items={TAB_ITEMS.map((tab) => ({ ...tab, count: counts[tab.value] ?? 0, alert: tab.alert }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EEF1F5] px-3 py-2.5">
          <SearchField
            value={values.q}
            onChange={(value) => set({ q: value, page: "1" })}
            loading={searching}
            placeholder="Search post text and tags"
            className="min-w-[200px] flex-1 sm:max-w-[280px]"
          />
          <SelectMenu
            label="Post type"
            prefix="Type:"
            value={values.type}
            onChange={(value) => set({ type: value, page: "1" })}
            options={[{ value: "all", label: "All types" }, ...(Object.keys(TYPE_LABEL) as PostType[]).map((type) => ({ value: type, label: TYPE_LABEL[type] }))]}
          />
          <SelectMenu
            label="Media"
            prefix="Media:"
            value={values.media}
            onChange={(value) => set({ media: value, page: "1" })}
            options={[
              { value: "all", label: "Any" },
              { value: "with", label: "With media" },
              { value: "without", label: "Text only" },
            ]}
          />
          <SelectMenu
            label="Date range"
            prefix="Date:"
            value={values.range}
            onChange={(value) => set({ range: value, page: "1" })}
            options={[
              { value: "all", label: "All time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
          />
          <SelectMenu
            label="Owner"
            prefix="Owner:"
            value={values.owner}
            onChange={(value) => set({ owner: value, page: "1" })}
            options={[{ value: "all", label: "Anyone" }, ...team.map((member) => ({ value: member.id, label: member.name }))]}
          />
          <SelectMenu
            label="Campaign"
            prefix="Campaign:"
            value={values.campaign}
            onChange={(value) => set({ campaign: value, page: "1" })}
            options={[{ value: "all", label: "All campaigns" }, ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))]}
          />
          <SelectMenu
            label="Approval"
            prefix="Approval:"
            value={values.approval}
            onChange={(value) => set({ approval: value, page: "1" })}
            options={[
              { value: "all", label: "Any" },
              { value: "pending", label: "Pending approval" },
              { value: "approved", label: "Approved" },
              { value: "changes_requested", label: "Changes requested" },
              { value: "rejected", label: "Rejected" },
              { value: "none", label: "No approval" },
            ]}
          />
          {filterCount > 0 && (
            <Button size="sm" variant="ghost" icon={Filter} onClick={() => reset(["status"])}>
              Clear filters ({filterCount})
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="primary" icon={Plus} gate={can.canCreatePost} href={`${xRoutes.content}?compose=new`}>
              Create post
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <ContentEmptyState status={values.status as PostStatus | "all"} filtered={filterCount > 0 || Boolean(search)} onClear={() => reset(["status"])} />
        ) : (
          <>
            <PostTable
              rows={rows}
              sort={values.sort as PostSortKey}
              dir={values.dir as "asc" | "desc"}
              onSort={toggleSort}
              memberName={memberName}
              campaignName={campaignName}
              actions={actions}
            />
            <PostCards rows={rows} memberName={memberName} actions={actions} />
            <div className="border-t border-[#EEF1F5]">
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={sorted.length}
                pageSize={PAGE_SIZE}
                noun="posts"
                onPage={(next) => set({ page: String(next) })}
              />
            </div>
          </>
        )}
      </Card>
      {actions.dialogs}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty states                                                        */
/* ------------------------------------------------------------------ */

function ContentEmptyState({ status, filtered, onClear }: { status: PostStatus | "all"; filtered: boolean; onClear: () => void }) {
  const { can } = useX();

  if (filtered) {
    return (
      <EmptyState
        icon={Filter}
        title="No posts match these filters"
        description="Try a different search term, or clear the filters to see everything in this tab."
        action={
          <Button variant="primary" onClick={onClear}>
            Clear filters
          </Button>
        }
      />
    );
  }

  const copy: Record<PostStatus | "all", { icon: ComponentType<{ className?: string }>; title: string; description: string; cta?: "create" | "schedule" }> = {
    all: { icon: XLogo, title: "No posts yet", description: "Everything you write, schedule or publish to X will live here.", cta: "create" },
    published: { icon: XLogo, title: "Nothing published yet", description: "Published posts and their performance appear here once your first post goes out.", cta: "create" },
    draft: { icon: FileText, title: "No drafts", description: "Drafts are OmniPlatform-only — nothing is sent to X until you publish or schedule them.", cta: "create" },
    scheduled: { icon: CalendarClock, title: "Nothing scheduled", description: "Queue posts ahead so the account keeps a steady rhythm.", cta: "schedule" },
    publishing: { icon: CalendarClock, title: "Nothing publishing", description: "Posts currently being sent to X appear here for the few seconds it takes." },
    failed: { icon: XCircle, title: "No failed posts", description: "Posts that X rejects show up here with the reason and a way to retry." },
    archived: { icon: Archive, title: "Nothing archived", description: "Archiving hides a post from your working views in OmniPlatform. It stays live on X." },
  };

  const meta = copy[status];
  return (
    <EmptyState
      icon={meta.icon}
      title={meta.title}
      description={meta.description}
      action={
        meta.cta === "create" ? (
          <Button variant="primary" icon={Plus} gate={can.canCreatePost} href={`${xRoutes.content}?compose=new`}>
            Create a post
          </Button>
        ) : meta.cta === "schedule" ? (
          <Button variant="primary" icon={CalendarClock} gate={can.canSchedulePost} href={`${xRoutes.content}?compose=new&intent=schedule`}>
            Schedule a post
          </Button>
        ) : undefined
      }
      secondary={status === "failed" ? undefined : <Button variant="secondary" href={xRoutes.scheduling}>Open scheduling</Button>}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Table (desktop)                                                     */
/* ------------------------------------------------------------------ */

function PostTable({
  rows,
  sort,
  dir,
  onSort,
  memberName,
  campaignName,
  actions,
}: {
  rows: XPost[];
  sort: PostSortKey;
  dir: "asc" | "desc";
  onSort: (key: PostSortKey) => void;
  memberName: (id: string | null) => string;
  campaignName: (id: string | null) => string;
  actions: ReturnType<typeof usePostActions>;
}) {
  return (
    <div className="scrollbar-thin hidden overflow-x-auto xl:block">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={cn(thClass, "min-w-[240px]")}>
              Post
            </th>
            <th scope="col" className={thClass}>
              Type
            </th>
            <th scope="col" className={thClass}>
              Status
            </th>
            <SortHeader label="Date" active={sort === "date"} dir={dir} onClick={() => onSort("date")} />
            <th scope="col" className={cn(thClass, "hidden 2xl:table-cell")}>
              Owner
            </th>
            <SortHeader label="Impressions" align="right" active={sort === "impressions"} dir={dir} onClick={() => onSort("impressions")} />
            <SortHeader label="Eng. rate" align="right" active={sort === "engagementRate"} dir={dir} onClick={() => onSort("engagementRate")} />
            <SortHeader label="Replies" align="right" active={sort === "replies"} dir={dir} onClick={() => onSort("replies")} className="hidden 2xl:table-cell" />
            <SortHeader label="Reposts" align="right" active={sort === "reposts"} dir={dir} onClick={() => onSort("reposts")} className="hidden 2xl:table-cell" />
            <th scope="col" className={cn(thClass, "w-px")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => {
            const published = post.status === "published";
            return (
              <tr key={post.id} className="group transition-colors hover:bg-[#FAFBFD]">
                <td className={cn(tdClass, "max-w-[340px]")}>
                  <div className="flex items-start gap-2.5">
                    <MediaBadge post={post} />
                    <div className="min-w-0">
                      <Link href={xRoutes.post(post.id)} className={cn("block rounded", x.focus)} title={post.text}>
                        <PostText text={post.text} clamp={2} className="text-[12.5px]" />
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {post.campaignId && (
                          <span className="truncate text-[11px] text-[#98A2B3]" title={campaignName(post.campaignId)}>
                            {campaignName(post.campaignId)}
                          </span>
                        )}
                        {post.internalTags.slice(0, 2).map((tag) => (
                          <Badge key={tag} tone="neutral">
                            {tag}
                          </Badge>
                        ))}
                        {post.failure && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C81E2B]" title={post.failure.message}>
                            <AlertTriangle className="size-3" />
                            {post.failure.retryCount} {post.failure.retryCount === 1 ? "retry" : "retries"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={tdClass}>
                  <TypeBadge type={post.type} />
                </td>
                <td className={tdClass}>
                  <span className="flex flex-col gap-1">
                    <StatusBadge status={post.status} />
                    <ApprovalBadge state={post.approval} />
                  </span>
                </td>
                <td className={cn(tdClass, "whitespace-nowrap")}>
                  <span className="block text-[#0F1B3D]">{date(postDate(post), "MMM d, yyyy")}</span>
                  <span className="block text-[11.5px] text-[#98A2B3]">
                    {post.status === "scheduled" ? `Publishes ${time(post.scheduledAt)}` : published ? time(post.publishedAt) : "Last edited"}
                  </span>
                </td>
                <td className={cn(tdClass, "hidden whitespace-nowrap 2xl:table-cell")}>{memberName(post.ownerId)}</td>
                <td className={cn(tdClass, numClass)}>{published ? compact(post.metrics.impressions) : "—"}</td>
                <td className={cn(tdClass, numClass)}>{published ? percent(engagementRate(post), 2) : "—"}</td>
                <td className={cn(tdClass, numClass, "hidden 2xl:table-cell")}>{published ? compact(post.metrics.replies) : "—"}</td>
                <td className={cn(tdClass, numClass, "hidden 2xl:table-cell")}>{published ? compact(post.metrics.reposts) : "—"}</td>
                <td className={cn(tdClass, "text-right")}>
                  <span className="flex items-center justify-end gap-1">
                    <Button size="xs" variant="secondary" href={xRoutes.post(post.id)}>
                      View
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MediaBadge({ post }: { post: XPost }) {
  const first = post.media[0];
  if (first) {
    return (
      <span className="relative size-10 shrink-0 overflow-hidden rounded-sm bg-[#E9EDF3] ring-1 ring-inset ring-[#E4E9F0]">
        <Image src={first.url} alt="" fill sizes="40px" className="object-cover" />
        {post.media.length > 1 && (
          <span className="absolute bottom-0 right-0 rounded-tl bg-[#0F1B3D]/80 px-1 text-[9px] font-bold text-white">+{post.media.length - 1}</span>
        )}
        {first.kind === "video" && (
          <span className="absolute inset-0 grid place-items-center bg-[#0F1B3D]/25 text-white">
            <Video className="size-3.5" />
          </span>
        )}
      </span>
    );
  }
  const Icon = post.type === "poll" ? ListChecks : post.type === "thread" ? FileText : post.type === "link" ? ImageIcon : XLogo;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#F1F4F8] text-[#98A2B3]">
      <Icon className="size-4" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cards (tablet & mobile)                                             */
/* ------------------------------------------------------------------ */

function PostCards({
  rows,
  memberName,
  actions,
}: {
  rows: XPost[];
  memberName: (id: string | null) => string;
  actions: ReturnType<typeof usePostActions>;
}) {
  const { can } = useX();
  return (
    <ul className="divide-y divide-[#EEF1F5] xl:hidden">
      {rows.map((post) => {
        const published = post.status === "published";
        return (
          <li key={post.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <MediaBadge post={post} />
              <div className="min-w-0 flex-1">
                <Link href={xRoutes.post(post.id)} className="block">
                  <PostText text={post.text} clamp={3} className="text-[12.5px]" />
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={post.status} />
                  <TypeBadge type={post.type} />
                  <ApprovalBadge state={post.approval} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-[#6B7890]">
                  {date(postDate(post), "MMM d, yyyy")} · {memberName(post.ownerId)}
                </p>
              </div>
            </div>

            {published && (
              <dl className="mt-2.5 grid grid-cols-2 gap-2 rounded-sm bg-[#F8FAFC] px-2.5 py-2 sm:grid-cols-4">
                {[
                  { label: "Impressions", value: compact(post.metrics.impressions) },
                  { label: "Eng. rate", value: percent(engagementRate(post), 2) },
                  { label: "Replies", value: compact(post.metrics.replies) },
                  { label: "Reposts", value: compact(post.metrics.reposts) },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-[10px] uppercase tracking-[0.03em] text-[#98A2B3]">{item.label}</dt>
                    <dd className="text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {post.failure && (
              <p className="mt-2 flex items-start gap-1.5 rounded-sm bg-[#FEF6F7] px-2.5 py-2 text-[11.5px] leading-4 text-[#C81E2B]">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                {post.failure.message}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Button size="xs" variant="secondary" href={xRoutes.post(post.id)}>
                View details
              </Button>
              {post.status === "failed" && (
                <Button size="xs" variant="primary" icon={RotateCcw} gate={can.canCreatePost} onClick={() => void actions.retry(post)}>
                  Retry
                </Button>
              )}
              {(post.status === "draft" || post.status === "scheduled") && (
                <Button size="xs" variant="secondary" icon={CalendarClock} gate={can.canSchedulePost} onClick={() => actions.openSchedule(post)}>
                  {post.status === "scheduled" ? "Reschedule" : "Schedule"}
                </Button>
              )}
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
        );
      })}
    </ul>
  );
}
