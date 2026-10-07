import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type { CompanySystemRole } from "@/types/domain/auth";

/** One row of GET /team/members, exactly as the backend returns it. */
export interface TeamMemberRecord {
  id: string;
  systemRole: CompanySystemRole;
  jobTitle?: string | null;
  department?: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  /** Clients this member has explicit access to (names only). */
  clientAccess?: Array<{ clientId: string; clientName: string }>;
  /** Set while the member's access to this Company is suspended. */
  suspendedAt?: string | null;
  suspensionReason?: string | null;
}

/** Validation response from POST /invitations/validate */
export interface InvitationValidationResponse {
  valid: boolean;
  email: string;
  companyName: string;
  systemRole: CompanySystemRole;
  expiresAt: string;
  accountExists: boolean;
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

/** One row of GET /companies/:companyId/invitations, exactly as backend returns it (Phase A1). */
export interface TeamInvitationRecord {
  id: string;
  email: string;
  systemRole: CompanySystemRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
}

export interface ListInvitationsParams {
  page?: number;
  limit?: number;
  status?: "pending" | "accepted" | "revoked" | "expired";
}

export interface ListInvitationsResponse {
  items: TeamInvitationRecord[];
  total: number;
  page: number;
  limit: number;
}

/** One row of GET /team/activity: what a member of this Company did (no metadata, IP or user agent). */
export interface TeamActivityRecord {
  id: string;
  at: string;
  actor: { userId: string; membershipId: string | null; name: string | null; email: string | null } | null;
  action: string;
  label: string;
  module: string;
  resourceType: string;
  resourceLabel: string;
  resourceId: string | null;
  clientId: string | null;
  clientName: string | null;
  outcome: "SUCCESS" | "FAILURE";
}

export interface TeamActivityResponse {
  items: TeamActivityRecord[];
  nextBefore: string | null;
}

/** One group of GET /team/groups (members and clients are listed by name; groups grant no capability). */
export interface TeamGroupRecord {
  id: string;
  name: string;
  description: string | null;
  lead: { membershipId: string; name: string | null; email: string } | null;
  memberCount: number;
  clientCount: number;
  members: Array<{ membershipId: string; name: string | null; email: string; systemRole: string; jobTitle: string | null }>;
  clients: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface TeamGroupInput {
  name?: string;
  description?: string;
  leadMembershipId?: string | null;
  memberIds?: string[];
  clientIds?: string[];
}

export const teamApi = {
  /** GET /team/groups - Company membership is enough to read. */
  listGroups(companyId: string, includeArchived = false): Promise<{ items: TeamGroupRecord[] }> {
    return apiClient.request({ method: "GET", path: "/team/groups", query: includeArchived ? { includeArchived: true } : undefined, headers: companyScopeHeaders(companyId) });
  },

  /** POST /team/groups - team:manage. */
  createGroup(companyId: string, input: TeamGroupInput & { name: string }): Promise<TeamGroupRecord> {
    return apiClient.request({ method: "POST", path: "/team/groups", body: input, headers: companyScopeHeaders(companyId) });
  },

  /** PATCH /team/groups/:id - team:manage. `memberIds` / `clientIds` replace the whole set; `leadMembershipId: null` clears the lead. */
  updateGroup(companyId: string, groupId: string, input: TeamGroupInput): Promise<TeamGroupRecord> {
    return apiClient.request({ method: "PATCH", path: `/team/groups/${encodeURIComponent(groupId)}`, body: input, headers: companyScopeHeaders(companyId) });
  },

  /** DELETE /team/groups/:id - archives (never deletes). */
  archiveGroup(companyId: string, groupId: string): Promise<{ id: string; archived: true }> {
    return apiClient.request({ method: "DELETE", path: `/team/groups/${encodeURIComponent(groupId)}`, headers: companyScopeHeaders(companyId) });
  },

  /** DELETE /team/members/:membershipId - removes the member from this Company only. */
  removeMember(companyId: string, membershipId: string): Promise<{ membershipId: string; removed: true }> {
    return apiClient.request({ method: "DELETE", path: `/team/members/${encodeURIComponent(membershipId)}`, headers: companyScopeHeaders(companyId) });
  },

  /** POST /team/members/:membershipId/suspend - blocks access to this Company without removing anything (team:manage). */
  suspendMember(companyId: string, membershipId: string, reason?: string): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/team/members/${encodeURIComponent(membershipId)}/suspend`, body: reason ? { reason } : {}, headers: companyScopeHeaders(companyId) });
  },

  /** POST /team/members/:membershipId/reactivate - restores a suspended member (team:manage). */
  reactivateMember(companyId: string, membershipId: string): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/team/members/${encodeURIComponent(membershipId)}/reactivate`, headers: companyScopeHeaders(companyId) });
  },

  /** POST /clients/:id/members - gives members explicit access to one Client (team:manage). */
  grantClientAccess(companyId: string, clientId: string, membershipIds: string[]): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/clients/${encodeURIComponent(clientId)}/members`, body: { membershipIds }, headers: companyScopeHeaders(companyId) });
  },

  /** DELETE /clients/:id/members/:membershipId - removes one member's access to one Client (team:manage). */
  revokeClientAccess(companyId: string, clientId: string, membershipId: string): Promise<unknown> {
    return apiClient.request({ method: "DELETE", path: `/clients/${encodeURIComponent(clientId)}/members/${encodeURIComponent(membershipId)}`, headers: companyScopeHeaders(companyId) });
  },

  /** GET /team/activity - `team:manage` (OWNER/ADMIN). */
  listActivity(companyId: string, params?: { limit?: number; before?: string; clientId?: string }): Promise<TeamActivityResponse> {
    return apiClient.request<TeamActivityResponse>({
      method: "GET",
      path: "/team/activity",
      query: { limit: params?.limit ?? 100, before: params?.before, clientId: params?.clientId },
      headers: companyScopeHeaders(companyId),
    });
  },

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

  /** PATCH /team/members/:membershipId/profile — updates jobTitle and department. */
  updateMemberProfile(
    companyId: string,
    membershipId: string,
    payload: { jobTitle?: string | null; department?: string | null },
  ): Promise<TeamMemberRecord> {
    return apiClient.request<TeamMemberRecord>({
      method: "PATCH",
      path: `/team/members/${encodeURIComponent(membershipId)}/profile`,
      body: payload,
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

  /** Public step 1: read-only validate invitation token, checking if account exists. */
  validateInvitation(token: string): Promise<InvitationValidationResponse> {
    return apiClient.request({
      method: "POST",
      path: "/invitations/validate",
      body: { token },
      skipSessionExpiry: true,
    });
  },

  /** Public step 2 (Path A - new user): accepts with password and creates account. */
  acceptInvitation(token: string, password: string, name?: string): Promise<{ status: "accepted"; membershipId: string }> {
    return apiClient.request({
      method: "POST",
      path: "/invitations/accept",
      body: { token, password, ...(name?.trim() ? { name: name.trim() } : {}) },
      skipSessionExpiry: true,
    });
  },

  /** Authenticated step 2 (Path B - existing account): consumes token for logged-in user. */
  finalizeInvitation(token: string): Promise<{ status: "accepted"; membershipId: string; companyId: string }> {
    return apiClient.request({
      method: "POST",
      path: "/invitations/finalize",
      body: { token },
    });
  },

  /** GET /companies/:companyId/invitations — list team invitations (Phase A1). */
  listInvitations(companyId: string, params?: ListInvitationsParams): Promise<ListInvitationsResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page) query.page = params.page;
    if (params?.limit) query.limit = params.limit;
    if (params?.status) query.status = params.status;
    return apiClient.request<ListInvitationsResponse>({
      method: "GET",
      path: `/companies/${encodeURIComponent(companyId)}/invitations`,
      query,
      headers: companyScopeHeaders(companyId),
    });
  },

  /** POST /companies/:companyId/invitations/:invitationId/resend — resend an invitation (Phase A1). */
  resendInvitation(
    companyId: string,
    invitationId: string,
  ): Promise<{ invitationId: string; status: "pending"; expiresAt: string }> {
    return apiClient.request({
      method: "POST",
      path: `/companies/${encodeURIComponent(companyId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
      headers: companyScopeHeaders(companyId),
    });
  },

  /** DELETE /companies/:companyId/invitations/:invitationId — revoke an invitation (Phase A1). */
  revokeInvitation(companyId: string, invitationId: string): Promise<{ invitationId: string; status: "revoked" }> {
    return apiClient.request({
      method: "DELETE",
      path: `/companies/${encodeURIComponent(companyId)}/invitations/${encodeURIComponent(invitationId)}`,
      headers: companyScopeHeaders(companyId),
    });
  },
};

export function invitationLink(origin: string, token: string): string {
  return `${origin}/accept-invitation?token=${encodeURIComponent(token)}`;
}
