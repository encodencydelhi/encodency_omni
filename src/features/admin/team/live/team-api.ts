import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type { CompanySystemRole } from "@/types/domain/auth";

/** One row of GET /team/members, exactly as the backend returns it. */
export interface TeamMemberRecord {
  id: string;
  systemRole: CompanySystemRole;
  createdAt: string;
  user: { id: string; email: string };
}

/** POST /companies/:companyId/invitations request (backend CreateInvitationDto). */
export interface CreateInvitationPayload {
  email: string;
  systemRole: CompanySystemRole;
}

/**
 * POST /companies/:companyId/invitations response. `token` is a single-use
 * bearer secret (the manual-relay fallback): keep it in memory only — never
 * log, persist or send it anywhere but to the invitee.
 */
export interface InvitationCreatedResponse {
  invitationId: string;
  status: "pending";
  expiresAt: string;
  token: string;
}

export const teamApi = {
  /** GET /team/members — Company membership required. */
  listMembers(companyId: string): Promise<TeamMemberRecord[]> {
    return apiClient.request<TeamMemberRecord[]>({ method: "GET", path: "/team/members", headers: companyScopeHeaders(companyId) });
  },

  /** PUT /team/members/:membershipId/role — `team:manage` plus the backend's rank rules. */
  updateRole(companyId: string, membershipId: string, systemRole: CompanySystemRole): Promise<TeamMemberRecord> {
    return apiClient.request<TeamMemberRecord>({
      method: "PUT",
      path: `/team/members/${encodeURIComponent(membershipId)}/role`,
      body: { systemRole },
      headers: companyScopeHeaders(companyId),
    });
  },

  /** Creates the invitation and queues the invitation email (TASK-08 notifications queue). */
  createInvitation(companyId: string, payload: CreateInvitationPayload): Promise<InvitationCreatedResponse> {
    return apiClient.request<InvitationCreatedResponse>({
      method: "POST",
      path: `/companies/${encodeURIComponent(companyId)}/invitations`,
      body: payload,
      headers: companyScopeHeaders(companyId),
    });
  },

  /** Public: the invitee has no account or session yet. Does not sign anyone in. */
  acceptInvitation(token: string, password: string): Promise<{ status: "accepted"; membershipId: string }> {
    return apiClient.request({ method: "POST", path: "/invitations/accept", body: { token, password }, skipSessionExpiry: true });
  },
};

export function invitationLink(origin: string, token: string): string {
  return `${origin}/accept-invitation?token=${encodeURIComponent(token)}`;
}
