"use client";

import { createContext, useContext } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { youtubeKeys } from "@/lib/query/keys";
import { youtubeApi, type DateRange, type YouTubeScope } from "../live/youtube-api";
import { shouldRetryYouTubeQuery } from "../live/youtube-errors";
import type {
  AnalyticsAudienceBy,
  AnalyticsDeviceBy,
  AnalyticsGranularity,
  AnalyticsVideoSort,
  YouTubeCommentOrder,
  YouTubeCommentThreadFilter,
  YouTubeLiveFilter,
  YouTubeLiveStreamCreateInput,
  YouTubeLiveCreateInput,
  YouTubeLiveTransitionTarget,
  YouTubeLiveUpdateInput,
  YouTubePlaylistCreateInput,
  YouTubePlaylistUpdateInput,
  YouTubePublishTarget,
  YouTubeUploadInput,
  YouTubeUploadResponse,
  YouTubeVideoUpdateInput,
} from "../live/youtube-dto";

/**
 * React Query bindings for the YouTube backend. All server data lives here; the YouTube store only keeps UI state.
 * Rules: keys always start with the Company + Client; reads never refetch on window focus (they spend Google quota);
 * mutations never auto-retry; every mutation invalidates only what it can have changed.
 */

/* ------------------------------ scope ------------------------------ */

export const YouTubeScopeContext = createContext<YouTubeScope | null>(null);

/** The Company + Client of the page, or null while the tenancy is still being resolved. */
export function useYouTubeScope(): YouTubeScope | null {
  return useContext(YouTubeScopeContext);
}

/** Query options shared by every YouTube read. */
const READ = { staleTime: 60_000, refetchOnWindowFocus: false, retry: shouldRetryYouTubeQuery } as const;

const PAGE_SIZE = 50;

function requireScope(scope: YouTubeScope | null): YouTubeScope {
  if (!scope) throw new Error("YouTube scope is not ready.");
  return scope;
}

/* ------------------------------ connection / channel ------------------------------ */

export function useConnectionQuery() {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.connection(scope) : ["youtube", "none", "connection"],
    queryFn: ({ signal }) => youtubeApi.connection(requireScope(scope), signal),
    enabled: scope !== null,
    ...READ,
    staleTime: 30_000,
  });
}

export function useChannelQuery(enabled: boolean) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.channel(scope) : ["youtube", "none", "channel"],
    queryFn: ({ signal }) => youtubeApi.channel(requireScope(scope), signal),
    enabled: scope !== null && enabled,
    ...READ,
  });
}

/* ------------------------------ videos ------------------------------ */

export function useVideosInfinite(enabled: boolean) {
  const scope = useYouTubeScope();
  return useInfiniteQuery({
    queryKey: scope ? youtubeKeys.videos(scope) : ["youtube", "none", "videos"],
    // The first page omits the token entirely; later pages pass Google's own token back unchanged.
    queryFn: ({ pageParam, signal }) => youtubeApi.videos(requireScope(scope), { pageToken: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: scope !== null && enabled,
    ...READ,
  });
}

export function useVideoQuery(videoId: string | undefined, enabled = true) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope && videoId ? youtubeKeys.video(scope, videoId) : ["youtube", "none", "video"],
    queryFn: ({ signal }) => youtubeApi.video(requireScope(scope), videoId as string, signal),
    enabled: scope !== null && Boolean(videoId) && enabled,
    ...READ,
  });
}

export function useSchedulesQuery(enabled: boolean) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.schedules(scope) : ["youtube", "none", "schedules"],
    queryFn: ({ signal }) => youtubeApi.schedules(requireScope(scope), undefined, signal),
    enabled: scope !== null && enabled,
    ...READ,
    staleTime: 15_000,
  });
}

/* ------------------------------ uploads ------------------------------ */

const UPLOAD_TERMINAL = new Set(["UPLOADED", "FAILED"]);
const PROCESSING_TERMINAL = new Set(["READY", "FAILED", "REJECTED"]);

/** Done polling: the bytes are delivered (a video id exists) AND YouTube finished processing, or the job failed. */
export function isUploadSettled(u: Pick<YouTubeUploadResponse, "status" | "processingStatus"> | undefined): boolean {
  if (!u) return false;
  if (u.status === "FAILED") return true;
  return UPLOAD_TERMINAL.has(u.status) && PROCESSING_TERMINAL.has(u.processingStatus);
}

/** Polls an upload job: 2 s while bytes move, 15 s while YouTube processes, never once it is settled. */
export function useUploadQuery(uploadId: string | null) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope && uploadId ? youtubeKeys.upload(scope, uploadId) : ["youtube", "none", "upload"],
    queryFn: ({ signal }) => youtubeApi.upload(requireScope(scope), uploadId as string, signal),
    enabled: scope !== null && Boolean(uploadId),
    ...READ,
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2_000;
      if (isUploadSettled(data)) return false;
      return data.status === "UPLOADED" ? 15_000 : 2_000;
    },
  });
}

/* ------------------------------ playlists ------------------------------ */

export function usePlaylistsInfinite(enabled: boolean) {
  const scope = useYouTubeScope();
  return useInfiniteQuery({
    queryKey: scope ? youtubeKeys.playlists(scope) : ["youtube", "none", "playlists"],
    queryFn: ({ pageParam, signal }) => youtubeApi.playlists(requireScope(scope), { pageToken: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: scope !== null && enabled,
    ...READ,
  });
}

export function usePlaylistQuery(playlistId: string | undefined, enabled = true) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope && playlistId ? youtubeKeys.playlist(scope, playlistId) : ["youtube", "none", "playlist"],
    queryFn: ({ signal }) => youtubeApi.playlist(requireScope(scope), playlistId as string, signal),
    enabled: scope !== null && Boolean(playlistId) && enabled,
    ...READ,
  });
}

export function usePlaylistItemsInfinite(playlistId: string | undefined, enabled = true) {
  const scope = useYouTubeScope();
  return useInfiniteQuery({
    queryKey: scope && playlistId ? youtubeKeys.playlistItems(scope, playlistId) : ["youtube", "none", "playlist-items"],
    queryFn: ({ pageParam, signal }) => youtubeApi.playlistItems(requireScope(scope), playlistId as string, { pageToken: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: scope !== null && Boolean(playlistId) && enabled,
    ...READ,
  });
}

/* ------------------------------ comments (per video) ------------------------------ */

export function useCommentsInfinite(videoId: string | undefined, options: { filter: YouTubeCommentThreadFilter; order: YouTubeCommentOrder; enabled?: boolean }) {
  const scope = useYouTubeScope();
  return useInfiniteQuery({
    queryKey: scope && videoId ? youtubeKeys.comments(scope, videoId, options.filter, options.order) : ["youtube", "none", "comments"],
    queryFn: ({ pageParam, signal }) =>
      youtubeApi.comments(requireScope(scope), videoId as string, { pageToken: pageParam, pageSize: 50, filter: options.filter, order: options.order }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: scope !== null && Boolean(videoId) && (options.enabled ?? true),
    ...READ,
    staleTime: 30_000,
  });
}

export function useRepliesInfinite(commentId: string | undefined, enabled = true) {
  const scope = useYouTubeScope();
  return useInfiniteQuery({
    queryKey: scope && commentId ? youtubeKeys.replies(scope, commentId) : ["youtube", "none", "replies"],
    queryFn: ({ pageParam, signal }) => youtubeApi.replies(requireScope(scope), commentId as string, { pageToken: pageParam, pageSize: 100 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: scope !== null && Boolean(commentId) && enabled,
    ...READ,
    staleTime: 30_000,
  });
}

/* ------------------------------ analytics ------------------------------ */

function useAnalytics<T>(kind: string, params: unknown, enabled: boolean, fetcher: (scope: YouTubeScope, signal: AbortSignal) => Promise<T>) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.analytics(scope, kind, params) : ["youtube", "none", "analytics", kind],
    queryFn: ({ signal }) => fetcher(requireScope(scope), signal),
    enabled: scope !== null && enabled,
    ...READ,
    staleTime: 5 * 60_000,
  });
}

export function useAnalyticsOverview(range: DateRange, enabled: boolean) {
  return useAnalytics("overview", range, enabled, (s, signal) => youtubeApi.analyticsOverview(s, range, signal));
}

export function useAnalyticsTimeseries(range: DateRange, granularity: AnalyticsGranularity, enabled: boolean) {
  return useAnalytics("timeseries", { ...range, granularity }, enabled, (s, signal) =>
    youtubeApi.analyticsTimeseries(s, range, { granularity, metrics: ["views", "estimatedMinutesWatched", "subscribersGained", "subscribersLost", "averageViewDurationSeconds"] }, signal),
  );
}

export function useAnalyticsTopVideos(range: DateRange, sort: AnalyticsVideoSort, enabled: boolean, pageSize = 50) {
  return useAnalytics("top-videos", { ...range, sort, pageSize }, enabled, (s, signal) => youtubeApi.analyticsTopVideos(s, range, { sort, page: 1, pageSize }, signal));
}

export function useVideoAnalytics(videoId: string | undefined, range: DateRange, granularity: "total" | "day", enabled: boolean) {
  return useAnalytics("video", { videoId, ...range, granularity }, enabled && Boolean(videoId), (s, signal) => youtubeApi.analyticsVideo(s, videoId as string, range, granularity, signal));
}

export function useAnalyticsTraffic(range: DateRange, enabled: boolean) {
  return useAnalytics("traffic", range, enabled, (s, signal) => youtubeApi.analyticsTrafficSources(s, range, signal));
}

export function useAnalyticsPlaybackLocations(range: DateRange, enabled: boolean) {
  return useAnalytics("playback", range, enabled, (s, signal) => youtubeApi.analyticsPlaybackLocations(s, range, signal));
}

export function useAnalyticsGeography(range: DateRange, enabled: boolean) {
  return useAnalytics("geography", range, enabled, (s, signal) => youtubeApi.analyticsGeography(s, range, { page: 1, pageSize: 50 }, signal));
}

export function useAnalyticsDevices(range: DateRange, by: AnalyticsDeviceBy, enabled: boolean) {
  return useAnalytics("devices", { ...range, by }, enabled, (s, signal) => youtubeApi.analyticsDevices(s, range, by, signal));
}

export function useAnalyticsAudience(range: DateRange, by: AnalyticsAudienceBy, enabled: boolean) {
  return useAnalytics("audience", { ...range, by }, enabled, (s, signal) => youtubeApi.analyticsAudience(s, range, by, signal));
}

export function useAnalyticsRevenue(range: DateRange, granularity: "total" | "day", enabled: boolean) {
  return useAnalytics("revenue", { ...range, granularity }, enabled, (s, signal) => youtubeApi.analyticsRevenue(s, range, { granularity }, signal));
}

/* ------------------------------ reporting / monetization ------------------------------ */

export function useReportTypes(enabled: boolean) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.reporting(scope, "types") : ["youtube", "none", "reporting-types"],
    queryFn: ({ signal }) => youtubeApi.reportTypes(requireScope(scope), signal),
    enabled: scope !== null && enabled,
    ...READ,
    staleTime: 5 * 60_000,
  });
}

export function useReportingJobs(enabled: boolean) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.reporting(scope, "jobs") : ["youtube", "none", "reporting-jobs"],
    queryFn: ({ signal }) => youtubeApi.reportingJobs(requireScope(scope), signal),
    enabled: scope !== null && enabled,
    ...READ,
    staleTime: 5 * 60_000,
  });
}

export function useMonetizationCapabilities(enabled: boolean) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.monetization(scope) : ["youtube", "none", "monetization"],
    queryFn: ({ signal }) => youtubeApi.monetizationCapabilities(requireScope(scope), signal),
    enabled: scope !== null && enabled,
    ...READ,
    staleTime: 5 * 60_000,
  });
}

/* ------------------------------ live ------------------------------ */

export function useLiveBroadcasts(status: YouTubeLiveFilter, enabled: boolean) {
  const scope = useYouTubeScope();
  return useInfiniteQuery({
    queryKey: scope ? youtubeKeys.liveBroadcasts(scope, status) : ["youtube", "none", "live"],
    queryFn: ({ pageParam, signal }) => youtubeApi.liveBroadcasts(requireScope(scope), { status, pageToken: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: scope !== null && enabled,
    ...READ,
    staleTime: status === "upcoming" || status === "completed" ? 60_000 : 0,
  });
}

export function useLiveStreams(enabled: boolean) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope ? youtubeKeys.liveStreams(scope) : ["youtube", "none", "streams"],
    queryFn: ({ signal }) => youtubeApi.liveStreams(requireScope(scope), { pageSize: PAGE_SIZE }, signal),
    enabled: scope !== null && enabled,
    ...READ,
    staleTime: 15_000,
  });
}

/** Live chat poll: respects YouTube's `pollingIntervalMillis` (never faster than 5 s). The first page is read without a token. */
export function useLiveChat(broadcastId: string | undefined, enabled: boolean) {
  const scope = useYouTubeScope();
  return useQuery({
    queryKey: scope && broadcastId ? youtubeKeys.liveChat(scope, broadcastId) : ["youtube", "none", "chat"],
    queryFn: ({ signal }) => youtubeApi.liveChat(requireScope(scope), broadcastId as string, { pageSize: 200 }, signal),
    enabled: scope !== null && Boolean(broadcastId) && enabled,
    ...READ,
    staleTime: 0,
    refetchInterval: (query) => Math.max(5_000, query.state.data?.pollingIntervalMillis ?? 10_000),
  });
}

/* ------------------------------ invalidation helpers ------------------------------ */

function invalidateVideo(qc: QueryClient, scope: YouTubeScope, videoId?: string) {
  void qc.invalidateQueries({ queryKey: youtubeKeys.videos(scope) });
  void qc.invalidateQueries({ queryKey: youtubeKeys.schedules(scope) });
  if (videoId) void qc.invalidateQueries({ queryKey: youtubeKeys.video(scope, videoId) });
}

/* ------------------------------ mutations ------------------------------ */

/**
 * One hook returns every mutation, so a page cannot forget `retry: false` or an invalidation.
 * `isPending` of each mutation is what disables the matching button.
 */
export function useYouTubeMutations() {
  const scope = useYouTubeScope();
  const qc = useQueryClient();
  const s = () => requireScope(scope);

  const sync = useMutation({
    mutationFn: () => youtubeApi.sync(s()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: youtubeKeys.connection(s()) });
      void qc.invalidateQueries({ queryKey: youtubeKeys.channel(s()) });
      void qc.invalidateQueries({ queryKey: youtubeKeys.videos(s()) });
    },
  });

  const initConsent = useMutation({
    mutationFn: (vars: { capability?: Parameters<typeof youtubeApi.initConsent>[1]; integrationId?: string | null }) => youtubeApi.initConsent(s(), vars.capability, vars.integrationId),
  });

  const disconnect = useMutation({
    mutationFn: () => youtubeApi.disconnect(s()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: youtubeKeys.root(s()) });
    },
  });

  const updateVideo = useMutation({
    mutationFn: (vars: { videoId: string; input: YouTubeVideoUpdateInput }) => youtubeApi.updateVideo(s(), vars.videoId, vars.input),
    onSuccess: (data, vars) => {
      qc.setQueryData(youtubeKeys.video(s(), vars.videoId), data);
      invalidateVideo(qc, s(), vars.videoId);
    },
  });

  const deleteVideo = useMutation({
    mutationFn: (videoId: string) => youtubeApi.deleteVideo(s(), videoId),
    onSuccess: (_d, videoId) => {
      qc.removeQueries({ queryKey: youtubeKeys.video(s(), videoId) });
      invalidateVideo(qc, s());
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlists(s()) });
    },
  });

  const createUpload = useMutation({
    mutationFn: (vars: { input: YouTubeUploadInput; idempotencyKey: string }) => youtubeApi.createUpload(s(), vars.input, vars.idempotencyKey),
    onSuccess: (data) => {
      qc.setQueryData(youtubeKeys.upload(s(), data.uploadId), data);
      void qc.invalidateQueries({ queryKey: youtubeKeys.uploads(s()) });
    },
  });

  const setThumbnail = useMutation({
    mutationFn: (vars: { videoId: string; assetId: string }) => youtubeApi.setThumbnail(s(), vars.videoId, vars.assetId),
    onSuccess: (_d, vars) => invalidateVideo(qc, s(), vars.videoId),
  });

  const publish = useMutation({
    mutationFn: (vars: { videoId: string; target: YouTubePublishTarget; idempotencyKey: string }) => youtubeApi.publish(s(), vars.videoId, vars.target, vars.idempotencyKey),
    onSuccess: (_d, vars) => invalidateVideo(qc, s(), vars.videoId),
  });

  const schedule = useMutation({
    mutationFn: (vars: { videoId: string; target: YouTubePublishTarget; scheduledAt: string; idempotencyKey: string }) => youtubeApi.schedule(s(), vars.videoId, vars.target, vars.scheduledAt, vars.idempotencyKey),
    onSuccess: (_d, vars) => invalidateVideo(qc, s(), vars.videoId),
  });

  const reschedule = useMutation({
    mutationFn: (vars: { scheduleId: string; videoId: string; scheduledAt: string }) => youtubeApi.reschedule(s(), vars.scheduleId, vars.scheduledAt),
    onSuccess: (_d, vars) => invalidateVideo(qc, s(), vars.videoId),
  });

  const cancelSchedule = useMutation({
    mutationFn: (vars: { scheduleId: string; videoId: string }) => youtubeApi.cancelSchedule(s(), vars.scheduleId),
    onSuccess: (_d, vars) => invalidateVideo(qc, s(), vars.videoId),
  });

  const createPlaylist = useMutation({
    mutationFn: (input: YouTubePlaylistCreateInput) => youtubeApi.createPlaylist(s(), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: youtubeKeys.playlists(s()) }),
  });

  const updatePlaylist = useMutation({
    mutationFn: (vars: { playlistId: string; input: YouTubePlaylistUpdateInput }) => youtubeApi.updatePlaylist(s(), vars.playlistId, vars.input),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlists(s()) });
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlist(s(), vars.playlistId) });
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: (playlistId: string) => youtubeApi.deletePlaylist(s(), playlistId),
    onSuccess: (_d, playlistId) => {
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlists(s()) });
      qc.removeQueries({ queryKey: youtubeKeys.playlist(s(), playlistId) });
      qc.removeQueries({ queryKey: youtubeKeys.playlistItems(s(), playlistId) });
    },
  });

  const addPlaylistItem = useMutation({
    mutationFn: (vars: { playlistId: string; videoId: string; position?: number }) => youtubeApi.addPlaylistItem(s(), vars.playlistId, vars.videoId, vars.position),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlistItems(s(), vars.playlistId) });
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlist(s(), vars.playlistId) });
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlists(s()) });
    },
  });

  const removePlaylistItem = useMutation({
    mutationFn: (vars: { playlistId: string; playlistItemId: string }) => youtubeApi.removePlaylistItem(s(), vars.playlistId, vars.playlistItemId),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlistItems(s(), vars.playlistId) });
      void qc.invalidateQueries({ queryKey: youtubeKeys.playlists(s()) });
    },
  });

  const movePlaylistItem = useMutation({
    mutationFn: (vars: { playlistId: string; playlistItemId: string; position: number }) => youtubeApi.movePlaylistItem(s(), vars.playlistId, vars.playlistItemId, vars.position),
    onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: youtubeKeys.playlistItems(s(), vars.playlistId) }),
  });

  const commentsChanged = (videoId: string, commentId?: string) => {
    void qc.invalidateQueries({ queryKey: youtubeKeys.commentsOfVideo(s(), videoId) });
    if (commentId) void qc.invalidateQueries({ queryKey: youtubeKeys.replies(s(), commentId) });
  };

  const replyToComment = useMutation({
    mutationFn: (vars: { videoId: string; commentId: string; text: string }) => youtubeApi.replyToComment(s(), vars.commentId, vars.text),
    onSuccess: (_d, vars) => commentsChanged(vars.videoId, vars.commentId),
  });

  const updateComment = useMutation({
    mutationFn: (vars: { videoId: string; commentId: string; text: string }) => youtubeApi.updateComment(s(), vars.commentId, vars.text),
    onSuccess: (_d, vars) => commentsChanged(vars.videoId, vars.commentId),
  });

  const deleteComment = useMutation({
    mutationFn: (vars: { videoId: string; commentId: string }) => youtubeApi.deleteComment(s(), vars.commentId),
    onSuccess: (_d, vars) => commentsChanged(vars.videoId),
  });

  const moderateComment = useMutation({
    mutationFn: (vars: { videoId: string; commentId: string; status: "published" | "heldForReview" }) => youtubeApi.moderateComment(s(), vars.commentId, vars.status),
    onSuccess: (_d, vars) => commentsChanged(vars.videoId),
  });

  const rejectComment = useMutation({
    mutationFn: (vars: { videoId: string; commentId: string }) => youtubeApi.rejectComment(s(), vars.commentId),
    onSuccess: (_d, vars) => commentsChanged(vars.videoId),
  });

  const liveChanged = () => void qc.invalidateQueries({ queryKey: youtubeKeys.liveAll(s()) });

  const createBroadcast = useMutation({
    mutationFn: (input: YouTubeLiveCreateInput) => youtubeApi.createLiveBroadcast(s(), input),
    onSuccess: liveChanged,
  });

  const updateBroadcast = useMutation({
    mutationFn: (vars: { broadcastId: string; input: YouTubeLiveUpdateInput }) => youtubeApi.updateLiveBroadcast(s(), vars.broadcastId, vars.input),
    onSuccess: liveChanged,
  });

  const bindBroadcast = useMutation({
    mutationFn: (vars: { broadcastId: string; streamId: string | null }) => youtubeApi.bindLiveBroadcast(s(), vars.broadcastId, vars.streamId),
    onSuccess: liveChanged,
  });

  const transitionBroadcast = useMutation({
    mutationFn: (vars: { broadcastId: string; status: YouTubeLiveTransitionTarget; confirmGoLive?: boolean }) => youtubeApi.transitionLiveBroadcast(s(), vars.broadcastId, vars.status, vars.confirmGoLive),
    onSuccess: () => {
      liveChanged();
      void qc.invalidateQueries({ queryKey: youtubeKeys.videos(s()) });
    },
  });

  const createStream = useMutation({
    mutationFn: (input: YouTubeLiveStreamCreateInput) => youtubeApi.createLiveStream(s(), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: youtubeKeys.liveStreams(s()) }),
  });

  const sendChat = useMutation({
    mutationFn: (vars: { broadcastId: string; text: string }) => youtubeApi.sendLiveChatMessage(s(), vars.broadcastId, vars.text),
    onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: youtubeKeys.liveChat(s(), vars.broadcastId) }),
  });

  return {
    sync, initConsent, disconnect, updateVideo, deleteVideo, createUpload, setThumbnail, publish, schedule, reschedule, cancelSchedule,
    createPlaylist, updatePlaylist, deletePlaylist, addPlaylistItem, removePlaylistItem, movePlaylistItem,
    replyToComment, updateComment, deleteComment, moderateComment, rejectComment,
    createBroadcast, updateBroadcast, bindBroadcast, transitionBroadcast, createStream, sendChat,
  };
}

export type YouTubeMutations = ReturnType<typeof useYouTubeMutations>;
