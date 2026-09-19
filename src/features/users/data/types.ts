import type { OrganisationRole } from "@/types/domain/user";

export type GlobalUserStatus = "active" | "invited" | "suspended" | "deactivated";
export type MembershipStatus = "active" | "invited" | "suspended";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export type TwoFactorStatus = "enabled" | "not_enabled" | "setup_pending" | "required_not_configured";
export type SecurityPosture = "healthy" | "action_required" | "locked" | "suspended" | "security_review";

export interface MembershipClientAccess {
  scope: "all" | "selected";
  clientIds: string[];
  clients: Array<{ id: string; name: string }>;
}

export interface CompanyMembership {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  role: OrganisationRole;
  status: MembershipStatus;
  clientAccess: MembershipClientAccess;
  joinedAt: string;
  updatedAt: string;
  isOwner: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActiveAt: string;
  status: "active" | "revoked";
  current: boolean;
}

export interface UserSecurityProfile {
  mfaEnabled: boolean;
  twoFactorRequired: boolean;
  twoFactorStatus: TwoFactorStatus;
  passwordLastChanged: string;
  lastSuccessfulLogin: string | null;
  failedLoginAttempts: number;
  isLocked: boolean;
  sessions: UserSession[];
  securityWarnings: string[];
}

export interface UserIdentity {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  globalStatus: GlobalUserStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  themePreference?: "system" | "light" | "dark";
  notificationsEnabled?: boolean;
}

export type ResourceType = "task" | "campaign" | "workflow" | "scheduled_post" | "approval" | "report";

export interface OwnedResource {
  id: string;
  companyId: string;
  companyName: string;
  type: ResourceType;
  title: string;
  status: string;
  assignedAt: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  name: string;
  companyId: string;
  companyName: string;
  role: OrganisationRole;
  clientAccessScope: "all" | "selected";
  clientAccessIds: string[];
  invitedBy: { id: string; name: string; email: string };
  sentAt: string;
  expiresAt: string;
  status: InvitationStatus;
  requires2fa: boolean;
  note: string | null;
  acceptedUserId: string | null;
}

export interface UserActivity {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  companyId: string;
  companyName: string;
  clientId: string | null;
  clientName: string | null;
  module: string;
  entity: string;
  result: "successful" | "failed";
  actor: { id: string; name: string };
  summary: string;
  previousValue: string | null;
  newValue: string | null;
  relatedAuditId: string | null;
}

export interface UserSecurityEvent {
  id: string;
  userId: string;
  eventType: string;
  timestamp: string;
  result: "success" | "warning" | "failed";
  companyId: string | null;
  companyName: string | null;
  device: string | null;
  ip: string | null;
  actor: string;
  summary: string;
  relatedAuditId: string | null;
}

export interface UserAttentionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string | null;
  companyName: string | null;
  issue: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  actionType: "review_security" | "open_user" | "review_access" | "resend_invite" | "transfer_ownership";
  actionLabel: string;
}

/** Full composite view of a user identity used across tables, drawers and details. */
export interface UserAggregate {
  identity: UserIdentity;
  memberships: CompanyMembership[];
  security: UserSecurityProfile;
  ownedResources: OwnedResource[];
  recentActivity: UserActivity[];
  totalClientsCount: number;
  activeSessionsCount: number;
  hasOwnerAccess: boolean;
  hasAdminAccess: boolean;
  securityPosture: SecurityPosture;
}

export interface UserKpis {
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  suspendedUsers: number;
  twoFactorEnabled: number;
  twoFactorTotal: number;
  inactive30PlusDays: number;
  multiCompanyUsers: number;
  needsAttentionCount: number;
}

export interface UserFilters {
  search?: string;
  companyId?: string;
  status?: GlobalUserStatus;
  role?: OrganisationRole;
  twoFactor?: "enabled" | "not_enabled" | "required";
  lastActive?: "all" | "7d" | "30d" | "inactive30d" | "never";
  multiCompanyOnly?: boolean;
  ownerOnly?: boolean;
  adminOnly?: boolean;
  noActiveMembership?: boolean;
  accessIssues?: boolean;
}

export type UserSortField =
  | "recentlyActive"
  | "newest"
  | "oldest"
  | "nameAsc"
  | "mostCompanies";

export interface UserListQuery {
  filters?: UserFilters;
  sort?: UserSortField;
  page?: number;
  pageSize?: number;
}

export interface UserListResult {
  items: UserAggregate[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  kpis: UserKpis;
}

export interface UserCapabilities {
  canViewUsers: boolean;
  canInviteUsers: boolean;
  canEditUserIdentity: boolean;
  canManageMemberships: boolean;
  canChangeMembershipRole: boolean;
  canManageClientAccess: boolean;
  canSuspendMembership: boolean;
  canSuspendGlobalAccount: boolean;
  canRequire2FA: boolean;
  canRequirePasswordReset: boolean;
  canRevokeSessions: boolean;
  canTransferOwnership: boolean;
  canExportUsers: boolean;
  canViewSecurityEvents: boolean;
  canViewUserActivity: boolean;
}

export interface CreateInvitationInput {
  email: string;
  name: string;
  phone?: string;
  companyId: string;
  role: OrganisationRole;
  clientAccessScope: "all" | "selected";
  clientAccessIds: string[];
  requires2fa: boolean;
  expiryDays: number;
  note?: string;
}

export interface AddMembershipInput {
  userId: string;
  companyId: string;
  role: OrganisationRole;
  clientAccessScope: "all" | "selected";
  clientAccessIds: string[];
}

export interface ChangeRoleInput {
  membershipId: string;
  newRole: OrganisationRole;
}

export interface UpdateClientAccessInput {
  membershipId: string;
  clientAccessScope: "all" | "selected";
  clientAccessIds: string[];
}

export interface TransferOwnershipInput {
  companyId: string;
  currentOwnerUserId: string;
  newOwnerUserId: string;
  reason?: string;
}

export interface RemoveMembershipInput {
  membershipId: string;
  reassignResourcesToUserId?: string;
}

export interface UpdateUserIdentityInput {
  userId: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  themePreference?: "system" | "light" | "dark";
  notificationsEnabled?: boolean;
}

export interface UserAccountLifecycleEvent {
  id: string;
  userId: string;
  eventType: "created" | "activated" | "suspended" | "reactivated" | "deactivated" | "ownership_transferred" | "membership_added" | "membership_removed";
  timestamp: string;
  actor: { id: string; name: string };
  companyId?: string;
  companyName?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export type UserCapability = keyof UserCapabilities;
