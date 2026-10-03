"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { youtubeKeys } from "@/lib/query/keys";
import { describeYouTubeError, youTubeErrorText } from "../live/youtube-errors";
import { mediaApi, describeMediaError } from "@/features/admin/content/live/media-api";
import { ApiError } from "@/types/api";
import { youtubeApi, type YouTubeScope } from "../live/youtube-api";
import { createSingleFlight, createSubmissionKeys } from "../lib/submission";
import { safeAuthUrl } from "../live/youtube-consent";
import type {
  YouTubeConnectionResponse,
  YouTubeConsentCapability,
  YouTubeLiveBroadcastDto,
  YouTubeLiveStreamCredentialsDto,
  YouTubePlaylistDto,
  YouTubePrivacy,
  YouTubePublishTarget,
  YouTubeUploadInput,
  YouTubeUploadResponse,
  YouTubeVideoUpdateInput,
} from "../live/youtube-dto";
import type { Video, Visibility } from "../types";
import type { YouTubeMutations } from "./hooks";

/**
 * User-facing actions. Each one: runs at most once at a time per logical target (double click / Enter + click are ignored),
 * maps backend errors through the central mapper, and toasts the outcome. They return the created/changed value or
 * `null`/`false` on failure; they never throw into the UI and never retry a non-idempotent POST.
 */

const THUMB_MAX_BYTES = 2 * 1024 * 1024;
const THUMB_TYPES = ["image/png", "image/jpeg"];

export interface ThumbnailSource {
  /** A new local file: uploaded to the media library first. */
  file?: File;
  /** An IMAGE asset already in the Client's media library. */
  assetId?: string;
}

export interface LiveCreateInput {
  title: string;
  description: string;
  /** ISO 8601 with offset (a `Date#toISOString()` value). */
  scheduledStart: string;
  visibility: Visibility;
  enableDvr: boolean;
  madeForKids: boolean;
}

export interface UploadStart {
  assetId: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: YouTubePrivacy;
  madeForKids: boolean;
  defaultLanguage?: string;
  embeddable?: boolean;
  license?: "youtube" | "creativeCommon";
  thumbnailAssetId?: string;
}

export type ConsentTarget = YouTubeConsentCapability | undefined;

export interface YouTubeActions {
  /** Starts Google sign-in (initial connect / reconnect) or the incremental consent for ONE named capability. */
  startConsent: (capability?: ConsentTarget) => Promise<boolean>;
  syncNow: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;

  updateVideo: (videoId: string, patch: YouTubeVideoUpdateInput) => Promise<boolean>;
  setVisibility: (videoIds: string[], visibility: Visibility) => Promise<boolean>;
  deleteVideos: (videoIds: string[]) => Promise<boolean>;
  changeThumbnail: (videoId: string, source: ThumbnailSource) => Promise<boolean>;
  publishNow: (videoId: string, target?: YouTubePublishTarget) => Promise<boolean>;
  scheduleVideo: (video: Pick<Video, "id" | "scheduleId">, scheduledAtIso: string, target?: YouTubePublishTarget) => Promise<boolean>;
  cancelSchedule: (video: Pick<Video, "id" | "scheduleId">) => Promise<boolean>;

  uploadMedia: (file: File, signal?: AbortSignal) => Promise<{ assetId: string } | null>;
  startUpload: (input: UploadStart, fingerprint: string) => Promise<YouTubeUploadResponse | null>;
  /** Publishes or schedules an uploaded video (the idempotency key is kept per logical submission). */
  finishUpload: (videoId: string, mode: { kind: "publish"; target: YouTubePublishTarget } | { kind: "schedule"; target: YouTubePublishTarget; scheduledAtIso: string }) => Promise<boolean>;

  createPlaylist: (input: { title: string; description: string; visibility: Visibility }, videoIds?: string[]) => Promise<YouTubePlaylistDto | null>;
  updatePlaylist: (playlistId: string, patch: { title?: string; description?: string; visibility?: Visibility }, message?: string) => Promise<boolean>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addToPlaylists: (videoIds: string[], playlistIds: string[]) => Promise<boolean>;
  removePlaylistItem: (playlistId: string, playlistItemId: string) => Promise<boolean>;
  movePlaylistItem: (playlistId: string, playlistItemId: string, position: number) => Promise<boolean>;

  replyToComment: (videoId: string, commentId: string, text: string) => Promise<boolean>;
  moderateComments: (items: { videoId: string; commentId: string }[], status: "published" | "heldForReview") => Promise<boolean>;
  /** Removes comments: the channel's own comments are deleted, anyone else's are rejected (permanent on YouTube). */
  removeComments: (items: { videoId: string; commentId: string; own: boolean }[]) => Promise<boolean>;

  createLiveEvent: (input: LiveCreateInput) => Promise<YouTubeLiveBroadcastDto | null>;
  updateLiveEvent: (broadcastId: string, patch: { title?: string; description?: string; scheduledStart?: string; visibility?: Visibility }) => Promise<boolean>;
  /** Creates a stream and binds it to a broadcast that has none. Two non-idempotent POSTs, never retried automatically. */
  attachStream: (broadcastId: string, title: string) => Promise<boolean>;
  startLiveEvent: (broadcastId: string) => Promise<boolean>;
  endLiveEvent: (broadcastId: string) => Promise<boolean>;
  sendLiveChat: (broadcastId: string, text: string) => Promise<boolean>;
  /** Fetches the stream key on an explicit click. The result is handed to the caller and kept nowhere else. */
  revealStreamCredentials: (streamId: string) => Promise<YouTubeLiveStreamCredentialsDto | null>;
}

export function useYouTubeActions(args: { scope: YouTubeScope | null; mutations: YouTubeMutations; connection: YouTubeConnectionResponse | undefined }): YouTubeActions {
  const { scope, mutations, connection } = args;
  // Mutation objects change identity on every render; callbacks read the latest through a ref so the actions stay stable.
  const mr = useRef(mutations);
  useEffect(() => {
    mr.current = mutations;
  });
  const qc = useQueryClient();
  const singleFlight = useRef(createSingleFlight());
  const submission = useRef(createSubmissionKeys());

  /** Runs `fn` unless the same `key` is already running. Returns `null` when ignored or failed. */
  const attempt = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, options: { success?: string | ((value: T) => string); errorTitle?: string } = {}): Promise<T | null> => {
      if (!scope) {
        toast.error("Select a client to continue.");
        return null;
      }
      const outcome = await singleFlight.current.run(key, async (): Promise<T | null> => {
        try {
          const value = await fn();
          const success = typeof options.success === "function" ? options.success(value) : options.success;
          if (success) toast.success(success);
          return value;
        } catch (error) {
          const info = describeYouTubeError(error);
          toast.error(options.errorTitle ?? info.title, { description: youTubeErrorText(info) });
          if (info.action === "reconnect" || info.action === "connect") void qc.invalidateQueries({ queryKey: youtubeKeys.connection(scope) });
          return null;
        }
      });
      // A second call while the first is still running is ignored (double click / Enter + click).
      return outcome.ran ? outcome.value : null;
    },
    [scope, qc],
  );

  const keyFor = useCallback((name: string, fingerprint: string): string => submission.current.keyFor(name, fingerprint), []);
  const forgetKey = useCallback((name: string) => submission.current.forget(name), []);

  const startConsent = useCallback(
    async (capability?: ConsentTarget) => {
      const result = await attempt(`consent:${capability ?? "connect"}`, () => mr.current.initConsent.mutateAsync({ capability, integrationId: connection?.integrationId ?? null }));
      if (!result) return false;
      const url = safeAuthUrl(result.authUrl);
      if (!url) {
        toast.error("Couldn't start Google sign-in", { description: "The sign-in address wasn't valid. Try again." });
        return false;
      }
      window.location.assign(url);
      return true;
    },
    [attempt, connection?.integrationId],
  );

  const syncNow = useCallback(async () => {
    const r = await attempt("sync", () => mr.current.sync.mutateAsync(), { success: "Channel synced" });
    return r !== null;
  }, [attempt]);

  const disconnect = useCallback(async () => {
    const r = await attempt("disconnect", () => mr.current.disconnect.mutateAsync(), { success: "YouTube disconnected" });
    return r !== null;
  }, [attempt]);

  const updateVideo = useCallback(
    async (videoId: string, patch: YouTubeVideoUpdateInput) => {
      if (Object.keys(patch).length === 0) return true;
      const r = await attempt(`video:${videoId}`, () => mr.current.updateVideo.mutateAsync({ videoId, input: patch }), { success: "Changes saved to YouTube" });
      return r !== null;
    },
    [attempt],
  );

  const setVisibility = useCallback(
    async (videoIds: string[], visibility: Visibility) => {
      let done = 0;
      for (const id of videoIds) {
        const r = await attempt(`video:${id}`, () => mr.current.updateVideo.mutateAsync({ videoId: id, input: { privacyStatus: visibility } }));
        if (r === null) break;
        done += 1;
      }
      if (done === videoIds.length) toast.success(`Visibility changed on ${done} ${done === 1 ? "video" : "videos"}`);
      else if (done > 0) toast.warning(`Changed ${done} of ${videoIds.length} videos`, { description: "Stopped at the first failure." });
      return done === videoIds.length;
    },
    [attempt],
  );

  const deleteVideos = useCallback(
    async (videoIds: string[]) => {
      let done = 0;
      for (const id of videoIds) {
        const r = await attempt(`video-delete:${id}`, () => mr.current.deleteVideo.mutateAsync(id));
        if (r === null) break;
        done += 1;
      }
      if (done === videoIds.length) toast.success(done === 1 ? "Video deleted" : `${done} videos deleted`);
      else if (done > 0) toast.warning(`Deleted ${done} of ${videoIds.length} videos`, { description: "Stopped at the first failure." });
      return done === videoIds.length;
    },
    [attempt],
  );

  const uploadMedia = useCallback(
    async (file: File, signal?: AbortSignal) => {
      if (!scope) return null;
      try {
        const asset = await mediaApi.upload(scope.companyId, scope.clientId, file, undefined, signal);
        return { assetId: asset.id };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        toast.error("Couldn't add the file to the media library", { description: describeMediaError(error) });
        return null;
      }
    },
    [scope],
  );

  const changeThumbnail = useCallback(
    async (videoId: string, source: ThumbnailSource) => {
      const r = await attempt(
        `thumb:${videoId}`,
        async () => {
          let assetId = source.assetId;
          if (!assetId) {
            const file = source.file;
            if (!file || !scope) throw new ApiError({ code: "BAD_REQUEST", message: "No image selected.", status: 400, reason: "youtube_thumbnail_invalid" });
            if (!THUMB_TYPES.includes(file.type) || file.size > THUMB_MAX_BYTES) throw new ApiError({ code: "BAD_REQUEST", message: "Invalid thumbnail.", status: 400, reason: "youtube_thumbnail_invalid" });
            assetId = (await mediaApi.upload(scope.companyId, scope.clientId, file)).id;
          }
          return mr.current.setThumbnail.mutateAsync({ videoId, assetId });
        },
        { success: "Thumbnail updated" },
      );
      return r !== null;
    },
    [attempt, scope],
  );

  const publishNow = useCallback(
    async (videoId: string, target: YouTubePublishTarget = "public") => {
      const name = `publish:${videoId}`;
      const key = keyFor(name, `${videoId}:${target}`);
      const r = await attempt(name, () => mr.current.publish.mutateAsync({ videoId, target, idempotencyKey: key }), { success: "Publishing — YouTube will confirm shortly" });
      if (r) forgetKey(name);
      return r !== null;
    },
    [attempt, keyFor, forgetKey],
  );

  const scheduleVideo = useCallback(
    async (video: Pick<Video, "id" | "scheduleId">, scheduledAtIso: string, target: YouTubePublishTarget = "public") => {
      if (video.scheduleId) {
        const r = await attempt(`schedule:${video.id}`, () => mr.current.reschedule.mutateAsync({ scheduleId: video.scheduleId as string, videoId: video.id, scheduledAt: scheduledAtIso }), { success: "Schedule updated" });
        return r !== null;
      }
      const name = `schedule:${video.id}`;
      const key = keyFor(name, `${video.id}:${target}:${scheduledAtIso}`);
      const r = await attempt(name, () => mr.current.schedule.mutateAsync({ videoId: video.id, target, scheduledAt: scheduledAtIso, idempotencyKey: key }), { success: "Scheduled" });
      if (r) forgetKey(name);
      return r !== null;
    },
    [attempt, keyFor, forgetKey],
  );

  const cancelSchedule = useCallback(
    async (video: Pick<Video, "id" | "scheduleId">) => {
      if (!video.scheduleId) return false;
      const r = await attempt(`schedule:${video.id}`, () => mr.current.cancelSchedule.mutateAsync({ scheduleId: video.scheduleId as string, videoId: video.id }), { success: "Schedule cancelled" });
      return r !== null;
    },
    [attempt],
  );

  const startUpload = useCallback(
    async (input: UploadStart, fingerprint: string) => {
      const key = keyFor("upload", fingerprint);
      const body: YouTubeUploadInput = {
        assetId: input.assetId,
        title: input.title,
        description: input.description,
        tags: input.tags,
        categoryId: input.categoryId,
        // Never public by default: the caller always passes the privacy explicitly and publishing is a separate, confirmed step.
        privacyStatus: input.privacyStatus,
        madeForKids: input.madeForKids,
        ...(input.defaultLanguage ? { defaultLanguage: input.defaultLanguage } : {}),
        ...(input.embeddable === undefined ? {} : { embeddable: input.embeddable }),
        ...(input.license ? { license: input.license } : {}),
        ...(input.thumbnailAssetId ? { thumbnailAssetId: input.thumbnailAssetId } : {}),
      };
      const r = await attempt("upload", () => mr.current.createUpload.mutateAsync({ input: body, idempotencyKey: key }));
      if (r) forgetKey("upload");
      return r;
    },
    [attempt, keyFor, forgetKey],
  );

  const finishUpload = useCallback<YouTubeActions["finishUpload"]>(
    async (videoId, mode) => {
      if (mode.kind === "publish") return publishNow(videoId, mode.target);
      return scheduleVideo({ id: videoId, scheduleId: null }, mode.scheduledAtIso, mode.target);
    },
    [publishNow, scheduleVideo],
  );

  const createPlaylist = useCallback(
    async (input: { title: string; description: string; visibility: Visibility }, videoIds: string[] = []) => {
      // Not retried automatically: a second POST would create a second playlist.
      const r = await attempt("playlist-create", () => mr.current.createPlaylist.mutateAsync({ title: input.title, ...(input.description ? { description: input.description } : {}), privacyStatus: input.visibility }));
      if (!r) return null;
      const playlist = r.playlist;
      if (videoIds.length) {
        let added = 0;
        for (const videoId of videoIds) {
          const item = await attempt(`playlist-add:${playlist.id}:${videoId}`, () => mr.current.addPlaylistItem.mutateAsync({ playlistId: playlist.id, videoId }));
          if (item === null) break;
          added += 1;
        }
        toast.success(`Playlist created${added ? ` with ${added} ${added === 1 ? "video" : "videos"}` : ""}`);
      } else {
        toast.success("Playlist created");
      }
      return playlist;
    },
    [attempt],
  );

  const updatePlaylist = useCallback(
    async (playlistId: string, patch: { title?: string; description?: string; visibility?: Visibility }, message = "Playlist updated") => {
      const input = { ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.description !== undefined ? { description: patch.description } : {}), ...(patch.visibility ? { privacyStatus: patch.visibility } : {}) };
      const r = await attempt(`playlist:${playlistId}`, () => mr.current.updatePlaylist.mutateAsync({ playlistId, input }), { success: message });
      return r !== null;
    },
    [attempt],
  );

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      const r = await attempt(`playlist:${playlistId}`, () => mr.current.deletePlaylist.mutateAsync(playlistId), { success: "Playlist deleted" });
      return r !== null;
    },
    [attempt],
  );

  const addToPlaylists = useCallback(
    async (videoIds: string[], playlistIds: string[]) => {
      let done = 0;
      const total = videoIds.length * playlistIds.length;
      outer: for (const playlistId of playlistIds) {
        for (const videoId of videoIds) {
          const r = await attempt(`playlist-add:${playlistId}:${videoId}`, () => mr.current.addPlaylistItem.mutateAsync({ playlistId, videoId }));
          if (r === null) break outer;
          done += 1;
        }
      }
      if (done === total) toast.success(`Added to ${playlistIds.length} ${playlistIds.length === 1 ? "playlist" : "playlists"}`);
      else if (done > 0) toast.warning(`Added ${done} of ${total}`, { description: "Stopped at the first failure." });
      return done === total;
    },
    [attempt],
  );

  const removePlaylistItem = useCallback(
    async (playlistId: string, playlistItemId: string) => {
      const r = await attempt(`playlist-item:${playlistItemId}`, () => mr.current.removePlaylistItem.mutateAsync({ playlistId, playlistItemId }), { success: "Video removed from playlist" });
      return r !== null;
    },
    [attempt],
  );

  const movePlaylistItem = useCallback(
    async (playlistId: string, playlistItemId: string, position: number) => {
      const r = await attempt(`playlist-item:${playlistItemId}`, () => mr.current.movePlaylistItem.mutateAsync({ playlistId, playlistItemId, position }));
      return r !== null;
    },
    [attempt],
  );

  const replyToComment = useCallback(
    async (videoId: string, commentId: string, text: string) => {
      // A reply is a non-idempotent POST: one in flight per comment, never auto-retried.
      const r = await attempt(`reply:${commentId}`, () => mr.current.replyToComment.mutateAsync({ videoId, commentId, text }), { success: "Reply posted" });
      return r !== null;
    },
    [attempt],
  );

  const moderateComments = useCallback(
    async (items: { videoId: string; commentId: string }[], status: "published" | "heldForReview") => {
      let done = 0;
      for (const item of items) {
        const r = await attempt(`moderate:${item.commentId}`, () => mr.current.moderateComment.mutateAsync({ ...item, status }));
        if (r === null) break;
        done += 1;
      }
      if (done === items.length) toast.success(status === "published" ? "Comment approved" : "Comment held for review");
      else if (done > 0) toast.warning(`Updated ${done} of ${items.length} comments`);
      return done === items.length;
    },
    [attempt],
  );

  const removeComments = useCallback(
    async (items: { videoId: string; commentId: string; own: boolean }[]) => {
      let done = 0;
      for (const item of items) {
        const key = `moderate:${item.commentId}`;
        const r = await attempt<unknown>(key, () => (item.own ? mr.current.deleteComment.mutateAsync({ videoId: item.videoId, commentId: item.commentId }) : mr.current.rejectComment.mutateAsync({ videoId: item.videoId, commentId: item.commentId })));
        if (r === null) break;
        done += 1;
      }
      if (done === items.length) toast.success(done === 1 ? "Comment removed" : `${done} comments removed`);
      else if (done > 0) toast.warning(`Removed ${done} of ${items.length} comments`);
      return done === items.length;
    },
    [attempt],
  );

  const createLiveEvent = useCallback(
    async (input: LiveCreateInput) => {
      // Two non-idempotent POSTs (broadcast, then stream). Neither is retried automatically; a partial result is reported honestly.
      const created = await attempt("live-create", () =>
        mr.current.createBroadcast.mutateAsync({
          title: input.title,
          ...(input.description ? { description: input.description } : {}),
          scheduledStartTime: input.scheduledStart,
          // Explicit, and private unless the person chose otherwise.
          privacyStatus: input.visibility,
          enableDvr: input.enableDvr,
          madeForKids: input.madeForKids,
        }),
      );
      if (!created) return null;
      const broadcast = created.broadcast;
      const stream = await attempt("live-stream-create", () => mr.current.createStream.mutateAsync({ title: input.title.slice(0, 128) }));
      if (!stream) {
        toast.warning("Live event created without a stream", { description: "Create or bind a stream from the setup panel before going live." });
        return broadcast;
      }
      const bound = await attempt("live-bind", () => mr.current.bindBroadcast.mutateAsync({ broadcastId: broadcast.broadcastId, streamId: stream.stream.streamId }));
      toast.success(bound ? "Live event created" : "Live event created — bind its stream from the setup panel");
      return broadcast;
    },
    [attempt],
  );

  const updateLiveEvent = useCallback(
    async (broadcastId: string, patch: { title?: string; description?: string; scheduledStart?: string; visibility?: Visibility }) => {
      const input = {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.scheduledStart ? { scheduledStartTime: patch.scheduledStart } : {}),
        ...(patch.visibility ? { privacyStatus: patch.visibility } : {}),
      };
      const r = await attempt(`live:${broadcastId}`, () => mr.current.updateBroadcast.mutateAsync({ broadcastId, input }), { success: "Live event updated" });
      return r !== null;
    },
    [attempt],
  );

  const attachStream = useCallback(
    async (broadcastId: string, title: string) => {
      const key = `live-attach:${broadcastId}`;
      const stream = await attempt(key, () => mr.current.createStream.mutateAsync({ title: title.slice(0, 128) || "Stream" }));
      if (!stream) return false;
      const bound = await attempt(`live:${broadcastId}`, () => mr.current.bindBroadcast.mutateAsync({ broadcastId, streamId: stream.stream.streamId }), { success: "Stream attached" });
      return bound !== null;
    },
    [attempt],
  );

  const startLiveEvent = useCallback(
    async (broadcastId: string) => {
      const r = await attempt(`live:${broadcastId}`, () => mr.current.transitionBroadcast.mutateAsync({ broadcastId, status: "live", confirmGoLive: true }), { success: "You're live" });
      return r !== null;
    },
    [attempt],
  );

  const endLiveEvent = useCallback(
    async (broadcastId: string) => {
      const r = await attempt(`live:${broadcastId}`, () => mr.current.transitionBroadcast.mutateAsync({ broadcastId, status: "complete" }), { success: "Stream ended" });
      return r !== null;
    },
    [attempt],
  );

  const sendLiveChat = useCallback(
    async (broadcastId: string, text: string) => {
      const r = await attempt(`chat:${broadcastId}`, () => mr.current.sendChat.mutateAsync({ broadcastId, text }));
      return r !== null;
    },
    [attempt],
  );

  const revealStreamCredentials = useCallback(
    async (streamId: string) => {
      const r = await attempt(`credentials:${streamId}`, () => (scope ? youtubeApi.liveStreamCredentials(scope, streamId) : Promise.reject(new Error("no scope"))));
      return r?.credentials ?? null;
    },
    [attempt, scope],
  );

  return useMemo(
    () => ({
      startConsent, syncNow, disconnect,
      updateVideo, setVisibility, deleteVideos, changeThumbnail, publishNow, scheduleVideo, cancelSchedule,
      uploadMedia, startUpload, finishUpload,
      createPlaylist, updatePlaylist, deletePlaylist, addToPlaylists, removePlaylistItem, movePlaylistItem,
      replyToComment, moderateComments, removeComments,
      createLiveEvent, updateLiveEvent, attachStream, startLiveEvent, endLiveEvent, sendLiveChat, revealStreamCredentials,
    }),
    [
      startConsent, syncNow, disconnect,
      updateVideo, setVisibility, deleteVideos, changeThumbnail, publishNow, scheduleVideo, cancelSchedule,
      uploadMedia, startUpload, finishUpload,
      createPlaylist, updatePlaylist, deletePlaylist, addToPlaylists, removePlaylistItem, movePlaylistItem,
      replyToComment, moderateComments, removeComments,
      createLiveEvent, updateLiveEvent, attachStream, startLiveEvent, endLiveEvent, sendLiveChat, revealStreamCredentials,
    ],
  );
}
