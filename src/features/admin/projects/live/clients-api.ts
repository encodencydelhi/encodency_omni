import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";

/**
 * Safe asset shape returned by backend storage services (IMAGE-01 Phase 3).
 * Client rows never return internal asset pointers (logoAssetId, providerPublicId, etc).
 */
export interface SafeAsset {
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

/** A Client row exactly as the backend returns it (backend/prisma/schema.prisma, model Client). */
export interface ClientRecord {
  id: string;
  companyId: string;
  name: string;
  industry: string | null;
  website: string | null;
  targetAudience: string | null;
  createdAt: string;
  updatedAt: string;
  logo: SafeAsset | null;
}

export interface ClientLogoResponse {
  clientId: string;
  logo: SafeAsset | null;
}

/** The only fields POST /clients accepts (backend CreateClientDto); anything else is rejected with 400. */
export interface CreateClientPayload {
  name: string;
  industry?: string;
  website?: string;
  targetAudience?: string;
}

export interface CreateClientFormValues {
  name: string;
  industry: string;
  website: string;
  targetAudience: string;
}

/** Trims the form and omits empty optional fields — never sends anything outside the backend DTO. */
export function toCreateClientPayload(values: CreateClientFormValues): CreateClientPayload {
  const payload: CreateClientPayload = { name: values.name.trim() };
  const industry = values.industry.trim();
  const website = values.website.trim();
  const targetAudience = values.targetAudience.trim();
  if (industry) payload.industry = industry;
  if (website) payload.website = website;
  if (targetAudience) payload.targetAudience = targetAudience;
  return payload;
}

/**
 * Client-side mirror of the backend upload policies for client logos.
 * Supported formats: PNG, JPEG, WebP. Max 5 MB.
 */
export const CLIENT_LOGO_UPLOAD_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/png", "image/jpeg", "image/webp"],
};

export function isAssetConflict(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  const code = (err.detail<string>("serverCode") ?? err.code) as string;
  return code === "asset_conflict" || err.reason === "asset_conflict" || err.status === 409;
}

export function isFileTooLarge(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  const code = (err.detail<string>("serverCode") ?? err.code) as string;
  return code === "file_too_large" || err.status === 413;
}

export function isStorageUnavailable(err: unknown): boolean {
  if (!ApiError.isApiError(err)) return false;
  const code = (err.detail<string>("serverCode") ?? err.code) as string;
  return (
    code === "storage_not_configured" ||
    code === "storage_unavailable" ||
    code === "upload_interrupted" ||
    err.status === 502 ||
    err.status === 503
  );
}

export const CLIENT_LOGO_ERROR_MESSAGES: Record<string, string> = {
  asset_conflict: "This client logo was modified by someone else. Reloading the latest version.",
  file_too_large: "The image exceeds the 5MB size limit.",
  unsupported_format: "Unsupported format. Use PNG, JPG, or WebP.",
  malformed_image: "The selected file is not a valid image.",
  mime_mismatch: "The file type does not match the image contents.",
  extension_mismatch: "The file extension does not match the image contents.",
  storage_not_configured: "Image storage is not configured. Contact your administrator.",
  storage_unavailable: "Image storage is temporarily unavailable. Please try again.",
  upload_interrupted: "The upload was interrupted. Please try again.",
};

export function describeClientLogoError(err: unknown): string {
  if (ApiError.isApiError(err)) {
    if (err.status === 401) return "You must be signed in to manage the client logo.";
    if (err.status === 403) return "You do not have permission to manage this client's logo.";
    if (err.status === 409 || isAssetConflict(err)) return CLIENT_LOGO_ERROR_MESSAGES.asset_conflict ?? "This client logo was modified by someone else. Reloading the latest version.";
    if (err.status === 413 || isFileTooLarge(err)) return CLIENT_LOGO_ERROR_MESSAGES.file_too_large ?? "The image exceeds the 5MB size limit.";
    if (isStorageUnavailable(err)) return CLIENT_LOGO_ERROR_MESSAGES.storage_unavailable ?? "Image storage is temporarily unavailable. Please try again.";
    const code = (err.detail<string>("serverCode") ?? err.code) as string;
    const msg = code ? CLIENT_LOGO_ERROR_MESSAGES[code] : undefined;
    if (msg) return msg;
    return err.message;
  }
  return err instanceof Error ? err.message : "The logo request could not be completed.";
}

export const clientsApi = {
  /** GET /clients — requires `clients:read` in the verified Company. */
  list(companyId: string): Promise<ClientRecord[]> {
    return apiClient.request<ClientRecord[]>({ method: "GET", path: "/clients", headers: companyScopeHeaders(companyId) });
  },

  /** POST /clients — requires `clients:write`; the creator is granted access to the new Client. */
  create(companyId: string, payload: CreateClientPayload): Promise<ClientRecord> {
    return apiClient.request<ClientRecord>({ method: "POST", path: "/clients", body: payload, headers: companyScopeHeaders(companyId) });
  },

  /**
   * GET /clients/:id — the backend requires x-client-id to equal the path id
   * AND an explicit access grant to that Client, even inside the Company.
   */
  get(companyId: string, clientId: string): Promise<ClientRecord> {
    return apiClient.request<ClientRecord>({
      method: "GET",
      path: `/clients/${encodeURIComponent(clientId)}`,
      headers: companyScopeHeaders(companyId, { "x-client-id": clientId }),
    });
  },

  /**
   * PUT /clients/:id/logo — upload or replace a Client's logo (IMAGE-01 Phase 3).
   * Multipart form data with field name "file" and optional "replacesAssetId".
   * Requires `clients:write` for this Client.
   * Context: `x-company-id` must be active company, `x-client-id` must equal `clientId`.
   */
  uploadLogo(
    companyId: string,
    clientId: string,
    file: File | Blob,
    options?: { replacesAssetId?: string },
  ): Promise<ClientLogoResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.replacesAssetId) {
      formData.append("replacesAssetId", options.replacesAssetId);
    }

    return apiClient.request<ClientLogoResponse>({
      method: "PUT",
      path: `/clients/${encodeURIComponent(clientId)}/logo`,
      headers: companyScopeHeaders(companyId, { "x-client-id": clientId }),
      body: formData,
    });
  },

  /**
   * DELETE /clients/:id/logo — remove a Client's logo.
   * Requires `clients:write` for this Client.
   * Headers include x-company-id and x-client-id equal to clientId.
   * Idempotent: repeated delete returns 200 with logo: null.
   */
  removeLogo(companyId: string, clientId: string): Promise<ClientLogoResponse> {
    return apiClient.request<ClientLogoResponse>({
      method: "DELETE",
      path: `/clients/${encodeURIComponent(clientId)}/logo`,
      headers: companyScopeHeaders(companyId, { "x-client-id": clientId }),
    });
  },
};
