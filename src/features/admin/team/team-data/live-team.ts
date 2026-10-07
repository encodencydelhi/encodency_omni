import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { clientsApi } from "../../projects/live/clients-api";
import { teamApi, type TeamGroupRecord, type TeamMemberRecord } from "../live/team-api";
import type { Member, TeamGroup } from "./types";

/**
 * The real Team backend, in one place. Every function throws on failure so the caller can show the real reason;
 * nothing here falls back to demo data.
 */
export const TEAM_LIVE = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";

export type SystemRoleKey = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";

/** The four platform-defined roles, highest rank first. There are no custom roles. */
export const SYSTEM_ROLES: ReadonlyArray<{ id: string; systemRole: SystemRoleKey; name: string; description: string }> = [
  { id: "owner", systemRole: "OWNER", name: "Owner", description: "Every capability, including assigning Owner." },
  { id: "admin", systemRole: "ADMIN", name: "Admin", description: "Team, billing, integrations, publishing and settings." },
  { id: "manager", systemRole: "MANAGER", name: "Manager", description: "Creates and edits campaigns, content and clients." },
  { id: "viewer", systemRole: "VIEWER", name: "Viewer", description: "Read-only access." },
];

export const roleName = (roleId: string) => SYSTEM_ROLES.find((role) => role.id === roleId.toLowerCase())?.name ?? "Member";
export const systemRoleOf = (roleId: string): SystemRoleKey | null => SYSTEM_ROLES.find((role) => role.id === roleId.toLowerCase())?.systemRole ?? null;

const companyId = () => getStoredCompanyId();

export function toLiveMember(row: TeamMemberRecord): Member {
  const roleId = row.systemRole.toLowerCase();
  const email = row.user.email;
  return {
    id: row.id,
    name: row.user.name?.trim() || email,
    email,
    jobTitle: row.jobTitle || undefined,
    department: row.department || undefined,
    avatarUrl: row.user.avatarUrl ?? null,
    roleId,
    roleName: roleName(roleId),
    status: row.suspendedAt ? "suspended" : "active",
    suspensionReason: row.suspensionReason ?? undefined,
    joinedAt: row.createdAt,
    // The backend does not track presence, tasks, approvals or per-person security for the Company roster.
    lastActiveAt: null,
    groups: [],
    clientAccess: (row.clientAccess ?? []).map((access) => ({ clientId: access.clientId, clientName: access.clientName, accessLevel: "full" as const, grantedAt: row.createdAt })),
    workload: { status: "available", openTasks: 0, overdueTasks: 0, pendingApprovals: 0, campaigns: 0, workflows: 0 },
    ownedResources: [],
    security: { has2FA: false, lastLogin: null, passwordLastChanged: null, activeSessions: 0, inviteAcceptedAt: null },
    isOrgAdmin: roleId === "owner" || roleId === "admin",
  };
}

export function toLiveGroup(row: TeamGroupRecord): TeamGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    leadId: row.lead?.membershipId ?? "",
    leadName: row.lead ? row.lead.name || row.lead.email : "No lead",
    memberCount: row.memberCount,
    clientCount: row.clientCount,
    activeTasks: 0,
    updatedAt: row.updatedAt,
    memberIds: row.members.map((member) => member.membershipId),
    clients: row.clients,
    archived: row.archivedAt !== null,
  };
}

export async function fetchMembers(): Promise<Member[]> {
  const rows = await apiClient.request<TeamMemberRecord[]>({ method: "GET", path: "/team/members", headers: companyScopeHeaders(companyId()) });
  return (Array.isArray(rows) ? rows : []).map(toLiveMember);
}

export async function fetchGroups(): Promise<TeamGroup[]> {
  const response = await teamApi.listGroups(companyId());
  return response.items.map(toLiveGroup);
}

export async function fetchClients(): Promise<Array<{ id: string; name: string }>> {
  const rows = await clientsApi.list(companyId());
  return rows.map((client) => ({ id: client.id, name: client.displayName || client.name }));
}

export async function createGroup(input: { name: string; description: string; leadId?: string; memberIds?: string[]; clients?: Array<{ id: string }> }): Promise<TeamGroup> {
  const row = await teamApi.createGroup(companyId(), {
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.leadId ? { leadMembershipId: input.leadId } : {}),
    memberIds: input.memberIds ?? [],
    clientIds: (input.clients ?? []).map((client) => client.id),
  });
  return toLiveGroup(row);
}

export async function updateGroup(id: string, patch: Partial<TeamGroup>): Promise<void> {
  if (patch.archived) {
    await teamApi.archiveGroup(companyId(), id);
    return;
  }
  await teamApi.updateGroup(companyId(), id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.leadId !== undefined ? { leadMembershipId: patch.leadId || null } : {}),
    ...(patch.memberIds !== undefined ? { memberIds: patch.memberIds } : {}),
    ...(patch.clients !== undefined ? { clientIds: patch.clients.map((client) => client.id) } : {}),
  });
}

export async function suspendMember(id: string, reason?: string): Promise<void> {
  await teamApi.suspendMember(companyId(), id, reason);
}

export async function reactivateMember(id: string): Promise<void> {
  await teamApi.reactivateMember(companyId(), id);
}

export async function removeMember(id: string): Promise<void> {
  await teamApi.removeMember(companyId(), id);
}

export async function changeRole(membershipId: string, roleId: string): Promise<void> {
  const systemRole = systemRoleOf(roleId);
  if (!systemRole) throw new Error("Choose one of the four roles.");
  await teamApi.updateRole(companyId(), membershipId, systemRole);
}

export async function updateProfile(membershipId: string, patch: { jobTitle?: string; department?: string }): Promise<void> {
  await teamApi.updateMemberProfile(companyId(), membershipId, { jobTitle: patch.jobTitle ?? null, department: patch.department ?? null });
}

/** Grants (`grant`) or removes access of the given members to ONE Client. Members that already match are skipped. */
export async function setClientAccess(clientId: string, membershipIds: string[], grant: boolean): Promise<void> {
  if (membershipIds.length === 0) return;
  if (grant) {
    await teamApi.grantClientAccess(companyId(), clientId, membershipIds);
    return;
  }
  for (const membershipId of membershipIds) await teamApi.revokeClientAccess(companyId(), clientId, membershipId);
}
