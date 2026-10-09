import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

export interface OrganizationAddressPayload {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  displayName: string;
  legalName: string | null;
  industry: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  address: OrganizationAddressPayload | null;
  taxId: string | null;
  /** Permanent Account Number; absent on a server that has not stored one yet. */
  pan?: string | null;
  timezone: string | null;
  currency: string | null;
  revision: number;
  /** When the Company was created (absent on a server that does not send it yet). */
  createdAt?: string;
  updatedAt: string;
}

export interface UpdateOrganizationPayload {
  expectedRevision: number;
  displayName?: string;
  legalName?: string | null;
  industry?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  address?: OrganizationAddressPayload | null;
  taxId?: string | null;
  pan?: string | null;
  timezone?: string | null;
  currency?: string | null;
}

export function isRevisionConflict(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as any).status;
  const reason = (err as any).reason;
  return status === 409 || reason === "revision_conflict";
}

export function describeOrganizationError(err: unknown): string {
  if (err && typeof err === "object") {
    const errorObj = err as any;
    if (errorObj.reason === "revision_conflict" || errorObj.status === 409) {
      return "The organization profile was modified by another session. Please reload and try again.";
    }
    if (errorObj.fieldErrors && typeof errorObj.fieldErrors === "object") {
      const entries = Object.entries(errorObj.fieldErrors);
      const firstEntry = entries[0];
      if (firstEntry) {
        return `${firstEntry[0]}: ${firstEntry[1]}`;
      }
    }
    if (errorObj.message) return errorObj.message;
  }
  return err instanceof Error ? err.message : "Failed to save organization settings.";
}

export const organizationApi = {
  /** GET /settings/organization — Company context, capability organization:read */
  get(companyId: string, signal?: AbortSignal): Promise<OrganizationRecord> {
    return apiClient.request<OrganizationRecord>({
      method: "GET",
      path: "/settings/organization",
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },

  /** PATCH /settings/organization — Company context, capability organization:write */
  update(companyId: string, payload: UpdateOrganizationPayload, signal?: AbortSignal): Promise<OrganizationRecord> {
    return apiClient.request<OrganizationRecord>({
      method: "PATCH",
      path: "/settings/organization",
      headers: companyScopeHeaders(companyId),
      body: payload,
      signal,
    });
  },
};

