import { apiClient } from "@/lib/api/client";
import type { SafeAsset } from "@/features/admin/projects/live/clients-api";

export type OwnerOnboardingState = "invited" | "invitation_expired" | "none" | "active";

export interface OwnerOnboarding {
  state: OwnerOnboardingState;
  ownerEmail: string | null;
  invitationExpiresAt?: string | null;
  emailQueued?: boolean;
}

export interface SuperAdminCompanyRecord {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  clientCount: number;
  ownerEmail: string | null;
  ownerOnboarding?: OwnerOnboarding | null;
  logo: SafeAsset | null;
}

export interface SuperAdminClientDirectoryItem {
  id: string;
  name: string;
  displayName: string | null;
  companyId: string;
  companyName: string;
  industry: string | null;
  website: string | null;
  timezone: string | null;
  language: string | null;
  lead: {
    membershipId: string;
    userId: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  logo: SafeAsset | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminClientsDirectoryResult {
  items: SuperAdminClientDirectoryItem[];
  total: number;
  page: number;
  limit: number;
}

export const superAdminCompaniesApi = {
  /**
   * POST /api/v1/super-admin/companies
   * Platform Super Admin only.
   * Requires Idempotency-Key header.
   * Body must only contain { name, ownerEmail }.
   */
  create(
    name: string,
    ownerEmail: string,
    idempotencyKey: string = crypto.randomUUID(),
  ): Promise<SuperAdminCompanyRecord> {
    return apiClient.request<SuperAdminCompanyRecord>({
      method: "POST",
      path: "/super-admin/companies",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: {
        name: name.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
      },
    });
  },

  /**
   * POST /api/v1/super-admin/companies/:companyId/owner-invitation/resend
   * Resends the owner invitation email, revoking any pending one.
   */
  resendOwnerInvitation(
    companyId: string,
    ownerEmail?: string,
  ): Promise<SuperAdminCompanyRecord> {
    return apiClient.request<SuperAdminCompanyRecord>({
      method: "POST",
      path: `/super-admin/companies/${encodeURIComponent(companyId)}/owner-invitation/resend`,
      body: ownerEmail ? { ownerEmail: ownerEmail.trim().toLowerCase() } : {},
    });
  },

  /**
   * GET /api/v1/super-admin/clients
   * Super Admin read-only Client Directory across all companies.
   */
  listClients(query?: {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
  }): Promise<SuperAdminClientsDirectoryResult> {
    return apiClient.request<SuperAdminClientsDirectoryResult>({
      method: "GET",
      path: "/super-admin/clients",
      query,
    });
  },
};
