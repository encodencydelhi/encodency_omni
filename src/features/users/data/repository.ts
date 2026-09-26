import { USERS_MOCK_MODE } from "./config";
import { mockUsersProvider } from "./mock-provider";
import {
  superAdminUsersApi,
  type SuperAdminUserSummary,
  type SuperAdminUserDetail,
} from "../live/super-admin-users-api";
import type {
  AddMembershipInput,
  ChangeRoleInput,
  CompanyMembership,
  CreateInvitationInput,
  RemoveMembershipInput,
  TransferOwnershipInput,
  UpdateClientAccessInput,
  UpdateUserIdentityInput,
  UserAccountLifecycleEvent,
  UserActivity,
  UserAggregate,
  UserAttentionItem,
  UserInvitation,
  UserKpis,
  UserListQuery,
  UserListResult,
  UserSecurityEvent,
} from "./types";
import type { OrganisationRole } from "@/types/domain/user";

export interface UsersRepository {
  listUsers(query?: UserListQuery): Promise<UserListResult>;
  getUser(id: string): Promise<UserAggregate>;
  getKpis(): Promise<UserKpis>;
  listInvitations(query?: { search?: string; status?: string }): Promise<UserInvitation[]>;
  createInvitation(input: CreateInvitationInput): Promise<UserInvitation>;
  resendInvitation(id: string): Promise<UserInvitation>;
  revokeInvitation(id: string): Promise<UserInvitation>;
  addCompanyMembership(input: AddMembershipInput): Promise<UserAggregate>;
  changeMembershipRole(input: ChangeRoleInput): Promise<UserAggregate>;
  updateClientAccess(input: UpdateClientAccessInput): Promise<UserAggregate>;
  suspendMembership(membershipId: string, reason?: string): Promise<UserAggregate>;
  reactivateMembership(membershipId: string): Promise<UserAggregate>;
  removeMembership(input: RemoveMembershipInput): Promise<UserAggregate>;
  transferCompanyOwnership(input: TransferOwnershipInput): Promise<void>;
  suspendGlobalAccount(userId: string, reason?: string): Promise<UserAggregate>;
  reactivateGlobalAccount(userId: string): Promise<UserAggregate>;
  require2FA(userId: string, enforce: boolean): Promise<UserAggregate>;
  requirePasswordReset(userId: string): Promise<void>;
  revokeSession(userId: string, sessionId: string): Promise<UserAggregate>;
  revokeAllSessions(userId: string): Promise<UserAggregate>;
  unlockAccount(userId: string): Promise<UserAggregate>;
  updateUserIdentity(input: UpdateUserIdentityInput): Promise<UserAggregate>;
  listSecurityUsers(query?: { search?: string; companyId?: string; status?: string; twoFactor?: string }): Promise<UserAggregate[]>;
  listSecurityEvents(): Promise<UserSecurityEvent[]>;
  listAttentionItems(): Promise<UserAttentionItem[]>;
  listActivities(query?: { userId?: string; companyId?: string; search?: string }): Promise<UserActivity[]>;
  listLifecycleEvents(userId?: string): Promise<UserAccountLifecycleEvent[]>;
  bulkAction(
    action: "export" | "require_2fa" | "notify" | "suspend",
    userIds: string[],
    params?: { reason?: string },
  ): Promise<{ affectedCount: number; message: string }>;
}

function toAggregateFromSummary(u: SuperAdminUserSummary, detail?: SuperAdminUserDetail): UserAggregate {
  const memberships: CompanyMembership[] = (detail?.memberships ?? []).map((m) => {
    const sysLower = m.systemRole.toLowerCase();
    const role: OrganisationRole =
      sysLower === "owner" ? "owner" :
      sysLower === "admin" ? "admin" :
      sysLower === "manager" ? "marketing_manager" :
      sysLower === "viewer" ? "viewer" : "viewer";

    return {
      id: m.membershipId,
      userId: u.id,
      companyId: m.company.id,
      companyName: m.company.name,
      companySlug: m.company.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      role,
      status: m.company.status === "ACTIVE" ? "active" : "suspended",
      clientAccess: {
        scope: "all",
        clientIds: [],
        clients: [],
      },
      joinedAt: m.createdAt,
      updatedAt: m.createdAt,
      isOwner: m.systemRole === "OWNER",
    };
  });

  return {
    identity: {
      id: u.id,
      name: u.name ?? u.email.split("@")[0] ?? "User",
      email: u.email,
      phone: null,
      avatarUrl: u.avatarUrl,
      globalStatus: "active",
      emailVerified: true,
      createdAt: u.createdAt,
      lastLoginAt: u.updatedAt,
    },
    memberships,
    security: {
      mfaEnabled: u.mfaEnabled,
      twoFactorRequired: false,
      twoFactorStatus: u.mfaEnabled ? "enabled" : "not_enabled",
      passwordLastChanged: u.createdAt,
      lastSuccessfulLogin: u.updatedAt,
      failedLoginAttempts: 0,
      isLocked: false,
      sessions: [],
      securityWarnings: [],
    },
    ownedResources: [],
    recentActivity: [],
    totalClientsCount: detail?.memberships.reduce((acc, m) => acc + (m.clientAccessCount || 0), 0) ?? 0,
    activeSessionsCount: 1,
    hasOwnerAccess: memberships.some((m) => m.isOwner),
    hasAdminAccess: memberships.some((m) => m.role === "admin" || m.isOwner) || u.platformRole === "SUPER_ADMIN",
    securityPosture: "healthy",
  };
}

const apiUsersProvider: UsersRepository = {
  ...mockUsersProvider,

  async listUsers(query: UserListQuery = {}): Promise<UserListResult> {
    try {
      const page = query.page ?? 1;
      const limit = query.pageSize ?? 20;
      const search = query.filters?.search;

      const res = await superAdminUsersApi.list({
        page,
        limit,
        search,
      });

      const items = res.items.map((u) => toAggregateFromSummary(u));

      return {
        items,
        total: res.total,
        page: res.page,
        pageSize: res.limit,
        pageCount: Math.ceil(res.total / res.limit) || 1,
        kpis: {
          totalUsers: res.total,
          activeUsers: res.total,
          pendingInvites: 0,
          suspendedUsers: 0,
          twoFactorEnabled: res.items.filter((i) => i.mfaEnabled).length,
          twoFactorTotal: res.total,
          inactive30PlusDays: 0,
          multiCompanyUsers: res.items.filter((i) => i.companyCount > 1).length,
          needsAttentionCount: 0,
        },
      };
    } catch (err) {
      console.warn("Live superAdminUsersApi.list failed, using fallback:", err);
      return mockUsersProvider.listUsers(query);
    }
  },

  async getUser(id: string): Promise<UserAggregate> {
    try {
      const detail = await superAdminUsersApi.get(id);
      return toAggregateFromSummary(detail, detail);
    } catch (err) {
      console.warn("Live superAdminUsersApi.get failed, using fallback:", err);
      return mockUsersProvider.getUser(id);
    }
  },
};

export const usersRepository: UsersRepository = USERS_MOCK_MODE
  ? mockUsersProvider
  : apiUsersProvider;
