"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, ChevronDown, ChevronRight, Loader2, MapPin, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import {
  schedulingApi,
  conflictingRevision,
  existingScheduledPostId,
  describeScheduleWarning,
  type PublishChannel,
  type PublishTarget,
  type ScheduledPost,
} from "../live/scheduling-api";
import { composeScheduledFor } from "../live/schedule-datetime";
import { SCHEDULED_POST_STATUS_META, describeScheduleErrorCode } from "../live/scheduling-status";
import { PLATFORM_META } from "../config/platform-config";
import type { Platform, PlatformSchedule } from "../types/content.types";

const PLATFORM_TO_CHANNEL: Partial<Record<Platform, PublishChannel>> = {
  facebook: "FACEBOOK_PAGE",
  instagram: "INSTAGRAM_ACCOUNT",
  linkedin: "LINKEDIN_ORGANIZATION",
  "google-business": "GOOGLE_BUSINESS_LOCATION",
};

type Props = {
  /** Saved draft id — targets and schedule creation both need it. */
  draftId: string | null;
  /** Draft revision the reviewer is looking at; sent as expectedDraftRevision. */
  revision: number | null;
  channels: Platform[];
  schedules: PlatformSchedule[];
  /** platform → backend draft-variant id, learned when the draft is saved. */
  variantIds: Partial<Record<Platform, string>>;
  /** Re-reads the draft so a stale revision can be recovered. */
  onReloadDraft: () => void;
};

export function ScheduledPostsPanel({ draftId, revision, channels, schedules, variantIds, onReloadDraft }: Props) {
  const { companyId, clientId } = useTenancyContext();

  const [targets, setTargets] = useState<Partial<Record<Platform, PublishTarget[]>>>({});
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Partial<Record<Platform, string>>>({});
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScheduledPost | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ platform: Platform; scheduledFor: string } | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [reconnectNotice, setReconnectNotice] = useState(false);

  const scheduledPlatforms = useMemo(
    () => channels.filter((p) => schedules.find((s) => s.platform === p)?.schedule === "later"),
    [channels, schedules],
  );

  const refreshPosts = useCallback(async () => {
    if (!companyId || !clientId) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const result = await schedulingApi.list(companyId, clientId, { limit: 25 });
      setPosts(result.items);
    } catch (error) {
      setPostsError(ApiError.isApiError(error) ? error.message : "Could not load scheduled posts.");
    } finally {
      setPostsLoading(false);
    }
  }, [companyId, clientId]);

  /* ── Publishing target discovery ── */
  useEffect(() => {
    if (!companyId || !clientId || !draftId) return;
    const withVariant = scheduledPlatforms.filter((p) => variantIds[p]);
    if (withVariant.length === 0) return;

    const controller = new AbortController();
    setTargetsLoading(true);
    void Promise.all(
      withVariant.map(async (p) => {
        const result = await schedulingApi.targets(companyId, clientId, draftId, variantIds[p]!, controller.signal);
        return [p, result.items] as const;
      }),
    )
      .then((entries) => {
        const next: Partial<Record<Platform, PublishTarget[]>> = {};
        let reconnect = false;
        for (const [platform, items] of entries) {
          next[platform] = items;
          if (items.some((t) => t.reason === "integration_reconnect_required")) reconnect = true;
        }
        setTargets((prev) => ({ ...prev, ...next }));
        setReconnectNotice(reconnect);
      })
      .catch(() => {
        /* aborted or a 4xx — the row stays on its "no target" copy */
      })
      .finally(() => setTargetsLoading(false));

    return () => controller.abort();
  }, [companyId, clientId, draftId, scheduledPlatforms, variantIds]);

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  const openDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    if (!companyId || !clientId) return;
    setDetailLoading(true);
    try {
      setDetail(await schedulingApi.get(companyId, clientId, id));
    } catch (error) {
      toast.error(ApiError.isApiError(error) ? error.message : "Could not load this scheduled post.");
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const attemptSchedule = async () => {
    if (!pendingConfirm) return;
    const { platform, scheduledFor } = pendingConfirm;
    const channel = PLATFORM_TO_CHANNEL[platform];
    const variantId = variantIds[platform];
    const targetId = selectedTarget[platform] ?? targets[platform]?.find((t) => t.publishable)?.resourceMappingId;

    setPendingConfirm(null);
    if (!companyId || !clientId) return toast.error("Verified Company and Client context are required.");
    if (!draftId || !variantId) return toast.error("Save the draft before scheduling.");
    if (revision === null) return toast.error("Save the draft to capture its revision first.");
    if (!channel) return toast.error("This channel cannot be scheduled yet.");
    if (!targetId) return toast.error("Pick a publishing target first.");

    setScheduling(true);
    setConflictNotice(null);
    try {
      const created = await schedulingApi.schedule(companyId, clientId, draftId, variantId, {
        resourceMappingId: targetId,
        scheduledFor,
        expectedDraftRevision: revision,
      });

      const warnings = created.warnings ?? [];
      if (warnings.length > 0) {
        warnings.forEach((w) => toast.warning(describeScheduleWarning(w), { duration: 8000 }));
      } else {
        toast.success(`Scheduled for ${new Date(created.scheduledFor).toLocaleString()}`);
      }
      await refreshPosts();
    } catch (error: unknown) {
      if (schedulingApi.isRevisionConflict(error)) {
        const current = conflictingRevision(error);
        setConflictNotice(
          error.message +
            (current !== undefined ? ` (now revision ${current})` : ""),
        );
        toast.error("Revision conflict: reload the draft, then schedule again.");
      } else if (schedulingApi.isAlreadyScheduled(error)) {
        const existingId = existingScheduledPostId(error);
        toast.error(error.message, {
          action: existingId
            ? { label: "View", onClick: () => void openDetail(existingId) }
            : undefined,
          duration: 8000,
        });
        await refreshPosts();
      } else if (schedulingApi.isReconnectRequired(error)) {
        setReconnectNotice(true);
        toast.error(error.message, { duration: 8000 });
      } else if (ApiError.isApiError(error)) {
        toast.error(error.message);
      } else {
        toast.error("Unexpected error while scheduling.");
      }
    } finally {
      setScheduling(false);
    }
  };

  const cancelPost = async (id: string) => {
    setCancelConfirmId(null);
    if (!companyId || !clientId) return;
    try {
      const updated = await schedulingApi.cancel(companyId, clientId, id);
      toast.success("Schedule cancelled.");
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (expandedId === id) setDetail(updated);
    } catch (error: unknown) {
      if (schedulingApi.isNotCancellable(error)) {
        const status = error.detail<string>("status");
        toast.error(status ? `Cannot cancel: this post is already ${status}.` : error.message);
        await refreshPosts();
      } else if (ApiError.isApiError(error)) {
        toast.error(error.message);
      } else {
        toast.error("Could not cancel this schedule.");
      }
    }
  };

  const scheduleReady = !!draftId && revision !== null;

  return (
    <Card
      title="Scheduled Posts"
      subtitle="TASK-11B publishing queue"
      action={
        <button
          onClick={() => void refreshPosts()}
          disabled={postsLoading}
          className="rounded-sm p-1 text-[#7A87A0] transition hover:bg-slate-50 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn("size-3.5", postsLoading && "animate-spin")} />
        </button>
      }
    >
      {/* ── Target discovery + schedule creation ── */}
      {scheduledPlatforms.length > 0 && (
        <div className="mb-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4B5B76]">
            <MapPin className="size-3" /> Publishing targets
          </div>

          {conflictNotice && (
            <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] p-2 text-[10.5px] text-[#721c24]">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle size={12} className="shrink-0" /> Revision Conflict (409)
              </div>
              <p className="mt-0.5">{conflictNotice}</p>
              <button
                onClick={onReloadDraft}
                className="mt-1.5 flex items-center gap-1 rounded bg-[#721c24] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#501319]"
              >
                <RefreshCw size={10} /> Reload Latest Revision
              </button>
            </div>
          )}

          {reconnectNotice && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 p-2 text-[10.5px] text-amber-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle size={12} className="shrink-0" /> Reconnect required
              </div>
              <p className="mt-0.5">
                One or more connections are expired or revoked, so they cannot publish.{" "}
                <a href="/admin/integrations" className="font-semibold underline">
                  Reconnect the integration
                </a>{" "}
                before scheduling.
              </p>
            </div>
          )}

          {!scheduleReady && (
            <div className="rounded-sm border border-[#E2E8F0] bg-slate-50 p-2 text-[10.5px] text-[#687797]">
              Save the draft first — scheduling sends <code>expectedDraftRevision</code> so a concurrent edit is
              rejected with a 409.
            </div>
          )}

          {scheduledPlatforms.map((platform) => {
            const sched = schedules.find((s) => s.platform === platform);
            const items = targets[platform] ?? [];
            const selected = selectedTarget[platform] ?? items.find((t) => t.publishable)?.resourceMappingId;
            const reconnecting = items.some((t) => t.reason === "integration_reconnect_required");
            const unsupported = items.length === 0 && !targetsLoading;
            const composed = composeScheduledFor(sched?.date, sched?.time);

            return (
              <div key={platform} className="rounded-sm border border-[#E2E8F0] p-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[11px] font-semibold text-[#33445F]">
                    {PLATFORM_META[platform]?.label ?? platform}
                  </span>
                  <span className="text-[10px] text-[#7A87A0]">
                    {"error" in composed ? "—" : `${sched?.date ?? ""} ${sched?.time ?? ""}`}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  {targetsLoading && items.length === 0 ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#7A87A0]">
                      <Loader2 className="size-3 animate-spin" /> Discovering targets…
                    </span>
                  ) : items.length === 0 ? (
                    <span className="text-[10px] text-[#7A87A0]">
                      {unsupported
                        ? "No publishing target mapped yet — connect and map a page in Integrations."
                        : "No target for this channel."}
                    </span>
                  ) : (
                    <select
                      value={selected ?? ""}
                      onChange={(e) => setSelectedTarget((prev) => ({ ...prev, [platform]: e.target.value }))}
                      className="h-7 min-w-0 flex-1 appearance-none rounded-sm border border-[#D9E1EC] bg-white px-2 text-[10.5px] font-medium text-[#24365A] outline-none hover:border-[#1769DF] focus:border-[#1769DF]"
                    >
                      {items.map((t) => (
                        <option key={t.resourceMappingId} value={t.resourceMappingId} disabled={!t.publishable}>
                          {t.externalResourceId} · {t.provider}
                          {t.publishable ? "" : t.reason === "integration_reconnect_required" ? " (reconnect)" : " (unsupported)"}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    disabled={
                      !scheduleReady ||
                      scheduling ||
                      !selected ||
                      "error" in composed
                    }
                    onClick={() => {
                      if ("error" in composed) return toast.error(composed.error);
                      setPendingConfirm({ platform, scheduledFor: composed.scheduledFor });
                    }}
                    className="flex h-7 shrink-0 items-center gap-1 rounded-sm bg-[#1769DF] px-2.5 text-[10px] font-semibold text-white transition hover:bg-[#1259BD] disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    <Calendar className="size-3" /> Schedule
                  </button>
                </div>

                {"error" in composed && <p className="mt-1 text-[10px] text-red-500">{composed.error}</p>}
                {reconnecting && !selected && (
                  <p className="mt-1 text-[10px] text-amber-700">Selected target needs a reconnect first.</p>
                )}
              </div>
            );
          })}

        </div>
      )}

      {/* ── Scheduled-post list ── */}
      <div className="border-t border-[#EDF1F5] pt-2">
        {postsLoading && posts.length === 0 ? (
          <div className="flex items-center gap-1.5 py-3 text-[11px] text-[#7A87A0]">
            <Loader2 className="size-3 animate-spin" /> Loading scheduled posts…
          </div>
        ) : postsError ? (
          <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] p-2 text-[10.5px] text-[#721c24]">{postsError}</div>
        ) : posts.length === 0 ? (
          <p className="py-3 text-[11px] text-[#7A87A0]">Nothing scheduled for this client yet.</p>
        ) : (
          <ul className="space-y-1">
            {posts.map((post) => {
              const meta = SCHEDULED_POST_STATUS_META[post.status];
              const isOpen = expandedId === post.id;
              const shown = isOpen && detail?.id === post.id ? detail : post;
              const errorCode = shown.failureCode ?? shown.lastErrorCode;
              const errorCopy = describeScheduleErrorCode(shown.failureCode ?? shown.lastErrorCode);
              const cancellable = shown.status === "SCHEDULED" || shown.status === "CANCELLED";

              return (
                <li key={post.id} className="rounded-sm border border-[#E2E8F0]">
                  <button
                    onClick={() => void openDetail(post.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition hover:bg-slate-50"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3 shrink-0 text-[#7A87A0]" />
                    ) : (
                      <ChevronRight className="size-3 shrink-0 text-[#7A87A0]" />
                    )}
                    <span className="truncate text-[11px] text-[#33445F]">
                      {PLATFORM_META[
                        (Object.keys(PLATFORM_TO_CHANNEL) as Platform[]).find(
                          (p) => PLATFORM_TO_CHANNEL[p] === post.channel,
                        ) ?? "facebook"
                      ]?.label ?? post.channel}
                    </span>
                    <span className="truncate text-[10px] text-[#7A87A0]">{post.target.externalResourceId}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-[#7A87A0]">
                      {new Date(post.scheduledFor).toLocaleString()}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-sm px-1.5 py-0.5 text-[9.5px] font-semibold ring-1 ring-inset",
                        meta.className,
                      )}
                      title={meta.hint}
                    >
                      {meta.label}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#EDF1F5] bg-[#F8FAFD] p-2 text-[10.5px] text-[#4B5B76]">
                      {detailLoading && !detail ? (
                        <div className="flex items-center gap-1.5 py-1 text-[#7A87A0]">
                          <Loader2 className="size-3 animate-spin" /> Loading detail…
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            <span>Channel</span>
                            <span className="text-right font-semibold">{shown.channel}</span>
                            <span>Status</span>
                            <span className="text-right font-semibold">{meta.label} — {meta.hint}</span>
                            <span>Attempts</span>
                            <span className="text-right font-semibold">{shown.attemptCount}</span>
                            <span>Scheduled revision</span>
                            <span className="text-right font-semibold">r{shown.draftRevision}</span>
                            {errorCode && (
                              <>
                                <span>{shown.failureCode ? "Failure code" : "Last error"}</span>
                                <span className="text-right font-semibold text-red-600">
                                  {errorCode}
                                  {errorCopy && errorCopy !== errorCode ? ` — ${errorCopy}` : ""}
                                </span>
                              </>
                            )}
                            {shown.externalPostId && (
                              <>
                                <span>External post</span>
                                <span className="truncate text-right font-semibold">{shown.externalPostId}</span>
                              </>
                            )}
                            {shown.publishedAt && (
                              <>
                                <span>Published</span>
                                <span className="text-right font-semibold">{new Date(shown.publishedAt).toLocaleString()}</span>
                              </>
                            )}
                            {shown.cancelledAt && (
                              <>
                                <span>Cancelled</span>
                                <span className="text-right font-semibold">{new Date(shown.cancelledAt).toLocaleString()}</span>
                              </>
                            )}
                          </div>

                          {shown.draftChangedSinceScheduled && (
                            <p className="mt-1.5 rounded-sm bg-amber-50 p-1.5 text-amber-800 ring-1 ring-amber-200">
                              The draft changed after this was scheduled — this row will publish the r{shown.draftRevision}{" "}
                              snapshot.
                            </p>
                          )}

                          {shown.status === "OUTCOME_UNKNOWN" && (
                            <p className="mt-1.5 rounded-sm bg-purple-50 p-1.5 text-purple-800 ring-1 ring-purple-200">
                              The network gave an ambiguous answer, so we cannot prove whether the post went out. This state
                              is resolved manually — it is never retried automatically.
                            </p>
                          )}

                          <div className="mt-1.5 flex justify-end gap-1.5">
                            {cancelConfirmId === shown.id ? (
                              <>
                                <button
                                  onClick={() => setCancelConfirmId(null)}
                                  className="rounded-sm border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#687797] hover:bg-white"
                                >
                                  Keep
                                </button>
                                <button
                                  onClick={() => void cancelPost(shown.id)}
                                  className="flex items-center gap-1 rounded-sm bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700"
                                >
                                  <XCircle className="size-3" /> Cancel schedule
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={!cancellable}
                                onClick={() => setCancelConfirmId(shown.id)}
                                title={cancellable ? "Cancel this schedule" : "Only a SCHEDULED post can be cancelled"}
                                className="rounded-sm border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#687797] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Cancel schedule
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Explicit approval gate: nothing publishes without this confirm ── */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#172044]/40 p-4">
          <div className="w-full max-w-sm rounded-sm border border-[#E2E8F0] bg-white p-4 shadow-xl">
            <h4 className="text-[13px] font-semibold text-[#172044]">Confirm schedule</h4>
            <p className="mt-1 text-[11px] leading-4 text-[#687797]">
              This will publish to{" "}
              <b>{PLATFORM_META[pendingConfirm.platform]?.label ?? pendingConfirm.platform}</b> at{" "}
              <b>{new Date(pendingConfirm.scheduledFor).toLocaleString()}</b>. Publishing to Facebook or LinkedIn is a real,
              network-visible action.
            </p>
            <div className="mt-3 flex justify-end gap-1.5">
              <button
                onClick={() => setPendingConfirm(null)}
                className="rounded-sm border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold text-[#687797] hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={() => void attemptSchedule()}
                disabled={scheduling}
                className="flex items-center gap-1 rounded-sm bg-[#1769DF] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1259BD] disabled:opacity-60"
              >
                {scheduling && <Loader2 className="size-3 animate-spin" />} Confirm schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduling && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#7A87A0]">
          <Loader2 className="size-3 animate-spin" /> Creating schedule…
        </p>
      )}
    </Card>
  );
}
