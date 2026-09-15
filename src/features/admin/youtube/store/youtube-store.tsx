"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { addMinutes } from "date-fns";
import { toast } from "sonner";
import {
  mockApprovals,
  mockAudit,
  mockChannel,
  mockComments,
  mockConnection,
  mockFeatures,
  mockAudience,
  mockLiveEvents,
  mockNotifications,
  mockPlaylists,
  mockScopes,
  mockSettings,
  mockTeam,
  mockVersions,
  mockVideos,
} from "../data/mock";
import { evaluateCapabilities } from "../lib/capabilities";
import { ytRoutes } from "../lib/constants";
import type {
  ApprovalEvent,
  AudienceData,
  AuditEvent,
  CapabilityMap,
  Channel,
  ChannelFeatures,
  CommentThread,
  ConnectionInfo,
  ConnectionState,
  LiveEvent,
  ModerationStatus,
  Playlist,
  TeamMember,
  Video,
  VersionEntry,
  VersionField,
  Visibility,
  WorkspaceNotification,
  WorkspaceRole,
  WorkspaceSettings,
  YouTubePermission,
  YouTubeScope,
} from "../types";

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type NewVideoInput = Omit<Video, "id" | "stats" | "updatedAt" | "approval" | "publishedAt"> & {
  approval?: Video["approval"];
};

export type NewLiveInput = Omit<
  LiveEvent,
  "id" | "lifecycle" | "health" | "actualStart" | "actualEnd" | "concurrentViewers" | "peakViewers" | "totalViews" | "chatMessages" | "replayVideoId" | "ingestUrl" | "streamKey"
>;

interface PerformOptions {
  pending: string;
  success: string;
  /** Read-only operations (sync) still run on an expired token for cached data. */
  requiresWrite?: boolean;
  /** Longer operations (publish, delete, go live) take more time. */
  slow?: boolean;
  retry?: () => void;
}

interface Simulation {
  failNextAction: boolean;
  loading: boolean;
  belowPrivacyThreshold: boolean;
  loadError: boolean;
}

interface YouTubeStore {
  ready: boolean;
  channel: Channel;
  connection: ConnectionInfo;
  scopes: YouTubeScope[];
  features: ChannelFeatures;
  videos: Video[];
  playlists: Playlist[];
  comments: CommentThread[];
  liveEvents: LiveEvent[];
  settings: WorkspaceSettings;
  team: TeamMember[];
  approvals: ApprovalEvent[];
  versions: VersionEntry[];
  audit: AuditEvent[];
  notifications: WorkspaceNotification[];
  thumbnailHistory: Record<string, string[]>;
  role: WorkspaceRole;
  currentUser: TeamMember;
  permissions: YouTubePermission[];
  can: CapabilityMap;
  simulation: Simulation;
  audience: AudienceData;

  /* Content */
  createVideo: (input: NewVideoInput) => Promise<Video | null>;
  updateVideo: (id: string, patch: Partial<Video>, summary?: string) => Promise<boolean>;
  deleteVideos: (ids: string[]) => Promise<boolean>;
  setVisibility: (ids: string[], visibility: Visibility) => Promise<boolean>;
  scheduleVideo: (id: string, at: string) => Promise<boolean>;
  publishNow: (id: string) => Promise<boolean>;
  changeThumbnail: (id: string, url: string) => Promise<boolean>;
  restoreVersion: (versionId: string) => Promise<boolean>;
  submitForApproval: (id: string, note?: string) => Promise<boolean>;
  reviewApproval: (id: string, action: "approved" | "changes_requested" | "rejected", note?: string) => Promise<boolean>;

  /* Playlists */
  createPlaylist: (input: Pick<Playlist, "title" | "description" | "visibility">, videoIds?: string[]) => Promise<Playlist | null>;
  updatePlaylist: (id: string, patch: Partial<Pick<Playlist, "title" | "description" | "visibility" | "videoIds">>, summary?: string) => Promise<boolean>;
  deletePlaylist: (id: string) => Promise<boolean>;
  addToPlaylists: (videoIds: string[], playlistIds: string[]) => Promise<boolean>;

  /* Comments */
  replyToComment: (threadId: string, text: string) => Promise<boolean>;
  toggleCommentLike: (threadId: string) => void;
  moderateComments: (ids: string[], status: ModerationStatus) => Promise<boolean>;
  deleteComments: (ids: string[]) => Promise<boolean>;

  /* Live */
  createLiveEvent: (input: NewLiveInput) => Promise<LiveEvent | null>;
  updateLiveEvent: (id: string, patch: Partial<LiveEvent>) => Promise<boolean>;
  startLiveEvent: (id: string) => Promise<boolean>;
  endLiveEvent: (id: string) => Promise<boolean>;
  deleteLiveEvent: (id: string) => Promise<boolean>;
  resetStreamKey: (id: string) => Promise<boolean>;

  /* Connection & settings */
  syncNow: () => Promise<boolean>;
  reconnect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  updateSettings: (patch: Partial<WorkspaceSettings>, summary?: string) => Promise<boolean>;
  updateConnection: (patch: Partial<ConnectionInfo>) => void;

  /* Notifications */
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  /* Mock-mode preview controls */
  simulate: {
    setConnectionState: (state: ConnectionState) => void;
    toggleScope: (scope: YouTubeScope, granted: boolean) => void;
    setFeatures: (features: Partial<ChannelFeatures>) => void;
    setRole: (role: WorkspaceRole) => void;
    setFailNextAction: (fail: boolean) => void;
    setLoading: (loading: boolean) => void;
    setBelowPrivacyThreshold: (below: boolean) => void;
    setLoadError: (failed: boolean) => void;
  };

  /* Unsaved changes */
  registerGuard: (guard: GuardRegistration | null) => void;
  guardRef: React.RefObject<GuardRegistration | null>;
}

export interface GuardRegistration {
  dirty: boolean;
  save?: () => Promise<boolean>;
  label?: string;
}

const StoreContext = createContext<YouTubeStore | null>(null);

const VERSIONED = ["title", "description", "tags", "visibility"] as const satisfies readonly VersionField[];

function stringify(field: VersionField, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ") || "No tags";
  if (field === "description") return String(value ?? "").slice(0, 280) || "Empty";
  return String(value ?? "");
}

export function YouTubeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [channel] = useState(mockChannel);
  const [connection, setConnection] = useState(mockConnection);
  const [scopes, setScopesState] = useState(mockScopes);
  const [features, setFeaturesState] = useState(mockFeatures);
  const [videos, setVideos] = useState(mockVideos);
  const [playlists, setPlaylists] = useState(mockPlaylists);
  const [comments, setComments] = useState(mockComments);
  const [liveEvents, setLiveEvents] = useState(mockLiveEvents);
  const [settings, setSettings] = useState(mockSettings);
  const [team] = useState(mockTeam);
  const [approvals, setApprovals] = useState(mockApprovals);
  const [versions, setVersions] = useState(mockVersions);
  const [audit, setAudit] = useState(mockAudit);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [thumbnailHistory, setThumbnailHistory] = useState<Record<string, string[]>>({});
  const [role, setRole] = useState<WorkspaceRole>("owner");
  const [simulation, setSimulation] = useState<Simulation>({ failNextAction: false, loading: false, belowPrivacyThreshold: false, loadError: false });
  const guardRef = useRef<GuardRegistration | null>(null);

  // First paint shows skeletons: in production this is the initial query.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 650);
    return () => clearTimeout(t);
  }, []);

  const currentUser = useMemo(
    () => team.find((m) => m.role === role) ?? (team[0] as TeamMember),
    [team, role],
  );
  const permissions = settings.rolePermissions[role];

  const can = useMemo(
    () => evaluateCapabilities({ connection: connection.state, scopes, permissions, features }),
    [connection.state, scopes, permissions, features],
  );

  // Keep the latest values reachable from stable callbacks.
  const router = useRouter();
  const live = useRef({ connection, simulation, currentUser, videos, playlists, liveEvents, comments });
  useLayoutEffect(() => {
    live.current = { connection, simulation, currentUser, videos, playlists, liveEvents, comments };
  });

  const log = useCallback((event: Omit<AuditEvent, "id" | "at" | "actor" | "source"> & { source?: AuditEvent["source"] }) => {
    setAudit((prev) => [
      { id: uid("au"), at: nowIso(), actor: live.current.currentUser.name, source: "OmniPlatform", ...event },
      ...prev,
    ]);
  }, []);

  const notify = useCallback((n: Omit<WorkspaceNotification, "id" | "at" | "read">) => {
    setNotifications((prev) => [{ id: uid("n"), at: nowIso(), read: false, ...n }, ...prev]);
  }, []);

  /**
   * Runs a mutation with Saving → Saved / Failed feedback. Critical actions
   * only update state after the (simulated) API confirms.
   */
  const perform = useCallback(async (opts: PerformOptions, apply: () => void): Promise<boolean> => {
    const { connection: conn, simulation: sim } = live.current;
    const requiresWrite = opts.requiresWrite ?? true;

    if (requiresWrite && conn.state === "token_expired") {
      toast.error("YouTube connection expired", {
        description: "Reconnect the channel to continue. Your changes haven't been sent.",
        action: { label: "Reconnect", onClick: () => router.push(`${ytRoutes.settings}#connection`) },
      });
      return false;
    }
    if (requiresWrite && conn.state === "quota_exceeded") {
      toast.error("YouTube API quota reached", {
        description: "Try again after the daily quota resets (midnight Pacific Time).",
      });
      return false;
    }
    if (conn.state === "disconnected") {
      toast.error("No YouTube channel connected", {
        action: { label: "Connect", onClick: () => router.push(`${ytRoutes.settings}#connection`) },
      });
      return false;
    }

    const id = toast.loading(opts.pending);
    await wait(opts.slow ? 1100 : 600);

    if (sim.failNextAction) {
      setSimulation((s) => ({ ...s, failNextAction: false }));
      toast.error("Couldn't complete the action", {
        id,
        description: "YouTube didn't respond in time. Nothing was changed.",
        action: opts.retry ? { label: "Try again", onClick: opts.retry } : undefined,
      });
      return false;
    }

    apply();
    toast.success(opts.success, { id });
    return true;
  }, [router]);

  /* ---------------------------------------------------------------- */
  /* Content                                                           */
  /* ---------------------------------------------------------------- */

  const createVideo = useCallback<YouTubeStore["createVideo"]>(
    async (input) => {
      const video: Video = {
        ...input,
        id: uid("v"),
        approval: input.approval ?? "none",
        publishedAt: input.status === "published" ? nowIso() : null,
        updatedAt: nowIso(),
        stats: { views: 0, watchTimeHours: 0, likes: 0, comments: 0, ctr: null, impressions: null, avgViewDurationSec: null, subscribersGained: null },
      };
      const verb =
        input.status === "published" ? "Published" : input.status === "scheduled" ? "Scheduled" : input.approval === "pending" ? "Submitted for approval" : "Saved draft";
      const ok = await perform(
        { pending: input.status === "published" ? "Publishing to YouTube…" : "Saving…", success: `${verb}: “${input.title}”`, slow: input.status !== "draft" },
        () => {
          setVideos((prev) => [video, ...prev]);
          if (input.playlistIds.length) {
            setPlaylists((prev) =>
              prev.map((p) => (input.playlistIds.includes(p.id) ? { ...p, videoIds: [...p.videoIds, video.id], updatedAt: nowIso() } : p)),
            );
          }
          if (input.approval === "pending") {
            setApprovals((prev) => [...prev, { id: uid("ap"), videoId: video.id, action: "submitted", actor: live.current.currentUser.name, at: nowIso() }]);
          }
          log({ action: input.status === "published" ? "publish" : input.status === "scheduled" ? "schedule" : "upload", summary: verb, entity: { type: "video", id: video.id, label: video.title } });
          notify({
            kind: input.status === "published" ? "video_published" : "upload_completed",
            title: input.status === "published" ? "Video published" : "Upload completed",
            body: video.title,
            href: ytRoutes.video(video.id),
          });
        },
      );
      return ok ? video : null;
    },
    [perform, log, notify],
  );

  const recordVersions = useCallback((before: Video, patch: Partial<Video>) => {
    const entries: VersionEntry[] = [];
    for (const field of VERSIONED) {
      if (!(field in patch)) continue;
      const prev = stringify(field, before[field]);
      const next = stringify(field, patch[field]);
      if (prev !== next) {
        entries.push({ id: uid("ver"), videoId: before.id, field, previous: prev, next, actor: live.current.currentUser.name, at: nowIso() });
      }
    }
    if (entries.length) setVersions((v) => [...entries, ...v]);
    return entries;
  }, []);

  const updateVideo = useCallback<YouTubeStore["updateVideo"]>(
    async (id, patch, summary = "Video updated successfully") => {
      const before = live.current.videos.find((v) => v.id === id);
      if (!before) return false;
      return perform({ pending: "Saving to YouTube…", success: summary }, () => {
        const entries = recordVersions(before, patch);
        setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: nowIso() } : v)));
        if (patch.playlistIds) {
          setPlaylists((prev) =>
            prev.map((p) => {
              const shouldContain = patch.playlistIds!.includes(p.id);
              const contains = p.videoIds.includes(id);
              if (shouldContain && !contains) return { ...p, videoIds: [...p.videoIds, id], updatedAt: nowIso() };
              if (!shouldContain && contains) return { ...p, videoIds: p.videoIds.filter((x) => x !== id), updatedAt: nowIso() };
              return p;
            }),
          );
        }
        const first = entries[0];
        log({
          action: "edit",
          summary: entries.length ? `Updated ${entries.map((e) => e.field).join(", ")}` : "Updated details",
          entity: { type: "video", id, label: patch.title ?? before.title },
          previous: first?.previous,
          next: first?.next,
        });
      });
    },
    [perform, recordVersions, log],
  );

  const deleteVideos = useCallback<YouTubeStore["deleteVideos"]>(
    async (ids) => {
      const targets = live.current.videos.filter((v) => ids.includes(v.id));
      const label = targets.length === 1 ? `“${targets[0]!.title}”` : `${targets.length} videos`;
      return perform({ pending: `Deleting ${label}…`, success: `Deleted ${label}`, slow: true }, () => {
        setVideos((prev) => prev.filter((v) => !ids.includes(v.id)));
        setPlaylists((prev) => prev.map((p) => ({ ...p, videoIds: p.videoIds.filter((x) => !ids.includes(x)) })));
        setComments((prev) => prev.filter((c) => !ids.includes(c.videoId)));
        targets.forEach((t) => log({ action: "delete", summary: "Deleted video", entity: { type: "video", id: t.id, label: t.title } }));
      });
    },
    [perform, log],
  );

  const setVisibility = useCallback<YouTubeStore["setVisibility"]>(
    async (ids, visibility) => {
      const targets = live.current.videos.filter((v) => ids.includes(v.id));
      return perform(
        { pending: "Updating visibility…", success: `${targets.length === 1 ? "Visibility" : `${targets.length} videos`} set to ${visibility}` },
        () => {
          targets.forEach((t) => {
            recordVersions(t, { visibility });
            log({ action: "edit", summary: "Changed visibility", entity: { type: "video", id: t.id, label: t.title }, previous: t.visibility, next: visibility });
          });
          setVideos((prev) => prev.map((v) => (ids.includes(v.id) ? { ...v, visibility, updatedAt: nowIso() } : v)));
        },
      );
    },
    [perform, recordVersions, log],
  );

  const scheduleVideo = useCallback<YouTubeStore["scheduleVideo"]>(
    async (id, at) => {
      const before = live.current.videos.find((v) => v.id === id);
      if (!before) return false;
      return perform({ pending: "Scheduling…", success: before.scheduledAt ? "Video rescheduled" : "Video scheduled" }, () => {
        setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, status: "scheduled", visibility: "private", scheduledAt: at, updatedAt: nowIso() } : v)));
        setVersions((prev) => [
          { id: uid("ver"), videoId: id, field: "schedule", previous: before.scheduledAt ?? "Not scheduled", next: at, actor: live.current.currentUser.name, at: nowIso() },
          ...prev,
        ]);
        log({ action: "schedule", summary: before.scheduledAt ? "Rescheduled" : "Scheduled", entity: { type: "video", id, label: before.title }, previous: before.scheduledAt ?? undefined, next: at });
      });
    },
    [perform, log],
  );

  const publishNow = useCallback<YouTubeStore["publishNow"]>(
    async (id) => {
      const before = live.current.videos.find((v) => v.id === id);
      if (!before) return false;
      return perform({ pending: "Publishing to YouTube…", success: `Published “${before.title}”`, slow: true }, () => {
        setVideos((prev) =>
          prev.map((v) => (v.id === id ? { ...v, status: "published", visibility: "public", publishedAt: nowIso(), scheduledAt: null, updatedAt: nowIso() } : v)),
        );
        log({ action: "publish", summary: "Published", entity: { type: "video", id, label: before.title } });
        notify({ kind: "video_published", title: "Video published", body: before.title, href: ytRoutes.video(id) });
      });
    },
    [perform, log, notify],
  );

  const changeThumbnail = useCallback<YouTubeStore["changeThumbnail"]>(
    async (id, url) => {
      const before = live.current.videos.find((v) => v.id === id);
      if (!before) return false;
      return perform({ pending: "Uploading thumbnail…", success: "Thumbnail changed" }, () => {
        setThumbnailHistory((prev) => ({ ...prev, [id]: [before.thumbnailUrl, ...(prev[id] ?? []).filter((u) => u !== before.thumbnailUrl)].slice(0, 6) }));
        setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, thumbnailUrl: url, updatedAt: nowIso() } : v)));
        setVersions((prev) => [
          { id: uid("ver"), videoId: id, field: "thumbnail", previous: before.thumbnailUrl, next: url, actor: live.current.currentUser.name, at: nowIso() },
          ...prev,
        ]);
        log({ action: "thumbnail", summary: "Changed thumbnail", entity: { type: "video", id, label: before.title } });
      });
    },
    [perform, log],
  );

  const restoreVersion = useCallback<YouTubeStore["restoreVersion"]>(
    async (versionId) => {
      const entry = versions.find((v) => v.id === versionId);
      if (!entry) return false;
      if (entry.field === "thumbnail") return changeThumbnail(entry.videoId, entry.previous);
      if (entry.field === "schedule") {
        toast.info("Schedules can't be restored automatically", { description: "Pick a new time with Reschedule." });
        return false;
      }
      const value: Partial<Video> =
        entry.field === "tags"
          ? { tags: entry.previous === "No tags" ? [] : entry.previous.split(",").map((t) => t.trim()) }
          : entry.field === "visibility"
            ? { visibility: entry.previous as Visibility }
            : { [entry.field]: entry.previous };
      return updateVideo(entry.videoId, value, `Restored previous ${entry.field}`);
    },
    [versions, changeThumbnail, updateVideo],
  );

  const submitForApproval = useCallback<YouTubeStore["submitForApproval"]>(
    async (id, note) => {
      const v = live.current.videos.find((x) => x.id === id);
      if (!v) return false;
      return perform({ pending: "Submitting…", success: "Submitted for approval", requiresWrite: false }, () => {
        setVideos((prev) => prev.map((x) => (x.id === id ? { ...x, approval: "pending" } : x)));
        setApprovals((prev) => [...prev, { id: uid("ap"), videoId: id, action: "submitted", actor: live.current.currentUser.name, note, at: nowIso() }]);
        log({ action: "approval", summary: "Submitted for approval", entity: { type: "video", id, label: v.title } });
        notify({ kind: "approval_requested", title: "Approval requested", body: v.title, href: `${ytRoutes.video(id)}?tab=details` });
      });
    },
    [perform, log, notify],
  );

  const reviewApproval = useCallback<YouTubeStore["reviewApproval"]>(
    async (id, action, note) => {
      const v = live.current.videos.find((x) => x.id === id);
      if (!v) return false;
      const label = { approved: "Approved", changes_requested: "Changes requested", rejected: "Rejected" }[action];
      return perform({ pending: "Saving review…", success: label, requiresWrite: false }, () => {
        setVideos((prev) => prev.map((x) => (x.id === id ? { ...x, approval: action } : x)));
        setApprovals((prev) => [...prev, { id: uid("ap"), videoId: id, action, actor: live.current.currentUser.name, note, at: nowIso() }]);
        log({ action: "approval", summary: label, entity: { type: "video", id, label: v.title }, next: note });
      });
    },
    [perform, log],
  );

  /* ---------------------------------------------------------------- */
  /* Playlists                                                         */
  /* ---------------------------------------------------------------- */

  const createPlaylist = useCallback<YouTubeStore["createPlaylist"]>(
    async (input, videoIds = []) => {
      const playlist: Playlist = { ...input, id: uid("PL"), videoIds, createdAt: nowIso(), updatedAt: nowIso() };
      const ok = await perform({ pending: "Creating playlist…", success: `Playlist “${input.title}” created` }, () => {
        setPlaylists((prev) => [playlist, ...prev]);
        if (videoIds.length) {
          setVideos((prev) => prev.map((v) => (videoIds.includes(v.id) ? { ...v, playlistIds: [...v.playlistIds, playlist.id] } : v)));
        }
        log({ action: "playlist", summary: "Created playlist", entity: { type: "playlist", id: playlist.id, label: playlist.title } });
      });
      return ok ? playlist : null;
    },
    [perform, log],
  );

  const updatePlaylist = useCallback<YouTubeStore["updatePlaylist"]>(
    async (id, patch, summary = "Playlist updated") => {
      const before = live.current.playlists.find((p) => p.id === id);
      if (!before) return false;
      return perform({ pending: "Saving playlist…", success: summary }, () => {
        setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)));
        if (patch.videoIds) {
          const next = patch.videoIds;
          setVideos((prev) =>
            prev.map((v) => {
              const inNext = next.includes(v.id);
              const has = v.playlistIds.includes(id);
              if (inNext && !has) return { ...v, playlistIds: [...v.playlistIds, id] };
              if (!inNext && has) return { ...v, playlistIds: v.playlistIds.filter((p) => p !== id) };
              return v;
            }),
          );
        }
        log({ action: "playlist", summary, entity: { type: "playlist", id, label: patch.title ?? before.title } });
      });
    },
    [perform, log],
  );

  const deletePlaylist = useCallback<YouTubeStore["deletePlaylist"]>(
    async (id) => {
      const before = live.current.playlists.find((p) => p.id === id);
      if (!before) return false;
      return perform({ pending: "Deleting playlist…", success: `Deleted “${before.title}”`, slow: true }, () => {
        setPlaylists((prev) => prev.filter((p) => p.id !== id));
        setVideos((prev) => prev.map((v) => ({ ...v, playlistIds: v.playlistIds.filter((p) => p !== id) })));
        log({ action: "playlist", summary: "Deleted playlist", entity: { type: "playlist", id, label: before.title } });
      });
    },
    [perform, log],
  );

  const addToPlaylists = useCallback<YouTubeStore["addToPlaylists"]>(
    async (videoIds, playlistIds) => {
      const names = live.current.playlists.filter((p) => playlistIds.includes(p.id)).map((p) => p.title);
      return perform(
        { pending: "Adding to playlist…", success: `Added ${videoIds.length === 1 ? "video" : `${videoIds.length} videos`} to ${names.length === 1 ? `“${names[0]}”` : `${names.length} playlists`}` },
        () => {
          setPlaylists((prev) =>
            prev.map((p) =>
              playlistIds.includes(p.id) ? { ...p, videoIds: [...p.videoIds, ...videoIds.filter((v) => !p.videoIds.includes(v))], updatedAt: nowIso() } : p,
            ),
          );
          setVideos((prev) =>
            prev.map((v) =>
              videoIds.includes(v.id) ? { ...v, playlistIds: [...v.playlistIds, ...playlistIds.filter((p) => !v.playlistIds.includes(p))] } : v,
            ),
          );
          names.forEach((n, i) => log({ action: "playlist", summary: `Added ${videoIds.length} video(s)`, entity: { type: "playlist", id: playlistIds[i], label: n } }));
        },
      );
    },
    [perform, log],
  );

  /* ---------------------------------------------------------------- */
  /* Comments                                                          */
  /* ---------------------------------------------------------------- */

  const replyToComment = useCallback<YouTubeStore["replyToComment"]>(
    async (threadId, text) => {
      const thread = live.current.comments.find((c) => c.id === threadId);
      return perform({ pending: "Posting reply…", success: "Reply posted" }, () => {
        setComments((prev) =>
          prev.map((c) =>
            c.id === threadId
              ? { ...c, replies: [...c.replies, { id: uid("r"), author: "Namo Gange Trust", isChannelOwner: true, text, likeCount: 0, publishedAt: nowIso() }] }
              : c,
          ),
        );
        log({ action: "comment_reply", summary: "Replied to comment", entity: { type: "comment", id: threadId, label: thread?.author ?? "Comment" }, next: text });
      });
    },
    [perform, log],
  );

  const toggleCommentLike = useCallback((threadId: string) => {
    // Safe to apply optimistically: it's reversible and low-stakes.
    setComments((prev) =>
      prev.map((c) => (c.id === threadId ? { ...c, likedByChannel: !c.likedByChannel, likeCount: c.likeCount + (c.likedByChannel ? -1 : 1) } : c)),
    );
  }, []);

  const moderateComments = useCallback<YouTubeStore["moderateComments"]>(
    async (ids, status) => {
      const verb = { published: "Approved", heldForReview: "Held for review", likelySpam: "Marked as spam", rejected: "Removed" }[status];
      return perform({ pending: "Updating comments…", success: `${verb}${ids.length > 1 ? ` · ${ids.length} comments` : ""}` }, () => {
        setComments((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, moderationStatus: status } : c)));
        log({ action: "moderation", summary: verb, entity: { type: "comment", label: `${ids.length} comment${ids.length > 1 ? "s" : ""}` }, next: status });
      });
    },
    [perform, log],
  );

  const deleteComments = useCallback<YouTubeStore["deleteComments"]>(
    async (ids) =>
      perform({ pending: "Removing…", success: ids.length > 1 ? `${ids.length} comments removed` : "Comment removed", slow: true }, () => {
        setComments((prev) => prev.filter((c) => !ids.includes(c.id)));
        log({ action: "moderation", summary: "Deleted comment", entity: { type: "comment", label: `${ids.length} comment${ids.length > 1 ? "s" : ""}` } });
      }),
    [perform, log],
  );

  /* ---------------------------------------------------------------- */
  /* Live                                                              */
  /* ---------------------------------------------------------------- */

  const makeKey = () =>
    Array.from({ length: 5 }, () => Math.random().toString(36).slice(2, 6)).join("-");

  const createLiveEvent = useCallback<YouTubeStore["createLiveEvent"]>(
    async (input) => {
      const event: LiveEvent = {
        ...input,
        id: uid("live"),
        lifecycle: "upcoming",
        health: "waiting",
        actualStart: null,
        actualEnd: null,
        concurrentViewers: null,
        peakViewers: null,
        totalViews: null,
        chatMessages: null,
        replayVideoId: null,
        ingestUrl: "rtmp://a.rtmp.youtube.com/live2",
        streamKey: makeKey(),
      };
      const ok = await perform({ pending: "Creating live event…", success: `Live event “${input.title}” scheduled`, slow: true }, () => {
        setLiveEvents((prev) => [event, ...prev]);
        log({ action: "live", summary: "Created live event", entity: { type: "live", id: event.id, label: event.title } });
      });
      return ok ? event : null;
    },
    [perform, log],
  );

  const updateLiveEvent = useCallback<YouTubeStore["updateLiveEvent"]>(
    async (id, patch) => {
      const before = live.current.liveEvents.find((e) => e.id === id);
      return perform({ pending: "Saving…", success: "Live event updated" }, () => {
        setLiveEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
        log({ action: "live", summary: "Edited live event", entity: { type: "live", id, label: patch.title ?? before?.title ?? "Live event" } });
      });
    },
    [perform, log],
  );

  const startLiveEvent = useCallback<YouTubeStore["startLiveEvent"]>(
    async (id) => {
      const before = live.current.liveEvents.find((e) => e.id === id);
      if (!before) return false;
      return perform({ pending: "Starting broadcast…", success: "You're live on YouTube", slow: true }, () => {
        setLiveEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, lifecycle: "live", health: "live", actualStart: nowIso(), concurrentViewers: 0, peakViewers: 0, totalViews: 0, chatMessages: 0 } : e)),
        );
        log({ action: "live", summary: "Started broadcast", entity: { type: "live", id, label: before.title } });
        notify({ kind: "live_starting", title: "Live stream is on air", body: before.title, href: `${ytRoutes.live}?tab=live` });
      });
    },
    [perform, log, notify],
  );

  const endLiveEvent = useCallback<YouTubeStore["endLiveEvent"]>(
    async (id) => {
      const before = live.current.liveEvents.find((e) => e.id === id);
      if (!before) return false;
      return perform({ pending: "Ending broadcast…", success: "Broadcast ended. The replay is processing.", slow: true }, () => {
        setLiveEvents((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, lifecycle: "completed", health: "ended", actualEnd: nowIso(), concurrentViewers: null, peakViewers: e.peakViewers ?? e.concurrentViewers } : e,
          ),
        );
        log({ action: "live", summary: "Ended broadcast", entity: { type: "live", id, label: before.title } });
      });
    },
    [perform, log],
  );

  const deleteLiveEvent = useCallback<YouTubeStore["deleteLiveEvent"]>(
    async (id) => {
      const before = live.current.liveEvents.find((e) => e.id === id);
      return perform({ pending: "Deleting live event…", success: "Live event deleted", slow: true }, () => {
        setLiveEvents((prev) => prev.filter((e) => e.id !== id));
        log({ action: "live", summary: "Deleted live event", entity: { type: "live", id, label: before?.title ?? "Live event" } });
      });
    },
    [perform, log],
  );

  const resetStreamKey = useCallback<YouTubeStore["resetStreamKey"]>(
    async (id) =>
      perform({ pending: "Generating a new stream key…", success: "Stream key reset. Update your encoder." }, () => {
        setLiveEvents((prev) => prev.map((e) => (e.id === id ? { ...e, streamKey: makeKey() } : e)));
        log({ action: "live", summary: "Reset stream key", entity: { type: "live", id, label: "Stream key" } });
      }),
    [perform, log],
  );

  /* ---------------------------------------------------------------- */
  /* Connection & settings                                             */
  /* ---------------------------------------------------------------- */

  const syncNow = useCallback<YouTubeStore["syncNow"]>(async () => {
    const previous = live.current.connection.state;
    setConnection((c) => ({ ...c, state: "syncing" }));
    const ok = await perform({ pending: "Syncing with YouTube…", success: "Sync completed", requiresWrite: false, slow: true }, () => {
      setConnection((c) => ({ ...c, state: "connected", lastSyncedAt: nowIso(), nextSyncAt: addMinutes(new Date(), 60).toISOString(), quotaUsed: c.quotaUsed + 42 }));
      log({ action: "sync", summary: "Manual sync completed", entity: { type: "channel", label: "Namo Gange Trust" }, source: "YouTube sync" });
    });
    if (!ok) {
      setConnection((c) => ({ ...c, state: previous === "syncing" ? "sync_failed" : previous === "connected" ? "sync_failed" : previous }));
      if (previous === "connected") notify({ kind: "sync_failed", title: "Sync failed", body: "The last manual sync didn't complete.", href: `${ytRoutes.settings}#sync` });
    }
    return ok;
  }, [perform, log, notify]);

  const reconnect = useCallback<YouTubeStore["reconnect"]>(async () => {
    // Production: redirect to the backend's Google OAuth start URL with the full scope set.
    setConnection((c) => ({ ...c, state: c.state === "disconnected" ? "disconnected" : "syncing" }));
    const id = toast.loading("Waiting for Google authorisation…");
    await wait(1200);
    setScopesState([...mockScopes]);
    setConnection((c) => ({ ...c, state: "connected", lastSyncedAt: nowIso() }));
    log({ action: "reconnect", summary: "Reconnected channel with all permissions", entity: { type: "channel", label: "Namo Gange Trust" } });
    toast.success("YouTube reconnected", { id, description: "All permissions granted. Data is up to date." });
    return true;
  }, [log]);

  const disconnect = useCallback<YouTubeStore["disconnect"]>(async () => {
    const id = toast.loading("Disconnecting channel…");
    await wait(1000);
    setConnection((c) => ({ ...c, state: "disconnected" }));
    log({ action: "reconnect", summary: "Disconnected YouTube channel", entity: { type: "channel", label: "Namo Gange Trust" } });
    toast.success("YouTube channel disconnected", { id, description: "Synced data is kept for 30 days." });
    return true;
  }, [log]);

  const updateSettings = useCallback<YouTubeStore["updateSettings"]>(
    async (patch, summary = "Settings saved") =>
      perform({ pending: "Saving settings…", success: summary, requiresWrite: false }, () => {
        setSettings((s) => ({ ...s, ...patch }));
        log({ action: patch.rolePermissions ? "permission" : "settings", summary, entity: { type: "settings", label: "YouTube settings" } });
      }),
    [perform, log],
  );

  const updateConnection = useCallback((patch: Partial<ConnectionInfo>) => setConnection((c) => ({ ...c, ...patch })), []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);
  const markAllNotificationsRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  const simulate = useMemo<YouTubeStore["simulate"]>(
    () => ({
      setConnectionState: (state) => {
        setConnection((c) => ({ ...c, state }));
        if (state === "token_expired") notify({ kind: "token_expired", title: "YouTube token expired", body: "Reconnect to resume publishing and syncing.", href: `${ytRoutes.settings}#connection` });
        if (state === "quota_exceeded") notify({ kind: "quota_warning", title: "API quota exceeded", body: "Writes are paused until the quota resets.", href: `${ytRoutes.settings}#sync` });
        if (state === "sync_failed") notify({ kind: "sync_failed", title: "Sync failed", body: "YouTube didn't return channel data.", href: `${ytRoutes.settings}#sync` });
      },
      toggleScope: (scope, granted) => {
        setScopesState((prev) => (granted ? [...new Set([...prev, scope])] : prev.filter((x) => x !== scope)));
        if (!granted) notify({ kind: "permission_removed", title: "Permission removed", body: "Some YouTube permissions are no longer granted.", href: `${ytRoutes.settings}#permissions` });
      },
      setFeatures: (next) => setFeaturesState((f) => ({ ...f, ...next })),
      setRole,
      setFailNextAction: (fail) => setSimulation((s) => ({ ...s, failNextAction: fail })),
      setLoading: (loading) => setSimulation((s) => ({ ...s, loading })),
      setBelowPrivacyThreshold: (below) => setSimulation((s) => ({ ...s, belowPrivacyThreshold: below })),
      setLoadError: (failed) => setSimulation((s) => ({ ...s, loadError: failed })),
    }),
    [notify],
  );

  const audience = useMemo<AudienceData>(
    () =>
      simulation.belowPrivacyThreshold
        ? { ...mockAudience, returningViewers: null, newViewers: null, age: null, gender: null, geography: null, devices: mockAudience.devices, activity: null, subscriberSources: null }
        : mockAudience,
    [simulation.belowPrivacyThreshold],
  );

  const registerGuard = useCallback((guard: GuardRegistration | null) => {
    guardRef.current = guard;
  }, []);

  const value: YouTubeStore = {
    ready: ready && !simulation.loading,
    channel,
    connection,
    scopes,
    features,
    videos,
    playlists,
    comments,
    liveEvents,
    settings,
    team,
    approvals,
    versions,
    audit,
    notifications,
    thumbnailHistory,
    role,
    currentUser,
    permissions,
    can,
    simulation,
    audience,
    createVideo,
    updateVideo,
    deleteVideos,
    setVisibility,
    scheduleVideo,
    publishNow,
    changeThumbnail,
    restoreVersion,
    submitForApproval,
    reviewApproval,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addToPlaylists,
    replyToComment,
    toggleCommentLike,
    moderateComments,
    deleteComments,
    createLiveEvent,
    updateLiveEvent,
    startLiveEvent,
    endLiveEvent,
    deleteLiveEvent,
    resetStreamKey,
    syncNow,
    reconnect,
    disconnect,
    updateSettings,
    updateConnection,
    markNotificationRead,
    markAllNotificationsRead,
    simulate,
    registerGuard,
    guardRef,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useYouTube() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useYouTube must be used inside <YouTubeProvider>");
  return ctx;
}
