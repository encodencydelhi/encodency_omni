import { apiClient } from "@/lib/api/client";

export type StaffPlatformRole = "SUPER_ADMIN" | "SUPPORT";
export type StaffResponsibilityKey = "PRIMARY_OWNER" | "BACKUP_OWNER" | "SUPPORT_OWNER" | "INTEGRATION_SUPPORT" | "BILLING_CONTACT";
export type StaffReviewState = "not_scheduled" | "upcoming" | "due" | "overdue" | "completed";
export type StaffReviewOutcomeKey = "CONFIRMED" | "ROLE_CHANGE_RECOMMENDED" | "ACCESS_REMOVAL_RECOMMENDED";

export interface LiveStaffAssignment {
  id: string;
  companyId: string;
  companyName: string;
  responsibility: StaffResponsibilityKey;
  status: "ACTIVE" | "PENDING_HANDOVER" | "INACTIVE";
  assignedAt: string;
  assignedBy: { id: string; name: string | null; email: string } | null;
}

export interface LiveStaff {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  platformRole: StaffPlatformRole;
  status: "ACTIVE" | "DEACTIVATED";
  mfaEnabled: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  jobTitle: string | null;
  department: string | null;
  assignments: LiveStaffAssignment[];
  review: { status: StaffReviewState; lastReviewAt: string | null; nextReviewAt: string | null; openReviewId: string | null };
}

export interface LiveStaffList {
  items: LiveStaff[];
  total: number;
  page: number;
  limit: number;
  departments: string[];
}

export interface LiveStaffKpis {
  totalStaff: number;
  activeStaff: number;
  pendingInvitations: number;
  suspendedStaff: number;
  mfaActionRequired: number;
  accessReviewsDue: number;
  overdueReviews: number;
  privilegedStaff: number;
  assignedCompanies: number;
  unassignedCompanies: number;
}

export interface LiveCoverageItem {
  companyId: string;
  companyName: string;
  primary: { id: string; name: string | null; email: string; status: "ACTIVE" | "DEACTIVATED" } | null;
  backup: { id: string; name: string | null; email: string; status: "ACTIVE" | "DEACTIVATED" } | null;
  assignmentCount: number;
  status: "complete" | "missing_primary" | "missing_backup" | "staff_inactive" | "needs_reassignment";
}

export interface LiveCoverage {
  items: LiveCoverageItem[];
  kpis: {
    companiesRequiringCoverage: number;
    companiesWithPrimaryOwner: number;
    unassignedCompanies: number;
    companiesWithoutBackup: number;
    staffWithAssignments: number;
    assignmentsNeedingReassignment: number;
  };
}

export interface LiveReviewRow {
  staffId: string;
  name: string | null;
  email: string;
  platformRole: StaffPlatformRole;
  department: string | null;
  mfaEnabled: boolean;
  review: LiveStaff["review"];
}

export interface LiveReviews {
  items: LiveReviewRow[];
  kpis: {
    reviewsDue: number;
    overdueReviews: number;
    privilegedStaff: number;
    mfaActionRequired: number;
    suspendedWithAssignments: number;
    notScheduled: number;
  };
}

export interface LiveStaffInvitation {
  id: string;
  email: string;
  name: string | null;
  jobTitle: string | null;
  department: string | null;
  platformRole: StaffPlatformRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  acceptedUserId: string | null;
  invitedBy: { id: string; name: string | null; email: string };
  plannedAssignments: Array<{ companyId: string; responsibility: StaffResponsibilityKey; companyName: string | null }>;
}

export interface LiveStaffInvitations {
  items: LiveStaffInvitation[];
  kpis: { pending: number; accepted: number; expired: number; revoked: number; expiresSoon?: number; expiringSoon: number };
}

export interface LiveInviteResult {
  invitationId: string;
  status: "pending";
  expiresAt: string;
  token: string;
}

const base = "/super-admin/staff";
const enc = encodeURIComponent;

export const staffApi = {
  list(query: Record<string, string | number | undefined>): Promise<LiveStaffList> {
    return apiClient.request({ method: "GET", path: base, query });
  },
  get(id: string): Promise<LiveStaff> {
    return apiClient.request({ method: "GET", path: `${base}/${enc(id)}` });
  },
  kpis(): Promise<LiveStaffKpis> {
    return apiClient.request({ method: "GET", path: `${base}/kpis` });
  },
  coverage(): Promise<LiveCoverage> {
    return apiClient.request({ method: "GET", path: `${base}/coverage` });
  },
  reviews(query: { search?: string; status?: string } = {}): Promise<LiveReviews> {
    return apiClient.request({ method: "GET", path: `${base}/reviews`, query });
  },
  invitations(query: { search?: string; status?: string } = {}): Promise<LiveStaffInvitations> {
    return apiClient.request({ method: "GET", path: `${base}/invitations`, query });
  },
  invite(body: { email: string; name?: string; jobTitle?: string; department?: string; platformRole: StaffPlatformRole; assignments?: Array<{ companyId: string; responsibility: StaffResponsibilityKey }> }): Promise<LiveInviteResult> {
    return apiClient.request({ method: "POST", path: `${base}/invitations`, body });
  },
  resendInvitation(id: string): Promise<LiveInviteResult> {
    return apiClient.request({ method: "POST", path: `${base}/invitations/${enc(id)}/resend` });
  },
  revokeInvitation(id: string): Promise<{ invitationId: string; status: "revoked" }> {
    return apiClient.request({ method: "DELETE", path: `${base}/invitations/${enc(id)}` });
  },
  updateProfile(id: string, body: { name?: string; phone?: string; jobTitle?: string; department?: string }): Promise<LiveStaff> {
    return apiClient.request({ method: "PUT", path: `${base}/${enc(id)}/profile`, body });
  },
  changeRole(id: string, body: { platformRole: StaffPlatformRole; reason: string }): Promise<LiveStaff> {
    return apiClient.request({ method: "POST", path: `${base}/${enc(id)}/role`, body });
  },
  deactivate(id: string, body: { reason: string; reassignments?: Array<{ assignmentId: string; newStaffId: string }> }): Promise<LiveStaff> {
    return apiClient.request({ method: "POST", path: `${base}/${enc(id)}/deactivate`, body });
  },
  reactivate(id: string): Promise<LiveStaff> {
    return apiClient.request({ method: "POST", path: `${base}/${enc(id)}/reactivate` });
  },
  assign(id: string, body: { companyId: string; responsibility: StaffResponsibilityKey }): Promise<{ assignmentId: string }> {
    return apiClient.request({ method: "POST", path: `${base}/${enc(id)}/assignments`, body });
  },
  reassign(assignmentId: string, body: { newStaffId: string; reason: string }): Promise<{ assignmentId: string; previousAssignmentId: string }> {
    return apiClient.request({ method: "POST", path: `${base}/assignments/${enc(assignmentId)}/reassign`, body });
  },
  endAssignment(assignmentId: string): Promise<{ assignmentId: string; ended: true }> {
    return apiClient.request({ method: "DELETE", path: `${base}/assignments/${enc(assignmentId)}` });
  },
  scheduleReview(id: string, dueAt: string): Promise<{ reviewId: string }> {
    return apiClient.request({ method: "POST", path: `${base}/${enc(id)}/reviews`, body: { dueAt } });
  },
  completeReview(id: string, body: { outcome: StaffReviewOutcomeKey; notes: string }): Promise<{ reviewId: string; nextReviewId: string }> {
    return apiClient.request({ method: "POST", path: `${base}/${enc(id)}/reviews/complete`, body });
  },
};

export interface StaffTokenInfo {
  valid: true;
  email: string;
  name: string | null;
  platformRole: StaffPlatformRole;
  expiresAt: string;
}

/** Public: the invitee has no session yet. */
export const staffInvitationPublicApi = {
  validate(token: string): Promise<StaffTokenInfo> {
    return apiClient.request({ method: "POST", path: "/staff-invitations/validate", body: { token }, skipSessionExpiry: true });
  },
  accept(body: { token: string; password: string; name?: string; phone?: string }): Promise<{ status: "accepted" }> {
    return apiClient.request({ method: "POST", path: "/staff-invitations/accept", body, skipSessionExpiry: true });
  },
};
