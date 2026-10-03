import { ApiError } from "@/types/api";
import { YOUTUBE_CONSENT_CAPABILITIES, type YouTubeConsentCapability } from "./youtube-dto";

/**
 * The one place that turns a backend error into something a person can read and act on.
 * Messages are keyed by the stable `reason` code of the backend (`youtube_*`). The backend `message`, provider bodies and
 * raw JSON are never shown; unknown codes fall back to a generic sentence chosen by HTTP status.
 */

export type YouTubeErrorAction =
  /** Send the user through Google consent again (the connection is unusable). */
  | "reconnect"
  /** A named capability is missing: offer the incremental consent for it. */
  | "grant"
  /** The Company login has to be mapped to this Client first. */
  | "connect"
  /** Transient: trying again later can work. */
  | "retry"
  /** Quota / rate limit: wait. */
  | "wait"
  /** The role lacks the RBAC capability. */
  | "request_access"
  /** Nothing the user can do in OmniPlatform (e.g. do it in YouTube Studio). */
  | "none";

export interface YouTubeErrorInfo {
  /** Stable backend reason, or a local code (`network_error`, `no_client_selected`, ...). */
  reason: string;
  title: string;
  message: string;
  action: YouTubeErrorAction;
  /** Set when `action === "grant"` and the backend named the capability. Always one of the four allowlisted names. */
  capability: YouTubeConsentCapability | null;
  status: number;
  /** `true` for conditions where re-trying the same request is meaningful (never used to auto-retry POSTs). */
  retryable: boolean;
  /** Offending field names for validation problems (names only). */
  fields: string[];
}

interface Entry {
  title: string;
  message: string;
  action: YouTubeErrorAction;
  retryable?: boolean;
}

const E = (title: string, message: string, action: YouTubeErrorAction = "none", retryable = false): Entry => ({ title, message, action, retryable });

const TABLE: Record<string, Entry> = {
  // connection / channel
  youtube_not_connected: E("YouTube isn't connected", "Connect a YouTube channel for this Client to continue.", "connect"),
  youtube_channel_not_mapped: E("Channel not linked to this Client", "The company is connected to YouTube, but no channel is linked to this Client yet.", "connect"),
  youtube_channel_not_found: E("Channel not found", "YouTube didn't return a channel for this connection. Reconnect with the right Google account.", "reconnect"),
  youtube_insufficient_scope: E("Permission required", "This connection doesn't have the Google permission this action needs.", "grant"),
  youtube_insufficient_permissions: E("YouTube refused this action", "The connected Google account isn't allowed to do this on the channel.", "none"),
  youtube_reconnect_required: E("Reconnect YouTube", "The YouTube connection has expired or was revoked. Reconnect to continue.", "reconnect"),
  youtube_quota_exceeded: E("YouTube quota reached", "The daily YouTube API quota is used up. Cached data still works; try again after the quota resets.", "wait"),
  youtube_rate_limited: E("Too many requests", "YouTube is limiting requests right now. Wait a moment and try again.", "wait", true),
  youtube_provider_unreachable: E("YouTube is unreachable", "OmniPlatform couldn't reach YouTube. Try again in a moment.", "retry", true),
  youtube_provider_error: E("YouTube returned an error", "YouTube couldn't complete the request. Try again later.", "retry", true),
  youtube_provider_not_configured: E("YouTube isn't configured", "The YouTube integration isn't set up on this platform yet.", "none"),
  youtube_sync_too_soon: E("Synced a moment ago", "The channel was just synced. Try again in a minute.", "wait"),
  // videos
  youtube_video_not_found: E("Video not found", "The video may have been deleted on YouTube, or the link is incorrect.", "none"),
  youtube_video_not_owned: E("Not your video", "That video doesn't belong to the connected channel.", "none"),
  youtube_additional_permission_required: E("Permission required", "Managing videos needs the manage-content permission. Grant it to continue.", "grant"),
  youtube_invalid_video_metadata: E("Check the video details", "Some video details aren't valid for YouTube.", "none"),
  youtube_invalid_page_token: E("Page expired", "That page of results is no longer valid. Reload the list.", "retry", true),
  // upload / thumbnail
  youtube_upload_permission_required: E("Upload permission required", "Uploading needs the upload permission. Grant it to continue.", "grant"),
  youtube_invalid_video_file: E("Unsupported video file", "That file can't be uploaded to YouTube. Use an MP4 or MOV file from the media library.", "none"),
  youtube_video_too_large: E("Video too large", "That video is larger than the upload limit.", "none"),
  youtube_media_not_found: E("Media not found", "The selected file isn't in this Client's media library any more.", "none"),
  youtube_upload_not_found: E("Upload not found", "That upload doesn't exist or belongs to another Client.", "none"),
  youtube_upload_duplicate: E("Already uploading", "This file is already being uploaded with the same details.", "none"),
  youtube_upload_session_failed: E("Upload couldn't start", "YouTube didn't accept the upload. Try again.", "retry", true),
  youtube_upload_failed: E("Upload failed", "The upload to YouTube failed. Start it again from the media library.", "none"),
  youtube_upload_interrupted: E("Upload interrupted", "The connection to YouTube dropped. The upload will resume automatically.", "wait"),
  youtube_upload_restricted: E("Upload not allowed", "YouTube restricts uploads for this channel right now. Check YouTube Studio.", "none"),
  youtube_processing_failed: E("Processing failed", "YouTube couldn't process the uploaded file. Upload the original file again.", "none"),
  youtube_video_rejected: E("Video rejected", "YouTube rejected this video. Check YouTube Studio for the reason.", "none"),
  youtube_thumbnail_invalid: E("Invalid thumbnail", "Thumbnails must be a PNG or JPEG image of at most 2 MB.", "none"),
  youtube_thumbnail_failed: E("Thumbnail not applied", "YouTube couldn't set the thumbnail. The channel may need to be verified in YouTube Studio.", "none"),
  // publish / schedule
  youtube_publish_permission_required: E("Permission required", "Publishing needs the manage-content permission. Grant it to continue.", "grant"),
  youtube_video_not_ready: E("Video still processing", "YouTube is still processing this video. It will publish once processing finishes.", "wait"),
  youtube_schedule_invalid: E("Invalid schedule", "Pick a valid date and time, including the time zone.", "none"),
  youtube_schedule_in_past: E("That time has passed", "Choose a time in the future.", "none"),
  youtube_schedule_missed: E("Schedule missed", "The scheduled time passed before the video could be published.", "none"),
  youtube_schedule_conflict: E("Already scheduled", "This video already has a pending publish or schedule.", "none"),
  youtube_publish_conflict: E("Publish already in progress", "This video already has a publish in progress.", "none"),
  youtube_publish_failed: E("Publish failed", "YouTube couldn't publish this video. Try again later.", "retry", true),
  youtube_publish_target_invalid: E("Choose public or unlisted", "A publish needs an explicit target: public or unlisted.", "none"),
  youtube_publish_not_found: E("Schedule not found", "That publish or schedule doesn't exist any more.", "none"),
  // playlists
  youtube_playlist_not_found: E("Playlist not found", "The playlist may have been deleted on YouTube.", "none"),
  youtube_playlist_not_owned: E("Not your playlist", "That playlist doesn't belong to the connected channel (or is managed by YouTube).", "none"),
  youtube_playlist_item_not_found: E("Item not found", "That video isn't in the playlist any more.", "none"),
  youtube_playlist_permission_required: E("Permission required", "Managing playlists needs the manage-content permission. Grant it to continue.", "grant"),
  youtube_playlist_invalid_metadata: E("Check the playlist details", "Some playlist details aren't valid for YouTube.", "none"),
  youtube_playlist_conflict: E("Playlist conflict", "YouTube couldn't apply that change to the playlist (for example the video is already in it).", "none"),
  // comments
  youtube_comments_disabled: E("Comments are off", "Comments are turned off for this video.", "none"),
  youtube_comment_not_found: E("Comment not found", "The comment was deleted or is no longer available.", "none"),
  youtube_comment_not_owned: E("Not your comment", "Only comments written by the connected channel can be changed this way.", "none"),
  youtube_comment_not_editable: E("Can't edit this comment", "YouTube doesn't allow this comment to be edited.", "none"),
  youtube_comment_permission_required: E("Permission required", "Managing comments needs the manage-content permission. Grant it to continue.", "grant"),
  youtube_comment_invalid: E("Check the comment", "The comment is empty or too long.", "none"),
  youtube_comment_reply_disabled: E("Replies are off", "Replies aren't allowed on this comment.", "none"),
  youtube_comment_moderation_invalid: E("Invalid moderation action", "That moderation action isn't supported.", "none"),
  // analytics
  youtube_analytics_permission_required: E("Analytics permission required", "Viewing analytics needs the analytics permission. Grant it to continue.", "grant"),
  youtube_monetary_analytics_permission_required: E("Revenue permission required", "Viewing revenue needs the separate revenue permission. Grant it to continue.", "grant"),
  youtube_analytics_invalid_range: E("Invalid date range", "Pick a range of at most 366 days that ends today or earlier.", "none"),
  youtube_analytics_invalid_query: E("Invalid analytics request", "That analytics request isn't supported.", "none"),
  youtube_analytics_unavailable: E("Analytics unavailable", "YouTube Analytics isn't available for this channel right now.", "retry", true),
  youtube_analytics_quota_exceeded: E("Analytics quota reached", "The YouTube Analytics quota is used up. Try again later.", "wait"),
  // reporting
  youtube_reporting_permission_required: E("Permission required", "Reporting needs the analytics permission. Grant it to continue.", "grant"),
  youtube_reporting_job_not_found: E("Reporting job not found", "That reporting job doesn't exist.", "none"),
  youtube_reporting_report_not_found: E("Report not found", "That report doesn't exist or has expired.", "none"),
  youtube_reporting_download_failed: E("Report download failed", "The report couldn't be downloaded. Try again later.", "retry", true),
  youtube_reporting_parse_failed: E("Report couldn't be read", "The report file couldn't be read.", "none"),
  youtube_reporting_unavailable: E("Reporting unavailable", "YouTube Reporting isn't available for this channel right now.", "retry", true),
  youtube_reporting_type_not_supported: E("Report type not supported", "That report type isn't available.", "none"),
  // live
  youtube_live_permission_required: E("Permission required", "Live streaming needs the manage-content permission. Grant it to continue.", "grant"),
  youtube_live_not_enabled: E("Live streaming isn't enabled", "This channel isn't enabled for YouTube Live. Enable it in YouTube Studio (it can take up to 24 hours).", "none"),
  youtube_live_broadcast_not_found: E("Live event not found", "That live event doesn't exist any more.", "none"),
  youtube_live_broadcast_not_owned: E("Not your live event", "That live event doesn't belong to the connected channel.", "none"),
  youtube_live_stream_not_found: E("Stream not found", "That stream doesn't exist any more.", "none"),
  youtube_live_stream_not_owned: E("Not your stream", "That stream doesn't belong to the connected channel.", "none"),
  youtube_live_invalid: E("Check the live details", "Some live event details aren't valid for YouTube.", "none"),
  youtube_live_invalid_state: E("Not allowed in this state", "That isn't possible in the live event's current state.", "none"),
  youtube_live_not_ready: E("Stream not ready", "Start sending video from your encoder, then try again.", "wait"),
  youtube_live_conflict: E("Live conflict", "YouTube couldn't apply that change to the live event.", "none"),
  youtube_live_chat_not_available: E("Chat unavailable", "Live chat isn't available for this event.", "none"),
  youtube_live_publish_permission_required: E("Publish access required", "Going live or making a live event public needs publish access on your role.", "request_access"),
};

const HTTP_FALLBACK: Record<number, Entry> = {
  400: E("Check the details", "Some details aren't valid. Fix them and try again.", "none"),
  401: E("Session expired", "Your session has expired. Sign in again to continue.", "none"),
  403: E("You don't have access", "Your role doesn't allow this action. Ask an admin for access.", "request_access"),
  404: E("Not found", "That item doesn't exist or isn't available to you.", "none"),
  409: E("Not possible right now", "The request conflicts with the current state. Reload and try again.", "none"),
  422: E("Check the details", "Some details aren't valid. Fix them and try again.", "none"),
  429: E("Too many requests", "You're sending requests too quickly. Wait a moment and try again.", "wait", true),
  502: E("YouTube error", "YouTube couldn't complete the request. Try again later.", "retry", true),
  503: E("Service unavailable", "The service is temporarily unavailable. Try again in a moment.", "retry", true),
};

const GENERIC = E("Something went wrong", "The request couldn't be completed. Try again.", "retry", true);

function asCapability(value: unknown): YouTubeConsentCapability | null {
  return typeof value === "string" && (YOUTUBE_CONSENT_CAPABILITIES as readonly string[]).includes(value) ? (value as YouTubeConsentCapability) : null;
}

function fieldNames(details: Record<string, unknown> | undefined): string[] {
  const raw = details?.fields;
  if (Array.isArray(raw)) return raw.filter((f): f is string => typeof f === "string").slice(0, 10);
  return [];
}

/** Maps any thrown value to a safe, actionable description. Never includes provider bodies or raw JSON. */
export function describeYouTubeError(error: unknown): YouTubeErrorInfo {
  if (!ApiError.isApiError(error)) {
    return { reason: "unknown", title: GENERIC.title, message: GENERIC.message, action: "retry", capability: null, status: 0, retryable: true, fields: [] };
  }

  if (error.code === "NETWORK_ERROR") {
    return { reason: "network_error", title: "Can't reach the platform", message: "Check your connection and try again.", action: "retry", capability: null, status: 0, retryable: true, fields: [] };
  }
  if (error.code === "NO_COMPANY_SELECTED") {
    return { reason: "no_company_selected", title: "Select a company", message: "Choose a company to continue.", action: "none", capability: null, status: 0, retryable: false, fields: [] };
  }
  if (error.code === "NO_CLIENT_SELECTED") {
    return { reason: "no_client_selected", title: "Select a client", message: "YouTube is managed per client. Choose a client to continue.", action: "none", capability: null, status: 0, retryable: false, fields: [] };
  }

  const reason = error.reason ?? "";
  const entry = (reason && TABLE[reason]) || HTTP_FALLBACK[error.status] || GENERIC;
  const capability = entry.action === "grant" ? asCapability(error.details?.requiredCapability) : null;
  const known = Boolean(reason && TABLE[reason]);

  return {
    reason: reason || `http_${error.status}`,
    title: entry.title,
    message: entry.message,
    action: entry.action,
    capability,
    status: error.status,
    retryable: Boolean(entry.retryable),
    fields: known || error.status === 400 || error.status === 422 ? fieldNames(error.details) : [],
  };
}

/** One line for toasts: title and message, plus offending field names when the backend named them. */
export function youTubeErrorText(info: YouTubeErrorInfo): string {
  return info.fields.length ? `${info.message} (${info.fields.join(", ")})` : info.message;
}

/** Describes a bare stable reason code (for example an upload job's `failure.code`) with the same table. */
export function describeYouTubeReason(reason: string | null | undefined): YouTubeErrorInfo {
  const entry = (reason && TABLE[reason]) || GENERIC;
  return { reason: reason ?? "unknown", title: entry.title, message: entry.message, action: entry.action, capability: null, status: 0, retryable: Boolean(entry.retryable), fields: [] };
}

/** `youtube_live_not_enabled` is a provider capability state (not a failure): the UI shows it as info/empty. */
export function isLiveNotEnabled(error: unknown): boolean {
  return ApiError.isApiError(error) && error.reason === "youtube_live_not_enabled";
}

/** 4xx answers are decisions, not outages: React Query must not retry them. */
export function shouldRetryYouTubeQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!ApiError.isApiError(error)) return false;
  if (error.code === "NETWORK_ERROR") return true;
  return error.status >= 500 && error.status !== 501;
}
