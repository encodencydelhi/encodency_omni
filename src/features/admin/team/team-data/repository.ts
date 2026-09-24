import { MOCK_ACTIVITY, MOCK_GROUPS, MOCK_INVITATIONS, MOCK_MEMBERS } from "./mock-provider";
import { Invitation, Member, MemberActivity, TeamGroup } from "./types";
import { apiClient } from "@/lib/api/client";

function getCompanyIdHeader() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("omni_active_company_id") ?? "development-company-id";
  }
  return "development-company-id";
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

export const teamRepository = {
  async getMembers(): Promise<Member[]> {
    try {
      const response = await apiClient.request<any[]>({
        method: "GET",
        path: "/team/members",
        headers: { "x-company-id": getCompanyIdHeader() },
      });
      // Map backend shape to frontend if necessary, for now return directly if matched
      return response as any;
    } catch (error) {
      console.error("Failed to fetch team members", error);
      return [...members]; // Fallback to mock
    }
  },

  async getGroups(): Promise<TeamGroup[]> {
    return [...groups];
  },

  async getInvitations(): Promise<Invitation[]> {
    return [...invitations];
  },

  async getActivity(): Promise<MemberActivity[]> {
    return [...activity];
  },

  async inviteMember(invite: Omit<Invitation, "id" | "status" | "sentAt">): Promise<Invitation> {
    const companyId = getCompanyIdHeader();

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
    const clientRestrictions = invite.clients?.map((c) => c.id).filter(Boolean);

    let serverInvitationId = `inv-${Date.now()}`;
    let serverExpiresAt = invite.expiresAt;
    let inviteToken: string | undefined;

    try {
      const response = await apiClient.request<{
        invitationId: string;
        status: string;
        expiresAt: string;
        token?: string;
      }>({
        method: "POST",
        path: `/companies/${companyId}/invitations`,
        body: {
          email: invite.email,
          systemRole,
          ...(clientRestrictions && clientRestrictions.length > 0 ? { clientRestrictions } : {}),
        },
        headers: { "x-company-id": companyId },
      });

      if (response?.invitationId) {
        serverInvitationId = response.invitationId;
      }
      if (response?.expiresAt) {
        serverExpiresAt = response.expiresAt;
      }
      if (response?.token) {
        inviteToken = response.token;
      }
    } catch (error) {
      console.warn("Backend invitation API error (continuing with local state):", error);
    }

    const newInvite: Invitation = {
      ...invite,
      id: serverInvitationId,
      status: "pending",
      sentAt: new Date().toISOString(),
      expiresAt: serverExpiresAt,
      token: inviteToken,
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

  async suspendMember(id: string): Promise<void> {
    members = members.map((m) => (m.id === id ? { ...m, status: "suspended" } : m));
  },

  async deactivateMember(id: string): Promise<void> {
    members = members.map((m) => (m.id === id ? { ...m, status: "deactivated" } : m));
  },
  
  async reactivateMember(id: string): Promise<void> {
    members = members.map((m) => (m.id === id ? { ...m, status: "active" } : m));
  },

  async createGroup(group: Omit<TeamGroup, "id" | "updatedAt" | "activeTasks" | "memberCount" | "clientCount">): Promise<TeamGroup> {
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
          path: `/team/members/${id}/role`,
          body: { systemRole },
          headers: { "x-company-id": getCompanyIdHeader() },
        });
      } catch (err) {
        console.warn("Failed to update role on backend:", err);
      }
    }
    members = members.map((member) => member.id === id ? { ...member, ...patch } : member);
  },

  async removeMember(id: string, replacementId?: string): Promise<void> {
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
    invitations = invitations.map((invite) => invite.id === id ? { ...invite, ...patch } : invite);
  },

  async deleteInvitation(id: string): Promise<void> {
    invitations = invitations.filter((invite) => invite.id !== id);
  },

  async updateGroup(id: string, patch: Partial<TeamGroup>): Promise<void> {
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
