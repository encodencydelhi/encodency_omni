"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import { schedulingApi, SCHEDULED_POST_STATUSES, type PublishChannel, type ScheduledPost, type ScheduledPostStatus } from "@/features/admin/content/live/scheduling-api";
import { btn, btnPrimary, EmptyState, FilterBar, FilterSelect, PagedFooter, SearchInput, TableShell, Td, Th, Tr } from "@/features/admin/meta-ads/components/ui";
import { usePagination } from "@/features/admin/meta-ads/use-filters";
import { useMeta } from "../connection-context";
import { META_KEY, messageOf, useMetaScheduledPosts } from "../live/meta-hooks";
import { DetailDialog, KeyValue, Pill } from "../ui";

const STATUS_TONE: Record<ScheduledPostStatus, "blue" | "amber" | "green" | "red" | "slate"> = {
  SCHEDULED: "blue",
  PUBLISHING: "amber",
  PUBLISHED: "green",
  FAILED: "red",
  OUTCOME_UNKNOWN: "amber",
  CANCELLED: "slate",
};

const STATUS_LABEL: Record<ScheduledPostStatus, string> = {
  SCHEDULED: "Scheduled",
  PUBLISHING: "Publishing",
  PUBLISHED: "Published",
  FAILED: "Failed",
  OUTCOME_UNKNOWN: "Needs check",
  CANCELLED: "Cancelled",
};

const CHANNEL_LABEL: Record<string, string> = { FACEBOOK_PAGE: "Facebook", INSTAGRAM_ACCOUNT: "Instagram" };
const ALL_STATUSES = "All statuses";
const ALL_CHANNELS = "All channels";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const humanize = (code: string | null) => (code ? code.replace(/_/g, " ") : "—");

function ChannelMark({ channel }: { channel: PublishChannel }) {
  return channel === "INSTAGRAM_ACCOUNT" ? <FaInstagram className="size-3.5 text-[#d946ef]" aria-label="Instagram" /> : <FaFacebookF className="size-3.5 text-[#1877f2]" aria-label="Facebook" />;
}

/**
 * Posts OmniPlatform scheduled or published for this Client. `channel` pins the table to one network; without
 * it a channel filter is offered. Rows open a detail dialog; a still-scheduled post can be cancelled there.
 */
export function ScheduledPostsTable({ channel, targetId, pageSize = 8 }: { channel?: "FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT"; /** Only posts aimed at this Page / Instagram account id. */ targetId?: string; pageSize?: number }) {
  const meta = useMeta();
  const queryClient = useQueryClient();
  const query = useMetaScheduledPosts(meta.companyId, meta.clientId, meta.state === "connected");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [channelFilter, setChannelFilter] = useState(ALL_CHANNELS);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const base = useMemo(() => query.items.filter((post) => (!channel || post.channel === channel) && (!targetId || post.target.externalResourceId === targetId)), [query.items, channel, targetId]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter((post) => {
      if (status !== ALL_STATUSES && STATUS_LABEL[post.status] !== status) return false;
      if (!channel && channelFilter !== ALL_CHANNELS && CHANNEL_LABEL[post.channel] !== channelFilter) return false;
      return !q || post.content.toLowerCase().includes(q) || post.target.externalResourceId.includes(q);
    });
  }, [base, status, channelFilter, search, channel]);
  const paged = usePagination(rows, pageSize);
  const open = base.find((post) => post.id === openId) ?? null;
  const filtered = status !== ALL_STATUSES || channelFilter !== ALL_CHANNELS || search !== "";

  const cancel = useMutation({
    mutationFn: (post: ScheduledPost) => schedulingApi.cancel(meta.companyId, meta.clientId, post.id),
    onSuccess: async () => {
      toast.success("Post cancelled. It will not be published.");
      setConfirmCancel(false);
      await queryClient.invalidateQueries({ queryKey: [META_KEY, meta.companyId, meta.clientId, "scheduled"] });
    },
    onError: (error) => toast.error(messageOf(error, "Unable to cancel this post.")),
  });

  if (query.isLoading) return <div className="h-40 animate-pulse bg-slate-50" role="status" aria-label="Loading posts" />;
  if (query.isError) {
    return (
      <div className="p-4">
        <p className="rounded-sm border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{messageOf(query.error, "Unable to load scheduled posts.")}</p>
      </div>
    );
  }

  return (
    <>
      {base.length > 0 && (
        <FilterBar>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[ALL_STATUSES, ...SCHEDULED_POST_STATUSES.map((s) => STATUS_LABEL[s])]} minWidth={150} />
          {!channel && <FilterSelect label="Channel" value={channelFilter} onChange={setChannelFilter} options={[ALL_CHANNELS, "Facebook", "Instagram"]} minWidth={140} />}
          <SearchInput placeholder="Search post text…" value={search} onChange={setSearch} />
          {filtered && (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setStatus(ALL_STATUSES);
                setChannelFilter(ALL_CHANNELS);
                setSearch("");
              }}
            >
              Clear
            </button>
          )}
        </FilterBar>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={filtered ? "No posts match these filters" : "No scheduled posts yet"}
          description={filtered ? "Try another status or channel, or clear the filters." : "Posts you schedule from Content appear here with their publishing status."}
          secondary={filtered ? undefined : { label: "Open Content", href: "/admin/content" }}
          compact
        />
      ) : (
        <TableShell minWidth={760}>
          <thead>
            <tr>
              <Th>Post</Th>
              <Th>Channel</Th>
              <Th>Status</Th>
              <Th>Scheduled for</Th>
              <Th>Published</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {paged.visible.map((post) => (
              <Tr key={post.id}>
                <Td>
                  <button type="button" onClick={() => setOpenId(post.id)} className="block max-w-[320px] truncate text-left font-semibold text-blue-700 hover:underline" title={post.content}>
                    {post.content || "(empty post)"}
                  </button>
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5">
                    <ChannelMark channel={post.channel} />
                    {CHANNEL_LABEL[post.channel]}
                  </span>
                </Td>
                <Td>
                  <Pill tone={STATUS_TONE[post.status]}>{STATUS_LABEL[post.status]}</Pill>
                </Td>
                <Td>{when(post.scheduledFor)}</Td>
                <Td>{when(post.publishedAt)}</Td>
                <Td>
                  <button type="button" onClick={() => setOpenId(post.id)} className={btn}>
                    View
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
      <PagedFooter paged={paged} noun="posts" />
      {query.total > query.items.length && base.length > 0 && <p className="border-t border-slate-100 px-4 py-2 text-[11px] font-medium text-slate-500">Showing the {query.items.length} nearest of {query.total} scheduled posts for this Client.</p>}

      <DetailDialog
        open={Boolean(open)}
        onOpenChange={(next) => {
          if (!next) {
            setOpenId(null);
            setConfirmCancel(false);
          }
        }}
        title="Scheduled post"
        description={open ? `${CHANNEL_LABEL[open.channel]} · ${when(open.scheduledFor)}` : undefined}
        footer={
          open?.status === "SCHEDULED" ? (
            confirmCancel ? (
              <>
                <span className="mr-auto self-center text-xs font-medium text-slate-600">Cancel this post so it is never published?</span>
                <button type="button" className={btn} onClick={() => setConfirmCancel(false)}>
                  Keep it
                </button>
                <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate(open)} className="inline-flex h-9 items-center gap-2 rounded-sm bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                  {cancel.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Cancel post
                </button>
              </>
            ) : (
              <>
                <button type="button" className={btn} onClick={() => setConfirmCancel(true)}>
                  Cancel post
                </button>
                <button type="button" className={btnPrimary} onClick={() => setOpenId(null)}>
                  Close
                </button>
              </>
            )
          ) : (
            <button type="button" className={btnPrimary} onClick={() => setOpenId(null)}>
              Close
            </button>
          )
        }
      >
        {open && (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-800">{open.content || "(empty post)"}</p>
            {open.media && open.media.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {open.media.map((item) => (
                  <li key={item.assetId} className="text-[11px] font-medium text-slate-600">
                    {item.asset ? `${item.asset.kind === "VIDEO" ? "Video" : "Image"} ${item.asset.width && item.asset.height ? `${item.asset.width}×${item.asset.height}` : ""}` : "Media removed"}
                  </li>
                ))}
              </ul>
            )}
            <dl>
              <KeyValue label="Status">
                <Pill tone={STATUS_TONE[open.status]}>{STATUS_LABEL[open.status]}</Pill>
              </KeyValue>
              <KeyValue label="Channel">{CHANNEL_LABEL[open.channel]}</KeyValue>
              <KeyValue label="Target ID">{open.target.externalResourceId}</KeyValue>
              <KeyValue label="Scheduled for">{when(open.scheduledFor)}</KeyValue>
              <KeyValue label="Published at">{when(open.publishedAt)}</KeyValue>
              {open.cancelledAt && <KeyValue label="Cancelled at">{when(open.cancelledAt)}</KeyValue>}
              <KeyValue label="Attempts">{open.attemptCount}</KeyValue>
              {(open.failureCode || open.lastErrorCode) && <KeyValue label="Problem">{humanize(open.failureCode ?? open.lastErrorCode)}</KeyValue>}
              {open.externalPostId && <KeyValue label="Meta post ID">{open.externalPostId}</KeyValue>}
              {open.draftChangedSinceScheduled && <KeyValue label="Draft">Edited after scheduling — this row keeps the text that will be posted.</KeyValue>}
            </dl>
          </div>
        )}
      </DetailDialog>
    </>
  );
}
