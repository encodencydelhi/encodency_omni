import { USERS_MOCK_MODE } from "./config";
import { mockUsersProvider } from "./mock-provider";
import type {
  AddMembershipInput,
  ChangeRoleInput,
  CreateInvitationInput,
  RemoveMembershipInput,
  TransferOwnershipInput,
  UpdateClientAccessInput,
  UpdateUserIdentityInput,
  UserActivity,
  UserAggregate,
  UserAttentionItem,
  UserInvitation,
  UserKpis,
  UserListQuery,
  UserListResult,
  UserSecurityEvent,
} from "./types";

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
  bulkAction(
    action: "export" | "require_2fa" | "notify" | "suspend",
    userIds: string[],
    params?: { reason?: string },
  ): Promise<{ affectedCount: number; message: string }>;
}

export const usersRepository: UsersRepository = USERS_MOCK_MODE
  ? mockUsersProvider
  : mockUsersProvider; // When backend is wired, swap in remote service implementation here
