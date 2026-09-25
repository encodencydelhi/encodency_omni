import { ApiError } from "@/types/api";
import type { MockRoutes } from "../lib/router";

interface StoredBrandingAsset {
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

interface CompanyBrandingState {
  logo: StoredBrandingAsset | null;
  favicon: StoredBrandingAsset | null;
  reportLogo: StoredBrandingAsset | null;
  emailLogo: StoredBrandingAsset | null;
}

type BrandingField = keyof CompanyBrandingState;

const brandingStore = new Map<string, CompanyBrandingState>();

function getCompanyBranding(companyId: string): CompanyBrandingState {
  let state = brandingStore.get(companyId);
  if (!state) {
    state = { logo: null, favicon: null, reportLogo: null, emailLogo: null };
    brandingStore.set(companyId, state);
  }
  return state;
}

const VALID_PURPOSES = new Set(["logo", "favicon", "report-logo", "email-logo"]);
const PURPOSE_FIELD_MAP: Record<string, BrandingField> = {
  logo: "logo",
  favicon: "favicon",
  "report-logo": "reportLogo",
  "email-logo": "emailLogo",
};

function requireCompany(headers?: Record<string, string>): string {
  const companyId = headers?.["x-company-id"];
  if (!companyId) {
    throw new ApiError({
      code: "NO_COMPANY_SELECTED",
      message: "Header x-company-id is required.",
      status: 400,
    });
  }
  return companyId;
}

function resolvePurpose(purpose: string): BrandingField {
  const field = VALID_PURPOSES.has(purpose) ? PURPOSE_FIELD_MAP[purpose] : undefined;
  if (!field) {
    throw new ApiError({
      code: "NOT_FOUND",
      message: `Unknown branding slot. Use one of: ${Array.from(VALID_PURPOSES).join(", ")}.`,
      status: 404,
    });
  }
  return field;
}

function readReplacesAssetId(body: unknown): string | undefined {
  if (body instanceof FormData) {
    const value = body.get("replacesAssetId");
    return typeof value === "string" ? value : undefined;
  }
  if (body && typeof body === "object" && "replacesAssetId" in body) {
    const value = (body as { replacesAssetId?: unknown }).replacesAssetId;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function assertSlotUnchanged(field: BrandingField, current: CompanyBrandingState, replacesAssetId: string | undefined): void {
  if (replacesAssetId !== undefined && current[field]?.id !== replacesAssetId) {
    throw new ApiError({
      code: "CONFLICT",
      reason: "asset_conflict",
      message: "This branding slot was changed by someone else. Reload and try again.",
      status: 409,
      details: { serverCode: "asset_conflict" },
    });
  }
}

function buildAsset(companyId: string, purpose: string): StoredBrandingAsset {
  const isFavicon = purpose === "favicon";
  return {
    id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    purpose: purpose.toUpperCase().replace(/-/g, "_"),
    url: `https://res.cloudinary.com/omni-mock/image/upload/v1727170000/companies/${companyId}/${purpose}.png`,
    mimeType: "image/png",
    format: "png",
    bytes: isFavicon ? 4096 : 24576,
    width: isFavicon ? 64 : 400,
    height: isFavicon ? 64 : 120,
    uploadedAt: new Date().toISOString(),
  };
}

export const brandingRoutes: MockRoutes = {
  "GET /settings/branding": ({ headers }) => getCompanyBranding(requireCompany(headers)),

  "PUT /settings/branding/:purpose": ({ params, headers, body }) => {
    const companyId = requireCompany(headers);
    const field = resolvePurpose(params.purpose ?? "");
    const state = getCompanyBranding(companyId);

    assertSlotUnchanged(field, state, readReplacesAssetId(body));

    state[field] = buildAsset(companyId, params.purpose ?? "");
    return { ...state };
  },

  "DELETE /settings/branding/:purpose": ({ params, headers }) => {
    const companyId = requireCompany(headers);
    const field = resolvePurpose(params.purpose ?? "");
    const state = getCompanyBranding(companyId);

    state[field] = null;
    return { ...state };
  },

  "PUT /super-admin/companies/:companyId/logo": ({ params, body }) => {
    const companyId = params.companyId ?? "";
    if (!companyId) {
      throw new ApiError({ code: "NOT_FOUND", message: "Company ID is required.", status: 404 });
    }

    const state = getCompanyBranding(companyId);
    assertSlotUnchanged("logo", state, readReplacesAssetId(body));

    state.logo = { ...buildAsset(companyId, "logo"), purpose: "COMPANY_LOGO" };
    return { ...state };
  },

  "DELETE /super-admin/companies/:companyId/logo": ({ params }) => {
    const companyId = params.companyId ?? "";
    if (!companyId) {
      throw new ApiError({ code: "NOT_FOUND", message: "Company ID is required.", status: 404 });
    }

    const state = getCompanyBranding(companyId);
    state.logo = null;
    return { ...state };
  },

  "PUT /clients/:id/logo": ({ params, headers, body }) => {
    const clientId = params.id ?? "";
    if (!clientId) {
      throw new ApiError({ code: "NOT_FOUND", message: "Client ID is required.", status: 404 });
    }
    const asset = {
      id: `asset_logo_${clientId}`,
      purpose: "CLIENT_LOGO",
      url: `https://res.cloudinary.com/demo/image/upload/v1/client_logo_${clientId}.png`,
      mimeType: "image/png",
      format: "png",
      bytes: 2048,
      width: 200,
      height: 200,
      uploadedAt: new Date().toISOString(),
    };
    return { clientId, logo: asset };
  },

  "DELETE /clients/:id/logo": ({ params }) => {
    const clientId = params.id ?? "";
    if (!clientId) {
      throw new ApiError({ code: "NOT_FOUND", message: "Client ID is required.", status: 404 });
    }
    return { clientId, logo: null };
  },
};
