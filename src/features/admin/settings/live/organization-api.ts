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
  timezone: string | null;
  currency: string | null;
  revision: number;
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
  timezone?: string | null;
  currency?: string | null;
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
