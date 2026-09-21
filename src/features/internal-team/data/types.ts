import type { InternalRole, TeamMemberStatus } from "@/types/domain/team";

export type AccessReviewStatus = "not_scheduled" | "upcoming" | "due" | "overdue" | "completed";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export type MfaState = "enrolled" | "setup_required" | "review_required" | "unknown";
export type CoverageStatus = "complete" | "missing_primary" | "missing_backup" | "staff_inactive" | "needs_reassignment";
export type AssignmentResponsibility = "primary_owner" | "backup_owner" | "support_owner" | "integration_support" | "billing_contact";

export interface PlatformCapability {
  id: string;
  module: string;
  label: string;
  sensitive: boolean;
}

export interface RoleCapability {
  role: InternalRole;
  capabilities: string[];
  sensitiveCapabilities: string[];
}

export interface StaffAssignment {
  id: string;
  staffId: string;
  companyId: string;
  companyName: string;
  responsibility: AssignmentResponsibility;
  assignedAt: string;
  assignedBy: string;
  status: "active" | "inactive" | "pending_handover";
}

export interface StaffInvitation {
  id: string;
  email: string;
  name: string;
  department: string;
  jobTitle: string;
  role: InternalRole;
  invitedBy: { id: string; name: string };
  createdAt: string;
  expiresAt: string;
  status: InvitationStatus;
  companyAssignments: Array<{ companyId: string; companyName: string; responsibility: AssignmentResponsibility }>;
  acceptedUserId: string | null;
}

export interface StaffAccessReview {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  role: InternalRole;
  department: string;
  mfaState: MfaState;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  status: AccessReviewStatus;
  reviewer: string | null;
  notes: string | null;
  outcome: "confirmed" | "role_change_recommended" | "access_removal_recommended" | null;
}

export interface StaffActivity {
  id: string;
  staffId: string;
  timestamp: string;
  eventType: string;
  actor: { id: string; name: string };
  details: string;
  previousValue?: string;
  newValue?: string;
  companyId?: string;
  companyName?: string;
  result: "successful" | "failed";
}

export interface StaffLifecycleEvent {
  id: string;
  staffId: string;
  eventType: "invited" | "activated" | "role_changed" | "suspended" | "reactivated" | "deactivated" | "assignment_added" | "assignment_removed" | "review_completed";
  timestamp: string;
  actor: { id: string; name: string };
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string;
  department: string;
  role: InternalRole;
  status: TeamMemberStatus;
  mfaEnabled: boolean;
  mfaState: MfaState;
  lastActiveAt: string | null;
  createdAt: string;
  globalUserId: string;
  assignments: StaffAssignment[];
  accessReviewStatus: AccessReviewStatus;
  nextReviewDate: string | null;
  privilegedAccess: boolean;
  effectiveCapabilities: string[];
  sensitiveCapabilities: string[];
}

export interface StaffKpis {
  totalStaff: number;
  activeStaff: number;
  pendingInvitations: number;
  suspendedStaff: number;
  mfaActionRequired: number;
  accessReviewsDue: number;
  assignedCompanies: number;
  unassignedCompanies: number;
}

export interface InvitationKpis {
  pending: number;
  accepted: number;
  expired: number;
  revoked: number;
  expiringSoon: number;
}

export interface CoverageKpi {
  companiesRequiringCoverage: number;
  companiesWithPrimaryOwner: number;
  unassignedCompanies: number;
  companiesWithoutBackup: number;
  staffWithAssignments: number;
  assignmentsNeedingReassignment: number;
}

export interface AccessReviewKpis {
  reviewsDue: number;
  overdueReviews: number;
  privilegedStaff: number;
  mfaActionRequired: number;
  suspendedWithAssignments: number;
  tempAccessExpiring: number;
}

export interface StaffListQuery {
  search?: string;
  role?: InternalRole;
  status?: TeamMemberStatus;
  department?: string;
  mfaState?: MfaState;
  accessReviewStatus?: AccessReviewStatus;
  sort?: "recently_active" | "name" | "role" | "assigned_companies" | "join_date";
  page?: number;
  pageSize?: number;
}

export interface StaffListResult {
  items: StaffMember[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  kpis: StaffKpis;
}

export interface StaffCapabilities {
  canViewStaff: boolean;
  canInviteStaff: boolean;
  canEditStaffProfile: boolean;
  canChangePlatformRole: boolean;
  canAssignCompanies: boolean;
  canSuspendStaff: boolean;
  canReactivateStaff: boolean;
  canDeactivateStaff: boolean;
  canConductAccessReviews: boolean;
  canExportStaff: boolean;
  canViewActivity: boolean;
  canManageLifecycle: boolean;
}

export interface CreateStaffInvitationInput {
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  role: InternalRole;
  companyAssignments: Array<{ companyId: string; companyName: string; responsibility: AssignmentResponsibility }>;
}

export interface ChangeStaffRoleInput {
  staffId: string;
  newRole: InternalRole;
  reason: string;
}

export interface AssignCompanyInput {
  staffId: string;
  companyId: string;
  companyName: string;
  responsibility: AssignmentResponsibility;
}

export interface ReassignCompanyInput {
  assignmentId: string;
  newStaffId: string;
  reason: string;
}

export interface CompleteAccessReviewInput {
  reviewId: string;
  outcome: "confirmed" | "role_change_recommended" | "access_removal_recommended";
  notes: string;
}

export interface SuspendStaffInput {
  staffId: string;
  reason: string;
}

export interface ReactivateStaffInput {
  staffId: string;
  reason: string;
}

export interface DeactivateStaffInput {
  staffId: string;
  reason: string;
  reassignmentPlan: Array<{ companyId: string; newOwnerId: string }>;
}
