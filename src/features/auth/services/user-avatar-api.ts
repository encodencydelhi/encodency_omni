import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { SafeAssetSummary } from "@/types/domain/auth";

export const USER_AVATAR_LIMITS = {
  maxBytes: 2 * 1024 * 1024, // 2MB
  mimeTypes: ["image/png", "image/jpeg", "image/webp"],
};

export interface UserAvatarResponse {
  avatar: SafeAssetSummary | null;
}

function avatarErrorCode(err: unknown): string | undefined {
  if (!ApiError.isApiError(err)) return undefined;
  return err.detail<string>("serverCode") ?? (err.code as string);
}

export function isAvatarAssetConflict(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  return avatarErrorCode(err) === "asset_conflict" || err.reason === "asset_conflict";
}

export function isAvatarFileTooLarge(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  return avatarErrorCode(err) === "file_too_large" || err.status === 413;
}

export function isAvatarStorageUnavailable(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  const code = avatarErrorCode(err);
  return (
    code === "storage_not_configured" ||
    code === "storage_unavailable" ||
    code === "upload_interrupted" ||
    err.status === 502 ||
    err.status === 503
  );
}

export const userAvatarApi = {
  async upload(file: Blob, options?: { replacesAssetId?: string }): Promise<UserAvatarResponse> {
    const form = new FormData();
    form.append("file", file);
    if (options?.replacesAssetId) {
      form.append("replacesAssetId", options.replacesAssetId);
    }
    return apiClient.request<UserAvatarResponse>({
      method: "PUT",
      path: "/users/me/avatar",
      body: form,
    });
  },

  async remove(): Promise<UserAvatarResponse> {
    return apiClient.request<UserAvatarResponse>({
      method: "DELETE",
      path: "/users/me/avatar",
    });
  },
};
