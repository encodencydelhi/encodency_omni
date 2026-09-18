import { MOCK_ACTIVITY, MOCK_GROUPS, MOCK_INVITATIONS, MOCK_MEMBERS } from "./mock-provider";
import { Invitation, Member, MemberActivity, TeamGroup } from "./types";

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
    return [...members];
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
    const newInvite: Invitation = {
      ...invite,
      id: `inv-${Date.now()}`,
      status: "pending",
      sentAt: new Date().toISOString(),
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
