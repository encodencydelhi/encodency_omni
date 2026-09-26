import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";
import type { DraftRecord } from "./drafts-api";

export type MediaKind = "IMAGE" | "VIDEO";

export interface MediaUsage {
  drafts: number;
  scheduledPosts: number;
}

export interface MediaAssetRecord {
  id: string;
  kind: MediaKind;
  url: string;
  mimeType: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  uploadedAt: string;
  usage?: MediaUsage;
}

export interface ListMediaResult {
  items: MediaAssetRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ListMediaQuery {
  page?: number;
  limit?: number;
  kind?: MediaKind;
}

export const MEDIA_LIMITS = {
  image: {
    maxBytes: 8 * 1024 * 1024, // 8 MB
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    minDimension: 64,
    maxDimension: 4096,
  },
  video: {
    maxBytes: 50 * 1024 * 1024, // 50 MB
    mimeTypes: ["video/mp4", "video/quicktime"],
    minDimension: 128,
    maxDimension: 4096,
    minDurationMs: 1000,
    maxDurationMs: 120000,
  },
} as const;

function clientScopeHeaders(companyId: string, clientId: string): Record<string, string> {
  if (!clientId) {
    throw new ApiError({
      code: "NO_CLIENT_SELECTED",
      message: "Select a Client to continue.",
      status: 0,
    });
  }
  return companyScopeHeaders(companyId, { "x-client-id": clientId });
}

export function isMediaInUse(error: unknown): error is ApiError & { usage?: MediaUsage } {
  if (!ApiError.isApiError(error)) return false;
  const code = (error.detail<string>("serverCode") ?? error.code) as string;
  return error.status === 409 && (code === "media_in_use" || error.reason === "media_in_use");
}

export const MEDIA_ERROR_MESSAGES: Record<string, string> = {
  media_in_use: "This media asset is currently used by drafts or scheduled posts and cannot be removed.",
  file_required: "Please select a file to upload.",
  invalid_upload: "The uploaded file could not be processed.",
  unsupported_format: "Unsupported format. Use PNG, JPEG, WebP, or MP4/MOV (H.264).",
  malformed_image: "The image file is corrupted or unreadable.",
  malformed_video: "The video file is corrupted or unreadable.",
  mime_mismatch: "The file contents do not match the expected MIME type.",
  extension_mismatch: "The file extension does not match the file contents.",
  dimensions_out_of_range: "Image or video dimensions are outside allowed boundaries.",
  duration_out_of_range: "Video duration must be between 1 and 120 seconds.",
  unsupported_codec: "Only H.264 video codec is supported.",
  fragmented_not_allowed: "Fragmented MP4 videos are not supported.",
  no_video_track: "The video file contains no video track.",
  file_too_large: "File size exceeds the limit (8MB for images, 50MB for video).",
  upload_busy: "Upload server is busy. Please try again in a few moments.",
  storage_unavailable: "Media storage is temporarily unavailable. Please try again.",
  storage_not_configured: "Media storage service is not configured.",
  media_not_found: "One or more media assets were not found in this client's library.",
};

export function describeMediaError(error: unknown): string {
  if (ApiError.isApiError(error)) {
    const code = (error.detail<string>("serverCode") ?? error.detail<string>("code") ?? error.code) as string;
    if (code && MEDIA_ERROR_MESSAGES[code]) {
      return MEDIA_ERROR_MESSAGES[code]!;
    }
    if (error.reason && MEDIA_ERROR_MESSAGES[error.reason]) {
      return MEDIA_ERROR_MESSAGES[error.reason]!;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Media operation failed.";
}

export const mediaApi = {
  /**
   * POST /api/v1/media/upload — upload an image or video to the Client's library.
   * Multipart form data with field name "file".
   * Capability: content:write
   */
  async upload(
    companyId: string,
    clientId: string,
    file: File | Blob,
    fileName?: string,
    signal?: AbortSignal,
  ): Promise<MediaAssetRecord> {
    const formData = new FormData();
    if (fileName && file instanceof Blob && !(file instanceof File)) {
      formData.append("file", file, fileName);
    } else {
      formData.append("file", file);
    }

    return apiClient.request<MediaAssetRecord>({
      method: "POST",
      path: "/media/upload",
      headers: clientScopeHeaders(companyId, clientId),
      body: formData,
      signal,
    });
  },

  /**
   * GET /api/v1/media — list media in the Client's library.
   * Capability: content:read
   */
  async list(
    companyId: string,
    clientId: string,
    query?: ListMediaQuery,
    signal?: AbortSignal,
  ): Promise<ListMediaResult> {
    const q: Record<string, string | number | undefined> = {};
    if (query?.page) q.page = query.page;
    if (query?.limit) q.limit = query.limit;
    if (query?.kind) q.kind = query.kind;

    return apiClient.request<ListMediaResult>({
      method: "GET",
      path: "/media",
      headers: clientScopeHeaders(companyId, clientId),
      query: q,
      signal,
    });
  },

  /**
   * GET /api/v1/media/:id — get one media asset with usage details.
   * Capability: content:read
   */
  async get(
    companyId: string,
    clientId: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<MediaAssetRecord> {
    return apiClient.request<MediaAssetRecord>({
      method: "GET",
      path: `/media/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  /**
   * DELETE /api/v1/media/:id — remove a media asset from the Client's library.
   * Capability: content:write
   * Throws 409 media_in_use if attached to drafts or scheduled posts.
   */
  async remove(
    companyId: string,
    clientId: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<{ removed: boolean }> {
    return apiClient.request<{ removed: boolean }>({
      method: "DELETE",
      path: `/media/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  /**
   * PUT /api/v1/content/drafts/:id/media — attach, detach, or reorder media on a draft.
   * Capability: content:write
   * Optimistic concurrency: payload requires expectedRevision.
   */
  async setDraftMedia(
    companyId: string,
    clientId: string,
    draftId: string,
    expectedRevision: number,
    assetIds: string[],
    signal?: AbortSignal,
  ): Promise<DraftRecord> {
    return apiClient.request<DraftRecord>({
      method: "PUT",
      path: `/content/drafts/${encodeURIComponent(draftId)}/media`,
      headers: clientScopeHeaders(companyId, clientId),
      body: {
        expectedRevision,
        assetIds,
      },
      signal,
    });
  },
};
