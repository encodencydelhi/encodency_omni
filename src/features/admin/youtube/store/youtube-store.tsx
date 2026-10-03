"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import type { CompanySystemRole } from "@/types/domain/auth";
import { useYouTubeActions, type YouTubeActions } from "../data/actions";
import {
  YouTubeScopeContext,
  useAnalyticsTopVideos,
  useChannelQuery,
  useConnectionQuery,
  usePlaylistsInfinite,
  useSchedulesQuery,
  useVideosInfinite,
  useYouTubeMutations,
} from "../data/hooks";
import { emptyChannel, toChannel, toConnectionInfo, toPlaylist, toVideo, withVideoAnalytics } from "../data/mappers";
import type { YouTubeScope } from "../live/youtube-api";
import type { YouTubeConnectionResponse, YouTubeGrantedCapabilities, YouTubePublishResponse } from "../live/youtube-dto";
import { describeYouTubeError, type YouTubeErrorInfo } from "../live/youtube-errors";
import { evaluateCapabilities } from "../lib/capabilities";
import { periodRange } from "../lib/period";
import type { CapabilityMap, Channel, ChannelFeatures, ConnectionInfo, Playlist, Video } from "../types";

/**
 * The single entry point pages use (`useYouTube()`). Server data comes from React Query hooks (no second global state
 * system); this provider only composes it into the view models the pages render and keeps the unsaved-changes guard.
 */

export interface GuardRegistration {
  dirty: boolean;
  label?: string;
  save?: () => Promise<boolean>;
}

/** Eagerly loaded pages of 50 (so filters, counts and sorting work on a useful set); the rest loads on request. */
const AUTO_PAGES = 4;

export interface ListState {
  isLoading: boolean;
  isError: boolean;
  error: YouTubeErrorInfo | null;
  hasMore: boolean;
  isFetchingMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export interface YouTubeStore extends YouTubeActions {
  /** Tenancy resolved and the connection answered (success or error). */
  ready: boolean;
  /** A Company is selected but no Client is. */
  noClient: boolean;
  scope: YouTubeScope | null;
  /** The connection read failed (network / server): the workspace shows a retry state. */
  loadError: YouTubeErrorInfo | null;
  reload: () => void;

  connection: ConnectionInfo;
  rawConnection: YouTubeConnectionResponse | undefined;
  granted: YouTubeGrantedCapabilities | null;
  role: CompanySystemRole | null;
  channel: Channel;
  channelLoaded: boolean;
  features: ChannelFeatures;
  /** Called by the live page when the backend answers `youtube_live_not_enabled`. */
  markLiveNotEnabled: () => void;
  can: CapabilityMap;

  videos: Video[];
  videosState: ListState;
  /** The open (not finished) publish/schedule record of a video, if any. */
  scheduleFor: (videoId: string) => YouTubePublishResponse | null;
  playlists: Playlist[];
  playlistsState: ListState;

  isSyncing: boolean;

  registerGuard: (guard: GuardRegistration | null) => void;
  guardRef: RefObject<GuardRegistration | null>;
}

const YouTubeContext = createContext<YouTubeStore | null>(null);

export function useYouTube(): YouTubeStore {
  const ctx = useContext(YouTubeContext);
  if (!ctx) throw new Error("useYouTube must be used inside <YouTubeProvider>");
  return ctx;
}

export function YouTubeProvider({ children }: { children: ReactNode }) {
  const { companyId, clientId, isReady } = useTenancyContext();
  const scope = useMemo<YouTubeScope | null>(() => (companyId && clientId ? { companyId, clientId } : null), [companyId, clientId]);
  return (
    <YouTubeScopeContext.Provider value={scope}>
      <YouTubeState scope={scope} tenancyReady={isReady} hasCompany={Boolean(companyId)}>
        {children}
      </YouTubeState>
    </YouTubeScopeContext.Provider>
  );
}

function YouTubeState({ scope, tenancyReady, hasCompany, children }: { scope: YouTubeScope | null; tenancyReady: boolean; hasCompany: boolean; children: ReactNode }) {
  const { user } = useAuth();
  const role = useMemo<CompanySystemRole | null>(() => {
    const m = user?.memberships?.find((x) => x.companyId === scope?.companyId);
    return m?.systemRole ?? null;
  }, [user, scope?.companyId]);

  const guardRef = useRef<GuardRegistration | null>(null);
  const registerGuard = useCallback((guard: GuardRegistration | null) => {
    guardRef.current = guard;
  }, []);

  // The "Live isn't enabled" verdict belongs to one Client: it is stored with the scope it was learned for.
  const scopeKey = scope ? `${scope.companyId}:${scope.clientId}` : "";
  const [liveBlockedFor, setLiveBlockedFor] = useState<string | null>(null);
  const liveBlocked = liveBlockedFor !== null && liveBlockedFor === scopeKey;
  const markLiveNotEnabled = useCallback(() => setLiveBlockedFor(scopeKey), [scopeKey]);

  const connectionQuery = useConnectionQuery();
  const raw = connectionQuery.data;
  const mutations = useYouTubeMutations();
  const actions = useYouTubeActions({ scope, mutations, connection: raw });

  const mapped = raw?.status === "ACTIVE" || raw?.status === "ERROR" || raw?.status === "RECONNECT_REQUIRED";
  const connection = useMemo(() => toConnectionInfo(raw, mutations.sync.isPending), [raw, mutations.sync.isPending]);
  const features = useMemo<ChannelFeatures>(() => ({ liveStreamingEnabled: !liveBlocked }), [liveBlocked]);
  const granted = raw?.grantedCapabilities ?? null;
  const can = useMemo(() => evaluateCapabilities({ connection, granted, role, features }), [connection, granted, role, features]);

  const channelQuery = useChannelQuery(mapped);
  const channel = useMemo(() => (channelQuery.data ? toChannel(channelQuery.data.channel, raw?.googleAccountName ?? null) : emptyChannel(raw)), [channelQuery.data, raw]);

  /* ---- videos: first pages load eagerly, the rest on request; stats are enriched with the analytics top-videos report ---- */
  const videosQuery = useVideosInfinite(mapped);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = videosQuery;
  const loadedVideoPages = videosQuery.data?.pages.length ?? 0;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && loadedVideoPages > 0 && loadedVideoPages < AUTO_PAGES) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, loadedVideoPages, fetchNextPage]);

  const schedulesQuery = useSchedulesQuery(mapped);
  const range = useMemo(() => periodRange(28), []);
  const topVideos = useAnalyticsTopVideos(range, "views", mapped && can.canViewAnalytics.allowed);

  const scheduleByVideo = useMemo(() => {
    const byVideo = new Map<string, YouTubePublishResponse>();
    for (const s of schedulesQuery.data?.items ?? []) {
      const open = s.status === "SCHEDULED" || s.status === "QUEUED" || s.status === "WAITING_PROCESSING" || s.status === "PUBLISHING" || s.status === "FAILED";
      const current = byVideo.get(s.videoId);
      if (open && (!current || s.createdAt > current.createdAt)) byVideo.set(s.videoId, s);
    }
    return byVideo;
  }, [schedulesQuery.data]);
  const scheduleFor = useCallback((videoId: string) => scheduleByVideo.get(videoId) ?? null, [scheduleByVideo]);

  const videos = useMemo<Video[]>(() => {
    const dtos = videosQuery.data?.pages.flatMap((p) => p.items) ?? [];
    const byVideo = scheduleByVideo;
    const metrics = new Map((topVideos.data?.items ?? []).map((t) => [t.videoId, t.metrics]));
    const seen = new Set<string>();
    return dtos
      .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
      .map((d) => withVideoAnalytics(toVideo(d, byVideo.get(d.id) ?? null), metrics.get(d.id)));
  }, [videosQuery.data, scheduleByVideo, topVideos.data]);

  const videosState = useMemo<ListState>(
    () => ({
      isLoading: mapped && videosQuery.isPending,
      isError: videosQuery.isError,
      error: videosQuery.error ? describeYouTubeError(videosQuery.error) : null,
      hasMore: Boolean(hasNextPage),
      isFetchingMore: isFetchingNextPage,
      loadMore: () => void fetchNextPage(),
      refetch: () => void videosQuery.refetch(),
    }),
    [mapped, videosQuery, hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  /* ---- playlists (owned only: YouTube-managed lists are filtered out by the backend) ---- */
  const playlistsQuery = usePlaylistsInfinite(mapped);
  const { hasNextPage: plHasNext, isFetchingNextPage: plFetching, fetchNextPage: plFetchNext } = playlistsQuery;
  const loadedPlaylistPages = playlistsQuery.data?.pages.length ?? 0;
  useEffect(() => {
    if (plHasNext && !plFetching && loadedPlaylistPages > 0 && loadedPlaylistPages < AUTO_PAGES) void plFetchNext();
  }, [plHasNext, plFetching, loadedPlaylistPages, plFetchNext]);

  const playlists = useMemo<Playlist[]>(() => (playlistsQuery.data?.pages.flatMap((p) => p.items.map(toPlaylist)) ?? []), [playlistsQuery.data]);
  const playlistsState = useMemo<ListState>(
    () => ({
      isLoading: mapped && playlistsQuery.isPending,
      isError: playlistsQuery.isError,
      error: playlistsQuery.error ? describeYouTubeError(playlistsQuery.error) : null,
      hasMore: Boolean(plHasNext),
      isFetchingMore: plFetching,
      loadMore: () => void plFetchNext(),
      refetch: () => void playlistsQuery.refetch(),
    }),
    [mapped, playlistsQuery, plHasNext, plFetching, plFetchNext],
  );

  const ready = tenancyReady && (scope === null || connectionQuery.isSuccess || connectionQuery.isError);
  const loadError = connectionQuery.isError ? describeYouTubeError(connectionQuery.error) : null;

  const value = useMemo<YouTubeStore>(
    () => ({
      ...actions,
      ready,
      noClient: tenancyReady && hasCompany && scope === null,
      scope,
      loadError,
      reload: () => void connectionQuery.refetch(),
      connection,
      rawConnection: raw,
      granted,
      role,
      channel,
      channelLoaded: Boolean(channelQuery.data),
      features,
      markLiveNotEnabled,
      can,
      videos,
      videosState,
      scheduleFor,
      playlists,
      playlistsState,
      isSyncing: mutations.sync.isPending,
      registerGuard,
      guardRef,
    }),
    [actions, ready, tenancyReady, hasCompany, scope, loadError, connectionQuery, connection, raw, granted, role, channel, channelQuery.data, features, markLiveNotEnabled, can, videos, videosState, scheduleFor, playlists, playlistsState, mutations.sync.isPending, registerGuard],
  );

  return <YouTubeContext.Provider value={value}>{children}</YouTubeContext.Provider>;
}
