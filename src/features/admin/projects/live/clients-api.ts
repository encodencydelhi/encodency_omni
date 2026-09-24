import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

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
};
