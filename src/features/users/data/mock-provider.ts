import { ApiError } from "@/types/api";
import { apiClient } from "@/lib/api/client";
import { ORGANISATION_ROLE } from "@/types/domain/user";
import { MOCK_REFERENCE_TIME } from "./config";
import {
  addInvitation,
  computeUserKpis,
  getAllActivities,
  getAllAttentionItems,
  getAllInvitations,
  getAllLifecycleEvents,
  getAllRawUsers,
  getAllSecurityEvents,
  getRawUser,
  recordActivity,
  recordSecurityEvent,
  setAttentionItems,
  setInvitations,
  setRawUser,
  toUserAggregate,
} from "./mock/store";
import type {
  AddMembershipInput,
  ChangeRoleInput,
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

const DELAY_MS = 150;
const sleep = (ms = DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockUsersProvider = {
  async listUsers(query: UserListQuery = {}): Promise<UserListResult> {
    await sleep();
    const rawUsers = getAllRawUsers();
    let aggregates = rawUsers.map(toUserAggregate);

    const { filters, sort = "recentlyActive", page = 1, pageSize = 20 } = query;

    if (filters) {
      if (filters.search) {
        const term = filters.search.toLowerCase().trim();
        aggregates = aggregates.filter(
          (u) =>
            u.identity.name.toLowerCase().includes(term) ||
            u.identity.email.toLowerCase().includes(term) ||
            u.identity.id.toLowerCase().includes(term) ||
            u.memberships.some((m) => m.companyName.toLowerCase().includes(term)),
        );
      }

      if (filters.companyId) {
        aggregates = aggregates.filter((u) => u.memberships.some((m) => m.companyId === filters.companyId));
      }

      if (filters.status) {
        aggregates = aggregates.filter((u) => u.identity.globalStatus === filters.status);
      }

      if (filters.role) {
        aggregates = aggregates.filter((u) => u.memberships.some((m) => m.role === filters.role));
      }

      if (filters.twoFactor) {
        if (filters.twoFactor === "enabled") {
          aggregates = aggregates.filter((u) => u.security.mfaEnabled);
        } else if (filters.twoFactor === "not_enabled") {
          aggregates = aggregates.filter((u) => !u.security.mfaEnabled);
        } else if (filters.twoFactor === "required") {
          aggregates = aggregates.filter((u) => u.security.twoFactorRequired);
        }
      }

      if (filters.multiCompanyOnly) {
        aggregates = aggregates.filter((u) => u.memberships.length > 1);
      }

      if (filters.ownerOnly) {
        aggregates = aggregates.filter((u) => u.hasOwnerAccess);
      }

      if (filters.adminOnly) {
        aggregates = aggregates.filter((u) => u.hasAdminAccess);
      }

      if (filters.noActiveMembership) {
        aggregates = aggregates.filter((u) => !u.memberships.some((m) => m.status === "active"));
      }

      if (filters.accessIssues) {
        aggregates = aggregates.filter(
          (u) =>
            u.security.isLocked ||
            (u.security.twoFactorRequired && !u.security.mfaEnabled) ||
            u.identity.globalStatus === "suspended",
        );
      }

      if (filters.lastActive) {
        const now = MOCK_REFERENCE_TIME;
        if (filters.lastActive === "never") {
          aggregates = aggregates.filter((u) => !u.identity.lastLoginAt);
        } else if (filters.lastActive === "inactive30d") {
          aggregates = aggregates.filter((u) => {
            if (!u.identity.lastLoginAt) return true;
            return now - new Date(u.identity.lastLoginAt).getTime() > 30 * 86400000;
          });
        } else if (filters.lastActive === "7d") {
          aggregates = aggregates.filter((u) => {
            if (!u.identity.lastLoginAt) return false;
            return now - new Date(u.identity.lastLoginAt).getTime() <= 7 * 86400000;
          });
        } else if (filters.lastActive === "30d") {
          aggregates = aggregates.filter((u) => {
            if (!u.identity.lastLoginAt) return false;
            return now - new Date(u.identity.lastLoginAt).getTime() <= 30 * 86400000;
          });
        }
      }
    }

    // Sort
    aggregates.sort((a, b) => {
      switch (sort) {
        case "nameAsc":
          return a.identity.name.localeCompare(b.identity.name);
        case "newest":
          return new Date(b.identity.createdAt).getTime() - new Date(a.identity.createdAt).getTime();
        case "oldest":
          return new Date(a.identity.createdAt).getTime() - new Date(b.identity.createdAt).getTime();
        case "mostCompanies":
          return b.memberships.length - a.memberships.length;
        case "recentlyActive":
        default: {
          const aTime = a.identity.lastLoginAt ? new Date(a.identity.lastLoginAt).getTime() : 0;
          const bTime = b.identity.lastLoginAt ? new Date(b.identity.lastLoginAt).getTime() : 0;
          return bTime - aTime;
        }
      }
    });

    const total = aggregates.length;
    const startIndex = (page - 1) * pageSize;
    const items = aggregates.slice(startIndex, startIndex + pageSize);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const kpis = computeUserKpis();

    return {
      items,
      total,
      page,
      pageSize,
      pageCount,
      kpis,
    };
  },

  async getUser(id: string): Promise<UserAggregate> {
    await sleep(80);
    const record = getRawUser(id);
    if (!record) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: `User ${id} not found.` });
    }
    return toUserAggregate(record);
  },

  async getKpis(): Promise<UserKpis> {
    await sleep(50);
    return computeUserKpis();
  },

  async listInvitations(query: { search?: string; status?: string } = {}): Promise<UserInvitation[]> {
    await sleep(100);
    let items = getAllInvitations();
    if (query.status && query.status !== "all") {
      items = items.filter((i) => i.status === query.status);
    }
    if (query.search) {
      const term = query.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          i.email.toLowerCase().includes(term) ||
          i.companyName.toLowerCase().includes(term),
      );
    }
    return items;
  },

  async createInvitation(input: CreateInvitationInput): Promise<UserInvitation> {
    await sleep(200);

    // Rule: check if email already exists as a global user identity
    const existing = getAllRawUsers().find((u) => u.identity.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      throw new ApiError({
        code: "CONFLICT",
        status: 409,
        message: `A user with email ${input.email} already exists (${existing.identity.name}). Add them to the company instead of sending a new user invite.`,
      });
    }

    // Rule: check if pending invitation already exists for this company
    const duplicatePending = getAllInvitations().find(
      (inv) =>
        inv.email.toLowerCase() === input.email.toLowerCase() &&
        inv.companyId === input.companyId &&
        inv.status === "pending",
    );
    if (duplicatePending) {
      throw new ApiError({
        code: "CONFLICT",
        status: 409,
        message: `A pending invitation to ${input.email} for this company already exists.`,
      });
    }

    const companyName = getCompanyName(input.companyId);
    const now = new Date(MOCK_REFERENCE_TIME);
    let backendInvitationId: string | undefined;
    let backendExpiresAt: string | undefined;

    try {
      const systemRoleMap: Record<string, string> = {
        owner: "OWNER",
        admin: "ADMIN",
        marketing_manager: "MANAGER",
        content_creator: "VIEWER",
        analyst: "VIEWER",
        viewer: "VIEWER",
      };
      const systemRole = systemRoleMap[input.role] || "VIEWER";
      const clientRestrictions = input.clientAccessScope === "selected" ? input.clientAccessIds : undefined;

      const response = await apiClient.request<{ invitationId: string; status: string; expiresAt: string }>({
        method: "POST",
        path: `/companies/${input.companyId}/invitations`,
        body: {
          email: input.email.toLowerCase(),
          systemRole,
          ...(clientRestrictions && clientRestrictions.length > 0 ? { clientRestrictions } : {}),
        },
        headers: { "x-company-id": input.companyId },
      });
      if (response?.invitationId) backendInvitationId = response.invitationId;
      if (response?.expiresAt) backendExpiresAt = response.expiresAt;
    } catch (err) {
      console.warn("Backend invitation call bypassed or unavailable:", err);
    }

    const invitation: UserInvitation = {
      id: backendInvitationId || `inv_${Date.now().toString(36)}`,
      email: input.email.toLowerCase(),
      name: input.name,
      companyId: input.companyId,
      companyName,
      role: input.role,
      clientAccessScope: input.clientAccessScope,
      clientAccessIds: input.clientAccessIds,
      invitedBy: { id: "usr_superadmin", name: "Super Admin Ops", email: "ops@encodency.com" },
      sentAt: now.toISOString(),
      expiresAt: backendExpiresAt || new Date(now.getTime() + 7 * 86400000).toISOString(),
      status: "pending",
      requires2fa: input.requires2fa,
      note: input.note ?? null,
      acceptedUserId: null,
    };

    addInvitation(invitation);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: now.toISOString(),
      userId: "usr_superadmin",
      userName: "Super Admin Ops",
      userEmail: "ops@encodency.com",
      action: "Created User Invitation",
      companyId: input.companyId,
      companyName,
      clientId: null,
      clientName: null,
      module: "Identity",
      entity: `Invitation to ${input.email}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Created invitation for ${input.name} (${input.email}) as ${ORGANISATION_ROLE[input.role].label}.`,
      previousValue: null,
      newValue: "pending",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return invitation;
  },

  async resendInvitation(id: string): Promise<UserInvitation> {
    await sleep(150);
    const invitations = getAllInvitations();
    const index = invitations.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Invitation not found." });
    }

    const now = new Date(MOCK_REFERENCE_TIME);
    const existing = invitations[index];
    if (!existing) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Invitation not found." });
    }
    const updated: UserInvitation = {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      companyId: existing.companyId,
      companyName: existing.companyName,
      role: existing.role,
      clientAccessScope: existing.clientAccessScope,
      clientAccessIds: existing.clientAccessIds,
      invitedBy: existing.invitedBy,
      sentAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
      status: "pending",
      requires2fa: existing.requires2fa,
      note: existing.note,
      acceptedUserId: existing.acceptedUserId,
    };

    invitations[index] = updated;
    setInvitations(invitations);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: now.toISOString(),
      userId: "usr_superadmin",
      userName: "Super Admin Ops",
      userEmail: "ops@encodency.com",
      action: "Resent User Invitation",
      companyId: updated.companyId,
      companyName: updated.companyName,
      clientId: null,
      clientName: null,
      module: "Identity",
      entity: `Invitation ${id}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Resent invitation to ${updated.email}. Validity renewed for 7 days.`,
      previousValue: "sent",
      newValue: "resent",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return updated;
  },

  async revokeInvitation(id: string): Promise<UserInvitation> {
    await sleep(150);
    const invitations = getAllInvitations();
    const index = invitations.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Invitation not found." });
    }

    const existing = invitations[index];
    if (!existing) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Invitation not found." });
    }
    const updated: UserInvitation = {
      ...existing,
      id: existing.id,
      status: "revoked",
    };

    invitations[index] = updated;
    setInvitations(invitations);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: "usr_superadmin",
      userName: "Super Admin Ops",
      userEmail: "ops@encodency.com",
      action: "Revoked User Invitation",
      companyId: updated.companyId,
      companyName: updated.companyName,
      clientId: null,
      clientName: null,
      module: "Identity",
      entity: `Invitation ${id}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Revoked pending invitation for ${updated.email}.`,
      previousValue: "pending",
      newValue: "revoked",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return updated;
  },

  async addCompanyMembership(input: AddMembershipInput): Promise<UserAggregate> {
    await sleep(200);
    const user = getRawUser(input.userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    // Check if user already belongs to the company
    const existing = user.memberships.find((m) => m.companyId === input.companyId);
    if (existing) {
      throw new ApiError({
        code: "CONFLICT",
        status: 409,
        message: `User already belongs to ${existing.companyName}.`,
      });
    }

    const companyName = getCompanyName(input.companyId);
    const companySlug = input.companyId.replace("cmp_", "");
    const clients = getMockClientsForCompany(input.companyId, input.clientAccessIds);

    const newMembership = {
      id: `mbr_${input.userId}_${companySlug}_${Date.now().toString(36)}`,
      userId: input.userId,
      companyId: input.companyId,
      companyName,
      companySlug,
      role: input.role,
      status: "active" as const,
      clientAccess: {
        scope: input.clientAccessScope,
        clientIds: input.clientAccessIds,
        clients,
      },
      joinedAt: new Date(MOCK_REFERENCE_TIME).toISOString(),
      updatedAt: new Date(MOCK_REFERENCE_TIME).toISOString(),
      isOwner: input.role === "owner",
    };

    user.memberships.push(newMembership);
    setRawUser(user);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: user.identity.id,
      userName: user.identity.name,
      userEmail: user.identity.email,
      action: "Added Company Membership",
      companyId: input.companyId,
      companyName,
      clientId: null,
      clientName: null,
      module: "Company Access",
      entity: `Membership in ${companyName}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Added ${user.identity.name} to ${companyName} as ${ORGANISATION_ROLE[input.role].label}.`,
      previousValue: null,
      newValue: ORGANISATION_ROLE[input.role].label,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async changeMembershipRole(input: ChangeRoleInput): Promise<UserAggregate> {
    await sleep(150);
    const all = getAllRawUsers();
    let targetUser = all.find((u) => u.memberships.some((m) => m.id === input.membershipId));
    if (!targetUser) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Membership not found." });
    }

    const membership = targetUser.memberships.find((m) => m.id === input.membershipId)!;
    const oldRole = membership.role;

    membership.role = input.newRole;
    membership.isOwner = input.newRole === "owner";
    membership.updatedAt = new Date(MOCK_REFERENCE_TIME).toISOString();

    setRawUser(targetUser);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: targetUser.identity.id,
      userName: targetUser.identity.name,
      userEmail: targetUser.identity.email,
      action: "Changed Company Role",
      companyId: membership.companyId,
      companyName: membership.companyName,
      clientId: null,
      clientName: null,
      module: "Company Access",
      entity: `Role in ${membership.companyName}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Updated ${targetUser.identity.name}'s role in ${membership.companyName} from ${ORGANISATION_ROLE[oldRole].label} to ${ORGANISATION_ROLE[input.newRole].label}.`,
      previousValue: ORGANISATION_ROLE[oldRole].label,
      newValue: ORGANISATION_ROLE[input.newRole].label,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(targetUser);
  },

  async updateClientAccess(input: UpdateClientAccessInput): Promise<UserAggregate> {
    await sleep(150);
    const all = getAllRawUsers();
    let targetUser = all.find((u) => u.memberships.some((m) => m.id === input.membershipId));
    if (!targetUser) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Membership not found." });
    }

    const membership = targetUser.memberships.find((m) => m.id === input.membershipId)!;
    const clients = getMockClientsForCompany(membership.companyId, input.clientAccessIds);

    membership.clientAccess = {
      scope: input.clientAccessScope,
      clientIds: input.clientAccessIds,
      clients,
    };
    membership.updatedAt = new Date(MOCK_REFERENCE_TIME).toISOString();

    setRawUser(targetUser);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: targetUser.identity.id,
      userName: targetUser.identity.name,
      userEmail: targetUser.identity.email,
      action: "Updated Client Access",
      companyId: membership.companyId,
      companyName: membership.companyName,
      clientId: null,
      clientName: null,
      module: "Client Access",
      entity: `Clients in ${membership.companyName}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Configured client access scope (${input.clientAccessScope}): ${clients.length} clients accessible.`,
      previousValue: null,
      newValue: `${clients.length} clients`,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(targetUser);
  },

  async suspendMembership(membershipId: string, reason?: string): Promise<UserAggregate> {
    await sleep(180);
    const all = getAllRawUsers();
    let targetUser = all.find((u) => u.memberships.some((m) => m.id === membershipId));
    if (!targetUser) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Membership not found." });
    }

    const membership = targetUser.memberships.find((m) => m.id === membershipId)!;

    // Check sole owner protection rule:
    if (membership.role === "owner") {
      const otherOwners = all.filter(
        (u) =>
          u.identity.id !== targetUser!.identity.id &&
          u.memberships.some(
            (m) => m.companyId === membership.companyId && m.role === "owner" && m.status === "active",
          ),
      );
      if (otherOwners.length === 0) {
        throw new ApiError({
          code: "CONFLICT",
          status: 412,
          message: `This user is the only active owner of ${membership.companyName}. You must transfer organization ownership to an eligible member before suspending access.`,
        });
      }
    }

    membership.status = "suspended";
    membership.updatedAt = new Date(MOCK_REFERENCE_TIME).toISOString();
    setRawUser(targetUser);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: targetUser.identity.id,
      userName: targetUser.identity.name,
      userEmail: targetUser.identity.email,
      action: "Suspended Company Membership",
      companyId: membership.companyId,
      companyName: membership.companyName,
      clientId: null,
      clientName: null,
      module: "Company Access",
      entity: `Membership in ${membership.companyName}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Suspended membership in ${membership.companyName}. Reason: ${reason || "Administrative hold"}.`,
      previousValue: "active",
      newValue: "suspended",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(targetUser);
  },

  async reactivateMembership(membershipId: string): Promise<UserAggregate> {
    await sleep(150);
    const all = getAllRawUsers();
    let targetUser = all.find((u) => u.memberships.some((m) => m.id === membershipId));
    if (!targetUser) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Membership not found." });
    }

    const membership = targetUser.memberships.find((m) => m.id === membershipId)!;
    membership.status = "active";
    membership.updatedAt = new Date(MOCK_REFERENCE_TIME).toISOString();
    setRawUser(targetUser);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: targetUser.identity.id,
      userName: targetUser.identity.name,
      userEmail: targetUser.identity.email,
      action: "Reactivated Company Membership",
      companyId: membership.companyId,
      companyName: membership.companyName,
      clientId: null,
      clientName: null,
      module: "Company Access",
      entity: `Membership in ${membership.companyName}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Reactivated membership in ${membership.companyName}.`,
      previousValue: "suspended",
      newValue: "active",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(targetUser);
  },

  async removeMembership(input: RemoveMembershipInput): Promise<UserAggregate> {
    await sleep(200);
    const all = getAllRawUsers();
    let targetUser = all.find((u) => u.memberships.some((m) => m.id === input.membershipId));
    if (!targetUser) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Membership not found." });
    }

    const membership = targetUser.memberships.find((m) => m.id === input.membershipId)!;

    // Check sole owner protection
    if (membership.role === "owner") {
      const otherOwners = all.filter(
        (u) =>
          u.identity.id !== targetUser!.identity.id &&
          u.memberships.some(
            (m) => m.companyId === membership.companyId && m.role === "owner" && m.status === "active",
          ),
      );
      if (otherOwners.length === 0) {
        throw new ApiError({
          code: "CONFLICT",
          status: 412,
          message: `This user is the only active owner of ${membership.companyName}. Transfer ownership before removing membership.`,
        });
      }
    }

    // Reassign owned resources scoped to this company
    const resources = targetUser.ownedResources.filter((r) => r.companyId === membership.companyId);
    if (resources.length > 0 && input.reassignResourcesToUserId) {
      const replacementUser = all.find((u) => u.identity.id === input.reassignResourcesToUserId);
      if (replacementUser) {
        replacementUser.ownedResources.push(...resources);
        setRawUser(replacementUser);
      }
    }

    targetUser.ownedResources = targetUser.ownedResources.filter((r) => r.companyId !== membership.companyId);
    targetUser.memberships = targetUser.memberships.filter((m) => m.id !== input.membershipId);
    setRawUser(targetUser);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: targetUser.identity.id,
      userName: targetUser.identity.name,
      userEmail: targetUser.identity.email,
      action: "Removed Company Membership",
      companyId: membership.companyId,
      companyName: membership.companyName,
      clientId: null,
      clientName: null,
      module: "Company Access",
      entity: `Membership in ${membership.companyName}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Removed membership from ${membership.companyName}. Reassigned ${resources.length} resources.`,
      previousValue: "member",
      newValue: "removed",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(targetUser);
  },

  async transferCompanyOwnership(input: TransferOwnershipInput): Promise<void> {
    await sleep(200);
    const all = getAllRawUsers();
    const currentOwner = all.find((u) => u.identity.id === input.currentOwnerUserId);
    const newOwner = all.find((u) => u.identity.id === input.newOwnerUserId);

    if (!currentOwner || !newOwner) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Specified user(s) not found." });
    }

    const currentMbr = currentOwner.memberships.find((m) => m.companyId === input.companyId);
    const newMbr = newOwner.memberships.find((m) => m.companyId === input.companyId);

    if (!currentMbr || !newMbr) {
      throw new ApiError({
        code: "CONFLICT",
        status: 412,
        message: "Both users must belong to the target company.",
      });
    }

    currentMbr.role = "admin";
    currentMbr.isOwner = false;
    currentMbr.updatedAt = new Date(MOCK_REFERENCE_TIME).toISOString();

    newMbr.role = "owner";
    newMbr.isOwner = true;
    newMbr.status = "active";
    newMbr.updatedAt = new Date(MOCK_REFERENCE_TIME).toISOString();

    setRawUser(currentOwner);
    setRawUser(newOwner);

    // Remove attention item if one exists for sole owner issue in this company
    const attention = getAllAttentionItems().filter(
      (att) => !(att.companyId === input.companyId && att.actionType === "transfer_ownership"),
    );
    setAttentionItems(attention);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: newOwner.identity.id,
      userName: newOwner.identity.name,
      userEmail: newOwner.identity.email,
      action: "Transferred Company Ownership",
      companyId: input.companyId,
      companyName: currentMbr.companyName,
      clientId: null,
      clientName: null,
      module: "Organization",
      entity: `Ownership of ${currentMbr.companyName}`,
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Transferred ownership of ${currentMbr.companyName} from ${currentOwner.identity.name} to ${newOwner.identity.name}.`,
      previousValue: currentOwner.identity.name,
      newValue: newOwner.identity.name,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });
  },

  async suspendGlobalAccount(userId: string, reason?: string): Promise<UserAggregate> {
    await sleep(200);
    const user = getRawUser(userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    // Check sole owner protection across all memberships
    const all = getAllRawUsers();
    for (const membership of user.memberships) {
      if (membership.role === "owner" && membership.status === "active") {
        const otherOwners = all.filter(
          (u) =>
            u.identity.id !== userId &&
            u.memberships.some(
              (m) => m.companyId === membership.companyId && m.role === "owner" && m.status === "active",
            ),
        );
        if (otherOwners.length === 0) {
          throw new ApiError({
            code: "CONFLICT",
            status: 412,
            message: `Cannot suspend account: User is the sole active owner of ${membership.companyName}. Transfer ownership first.`,
          });
        }
      }
    }

    user.identity.globalStatus = "suspended";
    user.memberships.forEach((m) => {
      m.status = "suspended";
    });
    user.security.sessions.forEach((s) => {
      s.status = "revoked";
    });

    setRawUser(user);

    recordSecurityEvent({
      id: `sec_${Date.now().toString(36)}`,
      userId,
      eventType: "account_suspended",
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      result: "warning",
      companyId: null,
      companyName: null,
      device: null,
      ip: null,
      actor: "Super Admin Ops",
      summary: `Global account suspended. Reason: ${reason || "Administrative hold"}. All active sessions revoked.`,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId,
      userName: user.identity.name,
      userEmail: user.identity.email,
      action: "Suspended Global Account",
      companyId: user.memberships[0]?.companyId ?? "platform",
      companyName: user.memberships[0]?.companyName ?? "Platform",
      clientId: null,
      clientName: null,
      module: "Identity",
      entity: "Global Account",
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Suspended global account for ${user.identity.name}. Revoked ${user.security.sessions.length} active sessions.`,
      previousValue: "active",
      newValue: "suspended",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async reactivateGlobalAccount(userId: string): Promise<UserAggregate> {
    await sleep(150);
    const user = getRawUser(userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    user.identity.globalStatus = "active";
    user.memberships.forEach((m) => {
      m.status = "active";
    });
    user.security.isLocked = false;
    user.security.failedLoginAttempts = 0;

    setRawUser(user);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId,
      userName: user.identity.name,
      userEmail: user.identity.email,
      action: "Reactivated Global Account",
      companyId: user.memberships[0]?.companyId ?? "platform",
      companyName: user.memberships[0]?.companyName ?? "Platform",
      clientId: null,
      clientName: null,
      module: "Identity",
      entity: "Global Account",
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Reactivated global account for ${user.identity.name}.`,
      previousValue: "suspended",
      newValue: "active",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async require2FA(userId: string, enforce: boolean): Promise<UserAggregate> {
    await sleep(120);
    const user = getRawUser(userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    user.security.twoFactorRequired = enforce;
    if (enforce && !user.security.mfaEnabled) {
      user.security.securityWarnings = [
        "2FA is required by organization policy, but enrollment has not been completed.",
      ];
    } else {
      user.security.securityWarnings = user.security.securityWarnings.filter(
        (w) => !w.toLowerCase().includes("2fa is required"),
      );
    }

    setRawUser(user);

    recordSecurityEvent({
      id: `sec_${Date.now().toString(36)}`,
      userId,
      eventType: enforce ? "2fa_mandated" : "2fa_relaxed",
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      result: "success",
      companyId: null,
      companyName: null,
      device: null,
      ip: null,
      actor: "Super Admin Ops",
      summary: enforce ? "Mandated 2FA policy for account." : "Relaxed 2FA policy requirement.",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async requirePasswordReset(userId: string): Promise<void> {
    await sleep(150);
    const user = getRawUser(userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    recordSecurityEvent({
      id: `sec_${Date.now().toString(36)}`,
      userId,
      eventType: "password_reset_demanded",
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      result: "warning",
      companyId: null,
      companyName: null,
      device: null,
      ip: null,
      actor: "Super Admin Ops",
      summary: `Mandated password reset on next sign-in for ${user.identity.email}.`,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId,
      userName: user.identity.name,
      userEmail: user.identity.email,
      action: "Required Password Reset",
      companyId: user.memberships[0]?.companyId ?? "platform",
      companyName: user.memberships[0]?.companyName ?? "Platform",
      clientId: null,
      clientName: null,
      module: "Security",
      entity: "Password Policy",
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Sent password reset demand to ${user.identity.email}.`,
      previousValue: null,
      newValue: "reset_required",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });
  },

  async revokeSession(userId: string, sessionId: string): Promise<UserAggregate> {
    await sleep(120);
    const user = getRawUser(userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    const session = user.security.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.status = "revoked";
    }

    setRawUser(user);

    recordSecurityEvent({
      id: `sec_${Date.now().toString(36)}`,
      userId,
      eventType: "session_revoked",
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      result: "warning",
      companyId: null,
      companyName: null,
      device: session?.device ?? "Unknown",
      ip: session?.ip ?? "Unknown",
      actor: "Super Admin Ops",
      summary: `Revoked session ${sessionId} (${session?.device ?? "Device"}).`,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async revokeAllSessions(userId: string): Promise<UserAggregate> {
    await sleep(150);
    const user = getRawUser(userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    const count = user.security.sessions.filter((s) => s.status === "active").length;
    user.security.sessions.forEach((s) => {
      s.status = "revoked";
    });

    setRawUser(user);

    recordSecurityEvent({
      id: `sec_${Date.now().toString(36)}`,
      userId,
      eventType: "all_sessions_revoked",
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      result: "warning",
      companyId: null,
      companyName: null,
      device: null,
      ip: null,
      actor: "Super Admin Ops",
      summary: `Revoked all active sessions (${count} sessions).`,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async unlockAccount(userId: string): Promise<UserAggregate> {
    await sleep(120);
    const user = getRawUser(userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    user.security.isLocked = false;
    user.security.failedLoginAttempts = 0;
    user.security.securityWarnings = user.security.securityWarnings.filter((w) => !w.toLowerCase().includes("locked out"));

    setRawUser(user);

    recordSecurityEvent({
      id: `sec_${Date.now().toString(36)}`,
      userId,
      eventType: "account_unlocked",
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      result: "success",
      companyId: null,
      companyName: null,
      device: null,
      ip: null,
      actor: "Super Admin Ops",
      summary: "Manually unlocked account and cleared failed login attempts counter.",
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async updateUserIdentity(input: UpdateUserIdentityInput): Promise<UserAggregate> {
    await sleep(150);
    const user = getRawUser(input.userId);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    user.identity.name = input.name;
    user.identity.phone = input.phone;
    user.identity.avatarUrl = input.avatarUrl;
    if (input.themePreference) user.identity.themePreference = input.themePreference;
    if (input.notificationsEnabled !== undefined) user.identity.notificationsEnabled = input.notificationsEnabled;

    setRawUser(user);

    recordActivity({
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
      userId: user.identity.id,
      userName: user.identity.name,
      userEmail: user.identity.email,
      action: "Updated User Profile",
      companyId: user.memberships[0]?.companyId ?? "platform",
      companyName: user.memberships[0]?.companyName ?? "Platform",
      clientId: null,
      clientName: null,
      module: "Identity",
      entity: "Profile Details",
      result: "successful",
      actor: { id: "usr_superadmin", name: "Super Admin Ops" },
      summary: `Updated name and profile preferences for ${user.identity.name}.`,
      previousValue: null,
      newValue: input.name,
      relatedAuditId: `aud_${Date.now().toString(36)}`,
    });

    return toUserAggregate(user);
  },

  async listSecurityUsers(query: { search?: string; companyId?: string; status?: string; twoFactor?: string } = {}): Promise<UserAggregate[]> {
    await sleep(100);
    let items = getAllRawUsers().map(toUserAggregate);
    if (query.search) {
      const term = query.search.toLowerCase().trim();
      items = items.filter(
        (u) =>
          u.identity.name.toLowerCase().includes(term) ||
          u.identity.email.toLowerCase().includes(term) ||
          u.memberships.some((m) => m.companyName.toLowerCase().includes(term)),
      );
    }
    if (query.companyId && query.companyId !== "all") {
      items = items.filter((u) => u.memberships.some((m) => m.companyId === query.companyId));
    }
    if (query.twoFactor && query.twoFactor !== "all") {
      items = items.filter((u) => u.security.twoFactorStatus === query.twoFactor);
    }
    if (query.status && query.status !== "all") {
      items = items.filter((u) => u.identity.globalStatus === query.status);
    }
    return items;
  },

  async listSecurityEvents(): Promise<UserSecurityEvent[]> {
    await sleep(80);
    return getAllSecurityEvents();
  },

  async listAttentionItems(): Promise<UserAttentionItem[]> {
    await sleep(60);
    return getAllAttentionItems();
  },

  async listActivities(query: { userId?: string; companyId?: string; search?: string } = {}): Promise<UserActivity[]> {
    await sleep(100);
    let list = getAllActivities();
    if (query.userId) {
      list = list.filter((a) => a.userId === query.userId || a.actor?.id === query.userId);
    }
    if (query.companyId && query.companyId !== "all") {
      list = list.filter((a) => a.companyId === query.companyId);
    }
    if (query.search) {
      const term = query.search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.userName.toLowerCase().includes(term) ||
          a.userEmail.toLowerCase().includes(term) ||
          a.action.toLowerCase().includes(term) ||
          a.summary.toLowerCase().includes(term) ||
          a.companyName.toLowerCase().includes(term),
      );
    }
    return list;
  },

  async listLifecycleEvents(userId?: string): Promise<UserAccountLifecycleEvent[]> {
    await sleep(80);
    let events = getAllLifecycleEvents();
    if (userId) {
      events = events.filter((e) => e.userId === userId);
    }
    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  },

  async bulkAction(
    action: "export" | "require_2fa" | "notify" | "suspend",
    userIds: string[],
    _params?: { reason?: string },
  ): Promise<{ affectedCount: number; message: string }> {
    await sleep(250);
    const all = getAllRawUsers();
    const targets = all.filter((u) => userIds.includes(u.identity.id));

    if (action === "suspend") {
      // Check sole owner protection
      for (const target of targets) {
        for (const m of target.memberships) {
          if (m.role === "owner" && m.status === "active") {
            const others = all.filter(
              (u) =>
                !userIds.includes(u.identity.id) &&
                u.memberships.some((om) => om.companyId === m.companyId && om.role === "owner" && om.status === "active"),
            );
            if (others.length === 0) {
              throw new ApiError({
                code: "CONFLICT",
                status: 412,
                message: `Bulk suspension aborted: ${target.identity.name} is the sole owner of ${m.companyName}. Transfer ownership first.`,
              });
            }
          }
        }
      }

      targets.forEach((t) => {
        t.identity.globalStatus = "suspended";
        t.memberships.forEach((m) => (m.status = "suspended"));
        t.security.sessions.forEach((s) => (s.status = "revoked"));
        setRawUser(t);
      });

      return {
        affectedCount: targets.length,
        message: `Successfully suspended ${targets.length} accounts.`,
      };
    }

    if (action === "require_2fa") {
      targets.forEach((t) => {
        t.security.twoFactorRequired = true;
        setRawUser(t);
      });
      return {
        affectedCount: targets.length,
        message: `2FA requirement enforced for ${targets.length} accounts.`,
      };
    }

    if (action === "export") {
      const rows = targets.map((t) => ({
        id: t.identity.id,
        name: t.identity.name,
        email: t.identity.email,
        status: t.identity.globalStatus,
        companies: t.memberships.map((m) => m.companyName).join("; "),
        roles: t.memberships.map((m) => m.role).join("; "),
      }));
      const csvHeaders = ["ID", "Name", "Email", "Status", "Companies", "Roles"];
      const csvRows = rows.map((r) => [r.id, `"${r.name}"`, r.email, r.status, `"${r.companies}"`, `"${r.roles}"`].join(","));
      const csv = [csvHeaders.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `omniplatform-users-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      recordActivity({
        id: `act_${Date.now().toString(36)}`,
        timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
        userId: "usr_superadmin",
        userName: "Super Admin Ops",
        userEmail: "ops@encodency.com",
        action: "Exported User Data",
        companyId: "cmp_namo-gange-trust",
        companyName: "Platform",
        clientId: null,
        clientName: null,
        module: "Identity",
        entity: "User Export",
        result: "successful",
        actor: { id: "usr_superadmin", name: "Super Admin Ops" },
        summary: `Exported ${targets.length} user records to CSV.`,
        previousValue: null,
        newValue: "exported",
        relatedAuditId: null,
      });

      return {
        affectedCount: targets.length,
        message: `Exported ${targets.length} user records to CSV.`,
      };
    }

    if (action === "notify") {
      targets.forEach((t) => {
        recordActivity({
          id: `act_${Date.now().toString(36)}_${t.identity.id}`,
          timestamp: new Date(MOCK_REFERENCE_TIME).toISOString(),
          userId: t.identity.id,
          userName: t.identity.name,
          userEmail: t.identity.email,
          action: "Account Notification Sent",
          companyId: t.memberships[0]?.companyId ?? "platform",
          companyName: t.memberships[0]?.companyName ?? "Platform",
          clientId: null,
          clientName: null,
          module: "Identity",
          entity: "Account Notification",
          result: "successful",
          actor: { id: "usr_superadmin", name: "Super Admin Ops" },
          summary: `Platform notification sent to ${t.identity.name} (${t.identity.email}).`,
          previousValue: null,
          newValue: "notified",
          relatedAuditId: null,
        });
      });

      return {
        affectedCount: targets.length,
        message: `Notifications sent to ${targets.length} users.`,
      };
    }

    return {
      affectedCount: targets.length,
      message: `Action '${action}' processed for ${targets.length} users.`,
    };
  },
};

function getCompanyName(companyId: string): string {
  const map: Record<string, string> = {
    "cmp_namo-gange-trust": "Namo Gange Trust",
    "cmp_CityInida": "CityInida Pvt Ltd",
    "cmp_meridian-digital": "Meridian Digital",
    "cmp_bharat-organic-foods": "Bharat Organic Foods",
    "cmp_sattva-wellness": "Sattva Wellness Group",
    "cmp_craftline-interiors": "Craftline Interiors",
    "cmp_blue-harbour-logistics": "Blue Harbour Logistics",
    "cmp_auric-jewels": "Auric Jewels",
    "cmp_nordwind-studios": "Nordwind Studios",
    "cmp_peak-and-pine": "Peak & Pine Outdoors",
    "cmp_lumen-health": "Lumen Health Systems",
    "cmp_amberline-cosmetics": "Amberline Cosmetics",
  };
  return map[companyId] ?? companyId.replace("cmp_", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getMockClientsForCompany(companyId: string, clientIds: string[]): Array<{ id: string; name: string }> {
  const clientMap: Record<string, Array<{ id: string; name: string }>> = {
    "cmp_namo-gange-trust": [
      { id: "prj_namo-gange-trust_1", name: "Moksha Sewa" },
      { id: "prj_namo-gange-trust_2", name: "Ganga Aarti Live" },
    ],
    "cmp_CityInida": [
      { id: "prj_CityInida_1", name: "CityInida Services" },
      { id: "prj_CityInida_2", name: "CityInida Support" },
    ],
    "cmp_meridian-digital": [
      { id: "prj_meridian_1", name: "Northstar Bank" },
      { id: "prj_meridian_2", name: "Halo Fitness" },
      { id: "prj_meridian_3", name: "Verde Living" },
      { id: "prj_meridian_4", name: "Cinder Coffee" },
    ],
    "cmp_bharat-organic-foods": [
      { id: "prj_bharat_1", name: "Bharat Organic" },
      { id: "prj_bharat_2", name: "Bharat Kitchen" },
    ],
    "cmp_sattva-wellness": [
      { id: "prj_sattva_1", name: "Sattva Ayurveda" },
      { id: "prj_sattva_2", name: "Sattva Retreats" },
    ],
    "cmp_craftline-interiors": [{ id: "prj_craftline_1", name: "Craftline Studio" }],
    "cmp_blue-harbour-logistics": [
      { id: "prj_blueharbour_1", name: "Blue Harbour Freight" },
      { id: "prj_blueharbour_2", name: "Harbour Express" },
    ],
    "cmp_nordwind-studios": [
      { id: "prj_nordwind_1", name: "Nordwind Originals" },
      { id: "prj_nordwind_2", name: "Nordwind Shorts" },
    ],
    "cmp_amberline-cosmetics": [
      { id: "prj_amberline_1", name: "Amberline Paris" },
      { id: "prj_amberline_2", name: "Amberline Pro" },
    ],
  };

  const pool = clientMap[companyId] ?? [{ id: `prj_${companyId}_1`, name: "Primary Client Brand" }];
  if (!clientIds || clientIds.length === 0) return pool;
  return pool.filter((c) => clientIds.includes(c.id));
}
