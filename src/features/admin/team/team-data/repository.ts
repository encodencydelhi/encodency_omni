import { MOCK_ACTIVITY, MOCK_GROUPS, MOCK_INVITATIONS, MOCK_MEMBERS } from "./mock-provider";
import type { Invitation, Member, MemberActivity, TeamGroup } from "./types";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import { teamApi, type TeamActivityRecord, type TeamInvitationRecord } from "../live/team-api";
import * as live from "./live-team";

const LIVE = live.TEAM_LIVE;

function getCompanyId() {
  return getStoredCompanyId();
}

/** Backend CreateInvitationDto requires UUID v4 client ids — demo ids like `c-1` are omitted. */
function toBackendClientRestrictions(clients: { id: string }[] | undefined): string[] | undefined {
  const ids = (clients ?? []).map((client) => client.id).filter(Boolean);
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const valid = ids.filter((id) => uuidV4.test(id));
  return valid.length > 0 && valid.length === ids.length ? valid : undefined;
}

/** Owner fallback policy: network / 5xx / 404 fall back; auth/validation/conflict stay loud. */
function shouldFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  if (error.status === 0) return true;
  if (error.status >= 500) return true;
  if (error.status === 404) return true;
  return false;
}

/**
 * Repository for Team Management operations.
 * Acts as an abstraction layer over the mock provider, easily swappable for real API calls.
 */

// We keep in-memory clones to allow mutations in the current session.
let members = [...MOCK_MEMBERS];
let groups = [...MOCK_GROUPS];
let invitations = [...MOCK_INVITATIONS];
let activity = [...MOCK_ACTIVITY];

function toMember(raw: any): Member {
  if (raw && raw.roleName && raw.workload && raw.security) {
    return raw as Member;
  }
  const email: string = raw?.user?.email || raw?.email || "user@example.com";
  const name: string = raw?.user?.name || raw?.name || email.split("@")[0] || "Team Member";
  const roleId: string = (raw?.systemRole || raw?.roleId || "VIEWER").toLowerCase();
  const roleNameMap: Record<string, string> = {
    owner: "Organization Owner",
    admin: "Organization Admin",
    manager: "Social Media Manager",
    viewer: "Viewer",
  };
  const roleName = roleNameMap[roleId] || "Team Member";

  return {
    id: raw?.id ?? `mem-${Date.now()}`,
    name,
    email,
    jobTitle: raw?.jobTitle || (roleId === "admin" ? "Administrator" : "Team Member"),
    avatarUrl: raw?.avatarUrl || null,
    roleId,
    roleName,
    status: raw?.status || "active",
    joinedAt: raw?.createdAt || new Date().toISOString(),
    lastActiveAt: raw?.lastActiveAt || raw?.createdAt || new Date().toISOString(),
    groups: raw?.groups || [],
    clientAccess: raw?.clientAccess || [],
    workload: raw?.workload || {
      status: "available",
      openTasks: 0,
      overdueTasks: 0,
      pendingApprovals: 0,
      campaigns: 0,
      workflows: 0,
    },
    ownedResources: raw?.ownedResources || [],
    security: raw?.security || {
      has2FA: false,
      lastLogin: null,
      passwordLastChanged: null,
      activeSessions: 1,
      inviteAcceptedAt: raw?.createdAt || null,
    },
    isOrgAdmin: roleId === "admin" || roleId === "owner",
  };
}

function toActivity(row: TeamActivityRecord): MemberActivity {
  return {
    id: row.id,
    memberId: row.actor?.membershipId ?? row.actor?.userId ?? "",
    memberName: row.actor?.name || row.actor?.email || "Unknown member",
    action: row.outcome === "FAILURE" ? `${row.label} (failed)` : row.label,
    entityName: row.resourceLabel,
    module: row.module,
    clientId: row.clientId ?? undefined,
    clientName: row.clientName ?? undefined,
    timestamp: row.at,
  };
}

const INVITE_ROLE_NAMES: Record<string, string> = {
  owner: "Organization Owner",
  admin: "Organization Admin",
  manager: "Social Media Manager",
  viewer: "Viewer",
};

const INVITE_STATUS_MAP: Record<string, Invitation["status"]> = {
  pending: "pending",
  accepted: "accepted",
  expired: "expired",
  revoked: "cancelled",
};

function toInvitation(row: TeamInvitationRecord): Invitation {
  const roleId = (row.systemRole || "VIEWER").toLowerCase();
  return {
    id: row.id,
    email: row.email,
    name: row.email.split("@")[0] || row.email,
    roleId,
    roleName: INVITE_ROLE_NAMES[roleId] || "Team Member",
    clients: [],
    accessLevel: "full",
    groups: [],
    invitedBy: { id: row.invitedBy?.userId ?? "", name: row.invitedBy?.name || row.invitedBy?.email || "Team member" },
    sentAt: row.createdAt,
    expiresAt: row.expiresAt,
    status: INVITE_STATUS_MAP[row.status] ?? "pending",
  };
}

export const teamRepository = {
  async getMembers(): Promise<Member[]> {
    if (LIVE) return live.fetchMembers();
    try {
      const response = await apiClient.request<any[]>({
        method: "GET",
        path: "/team/members",
        headers: companyScopeHeaders(getCompanyId()),
      });
      if (Array.isArray(response)) {
        return response.map(toMember);
      }
      return [];
    } catch (error) {
      if (process.env.NEXT_PUBLIC_DATA_SOURCE === "mock") {
        return [...members];
      }
      throw error;
    }
  },

  async getGroups(): Promise<TeamGroup[]> {
    if (LIVE) return live.fetchGroups();
    return [...groups];
  },

  async getInvitations(): Promise<Invitation[]> {
    try {
      const response = await teamApi.listInvitations(getCompanyId(), { page: 1, limit: 100 });
      const rows = Array.isArray(response?.items) ? response.items : [];
      invitations = rows.map(toInvitation);
      return [...invitations];
    } catch (error) {
      if (process.env.NEXT_PUBLIC_DATA_SOURCE === "mock" || shouldFallBack(error)) return [...invitations];
      throw error;
    }
  },

  async getActivity(): Promise<MemberActivity[]> {
    if (process.env.NEXT_PUBLIC_DATA_SOURCE === "mock") return [...activity];
    try {
      const response = await teamApi.listActivity(getCompanyId(), { limit: 200 });
      return (Array.isArray(response?.items) ? response.items : []).map(toActivity);
    } catch (error) {
      // The feed needs team:manage (OWNER/ADMIN). A Manager or Viewer simply has no feed; it must never break the Team pages.
      if (ApiError.isApiError(error) && (error.status === 403 || error.status === 404 || error.status >= 500 || error.status === 0)) return [];
      throw error;
    }
  },

  async inviteMember(invite: Omit<Invitation, "id" | "status" | "sentAt">): Promise<Invitation> {
    const companyId = getCompanyId();

    // Map UI role to backend SystemRole
    const systemRoleMap: Record<string, string> = {
      "org-admin": "ADMIN",
      admin: "ADMIN",
      manager: "MANAGER",
      "social-manager": "MANAGER",
      "seo-manager": "MANAGER",
      contributor: "VIEWER",
      analyst: "VIEWER",
      viewer: "VIEWER",
      owner: "OWNER",
    };
    const systemRole = systemRoleMap[invite.roleId] || "VIEWER";
    const clientRestrictions = toBackendClientRestrictions(invite.clients);

    if (process.env.NEXT_PUBLIC_DATA_SOURCE === "mock") {
      const newInvite: Invitation = {
        ...invite,
        id: `inv-${Date.now()}`,
        status: "pending",
        sentAt: new Date().toISOString(),
        expiresAt: invite.expiresAt,
        token: `mock-token-${Date.now()}`,
      };
      invitations = [newInvite, ...invitations];
      return newInvite;
    }

    const response = await apiClient.request<{
      invitationId: string;
      status: string;
      expiresAt: string;
      token?: string;
    }>({
      method: "POST",
      path: `/companies/${encodeURIComponent(companyId)}/invitations`,
      body: {
        email: invite.email,
        systemRole,
        ...(clientRestrictions ? { clientRestrictions } : {}),
      },
      headers: companyScopeHeaders(companyId),
    });

    const newInvite: Invitation = {
      ...invite,
      id: response.invitationId,
      status: "pending",
      sentAt: new Date().toISOString(),
      expiresAt: response.expiresAt || invite.expiresAt,
      token: response.token,
    };
    invitations = [newInvite, ...invitations];
    
    // Log activity
    activity = [
      {
        id: `act-${Date.now()}`,
        memberId: invite.invitedBy.id,
        memberName: invite.invitedBy.name,
        action: "Invited Member",
        entityName: invite.email,
        module: "Team",
        timestamp: new Date().toISOString(),
      },
      ...activity,
    ];
    
    return newInvite;
  },

  /** The Company roster has no suspend/deactivate state in the backend; live mode never offers these actions. */
  async getClients(): Promise<Array<{ id: string; name: string }>> {
    if (LIVE) return live.fetchClients();
    return [{ id: "c-1", name: "Moksha Sewa" }, { id: "c-2", name: "CityInida" }, { id: "c-3", name: "EnCodency" }];
  },

  async setClientAccess(clientId: string, membershipIds: string[], grant: boolean): Promise<void> {
    if (LIVE) return live.setClientAccess(clientId, membershipIds, grant);
    members = members.map((m) => membershipIds.includes(m.id) ? { ...m, clientAccess: grant ? [...m.clientAccess.filter((a) => a.clientId !== clientId), { clientId, clientName: clientId, accessLevel: "full" as const, grantedAt: new Date().toISOString() }] : m.clientAccess.filter((a) => a.clientId !== clientId) } : m);
  },

  async suspendMember(id: string, reason?: string): Promise<void> {
    if (LIVE) return live.suspendMember(id, reason);
    members = members.map((m) => (m.id === id ? { ...m, status: "suspended" } : m));
  },

  async deactivateMember(id: string): Promise<void> {
    if (LIVE) throw new Error("Deactivating a member is not supported by the backend.");
    members = members.map((m) => (m.id === id ? { ...m, status: "deactivated" } : m));
  },
  
  async reactivateMember(id: string): Promise<void> {
    if (LIVE) return live.reactivateMember(id);
    members = members.map((m) => (m.id === id ? { ...m, status: "active" } : m));
  },

  async createGroup(group: Omit<TeamGroup, "id" | "updatedAt" | "activeTasks" | "memberCount" | "clientCount">): Promise<TeamGroup> {
    if (LIVE) return live.createGroup({ name: group.name, description: group.description, leadId: group.leadId, memberIds: group.memberIds, clients: group.clients });
    const newGroup: TeamGroup = {
      ...group,
      id: `grp-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      activeTasks: 0,
      memberCount: group.memberIds?.length ?? 0,
      clientCount: group.clients?.length ?? 0,
    };
    groups = [newGroup, ...groups];
    members = members.map((member) => group.memberIds?.includes(member.id)
      ? { ...member, groups: [...member.groups.filter((item) => item.id !== newGroup.id), { id: newGroup.id, name: newGroup.name }] }
      : member);
    return newGroup;
  },

  async updateMember(id: string, patch: Partial<Member>): Promise<void> {
    if (LIVE) {
      if (patch.roleId) await live.changeRole(id, patch.roleId);
      if (patch.jobTitle !== undefined || patch.department !== undefined) await live.updateProfile(id, { jobTitle: patch.jobTitle, department: patch.department });
      return;
    }
    if (patch.roleId) {
      const systemRoleMap: Record<string, string> = {
        "org-admin": "ADMIN",
        admin: "ADMIN",
        manager: "MANAGER",
        "social-manager": "MANAGER",
        "seo-manager": "MANAGER",
        contributor: "VIEWER",
        analyst: "VIEWER",
        viewer: "VIEWER",
        owner: "OWNER",
      };
      const systemRole = systemRoleMap[patch.roleId] || "VIEWER";
      try {
        await apiClient.request({
          method: "PUT",
          path: `/team/members/${encodeURIComponent(id)}/role`,
          body: { systemRole },
          headers: companyScopeHeaders(getCompanyId()),
        });
      } catch (err) {
        if (!shouldFallBack(err)) throw err;
        console.warn("Failed to update role on backend:", err);
      }
    }

    if (patch.jobTitle !== undefined || patch.department !== undefined) {
      try {
        await teamApi.updateMemberProfile(getCompanyId(), id, {
          jobTitle: patch.jobTitle ?? null,
          department: patch.department ?? null,
        });
      } catch (err) {
        if (!shouldFallBack(err)) throw err;
        console.warn("Failed to update member profile on backend:", err);
      }
    }

    members = members.map((member) => member.id === id ? { ...member, ...patch } : member);
  },

  async removeMember(id: string, replacementId?: string): Promise<void> {
    if (LIVE) return live.removeMember(id);
    const removed = members.find((member) => member.id === id);
    if (removed && replacementId) {
      members = members.map((member) => member.id === replacementId
        ? { ...member, ownedResources: [...member.ownedResources, ...removed.ownedResources] }
        : member);
    }
    members = members.filter((member) => member.id !== id);
    groups = groups.map((group) => ({
      ...group,
      memberIds: group.memberIds?.filter((memberId) => memberId !== id),
      memberCount: Math.max(0, group.memberCount - (removed?.groups.some((item) => item.id === group.id) ? 1 : 0)),
    }));
  },

  async updateInvitation(id: string, patch: Partial<Invitation>): Promise<void> {
    const isResend = patch.status === "pending" && !patch.roleId;
    if (isResend && process.env.NEXT_PUBLIC_DATA_SOURCE !== "mock") {
      await teamApi.resendInvitation(getCompanyId(), id);
      return;
    }
    invitations = invitations.map((invite) => invite.id === id ? { ...invite, ...patch } : invite);
  },

  async deleteInvitation(id: string): Promise<void> {
    if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "mock") {
      await teamApi.revokeInvitation(getCompanyId(), id);
    }
    invitations = invitations.filter((invite) => invite.id !== id);
  },

  async updateGroup(id: string, patch: Partial<TeamGroup>): Promise<void> {
    if (LIVE) return live.updateGroup(id, patch);
    const current = groups.find((group) => group.id === id);
    groups = groups.map((group) => group.id === id ? { ...group, ...patch, updatedAt: new Date().toISOString() } : group);
    if (patch.memberIds && current) {
      members = members.map((member) => ({
        ...member,
        groups: patch.memberIds!.includes(member.id)
          ? [...member.groups.filter((item) => item.id !== id), { id, name: patch.name ?? current.name }]
          : member.groups.filter((item) => item.id !== id),
      }));
    }
  },
};
