import { apiClient } from "@/lib/api/client";

export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "USER";
export type SystemRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
export type CompanyStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type UserStatus = "ACTIVE" | "DEACTIVATED";

export interface SuperAdminUserMembershipRef {
  membershipId: string;
  companyId: string;
  companyName: string;
  companyStatus: CompanyStatus;
  systemRole: SystemRole;
  suspended: boolean;
  clientAccess: Array<{ id: string; name: string }>;
}

export interface SuperAdminUserSummary {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  status: UserStatus;
  deactivatedAt: string | null;
  mfaEnabled: boolean;
  membershipCount: number;
  companyCount: number;
  /** Compact list of the Companies this person belongs to. */
  companies: SuperAdminUserMembershipRef[];
  /** Most recent session activity (null: never signed in). */
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminUserMembership {
  membershipId: string;
  company: {
    id: string;
    name: string;
    status: CompanyStatus;
  };
  systemRole: SystemRole;
  jobTitle: string | null;
  department: string | null;
  clientAccessCount: number;
  clientAccess: Array<{ id: string; name: string }>;
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
}

export interface SuperAdminUserDetail extends SuperAdminUserSummary {
  phone: string | null;
  memberships: SuperAdminUserMembership[];
}

export interface ListSuperAdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  platformRole?: PlatformRole;
  companyId?: string;
  systemRole?: SystemRole;
  status?: UserStatus;
  mfa?: "enabled" | "disabled";
  inactiveDays?: number;
  activeWithinDays?: number;
  neverActive?: boolean;
  accessIssues?: boolean;
  multiCompany?: boolean;
  ownerOnly?: boolean;
  adminOnly?: boolean;
  noMembership?: boolean;
  sort?: "recentlyActive" | "newest" | "oldest" | "nameAsc" | "mostCompanies";
}

export interface SuperAdminUserListResponse {
  items: SuperAdminUserSummary[];
  total: number;
  page: number;
  limit: number;
}

export const superAdminUsersApi = {
  /**
   * GET /api/v1/super-admin/users
   * Super Admin only. No x-company-id header. Read-only V1 (TASK-16).
   */
  async list(query?: ListSuperAdminUsersQuery, signal?: AbortSignal): Promise<SuperAdminUserListResponse> {
    const q: Record<string, string | number | boolean | undefined> = {};
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === "" || value === false) continue;
      q[key] = value as string | number | boolean;
    }

    return apiClient.request<SuperAdminUserListResponse>({
      method: "GET",
      path: "/super-admin/users",
      query: q,
      signal,
    });
  },

  /**
   * GET /api/v1/super-admin/users/:userId
   * Super Admin only. No x-company-id header. Returns detail with memberships.
   */
  async get(userId: string, signal?: AbortSignal): Promise<SuperAdminUserDetail> {
    return apiClient.request<SuperAdminUserDetail>({
      method: "GET",
      path: `/super-admin/users/${encodeURIComponent(userId)}`,
      signal,
    });
  },

  /**
   * PATCH /api/v1/super-admin/users/:userId/status (Phase B1)
   * Super Admin only. Sets status to ACTIVE or DEACTIVATED.
   */
  async setStatus(userId: string, status: UserStatus, signal?: AbortSignal): Promise<{ status: UserStatus }> {
    return apiClient.request<{ status: UserStatus }>({
      method: "PATCH",
      path: `/super-admin/users/${encodeURIComponent(userId)}/status`,
      body: { status },
      signal,
    });
  },

  /**
   * POST /api/v1/super-admin/users/:userId/revoke-sessions (Phase B2)
   * Super Admin only. Revokes all active sessions for another user.
   */
  async revokeSessions(userId: string, signal?: AbortSignal): Promise<{ revokedSessions: number }> {
    return apiClient.request<{ revokedSessions: number }>({
      method: "POST",
      path: `/super-admin/users/${encodeURIComponent(userId)}/revoke-sessions`,
      signal,
    });
  },

  /**
   * POST /api/v1/super-admin/users/:userId/password-reset (Phase B3)
   * Super Admin only. Triggers admin-issued password reset email for an active user.
   */
  async passwordReset(userId: string, signal?: AbortSignal): Promise<{ status: "queued" }> {
    return apiClient.request<{ status: "queued" }>({
      method: "POST",
      path: `/super-admin/users/${encodeURIComponent(userId)}/password-reset`,
      signal,
    });
  },

  /** PUT /api/v1/super-admin/users/:userId: account identity (name, phone) of another user. */
  async updateProfile(userId: string, body: { name?: string; phone?: string | null }): Promise<unknown> {
    return apiClient.request({ method: "PUT", path: `/super-admin/users/${encodeURIComponent(userId)}`, body });
  },

  sessions(userId: string): Promise<{ items: LiveUserSession[] }> {
    return apiClient.request({ method: "GET", path: `/super-admin/users/${encodeURIComponent(userId)}/sessions` });
  },

  revokeSession(userId: string, sessionId: string): Promise<{ sessionId: string; revoked: true }> {
    return apiClient.request({ method: "DELETE", path: `/super-admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}` });
  },

  kpis(): Promise<LiveUserKpis> {
    return apiClient.request({ method: "GET", path: "/super-admin/user-insights/kpis" });
  },

  attention(): Promise<{ items: LiveAttentionItem[] }> {
    return apiClient.request({ method: "GET", path: "/super-admin/user-insights/attention" });
  },

  activity(query: { userId?: string; companyId?: string; search?: string; limit?: number } = {}): Promise<{ items: LiveFeedItem[] }> {
    return apiClient.request({ method: "GET", path: "/super-admin/user-insights/activity", query });
  },

  lifecycle(userId?: string): Promise<{ items: LiveFeedItem[] }> {
    return apiClient.request({ method: "GET", path: "/super-admin/user-insights/lifecycle", query: { userId } });
  },

  securityEvents(userId?: string): Promise<{ items: LiveFeedItem[] }> {
    return apiClient.request({ method: "GET", path: "/super-admin/user-insights/security-events", query: { userId } });
  },

  notify(body: { userIds: string[]; title: string; message: string }): Promise<{ delivered: number; skipped: number }> {
    return apiClient.request({ method: "POST", path: "/super-admin/user-insights/notify", body });
  },

  listInvitations(query: { status?: string; companyId?: string; search?: string; page?: number; limit?: number } = {}): Promise<LiveInvitationList> {
    return apiClient.request({ method: "GET", path: "/super-admin/invitations", query });
  },

  invite(companyId: string, body: { email: string; systemRole: SystemRole; clientRestrictions?: string[] }): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/super-admin/invitations/company/${encodeURIComponent(companyId)}`, body });
  },

  resendInvitation(id: string): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/super-admin/invitations/${encodeURIComponent(id)}/resend` });
  },

  revokeInvitation(id: string): Promise<unknown> {
    return apiClient.request({ method: "DELETE", path: `/super-admin/invitations/${encodeURIComponent(id)}` });
  },

  addMembership(userId: string, body: { companyId: string; systemRole: SystemRole; clientIds?: string[] }): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/super-admin/users/${encodeURIComponent(userId)}/memberships`, body });
  },

  changeRole(membershipId: string, systemRole: SystemRole): Promise<unknown> {
    return apiClient.request({ method: "PUT", path: `/super-admin/memberships/${encodeURIComponent(membershipId)}/role`, body: { systemRole } });
  },

  setClientAccess(membershipId: string, clientIds: string[]): Promise<unknown> {
    return apiClient.request({ method: "PUT", path: `/super-admin/memberships/${encodeURIComponent(membershipId)}/client-access`, body: { clientIds } });
  },

  suspendMembership(membershipId: string, reason?: string): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/super-admin/memberships/${encodeURIComponent(membershipId)}/suspend`, body: { reason } });
  },

  reactivateMembership(membershipId: string): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/super-admin/memberships/${encodeURIComponent(membershipId)}/reactivate` });
  },

  removeMembership(membershipId: string): Promise<unknown> {
    return apiClient.request({ method: "DELETE", path: `/super-admin/memberships/${encodeURIComponent(membershipId)}` });
  },

  transferOwnership(companyId: string, body: { fromMembershipId: string; toMembershipId: string; previousOwnerRole?: SystemRole; reason?: string }): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `/super-admin/companies/${encodeURIComponent(companyId)}/transfer-ownership`, body });
  },
};

export interface LiveUserSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress: string | null;
  [key: string]: unknown;
}

export interface LiveUserKpis {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  mfaEnabled: number;
  mfaDisabled: number;
  multiCompanyUsers: number;
  inactive30PlusDays: number;
  pendingInvitations: number;
  needsAttention: number;
}

export interface LiveAttentionItem {
  id: string;
  kind: "no_mfa" | "no_active_owner" | "invitation_expired" | "invitation_expiring";
  severity: "critical" | "warning" | "info";
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  companyId: string | null;
  companyName: string | null;
  at: string;
  invitationId?: string;
}

export interface LiveFeedItem {
  id: string;
  at: string;
  actor: { userId: string; name: string | null; email: string | null } | null;
  action: string;
  label: string;
  module: string;
  resourceType: string;
  resourceLabel: string;
  resourceId: string | null;
  companyId: string | null;
  companyName: string | null;
  clientId: string | null;
  clientName: string | null;
  outcome: string;
  details: Record<string, unknown> | null;
}

export interface LiveInvitationRow {
  id: string;
  email: string;
  systemRole: SystemRole;
  clientCount: number;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  company: { id: string; name: string };
  invitedBy: { userId: string; name: string | null; email: string };
}

export interface LiveInvitationList {
  items: LiveInvitationRow[];
  total: number;
  page: number;
  limit: number;
  counts: { pending: number; accepted: number; revoked: number; expired: number };
}
