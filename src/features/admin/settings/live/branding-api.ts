import { apiClient } from "@/lib/api/client";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";

export type BrandingPurpose = "logo" | "favicon" | "report-logo" | "email-logo";

export interface BrandingAsset {
  id: string;
  purpose: string;
  url: string;
  mimeType: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
}

export interface BrandingResponse {
  logo: BrandingAsset | null;
  favicon: BrandingAsset | null;
  reportLogo: BrandingAsset | null;
  emailLogo: BrandingAsset | null;
}

/**
 * Client-side mirror of the backend `upload-policies.ts` limits, used to fail
 * fast before a request. The server stays authoritative: its rejection codes
 * are surfaced through the predicates below.
 */
export const BRANDING_UPLOAD_LIMITS: Record<BrandingPurpose, { maxBytes: number; mimeTypes: string[]; square: boolean }> = {
  logo: { maxBytes: 5 * 1024 * 1024, mimeTypes: ["image/png", "image/jpeg", "image/webp"], square: false },
  "report-logo": { maxBytes: 5 * 1024 * 1024, mimeTypes: ["image/png", "image/jpeg", "image/webp"], square: false },
  "email-logo": { maxBytes: 5 * 1024 * 1024, mimeTypes: ["image/png", "image/jpeg", "image/webp"], square: false },
  favicon: { maxBytes: 512 * 1024, mimeTypes: ["image/png", "image/webp"], square: true },
};

/** The backend's domain error code (`asset_conflict`, `file_too_large`, …). */
function brandingCode(err: unknown): string | undefined {
  if (!ApiError.isApiError(err)) return undefined;
  return err.detail<string>("serverCode") ?? (err.code as string);
}

export function isAssetConflict(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  return brandingCode(err) === "asset_conflict" || err.reason === "asset_conflict";
}

export function isFileTooLarge(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  return brandingCode(err) === "file_too_large" || err.status === 413;
}

export function isStorageUnavailable(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  const code = brandingCode(err);
  return code === "storage_not_configured" || code === "storage_unavailable" || code === "upload_interrupted" || err.status === 502 || err.status === 503;
}

export function isCompanyInactive(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  return brandingCode(err) === "company_not_active";
}

const BRANDING_ERROR_MESSAGES: Record<string, string> = {
  asset_conflict: "This branding slot was changed by someone else. Reloading the latest version.",
  company_not_active: "This Company is not active, so branding cannot be changed.",
  file_required: "No image was received. Choose a file and try again.",
  purpose_not_supported: "This branding slot does not accept uploads.",
  empty_file: "The selected file is empty.",
  file_too_large: "The image exceeds the size limit for this slot.",
  unsupported_format: "Unsupported image format for this slot.",
  format_not_allowed_for_purpose: "This slot does not accept that image format.",
  malformed_image: "The selected file is not a valid image.",
  mime_mismatch: "The file type does not match the image contents.",
  extension_mismatch: "The file name extension does not match the image contents.",
  animated_not_allowed: "Animated images are not allowed here.",
  dimensions_out_of_range: "The image dimensions are outside the allowed range.",
  not_square: "This slot requires a square image.",
  storage_not_configured: "Image storage is not configured. Contact your administrator.",
  storage_unavailable: "Image storage is temporarily unavailable. Please try again.",
  upload_interrupted: "The upload could not be completed. Please try again.",
};

/** Human-readable fallback for any branding failure, keyed by backend code. */
export function describeBrandingError(err: unknown): string {
  if (ApiError.isApiError(err)) {
    const code = brandingCode(err);
    if (code && BRANDING_ERROR_MESSAGES[code]) return BRANDING_ERROR_MESSAGES[code];
    return err.message;
  }
  return err instanceof Error ? err.message : "The request could not be completed.";
}

function requireExplicitCompanyId(companyId: string): string {
  if (!companyId) {
    throw new ApiError({
      code: "NO_COMPANY_SELECTED",
      message: "Company ID is required.",
      status: 400,
    });
  }
  return companyId;
}

function requireCompanyId(companyId?: string): string {
  const activeCompanyId = companyId || getStoredCompanyId();
  if (!activeCompanyId) {
    throw new ApiError({
      code: "NO_COMPANY_SELECTED",
      message: "A company must be selected to manage branding settings.",
      status: 400,
    });
  }
  return activeCompanyId;
}

export const brandingApi = {
  /**
   * Reads Company branding assets across all 4 slots.
   * Requires branding:read capability (every role).
   */
  async get(companyId?: string): Promise<BrandingResponse> {
    return apiClient.request<BrandingResponse>({
      method: "GET",
      path: "/settings/branding",
      headers: { "x-company-id": requireCompanyId(companyId) },
    });
  },

  /**
   * Uploads or replaces an asset for a specific branding slot (multipart,
   * field name `file`). Requires branding:write (OWNER and ADMIN).
   */
  async upload(
    purpose: BrandingPurpose,
    file: File | Blob,
    options?: { replacesAssetId?: string; companyId?: string },
  ): Promise<BrandingResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.replacesAssetId) {
      formData.append("replacesAssetId", options.replacesAssetId);
    }

    return apiClient.request<BrandingResponse>({
      method: "PUT",
      path: `/settings/branding/${encodeURIComponent(purpose)}`,
      headers: { "x-company-id": requireCompanyId(options?.companyId) },
      body: formData,
    });
  },

  /**
   * Removes an asset from a specific branding slot.
   * Idempotent: repeated delete on an already empty slot succeeds safely.
   */
  async remove(purpose: BrandingPurpose, companyId?: string): Promise<BrandingResponse> {
    return apiClient.request<BrandingResponse>({
      method: "DELETE",
      path: `/settings/branding/${encodeURIComponent(purpose)}`,
      headers: { "x-company-id": requireCompanyId(companyId) },
    });
  },

  /**
   * Super Admin route: uploads or replaces the primary Company logo ONLY.
   * The target Company is always explicit — never the active tenant.
   */
  async uploadSuperAdminLogo(companyId: string, file: File | Blob, replacesAssetId?: string): Promise<BrandingResponse> {
    requireExplicitCompanyId(companyId);

    const formData = new FormData();
    formData.append("file", file);
    if (replacesAssetId) {
      formData.append("replacesAssetId", replacesAssetId);
    }

    return apiClient.request<BrandingResponse>({
      method: "PUT",
      path: `/super-admin/companies/${encodeURIComponent(companyId)}/logo`,
      body: formData,
    });
  },

  /** Super Admin route: removes the primary Company logo. */
  async removeSuperAdminLogo(companyId: string): Promise<BrandingResponse> {
    requireExplicitCompanyId(companyId);

    return apiClient.request<BrandingResponse>({
      method: "DELETE",
      path: `/super-admin/companies/${encodeURIComponent(companyId)}/logo`,
    });
  },
};
